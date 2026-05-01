const fs = require('fs');
const path = require('path');

const fn = `
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
        var cls = s.currentClass || s.admissionClass || s.lastClass || '\u2014';
        var name = (s.studentName || '').toUpperCase();
        var father = s.fatherName || '\u2014';
        var admNo = s.admissionNo || '\u2014';
        var roll = s.rollNo || '\u2014';

        return '<div style="width:210mm;padding:12mm 14mm;page-break-after:always;">' +
          '<div style="border:2px solid #000;padding:14px 16px;">' +

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
          '<table style="width:100%;border-collapse:collapse;">' +
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
          '</div></div>';
    }).join('');

    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
        '<title>' + examName + ' Admit Cards</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">' +
        '<style>* { box-sizing:border-box;margin:0;padding:0; } body { font-family:"Libre Baskerville","Times New Roman",serif;font-size:11px;color:#000;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact; } @page { size:A4;margin:0; }</style>' +
        '</head><body>' + cards + '</body></html>';
}
`;

const target = path.join(__dirname, 'api', 'generate-pdf.js');
fs.appendFileSync(target, fn, 'utf8');
console.log('Appended successfully. New size:', fs.statSync(target).size, 'bytes');
