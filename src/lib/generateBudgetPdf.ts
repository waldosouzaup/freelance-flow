import jsPDF from "jspdf";

export interface BudgetData {
  budgetNumber: string;
  date: string;
  validityDate: string;

  freelancerName: string;
  freelancerEmail: string;
  freelancerPhone: string;
  freelancerWebsite: string;

  clientName: string;
  clientEmail: string;
  projectName: string;

  hourlyRate: number;
  hours: number;
  complexity: number;
  basePrice: number;

  // Categorized costs
  setupCosts?: { name: string; value: number }[];
  mensalCosts?: { name: string; value: number }[];
  extraCosts?: { name: string; value: number }[];
  totalSetup?: number;
  totalMensal?: number;
  totalExtra?: number;

  // Legacy flat list (kept for backward compat with old budgets)
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
}

const COLORS = {
  dark: [24, 24, 27] as [number, number, number],
  text: [63, 63, 70] as [number, number, number],
  muted: [113, 113, 122] as [number, number, number],
  light: [244, 244, 245] as [number, number, number],
  accent: [16, 185, 129] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
};

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function generateBudgetPdf(data: BudgetData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // ─── HEADER BAR ───
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 48, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.white);
  doc.text(data.freelancerName || "FreelanceFlow", margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  let contactY = 23;
  if (data.freelancerEmail) { doc.text(data.freelancerEmail, margin, contactY); contactY += 5; }
  if (data.freelancerPhone) { doc.text(data.freelancerPhone, margin, contactY); contactY += 5; }
  if (data.freelancerWebsite) { doc.text(data.freelancerWebsite, margin, contactY); }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text(data.budgetNumber, pageWidth - margin, 15, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(`Data: ${data.date}`, pageWidth - margin, 22, { align: "right" });
  doc.text(`Válido até: ${data.validityDate}`, pageWidth - margin, 28, { align: "right" });

  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 48, pageWidth, 1.5, "F");

  y = 60;

  // ─── CLIENT & PROJECT ───
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text("PARA", margin + 6, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text(data.clientName, margin + 6, y + 13);

  if (data.clientEmail) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(data.clientEmail, margin + 6, y + 19);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text("PROJETO", pageWidth / 2 + 10, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text(data.projectName || "—", pageWidth / 2 + 10, y + 13);

  y += 38;

  // ─── DETAILS TABLE ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.dark);
  doc.text("DETALHAMENTO", margin, y);
  y += 6;

  // Table header
  doc.setFillColor(...COLORS.dark);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.white);
  doc.text("Item", margin + 4, y + 5.5);
  doc.text("Valor", pageWidth - margin - 4, y + 5.5, { align: "right" });
  y += 8;

  let rowIdx = 0;
  const addRow = (label: string, value: string, options?: { bg?: boolean; bold?: boolean; color?: [number, number, number] }) => {
    if (options?.bg) {
      doc.setFillColor(...COLORS.light);
      doc.rect(margin, y, contentWidth, 8, "F");
    }
    doc.setFont("helvetica", options?.bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(...(options?.color || COLORS.text));
    doc.text(label, margin + 4, y + 5.5);
    doc.text(value, pageWidth - margin - 4, y + 5.5, { align: "right" });
    y += 8;
  };

  const addSectionHeader = (label: string, color: [number, number, number]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...color);
    doc.text(`● ${label}`, margin + 4, y + 5);
    y += 7;
  };

  // Base price
  addRow(
    `Base (${data.hours}h × R$${data.hourlyRate}/h × ${data.complexity}x)`,
    formatCurrency(data.basePrice),
    { bg: true }
  );

  // Check if we have categorized costs (new format)
  const hasCategories = (data.setupCosts && data.setupCosts.length > 0) ||
    (data.mensalCosts && data.mensalCosts.length > 0) ||
    (data.extraCosts && data.extraCosts.length > 0);

  if (hasCategories) {
    // Setup costs
    if (data.setupCosts && data.setupCosts.length > 0) {
      addSectionHeader("SETUP INICIAL", COLORS.blue);
      data.setupCosts.forEach((cost, i) => {
        addRow(`  ${cost.name}`, formatCurrency(cost.value), { bg: i % 2 === 0 });
      });
      if (data.totalSetup && data.totalSetup > 0) {
        addRow("  Subtotal Setup", formatCurrency(data.totalSetup), { bold: true, color: COLORS.blue });
      }
    }

    // Monthly costs
    if (data.mensalCosts && data.mensalCosts.length > 0) {
      addSectionHeader("CUSTOS FIXOS MENSAIS", COLORS.emerald);
      data.mensalCosts.forEach((cost, i) => {
        addRow(`  ${cost.name}`, formatCurrency(cost.value), { bg: i % 2 === 0 });
      });
      if (data.totalMensal && data.totalMensal > 0) {
        addRow("  Subtotal Mensal", formatCurrency(data.totalMensal), { bold: true, color: COLORS.emerald });
      }
    }

    // Extra costs
    if (data.extraCosts && data.extraCosts.length > 0) {
      addSectionHeader("CUSTOS EXTRAS", COLORS.amber);
      data.extraCosts.forEach((cost, i) => {
        addRow(`  ${cost.name}`, formatCurrency(cost.value), { bg: i % 2 === 0 });
      });
      if (data.totalExtra && data.totalExtra > 0) {
        addRow("  Subtotal Extras", formatCurrency(data.totalExtra), { bold: true, color: COLORS.amber });
      }
    }
  } else {
    // Legacy flat costs
    data.costs.forEach((cost, i) => {
      if (cost.name && cost.value > 0) {
        addRow(`Custo: ${cost.name}`, formatCurrency(cost.value), { bg: i % 2 === 0 });
      }
    });
  }

  // Separator
  doc.setDrawColor(...COLORS.light);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2;

  // Subtotal
  addRow("Subtotal", formatCurrency(data.subtotal), { bold: true, bg: true });

  if (data.profitMargin > 0) {
    addRow(`Margem de Lucro (${data.profitMargin}%)`, `+${formatCurrency(data.profitAmount)}`, { color: COLORS.accent });
  }

  if (data.tax > 0) {
    addRow(`Impostos (${data.tax}%)`, `+${formatCurrency(data.taxAmount)}`, { color: COLORS.warning });
  }

  if (data.discount > 0) {
    addRow("Desconto", `-${formatCurrency(data.discount)}`, { color: COLORS.danger });
  }

  // TOTAL
  y += 2;
  doc.setFillColor(...COLORS.accent);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.white);
  doc.text("VALOR TOTAL", margin + 6, y + 8);
  doc.setFontSize(14);
  doc.text(formatCurrency(data.total), pageWidth - margin - 6, y + 8.5, { align: "right" });
  y += 20;

  // ─── PAYMENT CONDITIONS ───
  if (data.paymentConditions) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text("CONDIÇÕES DE PAGAMENTO", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    const lines = doc.splitTextToSize(data.paymentConditions, contentWidth - 8);

    doc.setFillColor(...COLORS.light);
    doc.roundedRect(margin, y - 2, contentWidth, lines.length * 5 + 6, 2, 2, "F");
    doc.text(lines, margin + 4, y + 4);
    y += lines.length * 5 + 10;
  }

  // ─── NOTES ───
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text("OBSERVAÇÕES", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    const lines = doc.splitTextToSize(data.notes, contentWidth - 8);

    doc.setFillColor(...COLORS.light);
    doc.roundedRect(margin, y - 2, contentWidth, lines.length * 5 + 6, 2, 2, "F");
    doc.text(lines, margin + 4, y + 4);
    y += lines.length * 5 + 10;
  }

  // ─── FOOTER ───
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setDrawColor(...COLORS.light);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text("Gerado por FreelanceFlow", margin, footerY);
  doc.text(data.budgetNumber, pageWidth - margin, footerY, { align: "right" });

  const filename = `${data.budgetNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
