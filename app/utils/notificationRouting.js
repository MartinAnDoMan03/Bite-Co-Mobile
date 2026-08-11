// Decides where tapping a notification should take the user, based on the
// order's status at the time the notification was created — not just the
// notification type. Falls back to the detail page for anything we don't
// have a more specific destination for.

export function getBuyerNotificationRoute(data) {
  if (!data?.orderId) return null;

  switch (data.status) {
    case 'processing':
    case 'delivery':
    case 'recurring':
      return '/buyer/StatusOrder';
    case 'approved_awaiting_payment':
      return `/buyer/(tabs)/riwayat?filter=pembayaran`;
    default:
      return `/buyer/DetailOrder?orderId=${data.orderId}`;
  }
}

export function getSellerNotificationRoute(data) {
  if (!data?.orderId) return null;

  if (data.status === 'awaiting_seller_approval') {
    return 'seller/(tabs)/order?filter=diproses';
  }

  return `/seller/DetailOrder?orderId=${data.orderId}`;
}