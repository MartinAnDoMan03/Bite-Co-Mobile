import { LOGO_BASE64 } from './logoBase64';

export function buildInvoiceHTML({ order, sellerName, viewerRole }) {
  const items = order.items || [];
  const adminFee = order.adminFee || 0;
  const total = order.totalAmount || 0;
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || item.quantity || 1), 0);
  const discount = Math.max(0, subtotal + adminFee - total);
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
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 32px; color: #23272f; }

          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #711330; padding-bottom: 16px; margin-bottom: 20px; }
          .header-brand { display: flex; align-items: center; gap: 14px; }
          .header-brand img { height: 52px; width: auto; display: block; }
          .header-brand-text h1 { color: #711330; font-size: 20px; margin: 0; line-height: 1.2; }
          .header-brand-text .tagline { color: #999; font-size: 11px; margin-top: 2px; }
          .header-title { text-align: right; }
          .header-title .label { font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #711330; text-transform: uppercase; }
          .header-title .order-id { font-size: 11px; color: #999; margin-top: 2px; }

          .muted { color: #666; font-size: 12px; }

          .meta-box { background: #faf5f6; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
          .meta-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
          .meta-row .k { color: #888; }
          .meta-row .v { color: #23272f; font-weight: 600; }

          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { text-align: left; background: #f7f7f8; padding: 8px 6px; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 9px 6px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }

          .summary { display: flex; justify-content: flex-end; margin-top: 16px; }
          .summary-box { width: 260px; }
          .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .summary-total { font-weight: 700; font-size: 15px; border-top: 1px solid #ddd; margin-top: 8px; padding-top: 8px; color: #711330; }
          .discount { color: #2E7D32; }
          .net-seller { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ddd; color: #711330; font-weight: 600; }

          .footer { margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; text-align: center; }
          .footer .thanks { font-size: 12px; color: #666; }
          .footer .system-note { font-size: 10px; color: #bbb; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-brand">
            <img src="${LOGO_BASE64}" />
            <div class="header-brand-text">
              <h1>Bite&amp;Co</h1>
              <div class="tagline">Catering &amp; Event Order Platform</div>
            </div>
          </div>
          <div class="header-title">
            <div class="label">Invoice</div>
            <div class="order-id">#${order.id || '-'}</div>
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-row"><span class="k">Tanggal</span><span class="v">${order.createdAt ? new Date(order.createdAt).toLocaleString('id-ID') : '-'}</span></div>
          <div class="meta-row"><span class="k">Toko</span><span class="v">${sellerName || '-'}</span></div>
        </div>

        <table>
          <thead>
            <tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Harga</th></tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <div class="summary">
          <div class="summary-box">
            <div class="summary-row"><span>Subtotal</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div>
            ${discount > 0 ? `<div class="summary-row discount"><span>Diskon</span><span>- Rp ${discount.toLocaleString('id-ID')}</span></div>` : ''}
            ${adminFee > 0 ? `<div class="summary-row"><span>Biaya Admin</span><span>Rp ${adminFee.toLocaleString('id-ID')}</span></div>` : ''}
            <div class="summary-row summary-total"><span>Total Pembayaran</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
            ${viewerRole === 'seller' && adminFee > 0 ? `
              <div class="summary-row net-seller">
                <span>Pendapatan Bersih Anda</span><span>Rp ${netForSeller.toLocaleString('id-ID')}</span>
              </div>` : ''}
          </div>
        </div>

        <div class="footer">
          <div class="thanks">Terima kasih telah menggunakan Bite&amp;Co.</div>
          <div class="system-note">Invoice ini dibuat otomatis oleh sistem Bite&amp;Co.</div>
        </div>
      </body>
    </html>
  `;
}