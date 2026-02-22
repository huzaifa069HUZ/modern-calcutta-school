const { put } = require('@vercel/blob');
const Busboy = require('busboy');
const { getFirebase } = require('./_firebase');

// Disable default body parsing — we handle it via busboy
module.exports.config = { api: { bodyParser: false } };

function parseForm(req) {
    return new Promise((resolve, reject) => {
        let busboy;
        try {
            busboy = Busboy({ headers: req.headers });
        } catch (e) {
            return reject(new Error('Failed to initialise multipart parser: ' + e.message));
        }

        const fields = {};
        let fileBuffer = null;
        let fileName = '';
        let fileMime = '';

        busboy.on('file', (fieldname, file, info) => {
            // info may be an object (busboy v1) or individual args (busboy v0)
            const filename = (info && info.filename) ? info.filename : (info || '');
            const mimeType = (info && info.mimeType) ? info.mimeType : (arguments[3] || 'image/jpeg');
            fileName = filename;
            fileMime = mimeType;
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

        // Debug log to help trace issues
        console.log('[add-student] Received fields:', Object.keys(fields));
        console.log('[add-student] Photo received:', fileBuffer ? `${fileBuffer.length} bytes` : 'none');

        // Validate required fields
        const required = ['studentName', 'admissionNo', 'admissionDate', 'gender', 'dob', 'fatherName', 'status', 'fees'];
        for (const key of required) {
            if (!fields[key] || !fields[key].trim()) {
                return res.status(400).json({ error: `Missing required field: ${key}` });
            }
        }

        // Check required env vars — support both naming styles
        const hasFirebase =
            (process.env.FIREBASE_PROJECT_ID || process.env.project_id) &&
            (process.env.FIREBASE_CLIENT_EMAIL || process.env.client_email) &&
            (process.env.FIREBASE_PRIVATE_KEY || process.env.private_key);

        if (!hasFirebase) {
            console.error('[add-student] Missing Firebase env vars!');
            console.error('project_id:', !!(process.env.FIREBASE_PROJECT_ID || process.env.project_id));
            console.error('client_email:', !!(process.env.FIREBASE_CLIENT_EMAIL || process.env.client_email));
            console.error('private_key:', !!(process.env.FIREBASE_PRIVATE_KEY || process.env.private_key));
            return res.status(500).json({ error: 'Server configuration error: Firebase env vars missing. Check Vercel environment settings.' });
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

        // Upload photo to Vercel Blob (if provided)
        let photoUrl = '';
        if (fileBuffer && fileBuffer.length > 0) {
            if (!process.env.BLOB_READ_WRITE_TOKEN) {
                console.warn('[add-student] BLOB_READ_WRITE_TOKEN missing — skipping photo upload');
            } else {
                try {
                    const blobName = `students/photos/${admissionNo}-${Date.now()}.jpg`;
                    const blob = await put(blobName, fileBuffer, {
                        access: 'public',
                        token: process.env.BLOB_READ_WRITE_TOKEN,
                        contentType: fileMime || 'image/jpeg',
                    });
                    photoUrl = blob.url;
                    console.log('[add-student] Photo uploaded:', photoUrl);
                } catch (blobErr) {
                    console.error('[add-student] Blob upload failed (non-fatal):', blobErr.message);
                    // Continue without photo — don't block student creation
                }
            }
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
            pdfUrl: '',
            createdAt: new Date().toISOString(),
        };

        // Save to Firestore
        const docRef = await db.collection('students').add(student);
        student.id = docRef.id;
        console.log('[add-student] Saved to Firestore with ID:', docRef.id);

        return res.status(200).json({ success: true, student });
    } catch (err) {
        console.error('[add-student] Unhandled error:', err);
        return res.status(500).json({
            error: 'Internal server error',
            details: err.message,
            hint: 'Check Vercel logs and ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and BLOB_READ_WRITE_TOKEN are set in Vercel Environment Variables.'
        });
    }
};
