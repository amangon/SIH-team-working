/**
 * PDF report generator using PDFKit.
 * Streams a styled PDF directly to the HTTP response.
 */
import PDFDocument from 'pdfkit';

const INDIGO = '#4f46e5';
const GRAY = '#6b7280';

export const streamPdfReport = (res, { title, subtitle, sections, filename }) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename || 'report.pdf'}"`);
  doc.pipe(res);

  // Header band
  doc.rect(0, 0, doc.page.width, 90).fill(INDIGO);
  doc.fill('#ffffff').fontSize(22).font('Helvetica-Bold').text('TeamSync AI', 50, 28);
  doc.fontSize(11).font('Helvetica').text(title, 50, 58);
  doc.moveDown(2);

  doc.fill('#111827').fontSize(10).font('Helvetica')
    .text(`Generated: ${new Date().toLocaleString()}`, 50, 110);
  if (subtitle) doc.fill(GRAY).text(subtitle);
  doc.moveDown(1);

  for (const section of sections) {
    doc.moveDown(0.8);
    doc.fill(INDIGO).fontSize(14).font('Helvetica-Bold').text(section.heading);
    doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).strokeColor(INDIGO).lineWidth(0.5).stroke();
    doc.moveDown(0.5);

    if (section.rows?.length) {
      // Simple two-column key/value table
      for (const [key, value] of section.rows) {
        doc.fill('#111827').fontSize(10).font('Helvetica-Bold').text(`${key}: `, { continued: true });
        doc.font('Helvetica').fill(GRAY).text(String(value ?? '—'));
      }
    }
    if (section.list?.length) {
      for (const item of section.list) {
        doc.fill('#111827').fontSize(10).font('Helvetica').text(`• ${item}`);
      }
    }
    if (section.text) {
      doc.fill('#111827').fontSize(10).font('Helvetica').text(section.text);
    }
  }

  // Footer
  doc.fontSize(8).fill(GRAY).text(
    'TeamSync AI — Team Collaboration Platform',
    50,
    doc.page.height - 50,
    { align: 'center' }
  );
  doc.end();
};
