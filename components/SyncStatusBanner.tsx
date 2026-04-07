import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useOfflineQueueStore, isStaleWorkout } from '@/stores/offline-queue-store';
import type { SyncStatus } from '@/stores/offline-queue-store';
import { Colors } from '@/constants/theme';

// ─── Victory Peak palette — pulls from theme ───────────
const VP = {
  textPri:    Colors.text.primary,
  textSec:    Colors.text.secondary,
  primaryDim: Colors.primary.dim,
  danger:     Colors.error.DEFAULT,
  warning:    Colors.warning,
} as const;

// ─── Banner config per sync status ──────────────────────

interface BannerVariant {
  readonly bgColor: string;
  readonly label: (count: number) => string;
  readonly icon: React.ComponentProps<typeof FontAwesome>['name'] | null;
  readonly showSpinner: boolean;
}

const BANNER_VARIANTS: Record<SyncStatus, BannerVariant> = {
  syncing: {
    bgColor: `${VP.primaryDim}26`, // 15% opacity
    label: () => 'Syncing workouts...',
    icon: null,
    showSpinner: true,
  },
  error: {
    bgColor: `${VP.danger}26`,
    label: () => 'Sync failed — will retry',
    icon: 'exclamation-triangle',
    showSpinner: false,
  },
  offline: {
    bgColor: `${VP.warning}26`,
    label: (n) => `Offline — ${n} workout${n === 1 ? '' : 's'} pending`,
    icon: 'wifi',
    showSpinner: false,
  },
  idle: {
    bgColor: `${VP.warning}26`,
    label: (n) => `Score pending sync — ${n} workout${n === 1 ? '' : 's'}`,
    icon: 'clock-o',
    showSpinner: false,
  },
};

// ─── Component ──────────────────────────────────────────

export function SyncStatusBanner() {
  const { queue, syncStatus } = useOfflineQueueStore();

  if (queue.length === 0) return null;

  const variant = BANNER_VARIANTS[syncStatus];
  const hasStale = queue.some(isStaleWorkout);

  const handleRetry = () => {
    // TODO: Wire to useOfflineSync().syncQueue when mounted at app level
    console.log('[SyncStatusBanner] Tap to retry — sync will be triggered by useOfflineSync hook');
  };

  return (
    <Pressable onPress={handleRetry}>
      <View
        style={{
          backgroundColor: variant.bgColor,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {variant.showSpinner ? (
          <ActivityIndicator size="small" color={VP.textPri} />
        ) : variant.icon ? (
          <FontAwesome name={variant.icon} size={14} color={VP.textPri} />
        ) : null}

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 12,
              color: VP.textPri,
            }}
          >
            {variant.label(queue.length)}
          </Text>

          {hasStale && (
            <Text
              style={{
                fontFamily: 'BeVietnamPro-Regular',
                fontSize: 11,
                color: VP.danger,
                marginTop: 2,
              }}
            >
              Some workouts are over 72 hours old and may need manual review
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
