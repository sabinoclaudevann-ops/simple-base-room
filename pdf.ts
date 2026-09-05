import type { AppData, Contract, Installment } from "./types";
import {
  contractTypeLabel,
  formatCurrency,
  formatDate,
  getClientName,
  isOverdue,
} from "./logic";

export async function generateContractPDF(
  data: AppData,
  contract: Contract,
  installments: Installment[],
  archived = false,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const clientName = getClientName(data, contract.clientId);
  let y = 18;

  doc.setFontSize(16);
  doc.text("Q+Gestão · Contrato", 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Cliente: ${clientName}`, 14, y); y += 7;
  doc.text(`Tipo: ${contractTypeLabel(contract.type)}`, 14, y); y += 7;
  doc.text(`Valor pedido: ${formatCurrency(contract.capital)}`, 14, y); y += 7;
  
  doc.text(`Data do contrato: ${formatDate(contract.startDate)}`, 14, y); y += 7;
  doc.text(
    `Status: ${archived ? "Quitado / Arquivado" : contract.active ? "Ativo" : "Quitado"}`,
    14,
    y,
  );
  y += 10;

  doc.setFontSize(12);
  doc.text("Parcelas", 14, y); y += 8;
  doc.setFontSize(10);

  [...installments]
    .sort((a, b) => a.number - b.number)
    .forEach((i) => {
      if (y > 275) { doc.addPage(); y = 18; }
      const statusTxt = i.paid
        ? `Paga em ${formatDate(i.paidDate ?? "")}`
        : !archived && isOverdue(i)
          ? "Vencida"
          : "Pendente";
      const detail = `Parcela ${i.number} · ${formatCurrency(i.total)} · vence ${formatDate(i.dueDate)} · ${statusTxt}`;
      doc.text(detail, 14, y);
      y += 7;
    });

  doc.save(`contrato_${clientName.replace(/\s+/g, "_")}.pdf`);
}
