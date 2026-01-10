import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text, PlatformColor, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LiquidGlassView, LiquidGlassContainerView } from '@callstack/liquid-glass';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Match web app's icon style (Material Symbols)
const TAB_ICONS: Record<string, string> = {
  Discover: 'book-open-page-variant-outline', // Maps to web's discover icon (book/map style)
  MyCampaigns: 'home-outline',                 // Home icon for campaigns
  Wallet: 'credit-card-outline',               // Credit card for wallet
  Profile: 'account-circle-outline',           // Profile icon
};

const TAB_LABELS: Record<string, string> = {
  Discover: 'Discover',
  MyCampaigns: 'Campaigns',
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
  const tabWidth = (SCREEN_WIDTH - 32) / numTabs; // Account for padding

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
      {/* Full tab bar glass background */}
      <LiquidGlassView style={styles.tabBarBackground} effect="regular" />

      {/* Content layer with animated pill and tabs */}
      <View style={styles.contentLayer}>
        {/* Animated glass pill indicator */}
        <Animated.View style={[styles.pillContainer, pillAnimatedStyle, { width: tabWidth }]}>
          <LiquidGlassView
            style={styles.pill}
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

            const iconName = TAB_ICONS[route.name] || 'circle-outline';
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
                <Icon
                  name={iconName}
                  size={24}
                  color={isFocused ? colors.foreground : colors.mutedForeground}
                />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    marginHorizontal: 0,
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
});
