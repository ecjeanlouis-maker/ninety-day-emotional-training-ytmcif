import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';
import { trackEvent } from '@/utils/analytics';
import { IconSymbol } from '@/components/IconSymbol';

// Conditionally import expo-sharing only on native
let Sharing: typeof import('expo-sharing') | null = null;
if (Platform.OS !== 'web') {
  Sharing = require('expo-sharing');
}

// Conditionally import expo-file-system/legacy only on native
let FileSystem: typeof import('expo-file-system/legacy') | null = null;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsConsent {
  analytics_enabled: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, entitlement } = useUser();
  const { isSubscribed, restorePurchases } = useSubscription();

  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [savingConsent, setSavingConsent] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [signOutAllLoading, setSignOutAllLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Delete account modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Feedback modal
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success';
  }>({ visible: false, title: '', message: '', type: 'error' });

  useEffect(() => {
    loadConsent();
  }, []);

  const loadConsent = async () => {
    console.log('[AccountSettings] Loading analytics consent');
    try {
      const data = await authenticatedGet<AnalyticsConsent>('/api/analytics/consent');
      setAnalyticsEnabled(data.analytics_enabled);
    } catch (err) {
      console.warn('[AccountSettings] Failed to load consent:', err);
    } finally {
      setLoadingConsent(false);
    }
  };

  const showFeedback = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setFeedbackModal({ visible: true, title, message, type });
  };

  const hideFeedback = () => {
    setFeedbackModal(prev => ({ ...prev, visible: false }));
  };

  const handleBack = () => {
    console.log('[AccountSettings] Back button tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleEditProfile = () => {
    console.log('[AccountSettings] Edit Profile tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/profile-edit');
  };

  const handleChangePassword = () => {
    console.log('[AccountSettings] Change Password tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/forgot-password');
  };

  const handleSignOut = async () => {
    console.log('[AccountSettings] Sign Out tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  };

  const handleSignOutAll = async () => {
    console.log('[AccountSettings] Sign Out All Devices tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSignOutAllLoading(true);
    try {
      console.log('[AccountSettings] POST /api/account/sign-out-all');
      await authenticatedPost('/api/account/sign-out-all', {});
      console.log('[AccountSettings] Sign out all successful');
      await signOut();
    } catch (err: any) {
      console.error('[AccountSettings] Sign out all failed:', err);
      showFeedback('Error', err?.message || 'Could not sign out all devices. Please try again.', 'error');
    } finally {
      setSignOutAllLoading(false);
    }
  };

  const handleExportData = async () => {
    console.log('[AccountSettings] Download My Data tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackEvent('account_export_requested');
    setExportLoading(true);
    try {
      console.log('[AccountSettings] GET /api/account/export');
      const data = await authenticatedGet<object>('/api/account/export');
      const jsonString = JSON.stringify(data, null, 2);
      console.log('[AccountSettings] Export data received, size:', jsonString.length);

      if (Platform.OS === 'web') {
        // Web: trigger download via Blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-data-export.json';
        a.click();
        URL.revokeObjectURL(url);
        console.log('[AccountSettings] Web download triggered');
      } else if (FileSystem && Sharing) {
        // Native: write to temp file and share
        const fileUri = FileSystem.documentDirectory + 'my-data-export.json';
        await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export My Data' });
          console.log('[AccountSettings] Share sheet opened');
        } else {
          showFeedback('Export Ready', 'Your data has been saved to the app documents folder.', 'success');
        }
      }
    } catch (err: any) {
      console.error('[AccountSettings] Export failed:', err);
      showFeedback('Export Failed', err?.message || 'Could not export your data. Please try again.', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleAnalyticsToggle = async (value: boolean) => {
    console.log('[AccountSettings] Analytics consent toggled:', value);
    setAnalyticsEnabled(value);
    setSavingConsent(true);
    try {
      console.log('[AccountSettings] PUT /api/analytics/consent');
      await authenticatedPut('/api/analytics/consent', { analytics_enabled: value });
      console.log('[AccountSettings] Consent saved');
    } catch (err) {
      console.error('[AccountSettings] Failed to save consent:', err);
      // Revert on failure
      setAnalyticsEnabled(!value);
    } finally {
      setSavingConsent(false);
    }
  };

  const handleManageSubscription = () => {
    console.log('[AccountSettings] Manage Subscription tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/paywall');
  };

  const handleRestorePurchases = async () => {
    console.log('[AccountSettings] Restore Purchases tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoreLoading(true);
    try {
      await restorePurchases();
      showFeedback('Restore Complete', 'Your purchases have been restored.', 'success');
    } catch (err: any) {
      console.error('[AccountSettings] Restore failed:', err);
      showFeedback('Restore Failed', err?.message || 'Could not restore purchases.', 'error');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    console.log('[AccountSettings] Delete Account tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteModalVisible(true);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      console.log('[AccountSettings] Delete confirmation text mismatch');
      return;
    }
    console.log('[AccountSettings] Confirming account deletion');
    trackEvent('account_deletion_requested');
    setDeletingAccount(true);
    try {
      console.log('[AccountSettings] POST /api/account/delete');
      await authenticatedPost('/api/account/delete', {});
      console.log('[AccountSettings] Account deletion initiated');
      trackEvent('account_deletion_completed');
      setDeleteModalVisible(false);
      await signOut();
      router.replace('/auth');
    } catch (err: any) {
      console.error('[AccountSettings] Account deletion failed:', err);
      showFeedback('Deletion Failed', err?.message || 'Could not delete account. Please try again.', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const isEmailProvider = !user?.image?.includes('google') && !user?.image?.includes('apple');
  const providerLabel = user?.image?.includes('google') ? 'Google' : 'Email & Password';

  const subStatusLabel = isSubscribed
    ? 'Pro Member'
    : entitlement?.status
    ? String(entitlement.status)
    : 'Free';

  const deleteConfirmMatch = deleteConfirmText === 'DELETE MY ACCOUNT';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account & Privacy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{displayName}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{displayEmail}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sign-in</Text>
            <Text style={styles.infoValue}>{providerLabel}</Text>
          </View>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <IconSymbol ios_icon_name="person.crop.circle" android_material_icon_name="edit" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Security section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          {isEmailProvider ? (
            <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword} activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={20} color={colors.primary} />
                <Text style={styles.menuItemText}>Change Password</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={20} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>Password managed by Google</Text>
              </View>
            </View>
          )}
        </View>

        {/* Sessions section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sessions</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <IconSymbol ios_icon_name="rectangle.portrait.and.arrow.right" android_material_icon_name="logout" size={20} color="#FF3B30" />
              <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.menuItem, signOutAllLoading && styles.menuItemDisabled]}
            onPress={handleSignOutAll}
            disabled={signOutAllLoading}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol ios_icon_name="rectangle.portrait.and.arrow.right" android_material_icon_name="logout" size={20} color="#FF3B30" />
              <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Sign Out All Devices</Text>
            </View>
            {signOutAllLoading && <ActivityIndicator size="small" color="#FF3B30" />}
          </TouchableOpacity>
        </View>

        {/* Data & Privacy section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>

          <TouchableOpacity
            style={[styles.menuItem, exportLoading && styles.menuItemDisabled]}
            onPress={handleExportData}
            disabled={exportLoading}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol ios_icon_name="square.and.arrow.down" android_material_icon_name="download" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Download My Data</Text>
            </View>
            {exportLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={18} color={colors.textSecondary} />
            }
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.menuItemText}>Analytics & Privacy</Text>
              <Text style={styles.toggleSubtitle}>
                We collect anonymous usage data to improve the app. Disable to opt out. Essential security events are always logged.
              </Text>
            </View>
            {loadingConsent || savingConsent
              ? <ActivityIndicator size="small" color={colors.primary} />
              : (
                <Switch
                  value={analyticsEnabled}
                  onValueChange={handleAnalyticsToggle}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              )
            }
          </View>
        </View>

        {/* Subscription section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, isSubscribed && { color: '#27AE60', fontWeight: '700' }]}>
              {subStatusLabel}
            </Text>
          </View>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleManageSubscription} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <IconSymbol ios_icon_name="star.circle.fill" android_material_icon_name="star" size={20} color={isSubscribed ? '#27AE60' : colors.primary} />
              <Text style={styles.menuItemText}>Manage Subscription</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.menuItem, restoreLoading && styles.menuItemDisabled]}
            onPress={handleRestorePurchases}
            disabled={restoreLoading}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol ios_icon_name="arrow.clockwise.circle" android_material_icon_name="refresh" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Restore Purchases</Text>
            </View>
            {restoreLoading && <ActivityIndicator size="small" color={colors.primary} />}
          </TouchableOpacity>

          {isSubscribed && (
            <View style={styles.cancelNote}>
              <Text style={styles.cancelNoteText}>
                To cancel, go to Settings → Subscriptions on your device.
              </Text>
            </View>
          )}
        </View>

        {/* Danger zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={18} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deletingAccount) setDeleteModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              This will permanently delete your account and all data after a 30-day grace period. If you have an active subscription, cancel it first in your device's subscription settings to avoid future charges.
            </Text>
            <Text style={styles.modalMessage}>
              Type <Text style={{ fontWeight: '800', color: '#FF3B30' }}>DELETE MY ACCOUNT</Text> to confirm:
            </Text>
            <TextInput
              style={styles.deleteConfirmInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE MY ACCOUNT"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.deleteConfirmButton, (!deleteConfirmMatch || deletingAccount) && styles.deleteConfirmButtonDisabled]}
              onPress={handleConfirmDelete}
              disabled={!deleteConfirmMatch || deletingAccount}
              activeOpacity={0.8}
            >
              {deletingAccount
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.deleteConfirmButtonText}>Permanently Delete</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                console.log('[AccountSettings] Delete modal cancelled');
                setDeleteModalVisible(false);
              }}
              disabled={deletingAccount}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModal.visible}
        transparent
        animationType="fade"
        onRequestClose={hideFeedback}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{feedbackModal.title}</Text>
            <Text style={styles.modalMessage}>{feedbackModal.message}</Text>
            <TouchableOpacity
              style={[styles.deleteConfirmButton, { backgroundColor: feedbackModal.type === 'success' ? '#27AE60' : '#FF3B30' }]}
              onPress={hideFeedback}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteConfirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  dangerSection: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF8F8',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  toggleLeft: {
    flex: 1,
    gap: 4,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  cancelNote: {
    backgroundColor: colors.highlight,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  cancelNoteText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  deleteConfirmInput: {
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 1,
  },
  deleteConfirmButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteConfirmButtonDisabled: {
    opacity: 0.4,
  },
  deleteConfirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
