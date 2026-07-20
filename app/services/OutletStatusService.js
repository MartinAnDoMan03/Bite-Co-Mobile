/**
 * Menghitung status buka/tutup sebuah outlet berdasarkan jam operasional
 * dan flag manual dari seller.
 *
 * @param {Object} seller
 * @param {string|null} seller.openTime   - format "HH:mm", contoh "08:00"
 * @param {string|null} seller.closeTime  - format "HH:mm", contoh "21:00"
 * @param {boolean} seller.isManuallyClosed
 * @returns {{ status: 'open'|'closing_soon'|'closed', label: string, nextOpenLabel: string|null }}
 */
export function getOutletStatus(seller) {
  const { openTime, closeTime, isManuallyClosed } = seller || {};

  // Kalau seller belum pernah set jam operasional, anggap selalu buka
  // (biar seller lama yang belum pakai fitur ini nggak keblokir)
  if (!openTime || !closeTime) {
    if (isManuallyClosed) {
      return {
        status: 'closed',
        label: 'Tutup',
        nextOpenLabel: null,
      };
    }
    return { status: 'open', label: 'Buka', nextOpenLabel: null };
  }

  if (isManuallyClosed) {
    return {
      status: 'closed',
      label: 'Tutup',
      nextOpenLabel: `Buka lagi jam ${openTime}`,
    };
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const openMinutes = toMinutes(openTime);
  const closeMinutes = toMinutes(closeTime);

  // Handle kasus jam operasional lintas hari (misal buka 18:00 - tutup 02:00)
  const isOvernight = closeMinutes < openMinutes;

  let isWithinOperatingHours;
  if (isOvernight) {
    isWithinOperatingHours = nowMinutes >= openMinutes || nowMinutes < closeMinutes;
  } else {
    isWithinOperatingHours = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }

  if (!isWithinOperatingHours) {
    return {
      status: 'closed',
      label: 'Tutup',
      nextOpenLabel: `Buka lagi jam ${openTime}`,
    };
  }

  // Cek apakah dalam 30 menit menjelang closeTime
  const minutesUntilClose = isOvernight && nowMinutes < closeMinutes
    ? closeMinutes - nowMinutes
    : closeMinutes - nowMinutes;

  if (minutesUntilClose <= 30 && minutesUntilClose > 0) {
    return {
      status: 'closing_soon',
      label: 'Tutup sebentar lagi',
      nextOpenLabel: null,
    };
  }

  return { status: 'open', label: 'Buka', nextOpenLabel: null };
}

/**
 * Helper buat dipakai di tombol pesan / tambah keranjang
 * @param {Object} seller
 * @returns {boolean}
 */
export function isOutletOrderable(seller) {
  const { status } = getOutletStatus(seller);
  return status !== 'closed';
}