import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface StepDeviceConnectProps {
  onNext: () => void;
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

function handleConnect() {
  Alert.alert(
    "Coming Soon",
    "Device connections will be available in a future update."
  );
}

export default function StepDeviceConnect({ onNext }: StepDeviceConnectProps) {
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
