import React from 'react';
import {
  Svg,
  Rect,
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';

interface CrateProps {
  size?: number;
}

// ─── Common Crate (Grey) ──────────────────────────────────
export function CommonCrate({ size = 120 }: CrateProps) {
  const s = size;
  const unit = s / 120;

  return (
    <Svg width={s} height={s} viewBox="0 0 120 120">
      <Defs>
        {/* Front face gradient */}
        <LinearGradient id="commonFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#2a2a2a" stopOpacity="1" />
          <Stop offset="100%" stopColor="#1a1a1a" stopOpacity="1" />
        </LinearGradient>

        {/* Glow filter */}
        <RadialGradient id="commonGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#888888" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#888888" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Glow background */}
      <Rect x="15" y="15" width="90" height="90" rx="8" fill="url(#commonGlow)" />

      {/* Front face */}
      <Rect
        x="20"
        y="30"
        width="80"
        height="60"
        rx="6"
        fill="url(#commonFrontGrad)"
        stroke="#888888"
        strokeWidth="2"
      />

      {/* Top face (parallelogram) */}
      <Path
        d="M 20 30 L 28 20 L 108 20 L 100 30 Z"
        fill="#3a3a3a"
        stroke="#666666"
        strokeWidth="1.5"
      />

      {/* Right face (parallelogram) */}
      <Path
        d="M 100 30 L 108 20 L 108 80 L 100 90 Z"
        fill="#242424"
        stroke="#666666"
        strokeWidth="1.5"
      />

      {/* Lock/Clasp center icon */}
      <G>
        {/* Lock body */}
        <Rect
          x="45"
          y="50"
          width="30"
          height="25"
          rx="3"
          fill="none"
          stroke="#888888"
          strokeWidth="2"
        />
        {/* Lock shackle */}
        <Path
          d="M 50 50 Q 50 35 60 35 Q 70 35 70 50"
          fill="none"
          stroke="#888888"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Lock dot */}
        <Rect x="57" y="62" width="6" height="6" rx="1" fill="#888888" />
      </G>
    </Svg>
  );
}

// ─── Rare Crate (Cyan/Battle Blue) ───────────────────────
export function RareCrate({ size = 120 }: CrateProps) {
  const s = size;

  return (
    <Svg width={s} height={s} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="rareFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#0d2a4a" stopOpacity="1" />
          <Stop offset="100%" stopColor="#061829" stopOpacity="1" />
        </LinearGradient>

        <RadialGradient id="rareGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#81ecff" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#81ecff" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Glow background */}
      <Rect x="15" y="15" width="90" height="90" rx="8" fill="url(#rareGlow)" />

      {/* Front face */}
      <Rect
        x="20"
        y="30"
        width="80"
        height="60"
        rx="6"
        fill="url(#rareFrontGrad)"
        stroke="#81ecff"
        strokeWidth="2"
      />

      {/* Top face (parallelogram) */}
      <Path
        d="M 20 30 L 28 20 L 108 20 L 100 30 Z"
        fill="#0a1a2a"
        stroke="#4db8d9"
        strokeWidth="1.5"
      />

      {/* Right face (parallelogram) */}
      <Path
        d="M 100 30 L 108 20 L 108 80 L 100 90 Z"
        fill="#081428"
        stroke="#4db8d9"
        strokeWidth="1.5"
      />

      {/* Lock/Clasp center icon */}
      <G>
        {/* Lock body */}
        <Rect
          x="45"
          y="50"
          width="30"
          height="25"
          rx="3"
          fill="none"
          stroke="#81ecff"
          strokeWidth="2"
        />
        {/* Lock shackle */}
        <Path
          d="M 50 50 Q 50 35 60 35 Q 70 35 70 50"
          fill="none"
          stroke="#81ecff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Lock dot */}
        <Rect x="57" y="62" width="6" height="6" rx="1" fill="#81ecff" />
      </G>
    </Svg>
  );
}

// ─── Epic Crate (Purple/Elixir Purple) ────────────────────
export function EpicCrate({ size = 120 }: CrateProps) {
  const s = size;

  return (
    <Svg width={s} height={s} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="epicFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#2a0d4a" stopOpacity="1" />
          <Stop offset="100%" stopColor="#1a0630" stopOpacity="1" />
        </LinearGradient>

        <RadialGradient id="epicGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#ce96ff" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#ce96ff" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Glow background */}
      <Rect x="15" y="15" width="90" height="90" rx="8" fill="url(#epicGlow)" />

      {/* Front face */}
      <Rect
        x="20"
        y="30"
        width="80"
        height="60"
        rx="6"
        fill="url(#epicFrontGrad)"
        stroke="#ce96ff"
        strokeWidth="2"
      />

      {/* Top face (parallelogram) */}
      <Path
        d="M 20 30 L 28 20 L 108 20 L 100 30 Z"
        fill="#1a0a2a"
        stroke="#9d4ed4"
        strokeWidth="1.5"
      />

      {/* Right face (parallelogram) */}
      <Path
        d="M 100 30 L 108 20 L 108 80 L 100 90 Z"
        fill="#140820"
        stroke="#9d4ed4"
        strokeWidth="1.5"
      />

      {/* Lock/Clasp center icon */}
      <G>
        {/* Lock body */}
        <Rect
          x="45"
          y="50"
          width="30"
          height="25"
          rx="3"
          fill="none"
          stroke="#ce96ff"
          strokeWidth="2"
        />
        {/* Lock shackle */}
        <Path
          d="M 50 50 Q 50 35 60 35 Q 70 35 70 50"
          fill="none"
          stroke="#ce96ff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Lock dot */}
        <Rect x="57" y="62" width="6" height="6" rx="1" fill="#ce96ff" />
      </G>
    </Svg>
  );
}

// ─── Legendary Crate (Gold/Victory Gold) ──────────────────
export function LegendaryCrate({ size = 120 }: CrateProps) {
  const s = size;

  return (
    <Svg width={s} height={s} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="legendarFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#3d2800" stopOpacity="1" />
          <Stop offset="100%" stopColor="#1f1400" stopOpacity="1" />
        </LinearGradient>

        <RadialGradient id="legendaryGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#ffd709" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#ffd709" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Glow background */}
      <Rect x="15" y="15" width="90" height="90" rx="8" fill="url(#legendaryGlow)" />

      {/* Front face */}
      <Rect
        x="20"
        y="30"
        width="80"
        height="60"
        rx="6"
        fill="url(#legendarFrontGrad)"
        stroke="#ffd709"
        strokeWidth="2"
      />

      {/* Top face (parallelogram) */}
      <Path
        d="M 20 30 L 28 20 L 108 20 L 100 30 Z"
        fill="#4a3500"
        stroke="#d4a900"
        strokeWidth="1.5"
      />

      {/* Right face (parallelogram) */}
      <Path
        d="M 100 30 L 108 20 L 108 80 L 100 90 Z"
        fill="#2a1800"
        stroke="#d4a900"
        strokeWidth="1.5"
      />

      {/* Lock/Clasp center icon */}
      <G>
        {/* Lock body */}
        <Rect
          x="45"
          y="50"
          width="30"
          height="25"
          rx="3"
          fill="none"
          stroke="#ffd709"
          strokeWidth="2"
        />
        {/* Lock shackle */}
        <Path
          d="M 50 50 Q 50 35 60 35 Q 70 35 70 50"
          fill="none"
          stroke="#ffd709"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Lock dot */}
        <Rect x="57" y="62" width="6" height="6" rx="1" fill="#ffd709" />
      </G>
    </Svg>
  );
}

// ─── Helper: Get crate by rarity ──────────────────────────
export function CrateArtByRarity({
  rarity,
  size,
}: {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  size?: number;
}) {
  switch (rarity) {
    case 'rare':
      return <RareCrate size={size} />;
    case 'epic':
      return <EpicCrate size={size} />;
    case 'legendary':
      return <LegendaryCrate size={size} />;
    case 'common':
    default:
      return <CommonCrate size={size} />;
  }
}
