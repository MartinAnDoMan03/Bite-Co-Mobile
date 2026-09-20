import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildInvoiceHTML } from './invoiceTemplate';

export async function shareInvoice({ order, sellerName, viewerRole = 'buyer' }) {
    const html = buildInvoiceHTML({ order, sellerName, viewerRole });

    if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
    }

    const { uri } = await Print.printToFileAsync({ html });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Invoice Bite&Co' });
    }
    return uri;
}