import {
  Modal,
  Pressable,
  Text,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { CosmeticRarity } from '@/types';
import { getPreviewEquipmentItem } from '@/lib/character/equipment-registry';
import { CharacterWithEquipment } from '@/components/character/CharacterWithEquipment';
import type { LocalCosmetic } from '@/lib/shop/local-cosmetics';
import { CosmeticModelViewer } from './CosmeticModelViewer';

const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: '#aaa8c3',
  rare: '#81ecff',
  epic: '#ce96ff',
  legendary: '#ffd709',
};

interface CosmeticPreviewModalProps {
  readonly cosmetic: LocalCosmetic | null;
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onBuy?: (cosmetic: LocalCosmetic) => void;
}

export function CosmeticPreviewModal({
  cosmetic,
  visible,
  onClose,
  onBuy,
}: CosmeticPreviewModalProps) {
  if (!cosmetic) return null;

  const { width } = Dimensions.get('window');
  const viewerSize = Math.min(width - 32, 360);
  const rarityColor = RARITY_COLORS[cosmetic.rarity];
  const previewEquipment = getPreviewEquipmentItem(cosmetic);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(7, 7, 21, 0.92)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 440,
            borderRadius: 24,
            backgroundColor: '#14142a',
            borderWidth: 1,
            borderColor: rarityColor + '55',
            overflow: 'hidden',
            shadowColor: rarityColor,
            shadowOpacity: 0.5,
            shadowRadius: 30,
          }}
        >
          {/* Close button */}
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesome name="times" size={16} color="#fff" />
          </Pressable>

          <View>
            {/* 3D viewer — drag to rotate 360° */}
            <LinearGradient
              colors={[rarityColor + '22', 'transparent']}
              style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 8 }}
            >
              {previewEquipment && Platform.OS !== 'web' ? (
                <CharacterWithEquipment
                  key={cosmetic.id}
                  build="balanced"
                  tier="equipped"
                  equipment={[previewEquipment]}
                  size={viewerSize}
                  enableRotation
                />
              ) : (
                <CosmeticModelViewer
                  modelAsset={cosmetic.modelAsset}
                  size={viewerSize}
                  autoRotate
                  interactive
                />
              )}
              <Text
                style={{
                  fontFamily: 'BeVietnamPro-Regular',
                  fontSize: 11,
                  color: '#74738b',
                  marginTop: 4,
                }}
              >
                {previewEquipment && Platform.OS !== 'web'
                  ? 'Drag to rotate · attached character preview'
                  : 'Drag to rotate · 360° preview'}
              </Text>
            </LinearGradient>

            {/* Details */}
            <View style={{ padding: 20 }}>
              {/* Rarity badge */}
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: rarityColor + '22',
                  borderWidth: 1,
                  borderColor: rarityColor + '66',
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Epilogue-Bold',
                    fontSize: 10,
                    color: rarityColor,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {cosmetic.rarity}
                </Text>
              </View>

              {/* Name */}
              <Text
                style={{
                  fontFamily: 'Epilogue-Bold',
                  fontSize: 24,
                  color: '#fff',
                  marginBottom: 8,
                }}
              >
                {cosmetic.name}
              </Text>

              {/* Description */}
              <Text
                style={{
                  fontFamily: 'BeVietnamPro-Regular',
                  fontSize: 14,
                  color: '#aaa8c3',
                  lineHeight: 20,
                  marginBottom: 20,
                }}
              >
                {cosmetic.description}
              </Text>

              {/* Buy button */}
              <Pressable
                onPress={() => onBuy?.(cosmetic)}
                style={({ pressed }) => ({
                  backgroundColor: rarityColor,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FontAwesome name="bolt" size={14} color="#14142a" />
                  <Text
                    style={{
                      fontFamily: 'Epilogue-Bold',
                      fontSize: 15,
                      color: '#14142a',
                      letterSpacing: 0.5,
                    }}
                  >
                    {cosmetic.price_coins.toLocaleString()} COINS
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
