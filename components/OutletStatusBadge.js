import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getOutletStatus } from '../app/services/OutletStatusService';

const STATUS_STYLES = {
  open: null,
  closing_soon: {
    backgroundColor: '#FFF3CD',
    textColor: '#856404',
  },
  closed: {
    backgroundColor: '#F8D7DA',
    textColor: '#842029',
  },
};

export default function OutletStatusBadge({ seller }) {
  const { status, label } = getOutletStatus(seller);

  const style = STATUS_STYLES[status];

  if (!style) return null;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: style.backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: style.textColor,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,

    alignSelf: 'flex-start',

    // Supaya selalu berada di atas image
    zIndex: 999,
    elevation: 999,
  },

  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});