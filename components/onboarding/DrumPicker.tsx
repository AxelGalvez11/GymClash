import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

export const DRUM_ITEM_H = 52;
const VISIBLE = 5;
export const DRUM_PICKER_H = DRUM_ITEM_H * VISIBLE; // 260
const PAD = 2; // empty rows above/below for first/last item centering

export interface DrumPickerItem {
  readonly label: string;
  readonly value: string;
}

interface DrumPickerProps {
  readonly items: ReadonlyArray<DrumPickerItem>;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly unit?: string;
}

// ── Math note ────────────────────────────────────────────────────────────────
// With PAD empty rows prepended, item[idx] sits at content-y = (PAD + idx) * DRUM_ITEM_H.
// Viewport center when scrollY=s is s + PICKER_H/2 = s + 2.5 * DRUM_ITEM_H.
// Centering item[idx]: (PAD + idx) * H + H/2 = s + 2.5*H  →  s = idx * H  ✓
// ─────────────────────────────────────────────────────────────────────────────

export function DrumPicker({ items, value, onChange, unit }: DrumPickerProps) {
  const listRef = useRef<FlatList>(null);
  const isScrolling = useRef(false);

  const rawIdx = items.findIndex((i) => i.value === value);
  const currentIdx = rawIdx >= 0 ? rawIdx : 0;

  // liveIdx tracks which item is centered IN REAL TIME during scroll
  const liveIdxRef = useRef(currentIdx);
  const [liveIdx, setLiveIdx] = useState(currentIdx);

  // Pad the list so first/last items can be centred without content inset tricks
  const paddedItems = useMemo<DrumPickerItem[]>(() => {
    const pad = (n: number): DrumPickerItem => ({ label: '', value: `__pad${n}__` });
    return [pad(0), pad(1), ...items, pad(2), pad(3)];
  }, [items]);

  // ── Mount: default value + initial scroll ────────────────────────────────
  useEffect(() => {
    if (!value || rawIdx < 0) {
      onChange(items[0]?.value ?? '');
    }
    liveIdxRef.current = currentIdx;
    setLiveIdx(currentIdx);
    const t = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: currentIdx * DRUM_ITEM_H,
        animated: false,
      });
    }, 80);
    return () => clearTimeout(t);
    // intentionally only runs on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── External value change (e.g. unit toggle) re-scrolls ─────────────────
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    if (isScrolling.current) return; // user is mid-scroll, ignore
    const newIdx = items.findIndex((i) => i.value === value);
    const target = newIdx >= 0 ? newIdx : 0;
    liveIdxRef.current = target;
    setLiveIdx(target);
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: target * DRUM_ITEM_H, animated: false });
    }, 60);
  }, [value, items]);

  // ── Real-time scroll tracking ────────────────────────────────────────────
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const next = Math.max(0, Math.min(Math.round(y / DRUM_ITEM_H), items.length - 1));
      if (next !== liveIdxRef.current) {
        liveIdxRef.current = next;
        setLiveIdx(next); // triggers highlight re-render only when index changes
      }
    },
    [items.length],
  );

  // ── Snap settle ─────────────────────────────────────────────────────────
  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrolling.current = false;
      const y = e.nativeEvent.contentOffset.y;
      const snapped = Math.max(0, Math.min(Math.round(y / DRUM_ITEM_H), items.length - 1));
      liveIdxRef.current = snapped;
      setLiveIdx(snapped);
      onChange(items[snapped].value);
    },
    [items, onChange],
  );

  // ── Virtualised item layout (required for FlatList to skip off-screen) ──
  const getItemLayout = useCallback(
    (_: ArrayLike<DrumPickerItem> | null | undefined, index: number) => ({
      length: DRUM_ITEM_H,
      offset: DRUM_ITEM_H * index,
      index,
    }),
    [],
  );

  // ── Render a single row ──────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: DrumPickerItem; index: number }) => {
      if (item.value.startsWith('__pad')) {
        return <View style={{ height: DRUM_ITEM_H }} />;
      }
      const realIdx = index - PAD; // position in original `items` array
      const dist = Math.abs(realIdx - liveIdx);
      const sel = dist === 0;
      return (
        <View style={{ height: DRUM_ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: sel ? 'Epilogue-Bold' : 'BeVietnamPro-Regular',
              fontSize: sel ? 28 : dist === 1 ? 20 : 16,
              color: sel ? '#ce96ff' : '#e5e3ff',
              opacity: sel ? 1 : dist === 1 ? 0.45 : 0.18,
              letterSpacing: sel ? 0.5 : 0,
            }}
          >
            {item.label}
            {unit && sel ? ` ${unit}` : ''}
          </Text>
        </View>
      );
    },
    [liveIdx, unit],
  );

  return (
    <View style={{ height: DRUM_PICKER_H, overflow: 'hidden' }}>
      {/* Centre highlight bar */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: PAD * DRUM_ITEM_H,
          left: 0,
          right: 0,
          height: DRUM_ITEM_H,
          backgroundColor: 'rgba(164,52,255,0.13)',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: 'rgba(206,150,255,0.35)',
          zIndex: 2,
        }}
      />

      {/* Top fade */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: PAD * DRUM_ITEM_H, zIndex: 3 }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(12,12,31,0.85)' }} />
        <View style={{ flex: 1, backgroundColor: 'rgba(12,12,31,0.45)' }} />
      </View>

      {/* Bottom fade */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: PAD * DRUM_ITEM_H, zIndex: 3 }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(12,12,31,0.45)' }} />
        <View style={{ flex: 1, backgroundColor: 'rgba(12,12,31,0.85)' }} />
      </View>

      <FlatList
        ref={listRef}
        data={paddedItems}
        keyExtractor={(item, i) => `${item.value}-${i}`}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        extraData={liveIdx}          // tells FlatList to re-render items when highlight changes
        showsVerticalScrollIndicator={false}
        snapToInterval={DRUM_ITEM_H}
        decelerationRate="fast"
        onScrollBeginDrag={() => { isScrolling.current = true; }}
        onScroll={handleScroll}
        scrollEventThrottle={16}    // ~60fps highlight tracking
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        windowSize={5}              // render ~5 screens worth (25 items) — virtualized
        maxToRenderPerBatch={8}
        initialNumToRender={7}      // just what's visible on mount
        removeClippedSubviews
      />
    </View>
  );
}
