import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';

export interface FilterOption {
  value: string;
  label: string;
  icon?: string;
}

export interface FilterChipsProps {
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  style?: ViewStyle;
  scrollable?: boolean;
}

export function FilterChips({
  options,
  selected,
  onSelect,
  style,
  scrollable = true,
}: FilterChipsProps) {
  const content = (
    <View style={[styles.container, !scrollable && style]}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, isSelected && styles.chipActive]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
          >
            {option.icon && (
              <Icon
                name={option.icon}
                size={16}
                color={isSelected ? colors.foreground : colors.mutedForeground}
                style={styles.chipIcon}
              />
            )}
            <Text
              style={[styles.chipText, isSelected && styles.chipTextActive]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
        contentContainerStyle={styles.scrollContent}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
}

// Multi-select variant
export interface MultiFilterChipsProps {
  options: FilterOption[];
  selected: string[];
  onSelect: (values: string[]) => void;
  style?: ViewStyle;
}

export function MultiFilterChips({
  options,
  selected,
  onSelect,
  style,
}: MultiFilterChipsProps) {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onSelect(selected.filter((v) => v !== value));
    } else {
      onSelect([...selected, value]);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.container}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => handleToggle(option.value)}
              activeOpacity={0.7}
            >
              {option.icon && (
                <Icon
                  name={option.icon}
                  size={16}
                  color={isSelected ? colors.foreground : colors.mutedForeground}
                  style={styles.chipIcon}
                />
              )}
              <Text
                style={[styles.chipText, isSelected && styles.chipTextActive]}
              >
                {option.label}
              </Text>
              {isSelected && (
                <Icon
                  name="check"
                  size={14}
                  color={colors.foreground}
                  style={styles.checkIcon}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.foreground,
  },
  checkIcon: {
    marginLeft: 4,
  },
});
