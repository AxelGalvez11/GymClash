import { Modal, View, Text, Pressable, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/theme';

type ClanRole = 'leader' | 'officer' | 'member';

interface MemberActionSheetProps {
  readonly visible: boolean;
  readonly memberName: string;
  readonly memberRole: ClanRole;
  readonly myRole: ClanRole;
  readonly onClose: () => void;
  readonly onPromote: () => void;
  readonly onDemote: () => void;
  readonly onKick: () => void;
  readonly onViewProfile: () => void;
  readonly actionPending: boolean;
}

const ROLE_BADGE_COLORS: Record<ClanRole, { bg: string; text: string }> = {
  leader: { bg: '#ffd709' + '30', text: '#ffd709' },
  officer: { bg: '#ce96ff' + '30', text: '#ce96ff' },
  member: { bg: '#74738b' + '30', text: '#74738b' },
};

const ROLE_LABELS: Record<ClanRole, string> = {
  leader: 'Leader',
  officer: 'Officer',
  member: 'Member',
};

function ActionButton({
  icon,
  label,
  color,
  onPress,
  disabled,
}: {
  readonly icon: React.ComponentProps<typeof FontAwesome>['name'];
  readonly label: string;
  readonly color: string;
  readonly onPress: () => void;
  readonly disabled: boolean;
}) {
  return (
    <Pressable
      className="bg-[#23233f] rounded-xl py-3 px-4 flex-row items-center gap-3 active:scale-[0.98]"
      onPress={onPress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <FontAwesome name={icon} size={16} color={color} />
      <Text style={{ color, fontFamily: 'Lexend-SemiBold' }} className="text-sm">
        {label}
      </Text>
    </Pressable>
  );
}

export default function MemberActionSheet({
  visible,
  memberName,
  memberRole,
  myRole,
  onClose,
  onPromote,
  onDemote,
  onKick,
  onViewProfile,
  actionPending,
}: MemberActionSheetProps) {
  const badge = ROLE_BADGE_COLORS[memberRole];

  const canPromote = myRole === 'leader' && memberRole === 'member';
  const canDemote = myRole === 'leader' && memberRole === 'officer';
  const canKick =
    myRole === 'leader' ||
    (myRole === 'officer' && memberRole === 'member');

  function handleKick() {
    Alert.alert(
      'Kick Member',
      `Are you sure you want to kick ${memberName} from the clan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Kick', style: 'destructive', onPress: onKick },
      ],
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(12,12,31,0.85)' }}
        onPress={onClose}
      >
        <Pressable
          className="rounded-t-2xl pt-4 pb-8 px-6"
          style={{ backgroundColor: '#1d1d37' }}
          onPress={() => {
            // prevent closing when tapping the sheet content
          }}
        >
          {/* Header */}
          <View className="flex-row items-center gap-3 mb-4">
            <Text
              style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
              className="text-lg"
            >
              {memberName}
            </Text>
            <View
              className="rounded-full px-2.5 py-0.5"
              style={{ backgroundColor: badge.bg }}
            >
              <Text
                style={{ color: badge.text, fontFamily: 'Lexend-SemiBold' }}
                className="text-xs"
              >
                {ROLE_LABELS[memberRole]}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View className="gap-2">
            <ActionButton
              icon="user"
              label="View Profile"
              color="#aaa8c3"
              onPress={onViewProfile}
              disabled={actionPending}
            />

            {canPromote && (
              <ActionButton
                icon="arrow-up"
                label="Promote to Officer"
                color={Colors.success}
                onPress={onPromote}
                disabled={actionPending}
              />
            )}

            {canDemote && (
              <ActionButton
                icon="arrow-down"
                label="Demote to Member"
                color={Colors.warning}
                onPress={onDemote}
                disabled={actionPending}
              />
            )}

            {canKick && (
              <ActionButton
                icon="times"
                label="Kick from Clan"
                color={Colors.danger}
                onPress={handleKick}
                disabled={actionPending}
              />
            )}
          </View>

          {/* Cancel */}
          <Pressable className="mt-4 py-3 items-center" onPress={onClose}>
            <Text
              style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }}
              className="text-sm"
            >
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
