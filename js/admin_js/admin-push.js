/* MODULE: Push Notifications */
const VAPID_KEY = "BCx2edrg1xMNMgdGrIrNuvTjeLvxOMzp3rPf35vPXjm-_MX6hWY8-yqEScyDA4pj-FElrhxTCA-rYh1SsKjJlQ0";

let fcmMessaging = null;

async function getMessagingInstance() {
    if (fcmMessaging) return fcmMessaging;
    try {
        const { getMessaging, isSupported, app } = await import('../site_js/core/firebase.js');
        const supported = await isSupported();
        if (supported) {
            fcmMessaging = getMessaging(app);
            return fcmMessaging;
        } else {
            console.warn("FCM is not supported in this browser.");
            return null;
        }
    } catch (err) {
        console.error("Error initializing FCM messaging instance:", err);
        return null;
    }
}

window.initPushNotificationsView = async function() {
    console.log("Initializing Push Notifications View...");
    const statusText = document.getElementById("push-status-text");
    const toggleBtn = document.getElementById("btn-toggle-push");
    const testBtn = document.getElementById("btn-test-push");
    const saveBtn = document.getElementById("btn-save-prefs");
    const prefBooking = document.getElementById("pref-new-booking");
    const prefTodo = document.getElementById("pref-new-todo");
    
    // Check if superuser to show manual sending card
    const superuserCard = document.getElementById("superuser-push-card");
    if (window.currentUserRole === 'superuser') {
        if (superuserCard) {
            superuserCard.style.display = "block";
            renderPushUsersList();
        }
    } else {
        if (superuserCard) superuserCard.style.display = "none";
    }

    // Load current user settings from firestore
    try {
        const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
        const userDoc = await getDoc(doc(db, 'users', window.currentUser.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            const prefs = data.notification_preferences || {};
            prefBooking.checked = prefs.newBooking !== false; // default to true if not set
            prefTodo.checked = prefs.newTodo !== false; // default to true if not set
        }
    } catch (err) {
        console.error("Error reading user preferences:", err);
    }

    // Update permission status UI
    updatePermissionStatusUI();

    // Attach listeners
    toggleBtn.onclick = requestPushPermission;
    saveBtn.onclick = saveNotificationPreferences;
    testBtn.onclick = sendTestPushNotification;
    
    const sendCustomBtn = document.getElementById("btn-send-custom-push");
    if (sendCustomBtn) {
        sendCustomBtn.onclick = sendCustomPush;
    }
};

async function updatePermissionStatusUI() {
    const statusText = document.getElementById("push-status-text");
    const toggleBtn = document.getElementById("btn-toggle-push");
    const testBtn = document.getElementById("btn-test-push");

    if (!('Notification' in window)) {
        if (statusText) statusText.innerText = "Niet ondersteund op dit apparaat (geen push API).";
        if (toggleBtn) toggleBtn.disabled = true;
        return;
    }

    const permission = Notification.permission;
    if (permission === "granted") {
        if (statusText) statusText.innerHTML = '<span style="color:#22c55e;">✔ Ingeschakeld</span>';
        if (toggleBtn) {
            toggleBtn.innerText = "Rechten verleend";
            toggleBtn.disabled = true;
            toggleBtn.style.background = "#22c55e";
        }
        if (testBtn) testBtn.disabled = false;
    } else if (permission === "denied") {
        if (statusText) statusText.innerHTML = '<span style="color:#ef4444;">❌ Geweigerd</span> (Herstel in browserinstellingen)';
        if (toggleBtn) {
            toggleBtn.innerText = "Geweigerd";
            toggleBtn.disabled = true;
            toggleBtn.style.background = "#ef4444";
        }
        if (testBtn) testBtn.disabled = true;
    } else {
        if (statusText) statusText.innerText = "Nog niet ingesteld.";
        if (toggleBtn) {
            toggleBtn.innerText = "Inschakelen";
            toggleBtn.disabled = false;
            toggleBtn.style.background = "";
        }
        if (testBtn) testBtn.disabled = true;
    }
}

async function requestPushPermission() {
    if (!('Notification' in window)) return;
    
    const toggleBtn = document.getElementById("btn-toggle-push");
    const originalText = toggleBtn.innerText;
    toggleBtn.disabled = true;
    toggleBtn.innerText = "Bezig...";

    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            console.log("Push notifications allowed!");
            
            // Register token
            const messaging = await getMessagingInstance();
            if (messaging) {
                const { getToken } = await import('../site_js/core/firebase.js');
                
                // Get active registration or fallback to default
                let registration = undefined;
                if ('serviceWorker' in navigator) {
                    registration = await navigator.serviceWorker.ready;
                }

                const token = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    console.log("FCM Token retrieved:", token);
                    await saveFCMTokenToUser(token);
                    showToast("Gelukt!", "Pushmeldingen zijn succesvol geactiveerd voor dit apparaat.", "success");
                } else {
                    console.warn("Could not retrieve FCM token.");
                    showToast("Waarschuwing", "Push permissie verleend, maar token kon niet worden opgehaald.", "warning");
                }
            }
        } else {
            console.warn("Push permission denied.");
            showToast("Geweigerd", "Je hebt de toestemming geweigerd. Wijzig dit in je browser instellingen.", "error");
        }
    } catch (err) {
        console.error("Error requesting push permission:", err);
        showToast("Fout", "Er is een fout opgetreden: " + err.message, "error");
    } finally {
        updatePermissionStatusUI();
    }
}

async function saveFCMTokenToUser(token) {
    if (!window.currentUser) return;
    try {
        const { db, doc, getDoc, updateDoc, arrayUnion } = await import('../site_js/core/firebase.js');
        const userRef = doc(db, 'users', window.currentUser.uid);
        
        // Ensure user document exists and arrayUnion the token
        await updateDoc(userRef, {
            fcmTokens: arrayUnion(token),
            lastActive: new Date().toISOString()
        });
        console.log("FCM Token successfully saved to user document.");
    } catch (err) {
        console.error("Failed to save FCM token to Firestore:", err);
    }
}

async function saveNotificationPreferences() {
    if (!window.currentUser) return;
    const saveBtn = document.getElementById("btn-save-prefs");
    const originalText = saveBtn.innerText;
    saveBtn.disabled = true;
    saveBtn.innerText = "Opslaan...";

    const prefBooking = document.getElementById("pref-new-booking").checked;
    const prefTodo = document.getElementById("pref-new-todo").checked;

    try {
        const { db, doc, updateDoc } = await import('../site_js/core/firebase.js');
        const userRef = doc(db, 'users', window.currentUser.uid);

        await updateDoc(userRef, {
            notification_preferences: {
                newBooking: prefBooking,
                newTodo: prefTodo
            }
        });

        showToast("Opgeslagen", "Je voorkeuren zijn succesvol bijgewerkt.", "success");
    } catch (err) {
        console.error("Failed to save preferences:", err);
        showToast("Fout", "Kon voorkeuren niet opslaan: " + err.message, "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = originalText;
    }
}

async function sendTestPushNotification() {
    const testBtn = document.getElementById("btn-test-push");
    const originalText = testBtn.innerText;
    testBtn.disabled = true;
    testBtn.innerText = "Bezig...";

    try {
        // Send a request directly to the callable function to push a test message to ourselves
        const { functions, httpsCallable } = await import('../site_js/core/firebase.js');
        const sendCustom = httpsCallable(functions, 'sendCustomPushNotification');
        
        const result = await sendCustom({
            target: 'selected',
            targetIds: [window.currentUser.uid],
            title: 'Testmelding Gipfel Lodge',
            body: 'Dit is een testmelding om te controleren of uw pushnotificaties goed werken!'
        });

        if (result.data && result.data.success) {
            showToast("Test gestuurd", "Test pushnotificatie is succesvol verstuurd naar dit account.", "success");
        } else {
            showToast("Test mislukt", result.data ? result.data.message : "Onbekende fout", "error");
        }
    } catch (err) {
        console.error("Test push failed:", err);
        showToast("Fout", "Kon testmelding niet sturen: " + err.message, "error");
    } finally {
        testBtn.disabled = false;
        testBtn.innerText = originalText;
    }
}

// Custom Push (Superusers only)
window.toggleSelectedUsersList = function(value) {
    const listEl = document.getElementById("custom-push-users-list");
    if (listEl) {
        listEl.style.display = value === 'selected' ? 'block' : 'none';
    }
};

function renderPushUsersList() {
    const container = document.getElementById("custom-push-users-list");
    if (!container || !window.allUsers) return;

    if (window.allUsers.length === 0) {
        container.innerHTML = `<div style="font-size:0.8rem; color:#94a3b8; text-align:center; padding:10px;">Geen andere gebruikers gevonden.</div>`;
        return;
    }

    container.innerHTML = window.allUsers.map(u => `
        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 0.85rem; color: #334155; cursor: pointer;">
            <input type="checkbox" class="push-target-user-chk" value="${u.uid}" style="accent-color: var(--color-gold);">
            <span>${u.displayName} (${u.email})</span>
        </label>
    `).join('');
}

async function sendCustomPush() {
    const title = document.getElementById("custom-push-title").value.trim();
    const body = document.getElementById("custom-push-body").value.trim();
    const target = document.getElementById("custom-push-target").value;
    const btn = document.getElementById("btn-send-custom-push");

    if (!title || !body) {
        alert("Vul a.u.b. een titel en bericht in.");
        return;
    }

    let targetIds = [];
    if (target === 'selected') {
        const checkboxes = document.querySelectorAll(".push-target-user-chk:checked");
        checkboxes.forEach(chk => targetIds.push(chk.value));
        if (targetIds.length === 0) {
            alert("Selecteer a.u.b. ten minste één gebruiker.");
            return;
        }
    }

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="ph ph-spinner spinner"></i> Bezig met verzenden...`;

    try {
        const { functions, httpsCallable } = await import('../site_js/core/firebase.js');
        const sendCustom = httpsCallable(functions, 'sendCustomPushNotification');

        const result = await sendCustom({
            target,
            targetIds,
            title,
            body
        });

        if (result.data && result.data.success) {
            showToast("Verzonden!", `Pushmelding verzonden naar ${result.data.successCount} actieve apparaten.`, "success");
            // Clear input fields
            document.getElementById("custom-push-title").value = "";
            document.getElementById("custom-push-body").value = "";
        } else {
            alert("Verzenden mislukt: " + (result.data ? result.data.message : "onbekende fout"));
        }
    } catch (err) {
        console.error("Custom push failed:", err);
        alert("Fout bij verzenden: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Helper: Toast alerts (reusing existing styles if any, otherwise simple alert fallback)
function showToast(title, body, type = 'info') {
    const container = document.getElementById("eb-toast-container");
    if (!container) {
        alert(`${title}: ${body}`);
        return;
    }

    const colors = {
        success: { border: '#22c55e', bg: '#f0fdf4', icon: 'ph-check-circle', color: '#15803d' },
        warning: { border: '#eab308', bg: '#fefcbf', icon: 'ph-warning', color: '#854d0e' },
        error: { border: '#ef4444', bg: '#fef2f2', icon: 'ph-x-circle', color: '#b91c1c' },
        info: { border: '#3b82f6', bg: '#eff6ff', icon: 'ph-info', color: '#1d4ed8' }
    };

    const cfg = colors[type] || colors.info;

    const toast = document.createElement("div");
    toast.style.cssText = `
        background: ${cfg.bg};
        border-left: 4px solid ${cfg.border};
        color: ${cfg.color};
        padding: 12px 18px;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 280px;
        max-width: 400px;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    toast.innerHTML = `
        <i class="ph ${cfg.icon}" style="font-size: 1.25rem; margin-top: 2px; flex-shrink: 0;"></i>
        <div>
            <strong style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 2px;">${title}</strong>
            <span style="font-size: 0.8rem; line-height: 1.4; opacity: 0.9;">${body}</span>
        </div>
    `;

    container.appendChild(toast);
    
    // Trigger animations
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}
