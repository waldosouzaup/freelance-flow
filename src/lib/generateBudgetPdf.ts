import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { MaintenanceBudgetData } from "@/types/maintenance";

export interface BudgetData {
  budgetNumber: string;
  date: string;
  validityDate: string;

  freelancerName: string;
  freelancerEmail: string;
  freelancerPhone: string;
  freelancerWebsite: string;
  logoUrl?: string;
  cnpj?: string;
  address?: string;
  pixKeyType?: string;
  pixKey?: string;

  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCpf?: string;
  projectName: string;

  hourlyRate: number;
  hours: number;
  complexity: number;
  basePrice: number;

  setupCosts?: { name: string; value: number }[];
  mensalCosts?: { name: string; value: number }[];
  extraCosts?: { name: string; value: number }[];
  totalSetup?: number;
  totalMensal?: number;
  totalExtra?: number;

  costs: { name: string; value: number }[];
  totalCosts: number;
  subtotal: number;

  profitMargin: number;
  profitAmount: number;

  tax: number;
  taxAmount: number;

  discount: number;
  total: number;

  paymentConditions: string;
  notes: string;
  budget_type?: "service" | "maintenance";
}

function formatNumber(val: number): string {
  return (val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(val: number): string {
  return `R$ ${formatNumber(val)}`;
}

function sanitizeText(str?: string): string {
  if (!str) return "";
  return str
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "-")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .trim();
}

interface LoadedLogo {
  dataUrl: string;
  width: number;
  height: number;
  format: string;
}

async function loadImageData(url?: string): Promise<LoadedLogo | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const mimeType = blob.type.toLowerCase();
    const format = mimeType.includes("png") ? "PNG" : "JPEG";

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: base64,
            width: img.naturalWidth || img.width || 100,
            height: img.naturalHeight || img.height || 100,
            format,
          });
        };
        img.onerror = () => resolve(null);
        img.src = base64;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Could not load logo for PDF:", err);
    return null;
  }
}

function computeCRC16(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

export function generatePixPayload({
  key,
  name,
  city = "BRASIL",
  amount,
  transactionId = "***",
}: {
  key: string;
  name: string;
  city?: string;
  amount?: number;
  transactionId?: string;
}): string {
  const cleanKey = key.trim();
  const cleanName = (name || "RECEBEDOR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, 25) || "RECEBEDOR";
  const cleanCity = (city || "BRASIL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, 15) || "BRASIL";

  const gui = formatEmvField("00", "br.gov.bcb.pix");
  const pixKeyField = formatEmvField("01", cleanKey);
  const merchantAccountInfo = formatEmvField("26", `${gui}${pixKeyField}`);

  let payload =
    formatEmvField("00", "01") +
    merchantAccountInfo +
    formatEmvField("52", "0000") +
    formatEmvField("53", "986") +
    (amount && amount > 0 ? formatEmvField("54", amount.toFixed(2)) : "") +
    formatEmvField("58", "BR") +
    formatEmvField("59", cleanName) +
    formatEmvField("60", cleanCity) +
    formatEmvField("62", formatEmvField("05", transactionId || "***")) +
    "6304";

  const crc = computeCRC16(payload);
  return payload + crc;
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE-PAGE PROFESSIONAL BUDGET PDF ENGINE (EXACT MATCH TO ATTACHED MODEL)
// ─────────────────────────────────────────────────────────────────────────────

interface TableItem {
  qty: string;
  productService: string;
  itemDetail: string;
  unitPrice: number;
  subtotal: number;
}

interface CommonBudgetData {
  budgetNumber: string;
  date: string;
  validityDate: string;

  freelancerName: string;
  freelancerEmail: string;
  freelancerPhone: string;
  freelancerWebsite?: string;
  logoUrl?: string;
  cnpj?: string;
  address?: string;
  pixKeyType?: string;
  pixKey?: string;

  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCpf?: string;

  reportedIssue?: string;
  warrantyDays?: number;
  estimatedDaysToDeliver?: number;

  items: TableItem[];

  total: number;
  subtotal: number;
  discount?: number;

  paymentConditions?: string;
  observations: string[];
}

/**
 * Renders observation text supporting markdown bold (**text**) and paragraph breaks (\n)
 * while strictly adhering to line width and single-page vertical limit.
 */
function renderRichObservationText(
  doc: jsPDF,
  rawText: string,
  startX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxFooterLimit: number,
  darkColor: [number, number, number]
): number {
  if (!rawText || !rawText.trim()) return startY;

  // Split into paragraphs (handle both CRLF and LF)
  const rawParagraphs = rawText.split(/\r?\n/);
  let curY = startY;

  for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
    const rawPara = rawParagraphs[pIdx].trim();

    // Empty line -> paragraph separator gap
    if (!rawPara) {
      curY += 1.8;
      if (curY + lineHeight > maxFooterLimit) break;
      continue;
    }

    if (curY + lineHeight > maxFooterLimit) break;

    // Tokenize paragraph by **bold**
    const regex = /\*\*(.*?)\*\*/g;
    const tokens: { text: string; bold: boolean }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(rawPara)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ text: rawPara.substring(lastIndex, match.index), bold: false });
      }
      if (match[1]) {
        tokens.push({ text: match[1], bold: true });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < rawPara.length) {
      tokens.push({ text: rawPara.substring(lastIndex), bold: false });
    }
    if (tokens.length === 0) {
      tokens.push({ text: rawPara, bold: false });
    }

    // Split tokens into individual words
    interface WordToken {
      word: string;
      bold: boolean;
    }
    const words: WordToken[] = [];
    tokens.forEach((t) => {
      const parts = t.text.trim().split(/\s+/).filter(Boolean);
      parts.forEach((p) => {
        words.push({ word: sanitizeText(p).toUpperCase(), bold: t.bold });
      });
    });

    if (words.length === 0) continue;

    let curX = startX;

    for (let i = 0; i < words.length; i++) {
      const item = words[i];
      doc.setFont("helvetica", item.bold ? "bold" : "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...darkColor);

      const isLast = i === words.length - 1;
      const textToMeasure = item.word + (isLast ? "" : " ");
      const wordWidth = doc.getTextWidth(textToMeasure);

      // Check if word overflows current line
      if (curX + wordWidth > startX + maxWidth && curX > startX) {
        curY += lineHeight;
        curX = startX;
        if (curY + lineHeight > maxFooterLimit) break;
      }

      doc.text(textToMeasure, curX, curY);
      curX += wordWidth;
    }

    curY += lineHeight;
  }

  return curY;
}

/**
 * Renders rich text inside a bounded box column (like DEFEITO RELATADO)
 */
function renderRichBoxText(
  doc: jsPDF,
  rawText: string,
  startX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxY: number,
  darkColor: [number, number, number]
): void {
  if (!rawText || !rawText.trim()) return;

  const rawParagraphs = rawText.split(/\r?\n+/).filter(Boolean);
  let curY = startY;

  for (const para of rawParagraphs) {
    if (curY + lineHeight > maxY) break;

    // Tokenize by **bold**
    const regex = /\*\*(.*?)\*\*/g;
    const tokens: { text: string; bold: boolean }[] = [];
    let last = 0;
    let match;

    while ((match = regex.exec(para)) !== null) {
      if (match.index > last) {
        tokens.push({ text: para.substring(last, match.index), bold: false });
      }
      if (match[1]) {
        tokens.push({ text: match[1], bold: true });
      }
      last = regex.lastIndex;
    }
    if (last < para.length) {
      tokens.push({ text: para.substring(last), bold: false });
    }
    if (tokens.length === 0) {
      tokens.push({ text: para, bold: false });
    }

    // Split each token into individual words
    interface WordToken {
      word: string;
      bold: boolean;
    }
    const words: WordToken[] = [];
    tokens.forEach((t) => {
      const parts = t.text.trim().split(/\s+/).filter(Boolean);
      parts.forEach((p) => {
        words.push({ word: sanitizeText(p).toUpperCase(), bold: t.bold });
      });
    });

    let curX = startX;

    for (let i = 0; i < words.length; i++) {
      const item = words[i];
      doc.setFont("helvetica", item.bold ? "bold" : "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...darkColor);

      const isLast = i === words.length - 1;
      const textToMeasure = item.word + (isLast ? "" : " ");
      const wordWidth = doc.getTextWidth(textToMeasure);

      if (curX + wordWidth > startX + maxWidth && curX > startX) {
        curY += lineHeight;
        curX = startX;
        if (curY + lineHeight > maxY) break;
      }

      doc.text(textToMeasure, curX, curY);
      curX += wordWidth;
    }

    curY += lineHeight;
  }
}

async function renderSinglePageInvoice(
  data: CommonBudgetData,
  filename: string,
  options: { save?: boolean } = { save: true }
): Promise<string> {
  // A4 portrait dimensions in mm: 210 x 297
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const rightMargin = 196; // 210 - 14

  // Colors
  const darkColor: [number, number, number] = [20, 20, 20];
  const mutedColor: [number, number, number] = [100, 100, 100];
  const lineColor: [number, number, number] = [30, 30, 30];
  const lightLineColor: [number, number, number] = [210, 210, 210];

  // ─── 1. TOP LINE (Date left, "Orçamento [number]" right) ───
  let y = 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...darkColor);
  doc.text(sanitizeText(data.date), margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...darkColor);
  doc.text(`Orçamento ${sanitizeText(data.budgetNumber)}`, rightMargin, y, { align: "right" });

  y = 16.5;
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.35);
  doc.line(margin, y, rightMargin, y);

  // ─── 2. COMPANY HEADER (Logo box left, Info center, Contacts right) ───
  const logo = await loadImageData(data.logoUrl);
  let textX = margin;

  if (logo) {
    const boxW = 24;
    const boxH = 21;
    const boxY = 19;
    doc.setDrawColor(...lightLineColor);
    doc.setLineWidth(0.3);
    doc.rect(margin, boxY, boxW, boxH);

    const ratio = Math.min((boxW - 2) / logo.width, (boxH - 2) / logo.height);
    const w = logo.width * ratio;
    const h = logo.height * ratio;
    const imgX = margin + (boxW - w) / 2;
    const imgY = boxY + (boxH - h) / 2;

    try {
      doc.addImage(logo.dataUrl, logo.format, imgX, imgY, w, h);
    } catch (e) {
      console.warn("Logo render error in Single-Page PDF:", e);
    }

    textX = margin + boxW + 4; // 42mm
  }

  // Conditions box on the right (Warranty & Delivery Estimate)
  const hasWarranty = Boolean(data.warrantyDays);
  const hasDelivery = Boolean(data.estimatedDaysToDeliver);

  const boxW = 70;
  const boxX = rightMargin - boxW; // 126mm (aligned to right margin)
  const boxY = 19;
  const boxH = 21;

  // Company info column max width
  const companyMaxWidth = hasWarranty || hasDelivery ? Math.max(38, boxX - textX - 4) : rightMargin - textX;
  let compY = 22.5;

  // Company Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkColor);
  const companyTitle = sanitizeText(data.freelancerName || "ASSISTÊNCIA TÉCNICA");
  doc.text(companyTitle, textX, compY);
  compY += 4.2;

  // Phone under company name
  if (data.freelancerPhone?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...darkColor);
    doc.text(sanitizeText(data.freelancerPhone), textX, compY);
    compY += 3.8;
  }

  // Email under phone
  if (data.freelancerEmail?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedColor);
    doc.text(sanitizeText(data.freelancerEmail), textX, compY);
    compY += 3.6;
  }

  // Website under email (if present)
  if (data.freelancerWebsite?.trim() && compY <= 40) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...mutedColor);
    doc.text(sanitizeText(data.freelancerWebsite), textX, compY);
    compY += 3.4;
  }

  // Address (if present)
  if (data.address?.trim() && compY <= 40) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...darkColor);
    const addressLines = doc.splitTextToSize(sanitizeText(data.address), companyMaxWidth);
    for (const line of addressLines.slice(0, 2)) {
      if (compY > 41) break;
      doc.text(line, textX, compY);
      compY += 3.4;
    }
  }

  // CNPJ (if present)
  if (data.cnpj?.trim() && compY <= 41) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...mutedColor);
    doc.text(`CNPJ: ${sanitizeText(data.cnpj)}`, textX, compY);
    compY += 3.4;
  }

  // Render framed conditions box on the right
  if (hasWarranty || hasDelivery) {
    doc.setDrawColor(...lightLineColor);
    doc.setLineWidth(0.3);
    doc.rect(boxX, boxY, boxW, boxH);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkColor);

    if (hasWarranty && hasDelivery) {
      doc.setFontSize(7.5);
      doc.text(`GARANTIA : ${data.warrantyDays} DIAS`, boxX + 4, boxY + 8);

      const deliveryText = `PRAZO ESTIMADO DE ENTREGA : ${data.estimatedDaysToDeliver} DIAS ÚTEIS`;
      doc.setFontSize(7.0);
      const deliveryWidth = doc.getTextWidth(deliveryText);

      if (deliveryWidth <= boxW - 8) {
        doc.text(deliveryText, boxX + 4, boxY + 14.5);
      } else {
        const splitLines = doc.splitTextToSize(deliveryText, boxW - 8);
        let curDeliveryY = boxY + 13;
        for (const line of splitLines.slice(0, 2)) {
          doc.text(line, boxX + 4, curDeliveryY);
          curDeliveryY += 3.5;
        }
      }
    } else if (hasWarranty) {
      doc.setFontSize(8);
      doc.text(`GARANTIA : ${data.warrantyDays} DIAS`, boxX + 4, boxY + 11.5);
    } else if (hasDelivery) {
      doc.setFontSize(7.5);
      const deliveryText = `PRAZO ESTIMADO DE ENTREGA : ${data.estimatedDaysToDeliver} DIAS ÚTEIS`;
      const splitLines = doc.splitTextToSize(deliveryText, boxW - 8);
      if (splitLines.length === 1) {
        doc.text(deliveryText, boxX + 4, boxY + 11.5);
      } else {
        doc.text(splitLines[0], boxX + 4, boxY + 9.5);
        doc.text(splitLines[1], boxX + 4, boxY + 13.5);
      }
    }
  }

  // Horizontal divider below company
  y = 43.5;
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.35);
  doc.line(margin, y, rightMargin, y);

  // ─── 3. CUSTOMER, REPORTED ISSUE & PROPOSAL VALIDITY BOX ───
  y = 46.5;
  const boxHeight = 24.5;
  const boxWidth = rightMargin - margin; // 182mm
  const hasReportedIssue = Boolean(data.reportedIssue && data.reportedIssue.trim());

  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.35);
  doc.rect(margin, y, boxWidth, boxHeight);

  if (hasReportedIssue) {
    const div1X = 86;
    const div2X = 153;

    // Vertical dividers
    doc.line(div1X, y, div1X, y + boxHeight);
    doc.line(div2X, y, div2X, y + boxHeight);

    // 1. Customer Column (margin to div1X: 72mm)
    let curClientY = y + 4.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...darkColor);
    const clientNameLines = doc.splitTextToSize(
      sanitizeText(data.clientName || "CLIENTE NÃO INFORMADO").toUpperCase(),
      div1X - margin - 6
    );
    doc.text(clientNameLines[0] || "", margin + 3, curClientY);
    if (clientNameLines.length > 1) {
      curClientY += 3.2;
      doc.text(clientNameLines[1] || "", margin + 3, curClientY);
    }
    curClientY += 3.4;

    // Telefone
    if (data.clientPhone?.trim() && curClientY <= y + boxHeight - 2) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.0);
      doc.setTextColor(...darkColor);
      doc.text("Tel: ", margin + 3, curClientY);
      const telLabelW = doc.getTextWidth("Tel: ");
      doc.setFont("helvetica", "normal");
      doc.text(sanitizeText(data.clientPhone), margin + 3 + telLabelW, curClientY);
      curClientY += 3.2;
    }

    // E-mail
    if (data.clientEmail?.trim() && curClientY <= y + boxHeight - 2) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.0);
      doc.setTextColor(...darkColor);
      doc.text("E-mail: ", margin + 3, curClientY);
      const emailLabelW = doc.getTextWidth("E-mail: ");
      doc.setFont("helvetica", "normal");
      const emailLines = doc.splitTextToSize(sanitizeText(data.clientEmail), div1X - margin - 6 - emailLabelW);
      doc.text(emailLines[0] || "", margin + 3 + emailLabelW, curClientY);
      curClientY += 3.2;
    }

    // CPF / CNPJ
    if (data.clientCpf?.trim() && curClientY <= y + boxHeight - 2) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...darkColor);
      doc.text("CPF/CNPJ: ", margin + 3, curClientY);
      const cpfLabelW = doc.getTextWidth("CPF/CNPJ: ");
      doc.setFont("helvetica", "normal");
      doc.text(sanitizeText(data.clientCpf), margin + 3 + cpfLabelW, curClientY);
      curClientY += 3.2;
    }

    // Endereço
    if (data.clientAddress?.trim() && curClientY <= y + boxHeight - 2) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...mutedColor);
      const splitAddr = doc.splitTextToSize(sanitizeText(data.clientAddress), div1X - margin - 6);
      doc.text(splitAddr[0] || "", margin + 3, curClientY);
      if (splitAddr[1] && curClientY + 2.8 <= y + boxHeight - 1.2) {
        curClientY += 2.8;
        doc.text(splitAddr[1] || "", margin + 3, curClientY);
      }
    }

    // 2. Defeito Relatado Column (div1X to div2X: 67mm)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...darkColor);
    doc.text("DEFEITO RELATADO:", div1X + 3, y + 5);

    // Subtle underline under header
    doc.setDrawColor(...lightLineColor);
    doc.setLineWidth(0.2);
    doc.line(div1X + 3, y + 6.8, div2X - 3, y + 6.8);

    renderRichBoxText(
      doc,
      data.reportedIssue!,
      div1X + 3,
      y + 10.2,
      div2X - div1X - 6, // 61mm width
      3.2,
      y + boxHeight - 1,
      darkColor
    );

    // 3. Validity Column (div2X to rightMargin: 43mm)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...darkColor);
    doc.text("Validade da proposta", div2X + 3, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...darkColor);
    doc.text(sanitizeText(data.validityDate || data.date), div2X + 3, y + 12);
  } else {
    // Standard 2-column layout (for Service budgets without reported issue)
    const dividerX = 143;
    doc.line(dividerX, y, dividerX, y + boxHeight);

    // Customer Side (Left: 129mm width)
    let curClientY = y + 4.8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    doc.setTextColor(...darkColor);
    doc.text(sanitizeText(data.clientName || "CLIENTE NÃO INFORMADO").toUpperCase(), margin + 3.5, curClientY);
    curClientY += 3.8;

    // Contact line (Phone + Email)
    const hasPhone = Boolean(data.clientPhone?.trim());
    const hasEmail = Boolean(data.clientEmail?.trim());

    if (hasPhone || hasEmail) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(...darkColor);
      let contactX = margin + 3.5;

      if (hasPhone) {
        doc.text("Tel: ", contactX, curClientY);
        const lW = doc.getTextWidth("Tel: ");
        doc.setFont("helvetica", "normal");
        doc.text(sanitizeText(data.clientPhone!), contactX + lW, curClientY);
        contactX += lW + doc.getTextWidth(sanitizeText(data.clientPhone!)) + 5;
      }

      if (hasEmail && contactX + 45 < dividerX - 5) {
        doc.setFont("helvetica", "bold");
        doc.text("E-mail: ", contactX, curClientY);
        const lW = doc.getTextWidth("E-mail: ");
        doc.setFont("helvetica", "normal");
        doc.text(sanitizeText(data.clientEmail!), contactX + lW, curClientY);
      } else if (hasEmail) {
        curClientY += 3.2;
        doc.setFont("helvetica", "bold");
        doc.text("E-mail: ", margin + 3.5, curClientY);
        const lW = doc.getTextWidth("E-mail: ");
        doc.setFont("helvetica", "normal");
        doc.text(sanitizeText(data.clientEmail!), margin + 3.5 + lW, curClientY);
      }
      curClientY += 3.4;
    }

    // CPF / CNPJ
    if (data.clientCpf?.trim() && curClientY <= y + boxHeight - 2) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.0);
      doc.setTextColor(...darkColor);
      doc.text("CPF/CNPJ: ", margin + 3.5, curClientY);
      const cpfLabelW = doc.getTextWidth("CPF/CNPJ: ");
      doc.setFont("helvetica", "normal");
      doc.text(sanitizeText(data.clientCpf), margin + 3.5 + cpfLabelW, curClientY);
      curClientY += 3.4;
    }

    // Endereço
    if (data.clientAddress?.trim() && curClientY <= y + boxHeight - 2) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...mutedColor);
      const splitAddr = doc.splitTextToSize(sanitizeText(data.clientAddress), dividerX - margin - 7);
      doc.text(splitAddr[0] || "", margin + 3.5, curClientY);
      if (splitAddr[1] && curClientY + 2.8 <= y + boxHeight - 1.2) {
        curClientY += 2.8;
        doc.text(splitAddr[1] || "", margin + 3.5, curClientY);
      }
    }

    // Validity Side (Right)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...darkColor);
    doc.text("Validade da proposta", dividerX + 3.5, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...darkColor);
    doc.text(sanitizeText(data.validityDate || data.date), dividerX + 3.5, y + 12);
  }

  // ─── 4. ITEMS TABLE (Qt., Produto/Serviço, Detalhe do item, Valor unitário, Subtotal) ───
  y = 73.5;

  // Table top line
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.35);
  doc.line(margin, y, rightMargin, y);

  // Header texts
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...darkColor);

  const colQtX = 20;
  const colProdX = 28;
  const colDetailX = 98;
  const colUnitX = 168;
  const colSubtotX = rightMargin;

  doc.text("Qt.", colQtX, y + 4.2, { align: "center" });
  doc.text("Produto/Serviço", colProdX, y + 4.2);
  doc.text("Detalhe do item", colDetailX, y + 4.2);
  doc.text("Valor unitário", colUnitX, y + 4.2, { align: "right" });
  doc.text("Subtotal", colSubtotX, y + 4.2, { align: "right" });

  // Table header bottom line
  y += 6.5;
  doc.line(margin, y, rightMargin, y);

  // Render Table Rows (Clamped to avoid breaking into page 2)
  const maxRows = 6;
  const itemsToRender = data.items.slice(0, maxRows);

  let rowY = y + 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...darkColor);

  for (const item of itemsToRender) {
    doc.text(item.qty, colQtX, rowY, { align: "center" });

    // Truncate product if necessary
    const prodText = doc.splitTextToSize(sanitizeText(item.productService).toUpperCase(), 66);
    doc.text(prodText[0] || "", colProdX, rowY);

    // Truncate detail if necessary
    const detailText = doc.splitTextToSize(sanitizeText(item.itemDetail).toUpperCase(), 45);
    doc.text(detailText[0] || "", colDetailX, rowY);

    doc.text(formatNumber(item.unitPrice), colUnitX, rowY, { align: "right" });
    doc.text(formatNumber(item.subtotal), colSubtotX, rowY, { align: "right" });

    rowY += 5.5;
  }

  // Table bottom border
  doc.setDrawColor(...lightLineColor);
  doc.setLineWidth(0.25);
  doc.line(margin, rowY, rightMargin, rowY);
  rowY += 4.5;

  // ─── 5. TOTALS BLOCK (Right-aligned, Total & Valor líquido) ───
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Total", colUnitX, rowY, { align: "right" });
  doc.text(formatNumber(data.subtotal || data.total), colSubtotX, rowY, { align: "right" });

  if (data.discount && data.discount > 0) {
    rowY += 4;
    doc.text("Desconto", colUnitX, rowY, { align: "right" });
    doc.text(`-${formatNumber(data.discount)}`, colSubtotX, rowY, { align: "right" });
  }

  rowY += 2;
  doc.setDrawColor(...lightLineColor);
  doc.setLineWidth(0.25);
  doc.line(135, rowY, rightMargin, rowY);
  rowY += 4.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Valor líquido", colUnitX, rowY, { align: "right" });
  doc.text(formatNumber(data.total), colSubtotX, rowY, { align: "right" });

  rowY += 3;
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.5);
  doc.line(margin, rowY, rightMargin, rowY);

  // ─── 6. FORMA DE PAGAMENTO (With optional compact QR Code) ───
  let payY = rowY + 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkColor);
  doc.text("Forma de pagamento:", margin, payY + 3.5);

  let payLineY = payY + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...darkColor);

  // Cash / Pix line
  doc.text(`PAGAMENTO A VISTA EM PIX OU DINHEIRO = ${formatNumber(data.total)}`, margin, payLineY);
  payLineY += 4;

  // Pix key line
  if (data.pixKey?.trim()) {
    const keyTypeStr = data.pixKeyType ? ` (${data.pixKeyType.toUpperCase()})` : "";
    doc.text(`CHAVE PIX${keyTypeStr}: ${sanitizeText(data.pixKey)}`, margin, payLineY);
    payLineY += 4;
  }

  // Payment conditions lines
  if (data.paymentConditions?.trim()) {
    const condLines = doc.splitTextToSize(sanitizeText(data.paymentConditions).toUpperCase(), 135);
    for (const cLine of condLines.slice(0, 3)) {
      doc.text(cLine, margin, payLineY);
      payLineY += 4;
    }
  }

  // Compact QR Code on the right side of the payment block
  if (data.pixKey?.trim()) {
    try {
      const payload = generatePixPayload({
        key: data.pixKey.trim(),
        name: data.freelancerName || "Recebedor",
        amount: data.total,
      });
      const qrDataUrl = await QRCode.toDataURL(payload, {
        margin: 1,
        width: 150,
        color: { dark: "#18181b", light: "#ffffff" },
      });

      const qrSize = 22;
      const qrX = rightMargin - qrSize;
      const qrY = payY + 0.5;

      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...mutedColor);
      doc.text("QR Code Pix", qrX + qrSize / 2, qrY + qrSize + 2.5, { align: "center" });
    } catch (e) {
      console.warn("Could not render Pix QR code in payment block:", e);
    }
  }

  const obsStartY = Math.max(payLineY + 3, payY + 27);
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.35);
  doc.line(margin, obsStartY, rightMargin, obsStartY);

  // ─── 7. OBSERVAÇÕES BLOCK ───
  const obsY = obsStartY + 3.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkColor);
  doc.text("Observações:", margin, obsY + 3.5);

  let obsTextY = obsY + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...darkColor);

  // Cap lines to prevent overflow past footer
  const maxFooterLimit = 280;
  const lineHeight = 3.8;

  for (const obs of data.observations) {
    if (!obs || !obs.trim()) continue;
    obsTextY = renderRichObservationText(
      doc,
      obs,
      margin,
      obsTextY,
      182,
      lineHeight,
      maxFooterLimit,
      darkColor
    );
    if (obsTextY >= maxFooterLimit) {
      break;
    }
  }

  // ─── 8. FOOTER (Página 1 de 1) ───
  const footerY = 287;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedColor);
  doc.text("Página 1 de 1", rightMargin, footerY, { align: "right" });

  // Save PDF if requested (Strictly 1 page)
  if (options.save !== false) {
    doc.save(filename);
  }
  const dataUri = doc.output("datauristring");
  return dataUri.split(",")[1] || "";
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT: MAINTENANCE BUDGET PDF (SINGLE PAGE)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMaintenanceBudgetPdf(
  data: MaintenanceBudgetData,
  options: { save?: boolean } = { save: true }
): Promise<{ base64: string; filename: string }> {
  const items: TableItem[] = [];

  // Main maintenance service item
  const brandSuffix = data.brandModel && !data.productName.toUpperCase().includes(data.brandModel.toUpperCase())
    ? ` ${data.brandModel}`
    : "";
  const productTitle = `${data.productName}${brandSuffix} - MANUTENÇÃO`;
  const serialDetail = data.serialNumber ? `SERIAL: ${data.serialNumber}` : "SERVIÇO TÉCNICO E REVISÃO";

  items.push({
    qty: "1",
    productService: productTitle,
    itemDetail: serialDetail,
    unitPrice: data.laborTotal,
    subtotal: data.laborTotal,
  });

  // Parts items
  if (data.parts && data.parts.length > 0) {
    data.parts.forEach((p) => {
      items.push({
        qty: String(p.quantity || 1),
        productService: p.name,
        itemDetail: "PEÇA DE REPOSIÇÃO",
        unitPrice: p.unitPrice,
        subtotal: p.totalPrice,
      });
    });
  }

  // Extra costs
  if (data.extraCosts && data.extraCosts.length > 0) {
    data.extraCosts.forEach((e) => {
      items.push({
        qty: "1",
        productService: e.name,
        itemDetail: "INSUMOS / OPERACIONAL",
        unitPrice: e.value,
        subtotal: e.value,
      });
    });
  }

  // Build observations array (excluding reportedIssue, warranty and delivery which are in dedicated top boxes)
  const observations: string[] = [];

  if (data.technicalDiagnosis?.trim()) {
    observations.push(data.technicalDiagnosis.trim());
  }

  if (data.notes?.trim()) {
    observations.push(data.notes.trim());
  }

  const commonData: CommonBudgetData = {
    budgetNumber: data.budgetNumber,
    date: data.date,
    validityDate: data.validityDate,

    freelancerName: data.freelancerName,
    freelancerEmail: data.freelancerEmail,
    freelancerPhone: data.freelancerPhone,
    freelancerWebsite: data.freelancerWebsite,
    logoUrl: data.logoUrl,
    cnpj: data.cnpj,
    address: data.address,
    pixKeyType: data.pixKeyType,
    pixKey: data.pixKey,

    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
    clientAddress: data.clientAddress,
    clientCpf: data.clientCpf,

    reportedIssue: data.reportedIssue?.trim() || undefined,
    warrantyDays: data.warrantyDays,
    estimatedDaysToDeliver: data.estimatedDaysToDeliver,

    items,

    total: data.total,
    subtotal: data.subtotal,
    discount: data.discount,

    paymentConditions: data.paymentConditions,
    observations,
  };

  const cleanClient = data.clientName.replace(/\s+/g, "_");
  const filename = `${data.budgetNumber}_${cleanClient}_Manutencao.pdf`;
  const base64 = await renderSinglePageInvoice(commonData, filename, options);
  return { base64, filename };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT: SERVICE BUDGET PDF (SINGLE PAGE)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateBudgetPdf(
  data: BudgetData,
  options: { save?: boolean } = { save: true }
): Promise<{ base64: string; filename: string }> {
  const items: TableItem[] = [];

  // Main project service item
  const hoursDetail = data.hours ? `${data.hours}H DE TRABALHO TÉCNICO` : "PRESTAÇÃO DE SERVIÇOS";
  items.push({
    qty: "1",
    productService: `${data.projectName} - SERVIÇOS`,
    itemDetail: hoursDetail,
    unitPrice: data.basePrice || data.subtotal,
    subtotal: data.basePrice || data.subtotal,
  });

  // Setup / Extra / Legacy costs
  if (data.setupCosts && data.setupCosts.length > 0) {
    data.setupCosts.forEach((c) => {
      items.push({
        qty: "1",
        productService: c.name,
        itemDetail: "SETUP INICIAL",
        unitPrice: c.value,
        subtotal: c.value,
      });
    });
  }

  if (data.extraCosts && data.extraCosts.length > 0) {
    data.extraCosts.forEach((c) => {
      items.push({
        qty: "1",
        productService: c.name,
        itemDetail: "CUSTO ADICIONAL",
        unitPrice: c.value,
        subtotal: c.value,
      });
    });
  }

  if (data.costs && data.costs.length > 0 && (!data.setupCosts || data.setupCosts.length === 0)) {
    data.costs.forEach((c) => {
      if (c.value > 0) {
        items.push({
          qty: "1",
          productService: c.name,
          itemDetail: "CUSTO OPERACIONAL",
          unitPrice: c.value,
          subtotal: c.value,
        });
      }
    });
  }

  // Build observations
  const observations: string[] = [];
  if (data.notes?.trim()) {
    observations.push(data.notes.trim());
  }

  observations.push(`ESCOPO: DESENVOLVIMENTO E GESTÃO DE PROJETO CONFORME ESPECIFICAÇÃO.`);
  observations.push(`VALIDADE DA PROPOSTA: ATÉ ${data.validityDate}.`);

  const commonData: CommonBudgetData = {
    budgetNumber: data.budgetNumber,
    date: data.date,
    validityDate: data.validityDate,

    freelancerName: data.freelancerName,
    freelancerEmail: data.freelancerEmail,
    freelancerPhone: data.freelancerPhone,
    freelancerWebsite: data.freelancerWebsite,
    logoUrl: data.logoUrl,
    cnpj: data.cnpj,
    address: data.address,
    pixKeyType: data.pixKeyType,
    pixKey: data.pixKey,

    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
    clientAddress: data.clientAddress,
    clientCpf: data.clientCpf,

    items,

    total: data.total,
    subtotal: data.subtotal,
    discount: data.discount,

    paymentConditions: data.paymentConditions,
    observations,
  };

  const cleanClient = data.clientName.replace(/\s+/g, "_");
  const filename = `${data.budgetNumber}_${cleanClient}.pdf`;
  const base64 = await renderSinglePageInvoice(commonData, filename, options);
  return { base64, filename };
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED EXPORTER
// ─────────────────────────────────────────────────────────────────────────────
export async function exportBudgetPdf(data: BudgetData | MaintenanceBudgetData): Promise<void> {
  if ("budget_type" in data && data.budget_type === "maintenance") {
    await generateMaintenanceBudgetPdf(data as MaintenanceBudgetData);
  } else {
    await generateBudgetPdf(data as BudgetData);
  }
}

export async function getBudgetPdfBase64(
  data: BudgetData | MaintenanceBudgetData
): Promise<{ base64: string; filename: string }> {
  if ("budget_type" in data && data.budget_type === "maintenance") {
    return generateMaintenanceBudgetPdf(data as MaintenanceBudgetData, { save: false });
  } else {
    return generateBudgetPdf(data as BudgetData, { save: false });
  }
}
