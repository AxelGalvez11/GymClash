import { View } from 'react-native';
import Svg, { Polygon, Text, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface ClanEmblemProps {
  tag: string;           // e.g. "BUFF" — shows as initials
  name?: string;
  size?: number;         // default 80
  tier?: 'bronze' | 'silver' | 'gold' | 'diamond'; // border color tier
}

const getTierColor = (tier?: string): string => {
  switch (tier) {
    case 'bronze':
      return '#cd7f32';
    case 'silver':
      return '#c0c0c0';
    case 'gold':
      return '#ffd709';
    case 'diamond':
      return '#81ecff';
    default:
      return '#ce96ff'; // purple
  }
};

/**
 * ClanEmblem: A hexagonal clan identity badge
 * Uses react-native-svg for rendering a premium game UI hexagon with gradient fill
 */
export function ClanEmblem({
  tag,
  name,
  size = 80,
  tier,
}: ClanEmblemProps) {
  const borderColor = getTierColor(tier);

  // Calculate hexagon points (6 points around a circle)
  const radius = size / 2;
  const center = size / 2;
  const points: Array<[number, number]> = [];

  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    points.push([x, y]);
  }

  const hexagonPoints = points.map(([x, y]) => `${x},${y}`).join(' ');

  // Inner hexagon for glow effect (slightly smaller, semi-transparent)
  const glowRadius = radius * 0.95;
  const glowPoints: Array<[number, number]> = [];

  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    const x = center + glowRadius * Math.cos(angle);
    const y = center + glowRadius * Math.sin(angle);
    glowPoints.push([x, y]);
  }

  const glowHexagonPoints = glowPoints.map(([x, y]) => `${x},${y}`).join(' ');

  // Get initials from tag (first 2-3 chars)
  const initials = tag.substring(0, 3).toUpperCase();

  // Calculate text size based on emblem size
  const textSize = Math.max(size * 0.35, 12);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Gradient for inner fill: dark purple to darker void */}
          <LinearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#17172f" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0c0c1f" stopOpacity="1" />
          </LinearGradient>

          {/* Glow gradient: tier color with transparency falloff */}
          <LinearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={borderColor} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={borderColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Glow/shadow hexagon - slightly larger, semi-transparent */}
        <Polygon
          points={hexagonPoints}
          fill={borderColor}
          fillOpacity={0.08}
          stroke={borderColor}
          strokeWidth={0.5}
          strokeOpacity={0.2}
        />

        {/* Main hexagon border and fill */}
        <Polygon
          points={hexagonPoints}
          fill="url(#innerGradient)"
          stroke={borderColor}
          strokeWidth={1.5}
          strokeOpacity={0.9}
        />

        {/* Inner hexagon subtle glow */}
        <Polygon
          points={glowHexagonPoints}
          fill="url(#glowGradient)"
          stroke="none"
        />

        {/* Clan tag text - centered, white, bold */}
        <Text
          x={center}
          y={center + textSize * 0.35}
          textAnchor="middle"
          fontSize={textSize}
          fontWeight="bold"
          fill="#ffffff"
          fontFamily="Epilogue-Bold"
        >
          {initials}
        </Text>
      </Svg>
    </View>
  );
}

export default ClanEmblem;
