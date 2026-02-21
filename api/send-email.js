const nodemailer = require('nodemailer');

const SCHOOL_EMAIL_1 = 'moderncalcuttaschoolpatna@gmail.com';
const SCHOOL_EMAIL_2 = 'mcs.patna2019@gmail.com';

// HTML template for school notification email
function buildSchoolEmail(data) {
    const { formType, studentName, parentName, grade, phone, email, message } = data;
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{font-family:'Segoe UI',sans-serif;background:#F6F1E8;margin:0;padding:0;}
  .wrapper{max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
  .header{background:linear-gradient(135deg,#0F3D3E,#1a5f61);padding:32px 40px;text-align:center;}
  .header h1{color:#C6A75E;margin:0;font-size:22px;letter-spacing:0.1em;text-transform:uppercase;}
  .header p{color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:12px;letter-spacing:0.2em;}
  .body{padding:32px 40px;}
  .badge{display:inline-block;background:#C6A75E;color:#0F3D3E;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;padding:4px 12px;border-radius:99px;margin-bottom:20px;}
  .field{margin-bottom:16px;border-bottom:1px solid #f0ebe0;padding-bottom:16px;}
  .field:last-of-type{border-bottom:none;}
  .label{font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#9e8c6a;font-weight:700;margin-bottom:4px;}
  .value{font-size:15px;color:#0F3D3E;font-weight:600;}
  .footer{background:#0F3D3E;padding:20px 40px;text-align:center;}
  .footer p{color:rgba(255,255,255,0.4);font-size:11px;margin:0;}
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>New ${formType === 'inquiry' ? 'Inquiry' : 'Admission Enquiry'}</h1>
    <p>Modern Calcutta School — Admissions</p>
  </div>
  <div class="body">
    <span class="badge">${formType === 'inquiry' ? 'Homepage Inquiry' : 'Admissions Page'}</span>
    <div class="field"><div class="label">Student Name</div><div class="value">${studentName || '—'}</div></div>
    <div class="field"><div class="label">Parent / Guardian</div><div class="value">${parentName || '—'}</div></div>
    <div class="field"><div class="label">Grade Applying For</div><div class="value">${grade || '—'}</div></div>
    <div class="field"><div class="label">Phone Number</div><div class="value">${phone || '—'}</div></div>
    <div class="field"><div class="label">Email</div><div class="value">${email || 'Not provided'}</div></div>
    ${message ? `<div class="field"><div class="label">Message</div><div class="value">${message}</div></div>` : ''}
  </div>
  <div class="footer"><p>Modern Calcutta School · Phulwari Sharif, Patna · Bihar</p></div>
</div>
</body></html>`;
}

// HTML template for parent confirmation email
function buildParentEmail(data) {
    const { studentName, parentName, grade } = data;
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{font-family:'Segoe UI',sans-serif;background:#F6F1E8;margin:0;padding:0;}
  .wrapper{max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
  .header{background:linear-gradient(135deg,#0F3D3E,#1a5f61);padding:32px 40px;text-align:center;}
  .header h1{color:#C6A75E;margin:0;font-size:22px;letter-spacing:0.05em;}
  .header p{color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:12px;}
  .body{padding:36px 40px;line-height:1.8;}
  .body h2{color:#0F3D3E;font-size:20px;margin-bottom:8px;}
  .body p{color:#555;font-size:14px;margin-bottom:16px;}
  .highlight{background:#F6F1E8;border-left:4px solid #C6A75E;padding:12px 16px;border-radius:0 8px 8px 0;color:#0F3D3E;font-weight:600;margin:20px 0;}
  .footer{background:#0F3D3E;padding:20px 40px;text-align:center;}
  .footer p{color:rgba(255,255,255,0.4);font-size:11px;margin:0;}
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>We've received your enquiry! ✨</h1>
    <p>Modern Calcutta School · Phulwari Sharif, Patna</p>
  </div>
  <div class="body">
    <h2>As-salamu alaykum, ${parentName || 'Dear Parent'}</h2>
    <p>Thank you for your interest in enrolling <strong>${studentName || 'your child'}</strong> at <strong>Modern Calcutta School</strong>. We have received your enquiry for <strong>${grade || 'the requested grade'}</strong>.</p>
    <div class="highlight">Our admissions team will contact you within 1–2 business days to schedule a visit and discuss next steps.</div>
    <p>If you have any immediate questions, please don't hesitate to call us:</p>
    <p><strong>📞 +91 87098 61044</strong><br>Mon–Sat · 8:00 AM – 2:00 PM</p>
    <p>Jazak Allahu Khayran for trusting us with your child's future.</p>
    <p style="color:#C6A75E;font-style:italic;">— The Admissions Team, Modern Calcutta School</p>
  </div>
  <div class="footer"><p>Modern Calcutta School · Phulwari Sharif, Patna, Bihar 801505</p></div>
</div>
</body></html>`;
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { formType, studentName, parentName, grade, phone, email, message } = req.body;

    if (!studentName || !parentName || !phone) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    try {
        // 1. Send school notification to both school emails
        await transporter.sendMail({
            from: `"Modern Calcutta School Website" <${process.env.GMAIL_USER}>`,
            to: SCHOOL_EMAIL_1,
            cc: SCHOOL_EMAIL_2,
            subject: `📚 New ${formType === 'inquiry' ? 'Inquiry' : 'Admission Enquiry'} — ${studentName} (${grade || 'Grade TBD'})`,
            html: buildSchoolEmail(req.body),
        });

        // 2. Send parent confirmation if email was provided
        if (email && email.trim()) {
            await transporter.sendMail({
                from: `"Modern Calcutta School" <${process.env.GMAIL_USER}>`,
                to: email.trim(),
                subject: `✅ Enquiry Received — Modern Calcutta School`,
                html: buildParentEmail(req.body),
            });
        }

        return res.status(200).json({ success: true, message: 'Emails sent successfully' });
    } catch (err) {
        console.error('Email send error:', err);
        return res.status(500).json({ error: 'Failed to send email', details: err.message });
    }
};
