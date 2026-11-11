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
                    
                    // Expose to window for modules
                    window.currentUser = currentUser;
                    window.currentUserRole = currentUserRole;
                    window.currentUserName = currentUserName;

                    // Load the shared staff directory for collaborative features such as team to-do's.
                    // Only non-sensitive fields are exposed to browser modules.
                    try {
                        const { db, collection, getDocs } = await import('../site_js/core/firebase.js');
                        const usersSnap = await getDocs(collection(db, 'users'));
                        window.allUsers = [];
                        usersSnap.forEach(userDoc => {
                            const userData = userDoc.data();
                            window.allUsers.push({
                                uid: userDoc.id,
                                displayName: userData.displayName || userData.email?.split('@')[0] || 'Medewerker',
                                role: userData.role === 'superuser' ? 'superuser' : 'user'
                            });
                        });

                        // Keep the current employee available even when the profile query is incomplete.
                        if (!window.allUsers.some(staffUser => staffUser.uid === currentUser.uid)) {
                            window.allUsers.push({
                                uid: currentUser.uid,
                                displayName: currentUserName || currentUser.email?.split('@')[0] || 'Medewerker',
                                role: currentUserRole
                            });
                        }

                        window.allUsers.sort((a, b) => a.displayName.localeCompare(b.displayName, 'nl'));
                    } catch (e) {
                        console.error("Could not fetch shared staff list:", e);
                        window.allUsers = [{
                            uid: currentUser.uid,
                            displayName: currentUserName || currentUser.email?.split('@')[0] || 'Medewerker',
                            role: currentUserRole
                        }];
                    }

                    showDashboard();
                } else {
                    console.log("No user is logged in.");
                    currentUser = null;
                    currentUserRole = 'user';
                    currentUserName = '';
                    
                    window.currentUser = null;
                    window.currentUserRole = 'user';
                    window.currentUserName = '';
                    window.allUsers = [];

                    const loginScreen = document.getElementById("login-screen");
                    const dashboardScreen = document.getElementById("dashboard-screen");

                    if (window.innerWidth <= 992) {
                        // Mobile: show login as overlay on top of dashboard
                        dashboardScreen.style.display = "block";
                        loginScreen.style.display = ""; // Clear inline style if any
                        loginScreen.classList.add('login-visible');
                        document.body.style.display = 'block';
                    } else {
                        // Desktop: hide dashboard, show login card as before
                        dashboardScreen.style.display = "none";
                        loginScreen.style.display = "block";
                        document.body.style.display = 'flex';
                    }
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

