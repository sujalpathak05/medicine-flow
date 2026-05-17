export interface InvoiceItem {
  name: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  totalPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  branchName: string;
  soldBy: string;
  customerName: string;
  customerPhone: string;
  doctorName: string;
  items: InvoiceItem[];
  totalAmount: number;
  discount: number;
  cgst: number;
  sgst: number;
  gstAmount: number;
  netAmount: number;
  paymentMethod: string;
}

export interface InvoiceSettings {
  name: string;
  address: string;
  phone: string;
  gstin: string;
  email: string;
  tagline: string;
  footer_note: string;
}

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export function buildInvoiceHTML(s: InvoiceData, p: InvoiceSettings): string {
  const taxable = s.totalAmount - s.gstAmount;
  return `
  <div class="bill">
    <div class="header">
      <h1>${esc(p.name)}</h1>
      ${p.tagline ? `<div class="tag">${esc(p.tagline)}</div>` : ""}
      ${p.address ? `<div class="addr">${esc(p.address)}</div>` : ""}
      ${p.phone || p.email ? `<div class="addr">${p.phone ? `📞 ${esc(p.phone)}` : ""}${p.phone && p.email ? " | " : ""}${p.email ? `✉️ ${esc(p.email)}` : ""}</div>` : ""}
      ${p.gstin ? `<div class="addr"><strong>GSTIN:</strong> ${esc(p.gstin)}</div>` : ""}
      <div class="gst-title">TAX INVOICE</div>
    </div>
    <div class="info">
      <div class="info-row"><span><strong>Invoice:</strong> ${esc(s.invoiceNumber)}</span><span>${esc(s.date)}</span></div>
      <div class="info-row"><span><strong>Branch:</strong> ${esc(s.branchName)}</span><span><strong>Sold by:</strong> ${esc(s.soldBy)}</span></div>
      ${s.customerName ? `<div class="info-row"><span><strong>Customer:</strong> ${esc(s.customerName)}</span>${s.customerPhone ? `<span>${esc(s.customerPhone)}</span>` : ""}</div>` : ""}
      ${s.doctorName ? `<div class="info-row"><span><strong>Doctor:</strong> Dr. ${esc(s.doctorName)}</span></div>` : ""}
    </div>
    <table>
      <thead><tr>
        <th>Item</th><th>HSN</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Rate</th>
        <th style="text-align:right">GST%</th>
        <th style="text-align:right">Total</th>
      </tr></thead>
      <tbody>
        ${s.items.map(i => `
          <tr>
            <td>${esc(i.name)}</td>
            <td>${esc(i.hsnCode || "-")}</td>
            <td style="text-align:right">${i.quantity}</td>
            <td style="text-align:right">₹${i.unitPrice.toFixed(2)}</td>
            <td style="text-align:right">${i.gstRate}%</td>
            <td style="text-align:right">₹${i.totalPrice.toFixed(2)}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Taxable Value</span><span>₹${taxable.toFixed(2)}</span></div>
      <div class="totals-row"><span>CGST</span><span>₹${s.cgst.toFixed(2)}</span></div>
      <div class="totals-row"><span>SGST</span><span>₹${s.sgst.toFixed(2)}</span></div>
      <div class="totals-row"><span>Subtotal (incl. GST)</span><span>₹${s.totalAmount.toFixed(2)}</span></div>
      ${s.discount > 0 ? `<div class="totals-row" style="color:green"><span>Discount</span><span>-₹${s.discount.toFixed(2)}</span></div>` : ""}
      <div class="totals-row net"><span>Net Payable</span><span>₹${s.netAmount.toFixed(2)}</span></div>
      <div class="totals-row" style="font-size:11px;margin-top:6px"><span>Payment Mode</span><span style="text-transform:uppercase">${esc(s.paymentMethod)}</span></div>
    </div>
    <div class="footer">
      <p>${esc(p.footer_note)}</p>
      ${p.gstin ? `<p style="margin-top:4px">This is a computer-generated GST invoice.</p>` : ""}
    </div>
  </div>`;
}

export const INVOICE_PRINT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', sans-serif; padding: 16px; color: #1a1a1a; }
  .bill { max-width: 420px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
  .header h1 { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
  .header .tag { font-size: 11px; color: #555; font-style: italic; margin-top: 2px; }
  .header .addr { font-size: 11px; color: #333; margin-top: 4px; line-height: 1.4; }
  .header .gst-title { display: inline-block; margin-top: 6px; padding: 2px 10px; border: 1px solid #000; font-size: 12px; font-weight: 700; letter-spacing: 1px; }
  .info { font-size: 12px; margin-bottom: 10px; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
  th { text-align: left; border-bottom: 1px solid #000; padding: 4px 2px; font-weight: 700; background: #f5f5f5; }
  td { padding: 4px 2px; border-bottom: 1px dashed #ccc; }
  .totals { border-top: 2px solid #000; padding-top: 8px; font-size: 12px; }
  .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
  .net { font-weight: 800; font-size: 15px; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px; }
  .footer { text-align: center; margin-top: 14px; font-size: 10px; color: #555; border-top: 2px dashed #999; padding-top: 8px; }
  @media print { body { padding: 0; } }
`;

export function printInvoice(s: InvoiceData, p: InvoiceSettings) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>GST Invoice - ${esc(s.invoiceNumber)}</title><style>${INVOICE_PRINT_CSS}</style></head><body>${buildInvoiceHTML(s, p)}<script>window.onload=function(){window.print();}</script></body></html>`);
  w.document.close();
}