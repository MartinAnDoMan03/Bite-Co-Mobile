export function buildInvoiceHTML({ order, sellerName, viewerRole }) {
  const items = order.items || [];
  const subtotal = order.subtotal ?? order.totalAmount ?? 0;
  const discount = order.discountAmount || 0;
  const adminFee = order.adminFee || 0;
  const total = order.totalAmount || 0;
  const netForSeller = total - adminFee; 

  const itemRows = items.map(item => `
    <tr>
      <td>${item.name || '-'}</td>
      <td style="text-align:center;">${item.qty ?? item.quantity ?? 1}</td>
      <td style="text-align:right;">Rp ${(item.price || 0).toLocaleString('id-ID')}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
      <title>Invoice-${order.id || 'Bite&Co'}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #23272f; }
          h1 { color: #711330; font-size: 20px; margin-bottom: 4px; }
          .muted { color: #666; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { text-align: left; border-bottom: 1px solid #ddd; padding: 6px 4px; font-size: 12px; color: #666; }
          td { padding: 8px 4px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
          .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .summary-total { font-weight: 700; font-size: 15px; border-top: 1px solid #ddd; margin-top: 8px; padding-top: 8px; }
          .discount { color: #2E7D32; }
        </style>
      </head>
      <body>
        <h1>Invoice — Bite&amp;Co</h1>
        <p class="muted">Order ID: ${order.id || '-'}</p>
        <p class="muted">Tanggal: ${order.createdAt ? new Date(order.createdAt).toLocaleString('id-ID') : '-'}</p>
        <p class="muted">Toko: ${sellerName || '-'}</p>

        <table>
          <thead>
            <tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Harga</th></tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <div style="margin-top:16px;">
          <div class="summary-row"><span>Subtotal</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div>
          ${discount > 0 ? `<div class="summary-row discount"><span>Diskon</span><span>- Rp ${discount.toLocaleString('id-ID')}</span></div>` : ''}
          ${adminFee > 0 ? `<div class="summary-row"><span>Biaya Admin</span><span>Rp ${adminFee.toLocaleString('id-ID')}</span></div>` : ''}
          <div class="summary-row summary-total"><span>Total Pembayaran</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
          ${viewerRole === 'seller' && adminFee > 0 ? `
            <div class="summary-row" style="margin-top:8px; color:#711330;">
              <span>Pendapatan Bersih Anda (setelah biaya admin)</span><span>Rp ${netForSeller.toLocaleString('id-ID')}</span>
            </div>` : ''}
        </div>

        <p class="muted" style="margin-top:24px;">Terima kasih telah menggunakan Bite&amp;Co.</p>
      </body>
    </html>
  `;
}