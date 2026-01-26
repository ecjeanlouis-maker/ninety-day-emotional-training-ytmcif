
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface CongratulationsModalProps {
  visible: boolean;
  onClose: () => void;
  weekNumber: number;
  techniqueTitle: string;
  categoryColor: string;
}

const { width } = Dimensions.get('window');

export default function CongratulationsModal({
  visible,
  onClose,
  weekNumber,
  techniqueTitle,
  categoryColor,
}: CongratulationsModalProps) {
  const scale = useSharedValue(0);
  const starScale1 = useSharedValue(0);
  const starScale2 = useSharedValue(0);
  const starScale3 = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      console.log('Congratulations modal opened for week:', weekNumber);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      
      starScale1.value = withDelay(
        200,
        withSequence(
          withSpring(1.2, { damping: 10 }),
          withSpring(1, { damping: 15 })
        )
      );
      
      starScale2.value = withDelay(
        300,
        withSequence(
          withSpring(1.2, { damping: 10 }),
          withSpring(1, { damping: 15 })
        )
      );
      
      starScale3.value = withDelay(
        400,
        withSequence(
          withSpring(1.2, { damping: 10 }),
          withSpring(1, { damping: 15 })
        )
      );
    } else {
      scale.value = 0;
      starScale1.value = 0;
      starScale2.value = 0;
      starScale3.value = 0;
    }
  }, [visible]);

  const modalStyle = useAnimatedStyle(() => {
    const scaleValue = scale.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const star1Style = useAnimatedStyle(() => {
    const scaleValue = starScale1.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const star2Style = useAnimatedStyle(() => {
    const scaleValue = starScale2.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const star3Style = useAnimatedStyle(() => {
    const scaleValue = starScale3.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const handleClose = () => {
    console.log('User closed congratulations modal');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const weekText = `Week ${weekNumber}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={handleClose}
        >
          <Animated.View style={[styles.modalContainer, modalStyle]}>
            <TouchableOpacity activeOpacity={1}>
              <LinearGradient
                colors={[categoryColor, categoryColor + 'DD']}
                style={styles.modalContent}
              >
                <View style={styles.starsContainer}>
                  <Animated.View style={star1Style}>
                    <IconSymbol
                      ios_icon_name="star.fill"
                      android_material_icon_name="star"
                      size={32}
                      color="#FFD700"
                    />
                  </Animated.View>
                  <Animated.View style={star2Style}>
                    <IconSymbol
                      ios_icon_name="star.fill"
                      android_material_icon_name="star"
                      size={40}
                      color="#FFD700"
                    />
                  </Animated.View>
                  <Animated.View style={star3Style}>
                    <IconSymbol
                      ios_icon_name="star.fill"
                      android_material_icon_name="star"
                      size={32}
                      color="#FFD700"
                    />
                  </Animated.View>
                </View>

                <View style={styles.iconContainer}>
                  <View style={styles.iconCircle}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={64}
                      color="#FFFFFF"
                    />
                  </View>
                </View>

                <Text style={styles.congratsTitle}>Congratulations!</Text>
                
                <Text style={styles.congratsMessage}>
                  You&apos;ve completed
                </Text>
                
                <View style={styles.weekBadge}>
                  <Text style={styles.weekBadgeText}>{weekText}</Text>
                </View>

                <Text style={styles.techniqueTitle}>{techniqueTitle}</Text>

                <Text style={styles.encouragementText}>
                  Keep up the amazing work! Consistency is the key to transformation.
                </Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeButtonText}>Continue</Text>
                  <IconSymbol
                    ios_icon_name="arrow.right"
                    android_material_icon_name="arrow-forward"
                    size={20}
                    color={categoryColor}
                  />
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width - 48,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 32,
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratsTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  congratsMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.95,
  },
  weekBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  weekBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  techniqueTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  encouragementText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    opacity: 0.9,
    paddingHorizontal: 8,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 8,
    width: '100%',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
});
