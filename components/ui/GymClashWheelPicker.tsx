import WheelPicker, {
  type PickerItem,
  type WheelPickerProps,
} from '@quidone/react-native-wheel-picker';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

export interface GymClashWheelItem<T extends string | number> extends PickerItem<T> {
  readonly label: string;
}

interface GymClashWheelPickerProps<T extends string | number> {
  readonly data: ReadonlyArray<GymClashWheelItem<T>>;
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly itemHeight?: number;
  readonly visibleItemCount?: number;
  readonly width?: WheelPickerProps<GymClashWheelItem<T>>['width'];
  readonly enableScrollByTapOnItem?: boolean;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly itemTextStyle?: StyleProp<TextStyle>;
  readonly overlayItemStyle?: StyleProp<ViewStyle>;
}

export function GymClashWheelPicker<T extends string | number>({
  data,
  value,
  onChange,
  itemHeight = 52,
  visibleItemCount = 5,
  width = '100%',
  enableScrollByTapOnItem = true,
  testID,
  style,
  itemTextStyle,
  overlayItemStyle,
}: GymClashWheelPickerProps<T>) {
  return (
    <WheelPicker
      data={data}
      value={value}
      onValueChanged={({ item }) => onChange(item.value)}
      itemHeight={itemHeight}
      visibleItemCount={visibleItemCount}
      width={width}
      enableScrollByTapOnItem={enableScrollByTapOnItem}
      testID={testID}
      style={[styles.root, style]}
      itemTextStyle={[styles.itemText, itemTextStyle]}
      overlayItemStyle={[styles.overlay, overlayItemStyle]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
  },
  itemText: {
    color: '#e5e3ff',
    fontFamily: 'Lexend-SemiBold',
    fontSize: 18,
  },
  overlay: {
    backgroundColor: 'rgba(164,52,255,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(206,150,255,0.3)',
  },
});
