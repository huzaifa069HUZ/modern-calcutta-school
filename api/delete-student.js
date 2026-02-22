const { getFirebase } = require('./_firebase');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const body = req.body || await new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => resolve(JSON.parse(data || '{}')));
        });

        const { studentId } = body;
        if (!studentId) return res.status(400).json({ error: 'Missing studentId' });

        const db = getFirebase();
        await db.collection('students').doc(studentId).delete();

        console.log('[delete-student] Deleted student:', studentId);
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('[delete-student] Error:', err);
        return res.status(500).json({ error: 'Failed to delete student', details: err.message });
    }
};
