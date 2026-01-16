import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';

export interface SwitchProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  style?: ViewStyle;
}

const sizeConfig = {
  sm: { track: { width: 36, height: 20 }, thumb: 16 },
  default: { track: { width: 44, height: 24 }, thumb: 20 },
  lg: { track: { width: 52, height: 28 }, thumb: 24 },
};

export function Switch({
  value = false,
  onValueChange,
  disabled = false,
  size = 'default',
  style,
}: SwitchProps) {
  const translateX = useRef(new Animated.Value(value ? 1 : 0)).current;
  const config = sizeConfig[size];
  const padding = 2;
  const travelDistance = config.track.width - config.thumb - padding * 2;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [value, translateX]);

  const thumbPosition = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [padding, padding + travelDistance],
  });

  const handlePress = () => {
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled}
      style={style}
    >
      <View
        style={[
          styles.track,
          config.track,
          value ? styles.trackActive : styles.trackInactive,
          disabled && styles.disabled,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              width: config.thumb,
              height: config.thumb,
              borderRadius: config.thumb / 2,
              transform: [{ translateX: thumbPosition }],
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 12,
    justifyContent: 'center',
  },
  trackActive: {
    backgroundColor: colors.primary,
  },
  trackInactive: {
    backgroundColor: colors.muted,
  },
  thumb: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
