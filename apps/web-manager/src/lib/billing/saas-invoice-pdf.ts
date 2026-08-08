/**
 * Minimal PDF 1.4 generator (Helvetica) — no native deps.
 * Good enough for single-page SaaS invoices.
 */

function escapePdfText(value: string): string {
  const ascii = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
  return ascii.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildContentStream(lines: Array<{ text: string; x: number; y: number; size: number; bold?: boolean }>): string {
  const ops: string[] = ["BT"];
  for (const line of lines) {
    const font = line.bold ? "/F2" : "/F1";
    ops.push(`${font} ${line.size} Tf`);
    ops.push(`${line.x} ${line.y} Td`);
    ops.push(`(${escapePdfText(line.text)}) Tj`);
    ops.push(`${-line.x} ${-line.y} Td`);
  }
  ops.push("ET");
  return ops.join("\n");
}

function assemblePdf(contentStream: string): Buffer {
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>";
  objects[4] = `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`;
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[6] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 6; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, "utf8");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 7\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= 6; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

export interface SaasInvoicePdfInput {
  invoiceNumber: string;
  organizationName: string;
  periodLabel: string;
  propertyCount: number;
  unitCount: number;
  pricePerUnitLabel: string;
  amountDueLabel: string;
  statusLabel: string;
  issuedAtLabel: string;
  dueAtLabel: string;
  paidAtLabel?: string | null;
  currencyCode: string;
}

export function buildSaasInvoicePdf(input: SaasInvoicePdfInput): Buffer {
  const lines: Array<{ text: string; x: number; y: number; size: number; bold?: boolean }> = [
    { text: "Haraka Property", x: 50, y: 780, size: 18, bold: true },
    { text: "Facture d'abonnement SaaS", x: 50, y: 756, size: 12 },
    { text: input.invoiceNumber, x: 50, y: 720, size: 16, bold: true },
    { text: `Organisation : ${input.organizationName}`, x: 50, y: 690, size: 11 },
    { text: `Periode : ${input.periodLabel}`, x: 50, y: 670, size: 11 },
    { text: `Statut : ${input.statusLabel}`, x: 50, y: 650, size: 11 },
    { text: `Emise le : ${input.issuedAtLabel}`, x: 50, y: 630, size: 11 },
    { text: `Echeance : ${input.dueAtLabel}`, x: 50, y: 610, size: 11 },
    ...(input.paidAtLabel
      ? [{ text: `Payee le : ${input.paidAtLabel}`, x: 50, y: 590, size: 11 }]
      : []),
    { text: "Detail", x: 50, y: 550, size: 13, bold: true },
    {
      text: `Biens : ${input.propertyCount}  |  Logements : ${input.unitCount}`,
      x: 50,
      y: 528,
      size: 11
    },
    {
      text: `Tarif : ${input.pricePerUnitLabel} / logement`,
      x: 50,
      y: 508,
      size: 11
    },
    {
      text: `${input.unitCount} x ${input.pricePerUnitLabel} = ${input.amountDueLabel}`,
      x: 50,
      y: 488,
      size: 11
    },
    { text: "Total a payer", x: 50, y: 450, size: 12, bold: true },
    { text: input.amountDueLabel, x: 50, y: 428, size: 18, bold: true },
    {
      text: "Reference de paiement : utilisez le numero de facture ci-dessus.",
      x: 50,
      y: 390,
      size: 10
    },
    {
      text: "Document genere par Haraka Property.",
      x: 50,
      y: 80,
      size: 9
    }
  ];

  return assemblePdf(buildContentStream(lines));
}
