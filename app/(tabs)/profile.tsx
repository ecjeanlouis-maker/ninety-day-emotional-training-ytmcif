
import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { isSubscribed, restorePurchases } = useSubscription();

  const handleSubscription = () => {
    console.log('User tapped Subscription — isSubscribed:', isSubscribed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/paywall');
  };

  const handleRestorePurchases = async () => {
    console.log('User tapped Restore Purchases');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await restorePurchases();
  };

  const handleSignIn = () => {
    console.log('User tapped sign in');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/auth');
  };

  const handleSignOut = async () => {
    console.log('User tapped sign out');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Guest';
  const displayEmail = user?.email || 'Not signed in';
  const subscriptionLabel = isSubscribed ? 'Pro Member — Manage Subscription' : 'Upgrade to Pro';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        <GlassView style={[
          styles.profileHeader,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <>
              <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="person" size={80} color={theme.colors.primary} />
              <Text style={[styles.name, { color: theme.colors.text }]}>{displayName}</Text>
              <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666' }]}>{displayEmail}</Text>
              {isSubscribed && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>⚡ Pro Member</Text>
                </View>
              )}
            </>
          )}
        </GlassView>

        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSubscription}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol
                ios_icon_name="star.circle.fill"
                android_material_icon_name="star"
                size={20}
                color={isSubscribed ? '#27AE60' : theme.colors.primary}
              />
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{subscriptionLabel}</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="arrow-forward"
              size={20}
              color={theme.dark ? '#98989D' : '#666'}
            />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleRestorePurchases}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol
                ios_icon_name="arrow.clockwise.circle"
                android_material_icon_name="refresh"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Restore Purchases</Text>
            </View>
          </TouchableOpacity>
        </GlassView>

        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          {user ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="rectangle.portrait.and.arrow.right"
                  android_material_icon_name="logout"
                  size={20}
                  color="#FF3B30"
                />
                <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Sign Out</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleSignIn}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="person.badge.plus"
                  android_material_icon_name="login"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.menuItemText, { color: theme.colors.primary }]}>Sign In / Create Account</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="arrow-forward"
                size={20}
                color={theme.dark ? '#98989D' : '#666'}
              />
            </TouchableOpacity>
          )}
        </GlassView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
  },
  proBadge: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  proBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    borderRadius: 12,
    padding: 20,
    gap: 4,
    marginBottom: 16,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.15)',
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
