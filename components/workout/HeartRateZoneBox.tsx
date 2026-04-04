import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { HR_ZONE_DEFINITIONS, getHRZone, type HRZone } from '@/lib/scoring/hr-zones';

interface HeartRateZoneBoxProps {
  readonly heartRate: number | null;
  readonly maxHR: number | null;
}

export function HeartRateZoneBox({ heartRate, maxHR }: HeartRateZoneBoxProps) {
  // No HR data — show connect prompt
  if (heartRate === null || maxHR === null || maxHR <= 0) {
    return (
      <Pressable
        className="bg-[#1d1d37] rounded-xl p-4 mb-4 active:scale-[0.98]"
        onPress={() => Alert.alert('Coming Soon', 'Heart rate monitor integration will be available in a future update. Connect an Apple Watch or Bluetooth HR strap for real-time zone tracking.')}
      >
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-[#23233f] items-center justify-center">
            <FontAwesome name="heartbeat" size={18} color="#74738b" />
          </View>
          <View className="flex-1">
            <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Heart Rate</Text>
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>
              Connect a device for zone tracking
            </Text>
          </View>
          <View className="bg-[#23233f] rounded-full px-2 py-0.5">
            <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>SOON</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // Determine current zone
  const zone = getHRZone(heartRate, maxHR);
  const zoneDef = zone ? HR_ZONE_DEFINITIONS.find(z => z.zone === zone) : null;
  const hrPercent = Math.round((heartRate / maxHR) * 100);

  return (
    <View className="bg-[#1d1d37] rounded-xl p-4 mb-4">
      {/* BPM + Zone header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <FontAwesome name="heartbeat" size={16} color={zoneDef?.color ?? '#74738b'} />
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 28 }}>
            {heartRate}
          </Text>
          <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}>bpm</Text>
        </View>
        {zoneDef && (
          <View
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: zoneDef.color + '25' }}
          >
            <Text style={{ color: zoneDef.color, fontFamily: 'Epilogue-Bold', fontSize: 13 }}>
              Zone {zoneDef.zone} · {zoneDef.name}
            </Text>
          </View>
        )}
        {!zoneDef && (
          <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>
            Below Zone 1
          </Text>
        )}
      </View>

      {/* Zone bar — shows all 5 zones with indicator */}
      <View className="flex-row h-3 rounded-full overflow-hidden mb-2">
        {HR_ZONE_DEFINITIONS.map((def) => (
          <View
            key={def.zone}
            className="flex-1"
            style={{
              backgroundColor: zone === def.zone ? def.color : def.color + '30',
            }}
          />
        ))}
      </View>

      {/* Zone labels */}
      <View className="flex-row">
        {HR_ZONE_DEFINITIONS.map((def) => (
          <View key={def.zone} className="flex-1 items-center">
            <Text style={{
              color: zone === def.zone ? def.color : '#74738b',
              fontFamily: 'Lexend-SemiBold',
              fontSize: 8,
            }}>
              Z{def.zone}
            </Text>
          </View>
        ))}
      </View>

      {/* HR percentage */}
      <Text className="text-center mt-2" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 10 }}>
        {hrPercent}% of max HR ({maxHR} bpm)
      </Text>
    </View>
  );
}
