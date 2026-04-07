import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGlowPulse } from '@/hooks/use-glow-pulse';
import { usePressScale } from '@/hooks/use-press-scale';
import { Colors, IconSize } from '@/constants/theme';

// ─── Design tokens ──────────────────────────────────────────────────────────
const ACCENT = Colors.primary.DEFAULT;
const INACTIVE = Colors.text.muted;
const BAR_BG = 'rgba(12,12,31,0.95)';
const BAR_BORDER = 'rgba(206,150,255,0.1)';
const BAR_HEIGHT = 64;

// ─── Icon map ────────────────────────────────────────────────────────────────
type FAIconName = React.ComponentProps<typeof FontAwesome>['name'];

// All tab icons use the same size (IconSize.md = 18) for consistency
const ICON_MAP: Record<string, { icon: FAIconName; size: number }> = {
  shop:    { icon: 'shopping-bag', size: IconSize.md },
  profile: { icon: 'user',         size: IconSize.md },
  home:    { icon: 'home',         size: IconSize.md },
  clan:    { icon: 'shield',       size: IconSize.md },
  coach:   { icon: 'bolt',         size: IconSize.md },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface NormalTabProps {
  routeName: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function NormalTab({ routeName, label, isFocused, onPress, onLongPress }: NormalTabProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.9);
  const { glowStyle } = useGlowPulse(ACCENT, 0.5, 1.0, 2400, isFocused);

  const entry = ICON_MAP[routeName] ?? { icon: 'circle' as FAIconName, size: 18 };
  const iconColor = isFocused ? ACCENT : INACTIVE;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[{ alignItems: 'center', gap: 4 }, animatedStyle]}>
        {/* Icon */}
        <FontAwesome name={entry.icon} size={entry.size} color={iconColor} />

        {/* Label — only shown when active */}
        {isFocused && (
          <Animated.Text
            style={{
              fontFamily: 'SpaceMono',
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: ACCENT,
            }}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
        )}

        {/* Glow dot indicator */}
        {isFocused && (
          <Animated.View
            style={[
              {
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: ACCENT,
                // Elevate shadow for iOS glow
                ...Platform.select({
                  ios: {
                    shadowColor: ACCENT,
                    shadowOpacity: 0.9,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                  },
                  android: { elevation: 4 },
                }),
              },
              glowStyle,
            ]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Visible tab order ────────────────────────────────────────────────────────
const VISIBLE_ROUTE_ORDER = ['shop', 'profile', 'home', 'clan', 'coach'] as const;
const VISIBLE_ROUTE_SET = new Set<string>(VISIBLE_ROUTE_ORDER);

// ─── Main component ───────────────────────────────────────────────────────────

export function GlowingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute.key]?.options as {
    href?: null | string;
    tabBarStyle?: object | object[];
  } | undefined;
  const flattenedTabBarStyle = StyleSheet.flatten(currentOptions?.tabBarStyle) as
    | { display?: string }
    | undefined;
  const shouldHideBar =
    currentOptions?.href === null ||
    flattenedTabBarStyle?.display === 'none' ||
    !VISIBLE_ROUTE_SET.has(currentRoute.name);

  if (shouldHideBar) {
    return null;
  }

  const visibleRoutes = state.routes.filter((route) => {
    const opts = descriptors[route.key]?.options as { href?: null | string } | undefined;
    return opts?.href !== null && VISIBLE_ROUTE_SET.has(route.name);
  });

  const sortedRoutes = [...visibleRoutes].sort((a, b) => {
    return VISIBLE_ROUTE_ORDER.indexOf(a.name as (typeof VISIBLE_ROUTE_ORDER)[number])
      - VISIBLE_ROUTE_ORDER.indexOf(b.name as (typeof VISIBLE_ROUTE_ORDER)[number]);
  });

  const totalHeight = BAR_HEIGHT + insets.bottom;

  return (
    <View
      style={{
        height: totalHeight,
      }}
    >
      <View
        style={{
          height: totalHeight,
          backgroundColor: BAR_BG,
          borderTopWidth: 0.5,
          borderTopColor: BAR_BORDER,
          flexDirection: 'row',
          alignItems: 'stretch',
          paddingBottom: insets.bottom,
        }}
      >
        {sortedRoutes.map((route) => {
          const isFocused = state.index === state.routes.indexOf(route);
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <NormalTab
              key={route.key}
              routeName={route.name}
              label={label}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

export default GlowingTabBar;
