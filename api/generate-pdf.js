const { put } = require('@vercel/blob');

// Lazy-load heavy deps to avoid cold-start issues
let chromium, puppeteer;

async function getBrowser() {
    if (!chromium) chromium = require('@sparticuz/chromium');
    if (!puppeteer) puppeteer = require('puppeteer-core');

    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    });
    return browser;
}

// Vercel function config — PDF generation needs more resources
module.exports.config = {
    api: { bodyParser: { sizeLimit: '2mb' } },
};

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { type, student, tc } = req.body || {};

    if (!type || (type === 'admission' && !student) || (type === 'tc' && !tc)) {
        return res.status(400).json({ error: 'Missing required fields: type + student/tc data' });
    }

    let browser;
    try {
        const html = type === 'tc'
            ? buildTcHtml(tc)
            : buildAdmissionHtml(student);

        browser = await getBrowser();
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });

        // A4 at 96 DPI → 794 × 1123 px  (browser units)
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
            preferCSSPageSize: false,
        });

        await browser.close();
        browser = null;

        // Upload to Vercel Blob
        const name = type === 'tc'
            ? `students/pdfs/TC_${tc.studentName?.replace(/[^a-z0-9]/gi, '_')}_${tc.admissionNo}_${Date.now()}.pdf`
            : `students/pdfs/${student.admissionNo}_${Date.now()}.pdf`;

        const blob = await put(name, pdfBuffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: 'application/pdf',
        });

        return res.status(200).json({ success: true, url: blob.url });
    } catch (err) {
        console.error('[generate-pdf] Error:', err);
        if (browser) await browser.close().catch(() => {});
        return res.status(500).json({ error: 'PDF generation failed', details: err.message });
    }
};

// ─── HTML Builders ────────────────────────────────────────────────────────────

function sharedFonts() {
    return `
        <link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                font-family: 'Libre Baskerville', 'Times New Roman', serif;
                font-size: 13px;
                color: #000;
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            @page { size: A4; margin: 0; }
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        </style>
    `;
}

function buildAdmissionHtml(s) {
    const formatDate = (v) => {
        if (!v) return '—';
        try {
            return new Date(v + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch { return v; }
    };

    const rows = [
        ['Student Name', s.studentName],
        ['Admission Number', s.admissionNo],
        ['Admission Date', formatDate(s.admissionDate)],
        ['Gender', s.gender],
        ['Date of Birth', formatDate(s.dob)],
        ["Father's Name", s.fatherName],
        ["Mother's Name", s.motherName],
        ["Guardian's Name", s.guardianName],
        ['Aadhar Number', s.aadharNo],
        ['Address', s.address],
        ['T.C. Number', s.tcNo],
        ['Admission Status', s.status],
        ['Fees Status', s.fees === 'Dues' && s.duesAmount ? `Dues (₹${s.duesAmount} Left)` : s.fees],
    ].filter(([, v]) => v);

    const tableRows = rows.map(([label, val], i) => `
        <tr style="background:${i % 2 === 0 ? '#f8f8f8' : '#fff'}">
            <td style="border:1px solid #333;padding:7px 12px;font-weight:700;width:38%;background:#efefef;font-size:12px;">${label}</td>
            <td style="border:1px solid #333;padding:7px 12px;font-size:13px;">${val}</td>
        </tr>
    `).join('');

    const photoHtml = s.photoUrl
        ? `<img src="${s.photoUrl}" style="width:100%;height:100%;object-fit:cover;" crossorigin="anonymous">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;font-size:10px;text-align:center;">No Photo</div>`;

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admission Certificate — ${s.studentName || ''}</title>
    ${sharedFonts()}
    <style>
        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 18mm 16mm;
            background: #fff;
        }
        .outer-border {
            border: 3px double #000;
            padding: 20px 24px;
            min-height: 250mm;
            position: relative;
        }
        .inner-border {
            border: 1px solid #555;
            padding: 16px 20px;
            min-height: 240mm;
        }
        .school-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 16px;
            margin-bottom: 18px;
            position: relative;
        }
        .school-name {
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-family: 'IM Fell English', serif;
            margin-bottom: 4px;
        }
        .school-tag {
            font-size: 12px;
            color: #333;
            font-style: italic;
            font-weight: 700;
            margin-bottom: 3px;
        }
        .school-addr { font-size: 11px; color: #444; margin-bottom: 2px; }
        .doc-title {
            text-align: center;
            font-size: 17px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            text-decoration: underline;
            margin: 14px 0 20px;
            font-family: 'IM Fell English', serif;
        }
        .photo-box {
            position: absolute;
            right: 0;
            top: 0;
            width: 100px;
            height: 120px;
            border: 2px solid #000;
            overflow: hidden;
            background: #f0f0f0;
        }
        table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
        .declaration {
            border: 1px solid #333;
            padding: 12px 16px;
            font-size: 12px;
            line-height: 1.75;
            margin-bottom: 28px;
            background: #fafafa;
        }
        .sig-row {
            display: flex;
            justify-content: space-between;
            margin-top: 44px;
            font-size: 12px;
            font-weight: 700;
        }
        .sig-line {
            border-top: 1.5px solid #000;
            width: 160px;
            padding-top: 6px;
            text-align: center;
        }
        .footer-note {
            font-size: 10px;
            color: #666;
            text-align: center;
            margin-top: 24px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        .verify-note {
            font-size: 9px;
            color: #1a3a5c;
            text-align: center;
            margin-top: 6px;
            font-weight: 700;
            letter-spacing: 0.4px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
<div class="page">
    <div class="outer-border">
        <div class="inner-border">

            <div class="school-header">
                <div class="photo-box">${photoHtml}</div>
                <p class="school-name" style="margin-right:110px;">MODERN CALCUTTA SCHOOL</p>
                <p class="school-tag" style="margin-right:110px;">Foundation of Ilm-o-Adab</p>
                <p class="school-addr" style="margin-right:110px;">MR Colony, Phulwari Sharif, Patna, Bihar – 801505</p>
                <p class="school-addr" style="margin-right:110px;font-weight:700;">📞 +91 87098 61044 &nbsp;|&nbsp; mcs.patna2019@gmail.com</p>
            </div>

            <h2 class="doc-title">Admission Certificate</h2>

            <table>
                <tbody>${tableRows}</tbody>
            </table>

            <div class="declaration">
                <strong>Declaration:</strong> This is to certify that the above-named student has been duly admitted to
                Modern Calcutta School, Phulwarisharif, Patna. The information recorded above is correct to the best of
                our knowledge.
            </div>

            <div class="sig-row">
                <div class="sig-line">Parent / Guardian</div>
                <div class="sig-line">Class Teacher</div>
                <div class="sig-line">Principal / Director</div>
            </div>

            <p class="footer-note">Generated on ${today} &middot; Modern Calcutta School Official Document</p>
            <p class="verify-note">The authenticity of this document can be verified through our portal: mcspatna.org/student-portal</p>

        </div>
    </div>
</div>
</body>
</html>`;
}

function buildTcHtml(tc) {
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const rows = [
        [1, 'Name of Student', `<strong>${tc.studentName || ''}</strong>`],
        [2, "Father's / Guardian Name", `<strong>${tc.fatherName || ''}</strong>`],
        [3, "Mother's Name", `<strong>${tc.motherName || ''}</strong>`],
        [4, 'Nationality', tc.nationality || 'Indian'],
        [5, 'Whether the candidate belong to SC/ST/OBC', tc.category || 'No'],
        [6, 'Date of First admission in the school with class', `<strong>${tc.admissionDate || '—'}</strong>&nbsp;&nbsp;&nbsp;&nbsp;<strong>${tc.admissionClass || '—'}</strong>`],
        [7, 'Date of birth according to admission Register<br><small>(in figure &amp; words)</small>',
            `<strong>${tc.dob || '—'}</strong>${tc.dobWords ? '<br><small>' + tc.dobWords + '</small>' : ''}`],
        [8, 'Class in which the pupil last studied', `<strong>${tc.lastClass || '—'}</strong>`],
        [9, 'Whether failed, If so once/twice in the same class', tc.failed || 'No'],
        [10, 'Whether qualified for promotion to the higher', tc.promotion || 'Yes'],
        [11, 'Any fee concession availed of : if so, the nature of such', tc.feeConcession || 'No'],
        [12, 'General Conduct', tc.conduct || 'Good'],
        [13, 'Date of application for certificate', tc.appDate || today],
        [14, 'Date of issue of certificate', tc.issueDate || today],
        [15, 'Reasons for leaving the school', tc.reason || 'Admission in other School'],
        [16, 'Any other remarks', tc.remarks || 'No'],
    ];

    const tableRows = rows.map(([no, label, val]) => `
        <tr>
            <td style="border:1px solid #1a3a5c;padding:7px 10px;width:65%;font-size:12px;">
                <span style="color:#1a3a5c;font-weight:500;">${no}.&nbsp;&nbsp;${label}</span>
            </td>
            <td style="border:1px solid #1a3a5c;padding:7px 10px;text-align:center;width:4%;color:#1a3a5c;font-weight:700;font-size:13px;">:</td>
            <td style="border:1px solid #1a3a5c;padding:7px 10px;font-size:13px;">${val}</td>
        </tr>
    `).join('');

    const photoHtml = tc.photoUrl
        ? `<img src="${tc.photoUrl}" style="width:100%;height:100%;object-fit:cover;" crossorigin="anonymous">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;font-size:10px;text-align:center;">Photo</div>`;

    const logoSrc = 'https://mcspatna.org/assets/transparent-logo.png';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Transfer Certificate — ${tc.studentName || ''}</title>
    ${sharedFonts()}
    <style>
        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 14mm 16mm;
            background: #fff;
        }
        .outer-border {
            border: 2px solid #1a3a5c;
            padding: 20px 24px;
        }
        .tc-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            border-bottom: 2.5px solid #1a3a5c;
            padding-bottom: 14px;
            margin-bottom: 14px;
            gap: 12px;
        }
        .photo-col {
            width: 100px;
            height: 120px;
            border: 2px solid #555;
            overflow: hidden;
            background: #f0f0f0;
            flex-shrink: 0;
        }
        .school-col { flex: 1; text-align: center; }
        .logo-col {
            width: 100px;
            height: 100px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .gov-label { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #666; margin-bottom: 5px; }
        .school-name { font-size: 22px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #1a3a5c; font-family: 'IM Fell English', serif; line-height: 1.2; }
        .school-tag { font-size: 12px; color: #444; margin-top: 5px; font-style: italic; font-weight: 700; }
        .school-addr { font-size: 11px; color: #333; margin-top: 3px; }
        .title-box {
            text-align: center;
            margin: 10px 0 8px;
        }
        .title-box span {
            display: inline-block;
            border: 2px solid #1a3a5c;
            padding: 5px 32px;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-family: 'IM Fell English', serif;
        }
        .tc-meta {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            font-weight: 700;
            margin: 14px 0 18px;
            color: #1a3a5c;
        }
        table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
        .sig-row {
            display: flex;
            justify-content: space-between;
            margin-top: 52px;
            font-size: 12px;
            font-weight: 700;
        }
        .sig-line {
            border-top: 1.5px solid #000;
            width: 155px;
            padding-top: 6px;
            text-align: center;
        }
        .footer-note {
            font-size: 10px;
            color: #666;
            text-align: center;
            margin-top: 20px;
            border-top: 1px solid #ccc;
            padding-top: 8px;
        }
        .verify-note {
            font-size: 9px;
            color: #1a3a5c;
            text-align: center;
            margin-top: 5px;
            font-weight: 700;
            letter-spacing: 0.4px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
<div class="page">
    <div class="outer-border">

        <div class="tc-header">
            <div class="photo-col">${photoHtml}</div>
            <div class="school-col">
                <p class="gov-label">Government Recognised</p>
                <p class="school-name">MODERN CALCUTTA SCHOOL</p>
                <p class="school-tag">Foundation of Ilm-o-Adab</p>
                <p class="school-addr">MR Colony, Phulwari Sharif, Patna, Bihar – 801505</p>
                <p class="school-addr" style="font-weight:700;">📞 +91 87098 61044 &nbsp;|&nbsp; mcs.patna2019@gmail.com</p>
            </div>
            <div class="logo-col">
                <img src="${logoSrc}" alt="MCS Logo" style="width:90px;height:90px;object-fit:contain;" onerror="this.style.display='none'">
            </div>
        </div>

        <div class="title-box"><span>Transfer Certificate</span></div>

        <div class="tc-meta">
            <span>T.C No : &nbsp;${tc.tcNo || '—'}</span>
            <span>Admission No : &nbsp;${tc.admissionNo || '—'}</span>
        </div>

        <table>
            <tbody>${tableRows}</tbody>
        </table>

        <div class="sig-row">
            <div class="sig-line">Parent / Guardian</div>
            <div class="sig-line">Class Teacher</div>
            <div class="sig-line">Principal / Director</div>
        </div>

        <p class="footer-note">Generated on ${today} &middot; Modern Calcutta School Official Document</p>
        <p class="verify-note">The authenticity of this document can be verified through our portal: mcspatna.org/student-portal</p>

    </div>
</div>
</body>
</html>`;
}
