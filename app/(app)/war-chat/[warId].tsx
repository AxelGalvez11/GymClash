import { useLocalSearchParams, useRouter } from 'expo-router';

import ClanWarChatScreen from '@/components/clan/ClanWarChatScreen';

export default function WarChatRoute() {
  const router = useRouter();
  const { warId } = useLocalSearchParams<{ warId: string }>();

  return (
    <ClanWarChatScreen
      warId={warId}
      initialTab="war"
      onBack={() => router.replace('/(app)/clan' as any)}
    />
  );
}
