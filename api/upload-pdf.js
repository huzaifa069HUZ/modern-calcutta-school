const { put } = require('@vercel/blob');

// Receives a raw PDF binary upload, stores in Vercel Blob, returns public URL
module.exports.config = { api: { bodyParser: false } };

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const admissionNo = req.headers['x-admission-no'] || 'unknown';
    const blobName = `students/pdfs/${admissionNo}-${Date.now()}.pdf`;

    try {
        const blob = await put(blobName, req, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: 'application/pdf',
        });

        return res.status(200).json({ success: true, url: blob.url });
    } catch (err) {
        console.error('PDF upload error:', err);
        return res.status(500).json({ error: 'Failed to upload PDF', details: err.message });
    }
};
