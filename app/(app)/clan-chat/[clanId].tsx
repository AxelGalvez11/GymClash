import { useLocalSearchParams, useRouter } from 'expo-router';

import ClanWarChatScreen from '@/components/clan/ClanWarChatScreen';

export default function ClanChatRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clanId: string; tab?: string | string[] }>();
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  return (
    <ClanWarChatScreen
      clanId={params.clanId}
      initialTab={tabParam === 'war' ? 'war' : 'clan'}
      onBack={() => router.replace('/(app)/clan' as any)}
    />
  );
}
