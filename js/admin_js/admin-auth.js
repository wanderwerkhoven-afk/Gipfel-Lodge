/* MODULE: Auth */
        // --- 1. LOGIN LOGICA (Firebase Auth) ---
        let currentUser = null;
        let currentUserRole = 'user'; // Default to least privilege
        let currentUserName = '';    // Display name fetched from Firestore

        // AUTH Observer: Handle session properly
        import('../site_js/core/firebase.js').then(firebase => {
            firebase.onAuthStateChanged(firebase.auth, async (user) => {
                if (user) {
                    console.log("User is logged in:", user.email);
                    currentUser = user;

                    // Fetch role + displayName from Firestore 'users' collection
                    try {
                        const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        if (userDoc.exists()) {
                            const data = userDoc.data();
                            currentUserRole = data.role === 'superuser' ? 'superuser' : 'user';
                            // Use stored displayName, or fall back to the part before @ in the email
                            currentUserName = data.displayName || user.email.split('@')[0];
                        } else {
                            currentUserRole = 'user';
                            currentUserName = user.email.split('@')[0];
                        }
                    } catch (e) {
                        console.warn('Could not fetch user role, defaulting to regular user.', e);
                        currentUserRole = 'user';
                        currentUserName = user.email.split('@')[0];
                    }

                    console.log('User role:', currentUserRole);
                    showDashboard();
                } else {
                    console.log("No user is logged in.");
                    currentUser = null;
                    currentUserRole = 'user';
                    currentUserName = '';
                    document.getElementById("dashboard-screen").style.display = "none";
                    document.getElementById("login-screen").style.display = "block";
                    document.body.style.display = 'flex';
                }
            });
        });

        async function login() {
            const emailInput = document.getElementById("admin-email").value;
            const passwordInput = document.getElementById("admin-password").value;
            const errorMsg = document.getElementById("login-error");
            const btn = document.getElementById("login-btn-el");

            if (!emailInput || !passwordInput) {
                errorMsg.innerText = "Vul a.u.b. alle velden in.";
                errorMsg.classList.add('visible');
                return;
            }

            try {
                btn.disabled = true;
                btn.innerText = "Bezig...";

                const { auth, signInWithEmailAndPassword } = await import('../site_js/core/firebase.js');
                await signInWithEmailAndPassword(auth, emailInput, passwordInput);

                // onAuthStateChanged will handle the UI transition
                errorMsg.classList.remove('visible');
            } catch (err) {
                console.error("Login failed:", err);
                errorMsg.innerText = "Inloggen mislukt. Controleer gegevens.";
                if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    errorMsg.innerText = "E-mail of wachtwoord onjuist.";
                }
                errorMsg.classList.add('visible');
                document.getElementById("admin-password").value = "";
            } finally {
                btn.disabled = false;
                btn.innerText = "Inloggen";
            }
        }

        async function logout() {
            try {
                const { auth, signOut } = await import('../site_js/core/firebase.js');
                await signOut(auth);
                // Auth observer handles the rest
            } catch (err) {
                console.error("Logout failed", err);
            }
        }

        // --- ACTIVITY LOGGING HELPER ---
        async function logActivity(action, details = '', bookingId = '') {
            if (!currentUser) return;
            try {
                const { db, collection, addDoc, serverTimestamp } = await import('../site_js/core/firebase.js');
                await addDoc(collection(db, "audit_logs"), {
                    timestamp: serverTimestamp(),
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    userName: currentUserName || currentUser.email.split('@')[0],
                    action: action,
                    details: details,
                    bookingId: bookingId
                });
                console.log(`Activity logged: ${action}`);
            } catch (err) {
                console.error("Failed to log activity:", err);
            }
        }

