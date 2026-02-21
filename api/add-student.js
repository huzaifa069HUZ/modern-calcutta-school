const { put } = require('@vercel/blob');
const Busboy = require('busboy');
const { getFirebase } = require('./_firebase');

// Disable default body parsing — we handle it via busboy
module.exports.config = { api: { bodyParser: false } };

function parseForm(req) {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: req.headers });
        const fields = {};
        let fileBuffer = null;
        let fileName = '';
        let fileMime = '';

        busboy.on('file', (fieldname, file, info) => {
            fileName = info.filename;
            fileMime = info.mimeType;
            const chunks = [];
            file.on('data', d => chunks.push(d));
            file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
        });

        busboy.on('field', (name, val) => { fields[name] = val; });
        busboy.on('finish', () => resolve({ fields, fileBuffer, fileName, fileMime }));
        busboy.on('error', reject);
        req.pipe(busboy);
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { fields, fileBuffer, fileName, fileMime } = await parseForm(req);

        // Validate required fields
        const required = ['studentName', 'admissionNo', 'admissionDate', 'gender', 'dob', 'fatherName', 'status', 'fees'];
        for (const key of required) {
            if (!fields[key] || !fields[key].trim()) {
                return res.status(400).json({ error: `Missing required field: ${key}` });
            }
        }

        const admissionNo = fields.admissionNo.trim().toUpperCase();
        const db = getFirebase();

        // Check for duplicate admission number
        const existing = await db.collection('students')
            .where('admissionNo', '==', admissionNo)
            .limit(1)
            .get();

        if (!existing.empty) {
            return res.status(409).json({ error: `Admission number ${admissionNo} already exists` });
        }

        // Upload photo to Vercel Blob
        let photoUrl = '';
        if (fileBuffer && fileBuffer.length > 0) {
            const blobName = `students/photos/${admissionNo}-${Date.now()}.jpg`;
            const blob = await put(blobName, fileBuffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
                contentType: fileMime || 'image/jpeg',
            });
            photoUrl = blob.url;
        }

        // Build student record
        const student = {
            studentName: fields.studentName.trim(),
            admissionNo,
            admissionDate: fields.admissionDate.trim(),
            gender: fields.gender.trim(),
            dob: fields.dob.trim(),
            aadharNo: (fields.aadharNo || '').trim(),
            fatherName: fields.fatherName.trim(),
            motherName: (fields.motherName || '').trim(),
            guardianName: (fields.guardianName || '').trim(),
            address: (fields.address || '').trim(),
            status: fields.status.trim(),       // 'Active' | 'Deactive'
            fees: fields.fees.trim(),           // 'No Dues' | 'Dues'
            tcNo: (fields.tcNo || '').trim(),
            photoUrl,
            pdfUrl: '',   // Will be set later by client after PDF upload
            createdAt: new Date().toISOString(),
        };

        // Save to Firestore
        const docRef = await db.collection('students').add(student);
        student.id = docRef.id;

        return res.status(200).json({ success: true, student });
    } catch (err) {
        console.error('add-student error:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};
