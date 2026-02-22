const { getFirebase } = require('./_firebase');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const db = getFirebase();
        const snap = await db.collection('students')
            .orderBy('createdAt', 'desc')
            .get();

        const students = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ success: true, students });
    } catch (err) {
        console.error('[students-list] Error:', err);
        return res.status(500).json({ error: 'Failed to fetch students', details: err.message });
    }
};
