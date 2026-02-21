const { getFirebase } = require('./_firebase');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const admissionNo = req.query.admissionNo;
    if (!admissionNo) return res.status(400).json({ error: 'admissionNo query param is required' });

    try {
        const db = getFirebase();
        const snap = await db.collection('students')
            .where('admissionNo', '==', admissionNo.trim().toUpperCase())
            .limit(1)
            .get();

        if (snap.empty) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const data = snap.docs[0].data();
        return res.status(200).json({ success: true, student: data });
    } catch (err) {
        console.error('Firestore fetch error:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};
