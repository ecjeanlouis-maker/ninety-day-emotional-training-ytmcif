
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
import { useUser } from "@/contexts/UserContext";

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { isSubscribed, restorePurchases } = useSubscription();
  const { role, profile, isAdmin, isTrialing, trialDaysRemaining } = useUser();

  const handleAudioSettings = () => {
    console.log('[Profile] Audio & Narration tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/audio-settings');
  };

  const handleReminders = () => {
    console.log('[Profile] Reminders tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/reminders');
  };

  const handleAccountSettings = () => {
    console.log('[Profile] Account & Privacy tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/account-settings');
  };

  const handleEditProfile = () => {
    console.log('[Profile] Edit Profile tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/profile-edit');
  };

  const handleAdminDashboard = () => {
    console.log('[Profile] Admin Dashboard tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/admin');
  };

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

  const handleVerifyEmail = () => {
    console.log('[Profile] Verify Email banner tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/email-verification-pending');
  };

  const handleTrialingBanner = () => {
    console.log('[Profile] Trialing banner tapped — routing to paywall');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/paywall');
  };

  const handleExpiredBanner = () => {
    console.log('[Profile] Expired banner tapped — routing to paywall');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/paywall');
  };

  const handlePastDueBanner = () => {
    console.log('[Profile] Past-due banner tapped — routing to paywall');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/paywall');
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Guest';
  const displayEmail = user?.email || 'Not signed in';
  const subscriptionLabel = isSubscribed ? 'Pro Member — Manage Subscription' : 'Upgrade to Pro';
  const showUnverifiedBanner = !!user && user.emailVerified === false;

  const accessState = profile?.access_state;
  const subStatus = profile?.subscription_status;
  const subEndDate = profile?.subscription_end_date;

  const showTrialingBanner = accessState === 'trialing';
  const showPastDueBanner = accessState === 'past_due' || subStatus === 'past_due';
  const showExpiredBanner = accessState === 'expired';
  const showCancelledBanner =
    (accessState === 'cancelled_grace' || subStatus === 'cancelled') &&
    !!subEndDate &&
    new Date(subEndDate) > new Date();

  const formattedEndDate = subEndDate
    ? new Date(subEndDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const rolePillLabel = isAdmin ? 'Admin' : role === 'premium' ? 'Premium' : 'Free';
  const rolePillColor = isAdmin ? '#6B4CE6' : role === 'premium' ? '#27AE60' : '#8E8E93';

  const trialDaysLabel = trialDaysRemaining === 1 ? '1 day' : `${trialDaysRemaining ?? 0} days`;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        {showUnverifiedBanner && (
          <TouchableOpacity style={styles.unverifiedBanner} onPress={handleVerifyEmail} activeOpacity={0.8}>
            <Text style={styles.unverifiedBannerText}>⚠ Email not verified — Verify Now</Text>
          </TouchableOpacity>
        )}

        {showTrialingBanner && (
          <TouchableOpacity style={styles.trialingBanner} onPress={handleTrialingBanner} activeOpacity={0.8}>
            <Text style={styles.trialingBannerText}>
              🎁 Free trial active — {trialDaysLabel} left
            </Text>
          </TouchableOpacity>
        )}

        {showPastDueBanner && (
          <TouchableOpacity style={styles.pastDueBanner} onPress={handlePastDueBanner} activeOpacity={0.8}>
            <Text style={styles.pastDueBannerText}>⚠ Payment failed — update your card</Text>
          </TouchableOpacity>
        )}

        {showCancelledBanner && (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledBannerText}>
              Premium until {formattedEndDate}
            </Text>
          </View>
        )}

        {showExpiredBanner && (
          <TouchableOpacity style={styles.expiredBanner} onPress={handleExpiredBanner} activeOpacity={0.8}>
            <Text style={styles.expiredBannerText}>Your premium access has expired. Tap to renew.</Text>
          </TouchableOpacity>
        )}

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
              <View style={styles.emailRow}>
                <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666', flexShrink: 1 }]} numberOfLines={1}>{displayEmail}</Text>
                <View style={[styles.rolePill, { backgroundColor: rolePillColor }]}>
                  <Text style={styles.rolePillText}>{rolePillLabel}</Text>
                </View>
              </View>
              {isSubscribed && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>⚡ Pro Member</Text>
                </View>
              )}
            </>
          )}
        </GlassView>

        {user && (
          <GlassView style={[
            styles.section,
            Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
          ]} glassEffectStyle="regular">
            {isAdmin && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleAdminDashboard}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <IconSymbol
                      ios_icon_name="shield.checkmark"
                      android_material_icon_name="verified-user"
                      size={20}
                      color="#6B4CE6"
                    />
                    <Text style={[styles.menuItemText, { color: '#6B4CE6' }]}>Admin Dashboard</Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="arrow-forward"
                    size={20}
                    color={theme.dark ? '#98989D' : '#666'}
                  />
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEditProfile}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="person.crop.circle"
                  android_material_icon_name="edit"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Edit Profile</Text>
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

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleAudioSettings}
              activeOpacity={0.7}
              accessibilityLabel="Audio and Narration settings"
              accessibilityRole="button"
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="speaker.wave.2.fill"
                  android_material_icon_name="volume-up"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Audio & Narration</Text>
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
              onPress={handleReminders}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="bell.fill"
                  android_material_icon_name="notifications"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Reminders</Text>
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
              onPress={handleAccountSettings}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="shield.fill"
                  android_material_icon_name="security"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Account & Privacy</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="arrow-forward"
                size={20}
                color={theme.dark ? '#98989D' : '#666'}
              />
            </TouchableOpacity>
          </GlassView>
        )}

        {!user && (
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
        )}

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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
  unverifiedBanner: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFD54F',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  unverifiedBannerText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  trialingBanner: {
    backgroundColor: '#F0EBFF',
    borderWidth: 1,
    borderColor: '#6B4CE6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  trialingBannerText: {
    color: '#6B4CE6',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pastDueBanner: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pastDueBannerText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelledBanner: {
    backgroundColor: '#FFFBEA',
    borderWidth: 1,
    borderColor: '#F5A623',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cancelledBannerText: {
    color: '#B7791F',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  expiredBanner: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#8E8E93',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  expiredBannerText: {
    color: '#636366',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
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
    paddingVertical: 12,
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
