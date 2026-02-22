// Helper: initialize Firebase Admin once
const admin = require('firebase-admin');

function getFirebase() {
    if (!admin.apps.length) {
        // Support BOTH naming conventions:
        // 1. Full names: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
        // 2. Short names (as shown in Vercel dashboard): project_id, client_email, private_key
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.project_id;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.client_email;
        const rawKey = process.env.FIREBASE_PRIVATE_KEY || process.env.private_key || '';
        const privateKey = rawKey.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !rawKey) {
            throw new Error(
                `Firebase env vars missing!\n` +
                `project_id: ${!!projectId}\n` +
                `client_email: ${!!clientEmail}\n` +
                `private_key: ${!!rawKey}`
            );
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }
    return admin.firestore();
}

module.exports = { getFirebase };
