import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { OnboardingFormState } from "./types";

interface StepDeviceConnectProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

const DEVICES = [
  {
    name: "Apple Watch",
    icon: "apple" as const,
    description: "Heart rate + workout detection",
  },
  {
    name: "Garmin",
    icon: "clock-o" as const,
    description: "GPS + heart rate tracking",
  },
  {
    name: "Other HR Monitor",
    icon: "heartbeat" as const,
    description: "Any Bluetooth heart rate strap",
  },
] as const;

function computeAge(birthDate: string): number | null {
  const match = birthDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const today = new Date();
  const birth = new Date(year, month - 1, day);
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age > 0 ? age : null;
}

function handleConnect() {
  Alert.alert(
    "Coming Soon",
    "Device connections will be available in a future update."
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#1d1d37",
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(206,150,255,0.15)",
      }}
    >
      <Text
        style={{
          fontFamily: "Lexend-SemiBold",
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "#74738b",
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: "Epilogue-Bold",
          fontSize: 22,
          color: "#e5e3ff",
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Lexend-SemiBold",
          fontSize: 9,
          color: "#74738b",
          marginTop: 2,
        }}
      >
        {unit}
      </Text>
    </View>
  );
}

export default function StepDeviceConnect({
  form,
  onUpdate,
  onNext,
}: StepDeviceConnectProps) {
  const age = useMemo(() => computeAge(form.birthDate), [form.birthDate]);
  const estimatedMaxHR = age !== null ? 220 - age : null;
  const estimatedRestingHR = 72; // Average resting HR default

  // Auto-set maxHR and restingHR if not already set
  useMemo(() => {
    if (estimatedMaxHR !== null && form.maxHROverride === "") {
      onUpdate({ maxHROverride: String(estimatedMaxHR) });
    }
    if (form.restingHR === "") {
      onUpdate({ restingHR: String(estimatedRestingHR) });
    }
  }, []);

  const maxHR = form.maxHROverride
    ? parseInt(form.maxHROverride, 10)
    : estimatedMaxHR;
  const restingHR = form.restingHR
    ? parseInt(form.restingHR, 10)
    : estimatedRestingHR;

  const vo2max =
    maxHR && restingHR && restingHR > 0
      ? Math.round((15.3 * (maxHR / restingHR)) * 10) / 10
      : null;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow px-6 pb-10 pt-12"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text
        style={{ fontFamily: "Epilogue-Bold", color: "#e5e3ff" }}
        className="text-3xl mb-2"
      >
        Connect Devices
      </Text>
      <Text
        style={{ fontFamily: "BeVietnamPro-Regular", color: "#aaa8c3" }}
        className="text-base mb-8"
      >
        Link your fitness trackers for verified scoring and bonus multipliers.
      </Text>

      {/* Device Cards */}
      <View className="gap-4 mb-6">
        {DEVICES.map((device) => (
          <View
            key={device.name}
            className="bg-[#23233f] rounded-xl p-4 flex-row items-center"
          >
            <View className="w-10 items-center mr-4">
              <FontAwesome name={device.icon} size={24} color="#ce96ff" />
            </View>

            <View className="flex-1 mr-3">
              <Text
                style={{ fontFamily: "Lexend-SemiBold", color: "#e5e3ff" }}
                className="text-base mb-0.5"
              >
                {device.name}
              </Text>
              <Text
                style={{
                  fontFamily: "BeVietnamPro-Regular",
                  color: "#aaa8c3",
                }}
                className="text-sm"
              >
                {device.description}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleConnect}
              style={{ borderColor: "#ce96ff", borderWidth: 1 }}
              className="rounded-lg px-3 py-1.5"
            >
              <Text
                style={{ fontFamily: "Lexend-SemiBold", color: "#ce96ff" }}
                className="text-sm"
              >
                Connect
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* ── Estimated Stats ─────────────────────────────────────────── */}
      {(maxHR || vo2max) && (
        <View
          style={{
            marginTop: 8,
            marginBottom: 16,
            borderTopWidth: 1,
            borderTopColor: "rgba(70,70,92,0.25)",
            paddingTop: 20,
          }}
        >
          <Text
            style={{
              fontFamily: "Lexend-SemiBold",
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#aaa8c3",
              marginBottom: 4,
            }}
          >
            Your Estimated Stats
          </Text>
          <Text
            style={{
              fontFamily: "BeVietnamPro-Regular",
              fontSize: 13,
              color: "#74738b",
              marginBottom: 16,
            }}
          >
            Auto-calculated from your profile. Connect a device for more accurate data.
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {maxHR && (
              <StatCard label="Max HR" value={String(maxHR)} unit="bpm" />
            )}
            <StatCard
              label="Resting HR"
              value={String(restingHR)}
              unit="bpm (est.)"
            />
            {vo2max && (
              <StatCard
                label="VO2 Max"
                value={String(vo2max)}
                unit="ml/kg/min"
              />
            )}
          </View>
        </View>
      )}

      {/* Info Note */}
      <Text
        style={{ fontFamily: "BeVietnamPro-Regular", color: "#74738b" }}
        className="text-xs mb-10 leading-5"
      >
        Connecting a heart rate monitor grants a verified bonus multiplier on
        your workout scores.
      </Text>

      {/* Spacer */}
      <View className="flex-1" />

      {/* Buttons */}
      <TouchableOpacity
        onPress={onNext}
        className="bg-[#a434ff] rounded-xl py-4 items-center mb-4"
      >
        <Text
          style={{ fontFamily: "Lexend-SemiBold", color: "#e5e3ff" }}
          className="text-base tracking-widest"
        >
          CONTINUE
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onNext} className="items-center py-2">
        <Text
          style={{ fontFamily: "BeVietnamPro-Regular", color: "#74738b" }}
          className="text-sm"
        >
          Skip for now
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
