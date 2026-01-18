import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text, Image, ImageSourcePropType } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LiquidGlassView, LiquidGlassContainerView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab icon images - React Native automatically selects @2x/@3x based on device
const TAB_ICONS: Record<string, { inactive: ImageSourcePropType; active: ImageSourcePropType }> = {
  Home: {
    inactive: require('../assets/home-inactive-new.png'),
    active: require('../assets/home-active-new.png'),
  },
  Discover: {
    inactive: require('../assets/discover-inactive.png'),
    active: require('../assets/discover-active.png'),
  },
  Wallet: {
    inactive: require('../assets/wallet-inactive.png'),
    active: require('../assets/wallet-active.png'),
  },
  Profile: {
    inactive: require('../assets/settings-inactive.png'),
    active: require('../assets/settings-active.png'),
  },
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Home',
  Discover: 'Discover',
  Wallet: 'Wallet',
  Profile: 'Profile',
};

// Spring config for smooth morphing animation
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

export function LiquidGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const numTabs = state.routes.length;
  const barWidth = SCREEN_WIDTH - 32;
  const tabWidth = barWidth / numTabs;

  // Animated value for the pill position
  const activeIndex = useSharedValue(state.index);

  // Update animation when tab changes
  React.useEffect(() => {
    activeIndex.value = withSpring(state.index, SPRING_CONFIG);
  }, [state.index]);

  // Animated style for the floating glass pill
  const pillAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: interpolate(activeIndex.value, [0, numTabs - 1], [0, (numTabs - 1) * tabWidth]) },
      ],
    };
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <LiquidGlassContainerView style={styles.barContainer}>
          {/* Full tab bar glass background */}
          <LiquidGlassView
            style={[
              styles.tabBarBackground,
              !isLiquidGlassSupported && styles.fallbackBackground,
            ]}
            effect="regular"
          />

          {/* Content layer with animated pill and tabs */}
          <View style={styles.contentLayer}>
          {/* Animated glass pill indicator - will merge with background on iOS 26+ */}
          <Animated.View style={[styles.pillContainer, pillAnimatedStyle, { width: tabWidth }]}>
            <LiquidGlassView
              style={[
                styles.pill,
                !isLiquidGlassSupported && styles.fallbackPill,
              ]}
              effect="clear"
              interactive
            />
          </Animated.View>

          {/* Tab buttons */}
          <View style={styles.tabsRow}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              const iconSet = TAB_ICONS[route.name];
              const label = TAB_LABELS[route.name] || route.name;

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={[styles.tab, { width: tabWidth }]}
                  activeOpacity={0.7}
                >
                  {iconSet && (
                    <Image
                      source={isFocused ? iconSet.active : iconSet.inactive}
                      style={styles.tabIcon}
                    />
                  )}
                  <Text
                    style={[
                      styles.label,
                      { color: isFocused ? colors.foreground : colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </LiquidGlassContainerView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 8,
  },
  barContainer: {
    width: SCREEN_WIDTH - 32,
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  contentLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    position: 'relative',
  },
  pillContainer: {
    position: 'absolute',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  pill: {
    width: '100%',
    height: 48,
    borderRadius: 16,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    zIndex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  // Fallback styles for non-iOS 26 devices (darker)
  fallbackBackground: {
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
  },
  fallbackPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
