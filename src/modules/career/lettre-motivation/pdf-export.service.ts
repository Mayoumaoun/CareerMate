import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { formatPhone } from 'src/common/utils/phone-format.util';


@Injectable()
export class PdfExportService {
  async generateCoverLetterPdf(
    letter: string,
    metadata: {
      candidateName: string;
      company: string;
      position: string;
      city: string;
      phone?: string;
      email?: string;
    },
  ): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    const today = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Parser la lettre en paragraphes HTML
    // Séparer ouverture, corps, closing et signature
    const lines = letter.split('\n').filter((l) => l.trim());

    // Extraire "Dear Hiring Manager," ou "Madame, Monsieur,"
    const openingIndex = lines.findIndex(
      (l) => l.startsWith('Dear') || l.startsWith('Madame'),
    );

    // Extraire "Sincerely," ou formule de politesse française
    const closingIndex = lines.findIndex(
      (l) =>
        l.startsWith('Sincerely') ||
        l.startsWith('Veuillez agréer') ||
        l.startsWith('Cordialement'),
    );

    // Extraire le nom à la fin
    const signatureName =
      lines[lines.length - 1]?.trim() ?? metadata.candidateName;

    // Corps de la lettre (entre opening et closing)
    const bodyLines = lines.slice(
      openingIndex + 1,
      closingIndex > 0 ? closingIndex : lines.length - 1,
    );

    const bodyHtml = bodyLines
      .filter((l) => l.trim())
      .map((l) => `<p>${l.trim()}</p>`)
      .join('');

    const openingLine =
      openingIndex >= 0 ? lines[openingIndex] : 'Dear Hiring Manager,';
    const closingLine = closingIndex >= 0 ? lines[closingIndex] : 'Sincerely,';

    const formattedPhone = formatPhone(metadata.phone);
    console.log('Formatted phone:', formattedPhone);


    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Cover Letter</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Great+Vibes&display=swap" rel="stylesheet">
        <style>
          body {
            background: #e9edf2;
            padding: 40px;
            font-family: Inter, sans-serif;
          }
          .page {
            width: 900px;
            margin: auto;
            background: white;
            padding: 70px 80px;
            border-radius: 18px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.08);
            color: #1f2937;
            line-height: 1.8;
          }
          .top-right {
            text-align: right;
            margin-bottom: 60px;
          }
          .name {
            font-weight: 600;
            font-size: 20px;
          }
          .contact {
            margin-top: 8px;
            font-size: 14px;
            color: #374151;
          }
          .date {
            margin-top: 14px;
            font-style: italic;
            color: #374151;
          }
          .receiver {
            margin-bottom: 40px;
          }
          .receiver-name {
            font-weight: 500;
          }
          .receiver-company {
            margin-bottom: 10px;
          }
          .job {
            margin: 30px 0;
            font-weight: 500;
            border-bottom: 1px solid #6b7280;
            display: inline-block;
            padding-bottom: 3px;
          }
          p {
            font-size: 15px;
            margin-bottom: 18px;
            color: #1f2937;
          }
          .signature {
            font-family: "Great Vibes", cursive;
            font-size: 36px;
            margin-top: 50px;
            color: #111827;
          }
          .signature-name {
            margin-top: 5px;
            font-size: 14px;
            color: #374151;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Candidate info -->
          <div class="top-right">
            <div class="name">${metadata.candidateName}</div>
            <div class="contact">
              ${formattedPhone ? `${formattedPhone}<br>` : ''}
              ${metadata.email ? `${metadata.email}<br>` : ''}
              ${metadata.city}
            </div>
            <div class="date">${today}</div>
          </div>

          <!-- Receiver -->
          <div class="receiver">
            <div class="receiver-name">Hiring Manager</div>
            <div class="receiver-company">${metadata.company}</div>
          </div>

          <!-- Job reference -->
          <div class="job">Job Reference: ${metadata.position}</div>

          <!-- Opening -->
          <p>${openingLine}</p>

          <!-- Body -->
          ${bodyHtml}

          <!-- Closing -->
          <p>${closingLine}</p>

          <!-- Signature -->
          <div class="signature">${signatureName}</div>
          <div class="signature-name">${signatureName}</div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0',
      },
    });

    await browser.close();
    return Buffer.from(pdf);
  }
}
