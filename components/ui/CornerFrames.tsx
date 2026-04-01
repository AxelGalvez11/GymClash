import { View } from 'react-native';

/**
 * Decorative corner frame accents — adapted from the hero-ascii-one
 * web component's corner border pattern.
 */
export function CornerFrames() {
  const cornerStyle = 'absolute w-6 h-6';
  const borderColor = 'rgba(255,255,255,0.25)';

  return (
    <>
      {/* Top-left */}
      <View
        className={`${cornerStyle} top-12 left-4`}
        style={{ borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor }}
      />
      {/* Top-right */}
      <View
        className={`${cornerStyle} top-12 right-4`}
        style={{ borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor }}
      />
      {/* Bottom-left */}
      <View
        className={`${cornerStyle} bottom-20 left-4`}
        style={{ borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor }}
      />
      {/* Bottom-right */}
      <View
        className={`${cornerStyle} bottom-20 right-4`}
        style={{ borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor }}
      />
    </>
  );
}
