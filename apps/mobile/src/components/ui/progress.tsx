import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

export type ProgressVariant = 'default' | 'success' | 'warning' | 'destructive';

export interface ProgressProps {
  value?: number;
  max?: number;
  variant?: ProgressVariant;
  height?: number;
  animated?: boolean;
  style?: ViewStyle;
}

const variantColors: Record<ProgressVariant, string> = {
  default: colors.primary,
  success: colors.success,
  warning: colors.warning,
  destructive: colors.destructive,
};

export function Progress({
  value = 0,
  max = 100,
  variant = 'default',
  height = 8,
  animated = true,
  style,
}: ProgressProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: percentage,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(percentage);
    }
  }, [percentage, animated, widthAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.container,
        { height, borderRadius: height / 2 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.bar,
          {
            width: animatedWidth,
            height,
            borderRadius: height / 2,
            backgroundColor: variantColors[variant],
          },
        ]}
      />
    </View>
  );
}

export interface CircularProgressProps {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressVariant;
  showValue?: boolean;
  style?: ViewStyle;
}

export function CircularProgress({
  value = 0,
  max = 100,
  size = 48,
  strokeWidth = 4,
  variant = 'default',
  showValue = false,
  style,
}: CircularProgressProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: percentage / 100,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [percentage, rotateAnim]);

  // For simplicity, using a view-based approach rather than SVG
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.circularContainer, { width: size, height: size }, style]}>
      <View
        style={[
          styles.circularBackground,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circularProgress,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderTopColor: variantColors[variant],
            borderRightColor: percentage > 25 ? variantColors[variant] : 'transparent',
            borderBottomColor: percentage > 50 ? variantColors[variant] : 'transparent',
            borderLeftColor: percentage > 75 ? variantColors[variant] : 'transparent',
            transform: [{ rotate: rotation }],
          },
        ]}
      />
      {showValue && (
        <View style={styles.circularValueContainer}>
          <Animated.Text style={styles.circularValue}>
            {Math.round(percentage)}%
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  circularContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularBackground: {
    position: 'absolute',
    borderColor: colors.muted,
  },
  circularProgress: {
    position: 'absolute',
    borderColor: 'transparent',
  },
  circularValueContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
});
