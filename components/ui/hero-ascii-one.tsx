import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

const ACCENT = Colors.primary.DEFAULT;
const TEXT_PRIMARY = Colors.text.primary;
const TEXT_SECONDARY = Colors.text.secondary;
const TEXT_MUTED = Colors.text.muted;

const featureLabels = ['CLANS', 'WORKOUTS', 'AI COACH', 'QUESTS'];

export default function HeroAsciiOne() {
  return (
    <View style={styles.shell}>
      <View style={styles.topRule}>
        <View style={styles.ruleShort} />
        <Text style={styles.ruleGlyph}>//</Text>
        <View style={styles.ruleLong} />
      </View>

      <Text style={styles.eyebrow}>BUILT FOR THE CLASH</Text>
      <Text style={styles.title}>Train with purpose.</Text>
      <Text style={styles.description}>
        Join a clan, lock into workouts, take guidance from your AI coach, and clear
        quests that keep your momentum moving.
      </Text>

      <View style={styles.featureRow}>
        {featureLabels.map((label) => (
          <View key={label} style={styles.featurePill}>
            <Text style={styles.featureText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginBottom: 20,
  },
  topRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    opacity: 0.7,
  },
  ruleShort: {
    width: 24,
    height: 1,
    backgroundColor: ACCENT,
  },
  ruleGlyph: {
    color: TEXT_SECONDARY,
    fontFamily: 'SpaceMono',
    fontSize: 10,
  },
  ruleLong: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(206,150,255,0.22)',
  },
  eyebrow: {
    color: ACCENT,
    fontFamily: 'SpaceMono',
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  title: {
    color: TEXT_PRIMARY,
    fontFamily: 'Epilogue-Bold',
    fontSize: 22,
    marginBottom: 8,
  },
  description: {
    color: TEXT_SECONDARY,
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featurePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(206,150,255,0.22)',
    backgroundColor: 'rgba(35,35,63,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  featureText: {
    color: TEXT_MUTED,
    fontFamily: 'Lexend-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
  },
});
