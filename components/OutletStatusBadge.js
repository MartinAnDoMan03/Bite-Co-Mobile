import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getOutletStatus } from '../app/services/OutletStatusService';

const STATUS_STYLES = {
  open: null, // buka -> nggak nampilin badge apa-apa
  closing_soon: {
    backgroundColor: '#FFF3CD',
    textColor: '#856404',
  },
  closed: {
    backgroundColor: '#F8D7DA',
    textColor: '#842029',
  },
};

/**
 * Badge kecil status outlet, dipasang di card outlet.
 * @param {Object} props
 * @param {Object} props.seller - data seller yang punya openTime, closeTime, isManuallyClosed
 */
export default function OutletStatusBadge({ seller }) {
  const { status, label } = getOutletStatus(seller);
  const style = STATUS_STYLES[status];

  // Status "open" -> card bersih, nggak ada badge
  if (!style) return null;

  return (
    <View style={[styles.badge, { backgroundColor: style.backgroundColor }]}>
      <Text style={[styles.text, { color: style.textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});