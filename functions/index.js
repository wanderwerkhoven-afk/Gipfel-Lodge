const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// 1. Nieuwe Boeking Trigger
exports.onNewBooking = functions.firestore
    .document('bookings/{bookingId}')
    .onCreate(async (snap, context) => {
        const bookingData = snap.data();
        
        try {
            // Haal alle users op die notificaties voor nieuwe boekingen aan hebben staan
            const usersSnapshot = await db.collection('users')
                .where('notification_preferences.newBooking', '==', true)
                .get();
                
            if (usersSnapshot.empty) {
                console.log('Geen gebruikers gevonden met newBooking === true.');
                return null;
            }

            const tokens = [];
            const userTokensMap = new Map();

            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.fcmTokens && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
                    userData.fcmTokens.forEach(token => {
                        tokens.push(token);
                        userTokensMap.set(token, doc.id);
                    });
                }
            });

            if (tokens.length === 0) {
                console.log('Geen actieve FCM tokens gevonden bij de doelgroep.');
                return null;
            }

            const payload = {
                notification: {
                    title: 'Nieuwe boeking binnen',
                    body: `Er is een nieuwe aanvraag ontvangen voor Gipfel Lodge.`,
                },
                data: {
                    type: 'new_booking',
                    bookingId: context.params.bookingId
                }
            };

            const response = await admin.messaging().sendEachForMulticast({
                tokens: tokens,
                ...payload
            });

            console.log(`Succesvol verzonden: ${response.successCount}, Gefaald: ${response.failureCount}`);
            
            // Verwijder ongeldige tokens (optioneel, maar goed voor onderhoud)
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(tokens[idx]);
                    }
                });
                console.log('Gefaalde tokens:', failedTokens);
            }

            return null;
        } catch (error) {
            console.error('Fout bij verzenden onNewBooking push:', error);
            return null;
        }
    });

// 2. Nieuwe To-Do Trigger
exports.onNewTodo = functions.firestore
    .document('todos/{todoId}')
    .onCreate(async (snap, context) => {
        const todoData = snap.data();
        const assignedUserId = todoData.assignedUserId;

        if (!assignedUserId) {
            console.log('Geen assignedUserId voor deze todo. Geen push gestuurd.');
            return null;
        }

        try {
            const userDoc = await db.collection('users').doc(assignedUserId).get();
            if (!userDoc.exists) {
                console.log('Assigned user bestaat niet.');
                return null;
            }

            const userData = userDoc.data();
            
            // Check preference and tokens
            if (userData.notification_preferences && userData.notification_preferences.newTodo === true) {
                const tokens = userData.fcmTokens || [];
                if (tokens.length > 0) {
                    const payload = {
                        notification: {
                            title: 'Nieuwe to-do',
                            body: 'Er is een nieuwe taak aan jou toegewezen.',
                        },
                        data: {
                            type: 'new_todo',
                            todoId: context.params.todoId
                        }
                    };

                    const response = await admin.messaging().sendEachForMulticast({
                        tokens: tokens,
                        ...payload
                    });
                    console.log(`To-do push gestuurd naar ${assignedUserId}: ${response.successCount} gelukt.`);
                }
            }
            return null;
        } catch (error) {
            console.error('Fout bij verzenden onNewTodo push:', error);
            return null;
        }
    });

// 3. Handmatige Push Callable
exports.sendCustomPushNotification = functions.https.onCall(async (data, context) => {
    // Beveiliging: Check of auth is meegegeven
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Je moet ingelogd zijn.');
    }

    // Beveiliging: Check of user een superuser is
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'superuser') {
        throw new functions.https.HttpsError('permission-denied', 'Alleen superusers mogen custom push notificaties sturen.');
    }

    const { target, targetIds, title, body } = data; // target kan 'all', 'selected' zijn. targetIds array.

    try {
        let tokens = [];

        if (target === 'all') {
            const usersSnap = await db.collection('users').get();
            usersSnap.forEach(doc => {
                const fcm = doc.data().fcmTokens;
                if (fcm && Array.isArray(fcm)) {
                    tokens.push(...fcm);
                }
            });
        } else if (target === 'selected' && Array.isArray(targetIds)) {
            for (const uid of targetIds) {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) {
                    const fcm = userDoc.data().fcmTokens;
                    if (fcm && Array.isArray(fcm)) {
                        tokens.push(...fcm);
                    }
                }
            }
        }

        if (tokens.length === 0) {
            return { success: false, message: 'Geen geldige tokens gevonden voor de geselecteerde doelgroep.' };
        }

        const payload = {
            notification: {
                title: title || 'Bericht van Gipfel Lodge',
                body: body || '',
            },
            data: {
                type: 'custom_push'
            }
        };

        const response = await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            ...payload
        });

        return { success: true, successCount: response.successCount, failureCount: response.failureCount };
    } catch (error) {
        console.error('Fout bij sendCustomPushNotification:', error);
        throw new functions.https.HttpsError('internal', 'Fout bij het versturen van de push.');
    }
});

// 4. To-Do Reminder Callable
exports.sendTodoReminder = functions.https.onCall(async (data, context) => {
    // Beveiliging: Check of auth is meegegeven
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Je moet ingelogd zijn.');
    }

    // Beveiliging: Check of user een superuser is
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'superuser') {
        throw new functions.https.HttpsError('permission-denied', 'Alleen superusers mogen reminders sturen.');
    }

    const { todoId } = data;
    if (!todoId) {
        throw new functions.https.HttpsError('invalid-argument', 'todoId is verplicht.');
    }

    try {
        const todoDoc = await db.collection('todos').doc(todoId).get();
        if (!todoDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'To-do niet gevonden.');
        }

        const assignedUserId = todoDoc.data().assignedUserId;
        if (!assignedUserId) {
            return { success: false, message: 'Deze to-do heeft geen toegewezen gebruiker.' };
        }

        const userDoc = await db.collection('users').doc(assignedUserId).get();
        if (!userDoc.exists) {
            return { success: false, message: 'Toegewezen gebruiker niet gevonden in de database.' };
        }

        const tokens = userDoc.data().fcmTokens || [];
        if (tokens.length === 0) {
            return { success: false, message: 'Deze gebruiker heeft geen actieve push tokens.' };
        }

        const payload = {
            notification: {
                title: 'To-do Reminder',
                body: `Vergeet niet: ${todoDoc.data().title || 'Je hebt een openstaande taak.'}`,
            },
            data: {
                type: 'todo_reminder',
                todoId: todoId
            }
        };

        const response = await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            ...payload
        });

        return { success: true, successCount: response.successCount };
    } catch (error) {
        console.error('Fout bij sendTodoReminder:', error);
        throw new functions.https.HttpsError('internal', 'Fout bij het versturen van de reminder.');
    }
});
