import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/contexts/UserContext';
import { AppFeature } from '@/lib/access';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface PremiumGateProps {
  feature: AppFeature;
  children: ReactNode;
  fallback?: ReactNode;
}

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
      <View style={styles.lockIconContainer}>
        <IconSymbol
          ios_icon_name="lock.fill"
          android_material_icon_name="lock"
          size={28}
          color={colors.primary}
        />
      </View>
      <Text style={styles.lockedTitle}>Premium Feature</Text>
      <Text style={styles.lockedDescription}>
        Unlock this feature and all premium content by upgrading your plan.
      </Text>
      <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade} activeOpacity={0.85}>
        <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
  },
  lockIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
