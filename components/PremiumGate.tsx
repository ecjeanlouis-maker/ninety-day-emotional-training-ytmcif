import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';
import { AppFeature } from '@/lib/access';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface PremiumGateProps {
  feature: AppFeature;
  children: ReactNode;
  fallback?: ReactNode;
}

const BENEFITS = [
  'Full training access',
  'Unlimited AI Coach',
  'Advanced emotional tracking',
  'Progress analytics',
  'Downloadable exercises',
];

export default function PremiumGate({ feature, children, fallback }: PremiumGateProps) {
  const { canAccess } = useUser();
  const router = useRouter();

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const handleUpgrade = () => {
    console.log('[PremiumGate] Upgrade button tapped — feature:', feature);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/paywall');
  };

  return (
    <View style={styles.lockedCard}>
      {/* Lock icon circle */}
      <View style={styles.lockIconContainer}>
        <IconSymbol
          ios_icon_name="lock.fill"
          android_material_icon_name="lock"
          size={28}
          color={colors.primary}
        />
      </View>

      {/* Title */}
      <Text style={styles.lockedTitle}>Unlock the Full 90-Day ECCT Program</Text>

      {/* Subtitle */}
      <Text style={styles.lockedSubtitle}>Take your transformation to the next level.</Text>

      {/* Benefits list */}
      <View style={styles.benefitsList}>
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={18}
              color="#27AE60"
            />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {/* CTA button */}
      <TouchableOpacity
        style={styles.upgradeButtonWrapper}
        onPress={handleUpgrade}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.upgradeGradient}
        >
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Cancel anytime */}
      <Text style={styles.cancelText}>Cancel anytime</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
    shadowColor: '#6B4CE6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  lockedSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  upgradeButtonWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#6B4CE6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cancelText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
