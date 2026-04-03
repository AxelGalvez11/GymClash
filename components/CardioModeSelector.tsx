import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface CardioModeSelectorProps {
  readonly onSelectTerritory: () => void;
  readonly onSelectTreadmill: () => void;
  readonly onBack: () => void;
}

function ModeCard({
  icon,
  title,
  description,
  hint,
  onPress,
}: {
  readonly icon: 'map-marker' | 'dashboard';
  readonly title: string;
  readonly description: string;
  readonly hint: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="active:scale-[0.98]"
      style={{
        backgroundColor: '#23233f',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(164, 52, 255, 0.15)',
        padding: 24,
        marginBottom: 16,
      }}
    >
      <View className="flex-row items-center gap-3 mb-2">
        <View
          className="items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: 'rgba(164, 52, 255, 0.15)',
          }}
        >
          <FontAwesome name={icon} size={20} color="#a434ff" />
        </View>
        <View className="flex-1">
          <Text style={{ color: '#e5e3ff', fontSize: 18, fontFamily: 'Epilogue-Bold' }}>
            {title}
          </Text>
          <Text style={{ color: '#aaa8c3', fontSize: 13, fontFamily: 'BeVietnamPro-Regular' }}>
            {description}
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={14} color="#74738b" />
      </View>
      <Text
        style={{
          color: '#74738b',
          fontSize: 11,
          fontFamily: 'BeVietnamPro-Regular',
          marginTop: 8,
        }}
      >
        {hint}
      </Text>
    </Pressable>
  );
}

export function CardioModeSelector({
  onSelectTerritory,
  onSelectTreadmill,
  onBack,
}: CardioModeSelectorProps) {
  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <View className="flex-1 px-4">
        {/* Back button */}
        <Pressable
          onPress={onBack}
          className="flex-row items-center py-4 active:scale-[0.98]"
        >
          <FontAwesome name="chevron-left" size={12} color="#aaa8c3" />
          <Text
            style={{
              color: '#aaa8c3',
              fontSize: 14,
              fontFamily: 'Lexend-SemiBold',
              marginLeft: 6,
              letterSpacing: 1,
            }}
          >
            BACK
          </Text>
        </Pressable>

        {/* Title */}
        <Text
          style={{
            color: '#e5e3ff',
            fontSize: 24,
            fontFamily: 'Epilogue-Bold',
            textAlign: 'center',
            marginTop: 24,
            marginBottom: 32,
          }}
        >
          Select Mode
        </Text>

        {/* Mode cards */}
        <ModeCard
          icon="map-marker"
          title="Territory"
          description="GPS-tracked outdoor run with real-time trail"
          hint="Points based on distance and pace. GPS tracking records your route for verification."
          onPress={onSelectTerritory}
        />

        <ModeCard
          icon="dashboard"
          title="Treadmill"
          description="Indoor session with photo verification"
          hint="Points based on session duration. Take a photo of your treadmill screen for verification."
          onPress={onSelectTreadmill}
        />
      </View>
    </SafeAreaView>
  );
}
