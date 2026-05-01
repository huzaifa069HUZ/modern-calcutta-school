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

    const { type, student, tc, students, examConfig } = req.body || {};

    if (!type || (type === 'admission' && !student) || (type === 'tc' && !tc) || (type === 'idcard-bulk' && !students) || (type === 'admit-card-bulk' && !students)) {
        return res.status(400).json({ error: 'Missing required fields for requested type' });
    }

    let browser;
    try {
        let html;
        if (type === 'tc') html = buildTcHtml(tc);
        else if (type === 'idcard-bulk') html = buildBulkIdCardsHtml(students);
        else if (type === 'admit-card-bulk') html = buildAdmitCardsHtml(students, examConfig);
        else html = buildAdmissionHtml(student);

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
        let name;
        if (type === 'tc') name = `students/pdfs/TC_${tc.studentName?.replace(/[^a-z0-9]/gi, '_')}_${tc.admissionNo}_${Date.now()}.pdf`;
        else if (type === 'idcard-bulk') name = `students/pdfs/ID_Cards_Bulk_${Date.now()}.pdf`;
        else if (type === 'admit-card-bulk') name = `students/pdfs/Admit_Cards_Bulk_${Date.now()}.pdf`;
        else name = `students/pdfs/${student.admissionNo}_${Date.now()}.pdf`;

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

function buildBulkIdCardsHtml(students) {
    if (!students || students.length === 0) return '';
    
    const cardsHtml = students.map(s => {
        const photoSrc = s.photoUrl || 'https://mcspatna.org/assets/transparent-logo.png';
        const dob = s.dob ? s.dob.split('-').reverse().join('/') : '—'; 
        
        return `
        <div class="card">
            <div class="bg-shape-1"></div>
            <div class="bg-shape-2"></div>
            
            <div class="header">
                <img class="logo" src="https://mcspatna.org/assets/transparent-logo.png" alt="Logo">
                <div class="phone-text">Mob: 8709861044<br>7677011133</div>
            </div>
            
            <div class="school-name">MODERN CALCUTTA SCHOOL</div>
            <div class="sub-name"><span>An English Medium Co-Educational School</span></div>
            
            <div class="trust-sect">
                <span class="run-by">Run and Managed by:</span> Shan and Nikhat Welfare Foundation<br>
                <span class="address-red">M.R. Colony, Phulwari Sharif, Patna-801505</span>
            </div>
            
            <div class="middle-section">
                <div class="adm-section">
                    <div class="adm-label">ADM NO</div>
                    <div class="adm-no">${s.admissionNo || '—'}</div>
                </div>
                <div class="photo-box">
                    <img src="${photoSrc}" alt="Photo">
                </div>
            </div>
            
            <div class="student-name">${(s.studentName || '').toUpperCase()}</div>
            
            <table class="details-table">
                <tr><td class="lbl">F. Name</td><td class="cln">:</td><td class="val">${s.fatherName || '—'}</td></tr>
                <tr>
                    <td class="lbl">Class</td><td class="cln">:</td>
                    <td class="val val-split">${s.currentClass || s.admissionClass || s.lastClass || '—'} <span>Roll No : ${s.rollNo || '—'}</span></td>
                </tr>
                <tr><td class="lbl">Mob</td><td class="cln">:</td><td class="val">${s.guardianName || '—'}</td></tr>
                <tr><td class="lbl">D.O.B.</td><td class="cln">:</td><td class="val">${dob}</td></tr>
                <tr><td class="lbl" style="vertical-align:top">Address</td><td class="cln" style="vertical-align:top">:</td><td class="val" style="line-height:1.1">${s.address || '—'}</td></tr>
            </table>
            
            <div class="footer">
                <div class="session">Session: 2026-27</div>
                <div class="signature">
                    <!-- Blank Space for actual signing -->
                    <div style="height: 15px;"></div>
                    <div>Principal Signature</div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Bulk ID Cards</title>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Dancing+Script:wght@700&family=Inter:wght@500;700;800&family=Great+Vibes&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: A4; margin: 0; }
        
        .page {
            width: 210mm;
            padding: 8mm 12mm;
            display: flex;
            flex-wrap: wrap;
            row-gap: 5mm;
            column-gap: 5mm;
            justify-content: flex-start;
            align-items: flex-start;
        }
        
        .card {
            width: 58mm; 
            height: 90mm; 
            border: 1px dashed #bbb; 
            position: relative;
            overflow: hidden;
            background: #fff;
            page-break-inside: avoid;
            font-family: 'Inter', sans-serif;
            color: #000;
        }
        
        /* Wavy Background */
        .card::before {
            content: ''; position: absolute;
            left: -15px; top: -10px;
            width: 40px; height: 120%;
            background: #00B2D6; border-right: 8px solid #6DD5ED;
            border-radius: 0 50% 50% 0; opacity: 0.15; z-index: 1;
        }
        .bg-shape-1 {
            position: absolute; left: -50px; top: -20px;
            width: 70px; height: 120%; background: #00B2D6;
            border-radius: 0 45% 45% 0 / 0 35% 35% 0; z-index: 1;
        }
        .bg-shape-2 {
            position: absolute; left: -20px; top: 0;
            width: 35px; height: 100%; background: #6DD5ED;
            border-radius: 0 50% 50% 0; opacity: 0.8; z-index: 2;
        }
        
        /* Ensure content stays above absolute background shapes */
        .header, .school-name, .sub-name, .trust-sect, .middle-section, .student-name, .details-table { 
            position: relative; z-index: 10; 
        }
        
        /* Header */
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 2mm 2mm 0 4mm; }
        .cin-text { font-size: 5px; color: #0096C7; font-weight: 800; max-width: 40px; line-height: 1.1; margin-top:2px; text-align: left;}
        .logo { width: 14mm; height: 14mm; object-fit: contain; margin-left:-2px; z-index:11; background:#fff; border-radius:50%; }
        .phone-text { font-size: 5px; color: #D62828; font-weight: 800; text-align: right; line-height: 1.1; margin-top:1px; }
        
        /* Typography */
        .school-name { text-align: center; font-family: 'Oswald', sans-serif; font-size: 14px; color: #023047; font-weight: 700; letter-spacing: -0.2px; transform: scaleY(1.2); margin-top: 3px; }
        .sub-name { text-align: center; margin-top: 0px; margin-bottom: 2px;}
        .sub-name span { background: #00B2D6; color: #fff; font-size: 5px; font-weight: 700; padding: 1px 4px; border-radius: 4px; display: inline-block; }
        
        .trust-sect { text-align: center; font-size: 5px; line-height: 1.2; margin-top: 0px; margin-bottom: 2px;}
        .run-by { font-family: 'Dancing Script', cursive; color: #D62828; font-size: 7px; }
        .address-red { color: #D62828; font-weight: 800; font-size: 5px; }
        
        /* Middle section */
        .middle-section { display: flex; justify-content: space-between; align-items: center; padding: 0 4mm 0 6mm; margin-top: 3px; }
        .adm-section { text-align: left; }
        .adm-label { font-size: 10px; font-weight: 800; color: #023047; }
        .adm-no { font-size: 9px; font-weight: 800; color: #D62828; margin-top:-1px;}
        .photo-box { width: 22mm; height: 26mm; border-radius: 6px; overflow: hidden; border: 1.5px solid #333; background: #f0f0f0; box-shadow: 2px 2px 4px rgba(0,0,0,0.1); }
        .photo-box img { width: 100%; height: 100%; object-fit: cover; }
        
        /* Details */
        .student-name { text-align: center; color: #D62828; font-family: 'Oswald', sans-serif; font-size: 11px; font-weight: 700; margin-top: 3px; letter-spacing: 0px; }
        .details-table { width: 100%; padding: 0 2mm 0 5mm; margin-top: 1px; border-collapse: collapse; }
        .details-table td { padding: 0.5px 0; font-size: 6px; font-weight: 700; color: #111; }
        .details-table .lbl { width: 12mm; }
        .details-table .cln { width: 2mm; text-align: center; }
        .details-table .val { width: auto; font-weight:800; }
        .val-split { display: flex; justify-content: space-between; padding-right: 2px !important; }
        
        /* Footer */
        .footer { display: flex; justify-content: space-between; align-items: flex-end; position: absolute; bottom: 2mm; left: 5mm; right: 2mm; }
        .session { font-size: 6px; font-weight: 800; padding-bottom:1mm; }
        .signature { text-align: center; }
        .sig-image { font-family: 'Great Vibes', cursive; font-size: 12px; color: #222; margin-bottom: -1px; transform: rotate(-5deg); }
        .signature div:last-child { font-size: 5px; font-weight: 700; color: #000; }
    </style>
</head>
<body>
    <div class="page">
        ${cardsHtml}
    </div>
</body>
</html>`;
}

// ─── Admit Cards Builder ───────────────────────────────────────────────────────
function buildAdmitCardsHtml(students, examConfig) {
    const examName   = (examConfig && examConfig.examName)   || 'Annual Examination 2026';
    const examTiming = (examConfig && examConfig.examTiming) || '08:00 AM to 11:00 AM';
    const schedule   = (examConfig && examConfig.schedule)   || [];
    const logoSrc    = 'https://mcspatna.org/assets/transparent-logo.png';
    const lbl = 'border:1px solid #000;padding:5px 8px;font-weight:700;font-size:10px;background:#f7f7f7;';
    const val = 'border:1px solid #000;padding:5px 8px;font-size:11px;';

    const dateHeaderCells = schedule.map(function(row) {
        return '<td style="' + lbl + 'text-align:center;">' +
               row.date + '<br><span style="font-weight:normal;font-size:8px;">' + row.day + '</span></td>';
    }).join('');

    const subjectCells = schedule.map(function(row) {
        return '<td style="' + lbl + 'text-align:center;font-weight:normal;">' + row.subject + '</td>';
    }).join('');

    const invigCells = schedule.map(function() {
        return '<td style="border:1px solid #000;padding:18px 3px;"></td>';
    }).join('');

    const cards = students.map(function(s) {
        var photoHtml = s.photoUrl
            ? '<img src="' + s.photoUrl + '" style="width:100%;height:100%;object-fit:cover;" crossorigin="anonymous">'
            : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:9px;">No Photo</div>';
        var cls = s.currentClass || s.admissionClass || s.lastClass || '—';
        var name = (s.studentName || '').toUpperCase();
        var father = s.fatherName || '—';
        var admNo = s.admissionNo || '—';
        var roll = s.rollNo || '—';

        return '<div style="width:98mm;height:140mm;float:left;margin:2mm 3mm;page-break-inside:avoid;box-sizing:border-box;overflow:hidden;">' +
          '<div style="width:210mm;padding:8mm;box-sizing:border-box;transform:scale(0.466);transform-origin:top left;">' +
          '<div style="border:2px solid #000;padding:14px 16px;background:#fff;">' +

          // Header
          '<div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid #000;padding-bottom:10px;">' +
          '<div><img src="' + logoSrc + '" style="width:68px;height:68px;object-fit:contain;" onerror="this.style.display=\'none\'"></div>' +
          '<div style="flex:1;text-align:center;">' +
          '<div style="font-size:21px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">MODERN CALCUTTA SCHOOL</div>' +
          '<div style="font-size:11px;margin:3px 0;">M.R. Colony, Phulwari Sharif, Patna - 801505</div>' +
          '<div style="font-size:11px;font-weight:700;margin-top:4px;">' + examName.toUpperCase() + '</div>' +
          '<div style="font-size:13px;font-weight:700;letter-spacing:2px;text-decoration:underline;">ADMIT CARD</div>' +
          '</div></div>' +

          // Student info table
          '<table style="width:100%;border-collapse:collapse;margin-top:14px;">' +
          '<tr>' +
          '<td style="' + lbl + 'width:20%;">Candidate\'s Full Name</td>' +
          '<td style="' + val + 'font-weight:700;" colspan="2">' + name + '</td>' +
          '<td rowspan="5" style="border:1px solid #000;width:78px;vertical-align:middle;text-align:center;padding:2px;">' +
          '<div style="width:72px;height:86px;overflow:hidden;background:#f5f5f5;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;">' + photoHtml + '</div></td>' +
          '<td rowspan="5" style="border:1px solid #000;text-align:center;vertical-align:bottom;padding:6px 4px;font-size:9px;font-weight:700;width:14%;">Candidate\'s<br>Signature</td>' +
          '</tr>' +
          '<tr><td style="' + lbl + '">Father\'s Name</td><td style="' + val + '" colspan="2">' + father + '</td></tr>' +
          '<tr><td style="' + lbl + '">Admission No.</td><td style="' + val + '" colspan="2">' + admNo + '</td></tr>' +
          '<tr><td style="' + lbl + '">Class</td><td style="' + val + 'width:12%;">' + cls + '</td>' +
          '<td style="' + val + '"><span style="font-weight:700;font-size:9px;">Roll No. &nbsp;</span>' + roll + '</td></tr>' +
          '<tr><td style="' + lbl + '">Exam Timing</td><td style="' + val + 'font-weight:700;text-align:center;" colspan="2">' + examTiming + '</td></tr>' +
          '</table>' +

          // Schedule table
          '<table style="width:100%;border-collapse:collapse;margin-top:-1px;">' +
          '<tr><td style="' + lbl + 'width:20%;vertical-align:middle;">Date of<br>Examination</td>' + dateHeaderCells + '</tr>' +
          '<tr><td style="' + lbl + '">Subject</td>' + subjectCells + '</tr>' +
          '<tr><td style="' + lbl + 'vertical-align:middle;">Sign. of<br>Invigilator</td>' + invigCells + '</tr>' +
          '</table>' +

          // Notes
          '<div style="margin-top:14px;font-size:10px;line-height:1.7;"><strong>Note:</strong>' +
          '<ul style="margin:4px 0 0 16px;">' +
          '<li>The students should come to the school on those days on which their examinations are to be held.</li>' +
          '<li>There will be no re-examination in the event of ABSENCE on account of any reason including MEDICAL. So, if the student misses any examination he/she will lose the marks of exam.</li>' +
          '<li>Parents/Guardians are required to guide their wards to study hard right from the beginning so that wards perform well in the examination.</li>' +
          '</ul></div>' +

          // Signatures
          '<div style="display:flex;justify-content:space-between;margin-top:28px;font-size:11px;font-weight:700;">' +
          '<div style="border-top:1.5px solid #000;width:148px;padding-top:5px;text-align:center;">Parent / Guardian</div>' +
          '<div style="border-top:1.5px solid #000;width:148px;padding-top:5px;text-align:center;">Class Teacher</div>' +
          '<div style="border-top:1.5px solid #000;width:148px;padding-top:5px;text-align:center;">Principal / Director</div>' +
          '</div>' +
          '</div></div></div>';
    }).join('');

    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
        '<title>' + examName + ' Admit Cards</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">' +
        '<style>* { box-sizing:border-box;margin:0;padding:0; } body { font-family:"Libre Baskerville","Times New Roman",serif;font-size:11px;color:#000;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact; } @page { size:A4;margin:0; }</style>' +
        '</head><body>' + cards + '</body></html>';
}
