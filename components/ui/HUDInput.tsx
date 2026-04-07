import React, { useCallback, useState } from 'react';
import { Platform, TextInput, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HUDInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  unit?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  error?: string;
  secureTextEntry?: boolean;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

/** surface_container_lowest — recessed field bed */
const COLOR_FIELD_BG = Colors.surface.containerLowest;

/** outline_variant at 20% opacity — ghost border at rest */
const COLOR_BORDER_REST = 'rgba(70, 70, 92, 0.20)';

/** primary_dim — focus glow ring */
const COLOR_BORDER_FOCUS = Colors.primary.dim;

/** Body text */
const COLOR_TEXT = Colors.text.primary;

/** Placeholder + unit muted tone */
const COLOR_MUTED = Colors.text.muted;

/** Label above field */
const COLOR_LABEL = Colors.text.secondary;

/** Error state */
const COLOR_ERROR = Colors.error.DEFAULT;

/** How long focus transitions animate (ms) */
const FOCUS_DURATION_MS = 200;

/** Easing curve for focus in/out */
const FOCUS_EASING = Easing.out(Easing.quad);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds the iOS neon glow shadow for the focused border ring.
 * Returns an empty object on Android where box-shadow is unavailable.
 */
function buildFocusGlow(active: boolean): object {
  if (Platform.OS !== 'ios' || !active) return {};
  return {
    shadowColor: COLOR_BORDER_FOCUS,
    shadowRadius: 10,
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 0 },
  };
}

/**
 * Simulates an inner recessed look on iOS by adding a subtle inward shadow
 * at the top edge (darker overlay). On Android we approximate with a slightly
 * elevated inner background — the backgroundColor contrast does most of the work.
 */
function buildRecessShadow(): object {
  if (Platform.OS !== 'ios') return {};
  return {
    shadowColor: '#000000',
    shadowRadius: 4,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 2 },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HUDInput({
  value,
  onChangeText,
  placeholder,
  label,
  unit,
  keyboardType = 'default',
  multiline = false,
  maxLength,
  autoFocus = false,
  error,
  secureTextEntry = false,
}: HUDInputProps) {
  // Internal focus state — drives reanimated transitions
  const [isFocused, setIsFocused] = useState(false);

  // 0 = blurred, 1 = focused; drives interpolateColor + borderWidth interpolation
  const focusProgress = useSharedValue(0);

  // ── Animated border container ──────────────────────────────────────────────
  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      [COLOR_BORDER_REST, COLOR_BORDER_FOCUS],
    );

    // Smoothly expand border width from 1.5 → 2 on focus
    const borderWidth = 1.5 + focusProgress.value * 0.5;

    return { borderColor, borderWidth };
  });

  // ── Animated error message (fade in) ──────────────────────────────────────
  const hasError = error != null && error.length > 0;
  const errorOpacity = useSharedValue(hasError ? 1 : 0);

  // Keep error opacity in sync when prop changes
  React.useEffect(() => {
    errorOpacity.value = withTiming(hasError ? 1 : 0, {
      duration: 220,
      easing: FOCUS_EASING,
    });
  }, [hasError, errorOpacity]);

  const animatedErrorStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
  }));

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, {
      duration: FOCUS_DURATION_MS,
      easing: FOCUS_EASING,
    });
  }, [focusProgress]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, {
      duration: FOCUS_DURATION_MS,
      easing: FOCUS_EASING,
    });
  }, [focusProgress]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.wrapper}>

      {/* Floating label */}
      {label != null && (
        <Text style={styles.label} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      )}

      {/* Animated border + recessed field */}
      <Animated.View
        style={[
          styles.fieldContainer,
          animatedBorderStyle,
          isFocused && buildFocusGlow(true),
        ]}
      >
        {/* Inner recessed shadow layer */}
        <View style={[styles.recessLayer, buildRecessShadow()]}>

          {/* Text input */}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLOR_MUTED}
            keyboardType={keyboardType}
            multiline={multiline}
            maxLength={maxLength}
            autoFocus={autoFocus}
            secureTextEntry={secureTextEntry}
            onFocus={handleFocus}
            onBlur={handleBlur}
            selectionColor={COLOR_BORDER_FOCUS}
            cursorColor={COLOR_BORDER_FOCUS}
            style={[
              styles.textInput,
              unit != null && styles.textInputWithUnit,
              multiline && styles.textInputMultiline,
            ]}
            // Prevent native keyboard from pushing layout unexpectedly
            scrollEnabled={multiline}
          />

          {/* Unit suffix */}
          {unit != null && (
            <Text style={styles.unit} numberOfLines={1}>
              {unit}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Error message — fades in when error prop is set */}
      <Animated.View style={[styles.errorContainer, animatedErrorStyle]}>
        {hasError && (
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
        )}
      </Animated.View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    // Let parent control width; stack vertically
    alignSelf: 'stretch',
  },

  label: {
    fontFamily: 'Lexend-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: COLOR_LABEL,
    marginBottom: 6,
  },

  fieldContainer: {
    borderRadius: 12,
    // Base border values — Reanimated overrides these at runtime
    borderWidth: 1.5,
    borderColor: COLOR_BORDER_REST,
    // Clip inner recess shadow to rounded corners
    overflow: 'hidden',
  },

  recessLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR_FIELD_BG,
    borderRadius: 11, // 1px inset from outer 12px to prevent bleed
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  textInput: {
    flex: 1,
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 16,
    color: COLOR_TEXT,
    // Remove default Android underline
    borderBottomWidth: 0,
    // Remove default RN text input padding on Android
    paddingVertical: 0,
    paddingHorizontal: 0,
    // Prevent text from being clipped on iOS
    includeFontPadding: false,
  },

  textInputWithUnit: {
    // Give space before unit badge
    marginRight: 8,
  },

  textInputMultiline: {
    // Allow natural height growth; min 3 lines
    minHeight: 72,
    textAlignVertical: 'top',
  },

  unit: {
    fontFamily: 'Lexend-SemiBold',
    fontSize: 13,
    color: COLOR_MUTED,
    // Prevent unit from participating in text input flex
    flexShrink: 0,
  },

  errorContainer: {
    marginTop: 6,
    minHeight: 16, // Reserve space so layout doesn't jump
  },

  errorText: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 11,
    color: COLOR_ERROR,
    lineHeight: 16,
  },
});

export default HUDInput;
