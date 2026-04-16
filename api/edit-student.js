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

        console.log('[edit-student] Received fields:', Object.keys(fields));
        console.log('[edit-student] Photo received:', fileBuffer ? `${fileBuffer.length} bytes` : 'none');

        const { studentId, ...studentFields } = fields;

        if (!studentId) {
            return res.status(400).json({ error: 'Missing required field: studentId' });
        }

        // Validate required fields for update (optional depending on UX, but standard requires everything as we replace)
        const required = ['studentName', 'admissionNo', 'admissionDate', 'gender', 'dob', 'fatherName', 'status', 'fees'];
        for (const key of required) {
            if (!fields[key] || !fields[key].trim()) {
                return res.status(400).json({ error: `Missing required field: ${key}` });
            }
        }

        const hasFirebase =
            (process.env.FIREBASE_PROJECT_ID || process.env.project_id) &&
            (process.env.FIREBASE_CLIENT_EMAIL || process.env.client_email) &&
            (process.env.FIREBASE_PRIVATE_KEY || process.env.private_key);

        if (!hasFirebase) {
            return res.status(500).json({ error: 'Server configuration error: Firebase env vars missing.' });
        }

        const db = getFirebase();
        const docRef = db.collection('students').doc(studentId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Student record not found.' });
        }
        
        const existingData = docSnap.data();

        const admissionNo = fields.admissionNo.trim().toUpperCase();

        // Check for duplicate admission number if the number has changed
        if (admissionNo !== existingData.admissionNo) {
            const existing = await db.collection('students')
                .where('admissionNo', '==', admissionNo)
                .limit(1)
                .get();

            if (!existing.empty) {
                return res.status(409).json({ error: `Admission number ${admissionNo} already exists` });
            }
        }

        // Upload new photo to Vercel Blob (if provided)
        let photoUrl = existingData.photoUrl || '';
        if (fileBuffer && fileBuffer.length > 0) {
            if (!process.env.BLOB_READ_WRITE_TOKEN) {
                console.warn('[edit-student] BLOB_READ_WRITE_TOKEN missing — skipping photo upload');
            } else {
                try {
                    const blobName = `students/photos/${admissionNo}-${Date.now()}.jpg`;
                    const blob = await put(blobName, fileBuffer, {
                        access: 'public',
                        token: process.env.BLOB_READ_WRITE_TOKEN,
                        contentType: fileMime || 'image/jpeg',
                    });
                    photoUrl = blob.url;
                    console.log('[edit-student] Photo uploaded/updated:', photoUrl);
                } catch (blobErr) {
                    console.error('[edit-student] Blob upload failed (non-fatal):', blobErr.message);
                }
            }
        }

        // Build student record for update
        const student = {
            studentName: fields.studentName.trim(),
            admissionNo,
            admissionDate: fields.admissionDate.trim(),
            gender: fields.gender.trim(),
            dob: fields.dob.trim(),
            admissionClass: (fields.admissionClass || '').trim(),
            lastClass: (fields.lastClass || '').trim(),
            rollNo: (fields.rollNo || '').trim(),
            category: (fields.category || '').trim(),
            aadharNo: (fields.aadharNo || '').trim(),
            fatherName: fields.fatherName.trim(),
            motherName: (fields.motherName || '').trim(),
            guardianName: (fields.guardianName || '').trim(),
            address: (fields.address || '').trim(),
            status: fields.status.trim(),
            fees: fields.fees.trim(),
            duesAmount: (fields.duesAmount || '').trim(),
            tcNo: (fields.tcNo || '').trim(),
            photoUrl,
            pdfUrl: existingData.pdfUrl || '', // Make sure we carry forward the pdfUrl if it's there
            updatedAt: new Date().toISOString(),
        };

        // Update in Firestore
        await docRef.update(student);
        console.log('[edit-student] Updated Firestore doc:', studentId);

        // Include existingData so we can use existing ID or other properties if necessary
        return res.status(200).json({ success: true, student: { id: studentId, ...existingData, ...student }});
    } catch (err) {
        console.error('[edit-student] Unhandled error:', err);
        return res.status(500).json({
            error: 'Internal server error',
            details: err.message
        });
    }
};
