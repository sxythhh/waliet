import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

export type SeparatorOrientation = 'horizontal' | 'vertical';

export interface SeparatorProps {
  orientation?: SeparatorOrientation;
  color?: string;
  thickness?: number;
  spacing?: number;
  style?: ViewStyle;
}

export function Separator({
  orientation = 'horizontal',
  color = colors.border,
  thickness = 1,
  spacing = 0,
  style,
}: SeparatorProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <View
      style={[
        isHorizontal ? styles.horizontal : styles.vertical,
        {
          backgroundColor: color,
          [isHorizontal ? 'height' : 'width']: thickness,
          [isHorizontal ? 'marginVertical' : 'marginHorizontal']: spacing,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
  },
  vertical: {
    height: '100%',
  },
});
