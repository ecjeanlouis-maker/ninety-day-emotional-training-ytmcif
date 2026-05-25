import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { authClient } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { authenticatedPatch } from "@/utils/api";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ─── Enum types (must match backend exactly) ────────────────────────────────
type AgeRange = 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus';
type MainGoal =
  | 'emotional_control'
  | 'build_confidence'
  | 'manage_anger'
  | 'reduce_stress'
  | 'social_anxiety'
  | 'thought_regulation';

const AGE_RANGES: { label: string; value: AgeRange }[] = [
  { label: 'Under 18', value: 'under_18' },
  { label: '18–24', value: '18_24' },
  { label: '25–34', value: '25_34' },
  { label: '35–44', value: '35_44' },
  { label: '45–54', value: '45_54' },
  { label: '55+', value: '55_plus' },
];

const MAIN_GOALS: { label: string; value: MainGoal }[] = [
  { label: 'Emotional Control', value: 'emotional_control' },
  { label: 'Build Confidence', value: 'build_confidence' },
  { label: 'Manage Anger', value: 'manage_anger' },
  { label: 'Reduce Stress', value: 'reduce_stress' },
  { label: 'Social Anxiety', value: 'social_anxiety' },
  { label: 'Thought Regulation', value: 'thought_regulation' },
];

const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Very low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very high',
};

const EMOTIONAL_LABELS: Record<number, string> = {
  1: 'Reactive', 2: 'Somewhat reactive', 3: 'Moderate', 4: 'Mostly regulated', 5: 'Highly regulated',
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, signOut, fetchUser } = useAuth();
  const { profile, refreshProfile } = useUser();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // ─── Preferences state (pre-filled from profile) ─────────────────────────
  const [ageRange, setAgeRange] = useState<AgeRange | null>(
    (profile?.age_range as AgeRange) || null
  );
  const [mainGoal, setMainGoal] = useState<MainGoal | null>(
    (profile?.main_goal as MainGoal) || null
  );
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(
    profile?.confidence_level || null
  );
  const [emotionalControlLevel, setEmotionalControlLevel] = useState<number | null>(
    profile?.emotional_control_level || null
  );

  // Sync preferences when profile loads
  useEffect(() => {
    if (profile) {
      setAgeRange((profile.age_range as AgeRange) || null);
      setMainGoal((profile.main_goal as MainGoal) || null);
      setConfidenceLevel(profile.confidence_level || null);
      setEmotionalControlLevel(profile.emotional_control_level || null);
    }
  }, [profile?.age_range, profile?.main_goal, profile?.confidence_level, profile?.emotional_control_level]);

  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "error" | "success";
    onClose?: () => void;
  }>({ visible: false, title: "", message: "", type: "error" });

  const showFeedback = (
    title: string,
    message: string,
    type: "error" | "success" = "error",
    onClose?: () => void
  ) => {
    setFeedbackModal({ visible: true, title, message, type, onClose });
  };

  const hideFeedback = () => {
    const onClose = feedbackModal.onClose;
    setFeedbackModal((prev) => ({ ...prev, visible: false, onClose: undefined }));
    if (onClose) onClose();
  };

  const handleSaveProfile = async () => {
    console.log("[ProfileEdit] Save Changes pressed — name:", name, "email:", email);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!name && !email) {
      showFeedback("Missing Fields", "Please enter at least a name or email.", "error");
      return;
    }

    setSavingProfile(true);
    try {
      console.log("[ProfileEdit] Calling updateUser...");
      const result = await authClient.updateUser({ name, email });
      if (result.error) {
        throw new Error(result.error.message || "Failed to update profile.");
      }
      console.log("[ProfileEdit] Profile updated successfully, refreshing user...");
      await fetchUser();
      showFeedback("Profile Updated!", "Your profile has been saved successfully.", "success");
    } catch (error: any) {
      console.log("[ProfileEdit] Save profile failed:", error.message);
      showFeedback("Update Failed", error.message || "Could not update profile. Please try again.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    console.log("[ProfileEdit] Update Password pressed");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!currentPassword || !newPassword) {
      showFeedback("Missing Fields", "Please enter both your current and new password.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showFeedback("Weak Password", "New password must be at least 8 characters.", "error");
      return;
    }

    setSavingPassword(true);
    try {
      console.log("[ProfileEdit] Calling changePassword...");
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to change password.");
      }
      console.log("[ProfileEdit] Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      showFeedback("Password Updated!", "Your password has been changed successfully.", "success");
    } catch (error: any) {
      console.log("[ProfileEdit] Change password failed:", error.message);
      showFeedback("Update Failed", error.message || "Could not change password. Please try again.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleVerifyEmail = () => {
    console.log("[ProfileEdit] Verify Email tapped");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/email-verification-pending");
  };

  const handleSignOut = async () => {
    console.log("[ProfileEdit] Sign Out pressed");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSigningOut(true);
    try {
      await signOut();
      console.log("[ProfileEdit] Signed out, navigating to /");
      router.replace("/");
    } catch (error: any) {
      console.log("[ProfileEdit] Sign out failed:", error.message);
      setSigningOut(false);
    }
  };

  const handleSavePreferences = async () => {
    console.log("[ProfileEdit] Save Preferences pressed — ageRange:", ageRange, "mainGoal:", mainGoal, "confidenceLevel:", confidenceLevel, "emotionalControlLevel:", emotionalControlLevel);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!ageRange || !mainGoal || !confidenceLevel || !emotionalControlLevel) {
      showFeedback("Missing Fields", "Please fill in all preference fields.", "error");
      return;
    }

    setSavingPreferences(true);
    try {
      console.log("[ProfileEdit] PATCH /api/profile — preferences");
      await authenticatedPatch('/api/profile', {
        age_range: ageRange,
        main_goal: mainGoal,
        confidence_level: confidenceLevel,
        emotional_control_level: emotionalControlLevel,
      });
      console.log("[ProfileEdit] Preferences saved — refreshing profile");
      await refreshProfile();
      showFeedback("Preferences Saved!", "Your preferences have been updated.", "success");
    } catch (error: any) {
      console.log("[ProfileEdit] Save preferences failed:", error?.message);
      showFeedback("Update Failed", error?.message || "Could not save preferences. Please try again.", "error");
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleBack = () => {
    console.log("[ProfileEdit] Back button pressed");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const isVerified = user?.emailVerified === true;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.avatarName}>{displayName}</Text>
          <View style={styles.emailRow}>
            <Text style={styles.avatarEmail}>{user?.email || ""}</Text>
            {isVerified ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
              </View>
            ) : (
              <View style={styles.unverifiedBadge}>
                <Text style={styles.unverifiedBadgeText}>Unverified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Your email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.fieldNote}>Changing email will require re-verification</Text>

          <TouchableOpacity
            style={[styles.primaryButton, savingProfile && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Change Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>

          <Text style={styles.fieldLabel}>Current Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter current password"
            placeholderTextColor="#999"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new password (min. 8 chars)"
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.primaryButton, savingPassword && styles.buttonDisabled]}
            onPress={handleUpdatePassword}
            disabled={savingPassword}
          >
            {savingPassword ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Email Verification Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Verification</Text>
          {isVerified ? (
            <View style={styles.verifiedRow}>
              <Text style={styles.verifiedText}>✓ Email verified</Text>
            </View>
          ) : (
            <>
              <Text style={styles.fieldNote}>Your email address has not been verified yet.</Text>
              <TouchableOpacity style={styles.outlineButton} onPress={handleVerifyEmail}>
                <Text style={styles.outlineButtonText}>Verify Email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <Text style={styles.fieldLabel}>Age Range</Text>
          <View style={styles.pillRow}>
            {AGE_RANGES.map((item) => {
              const isSelected = ageRange === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.pill, isSelected && styles.pillSelected]}
                  onPress={() => {
                    console.log("[ProfileEdit] Age range tapped:", item.value);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAgeRange(item.value);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Main Goal</Text>
          <View style={styles.goalGrid}>
            {MAIN_GOALS.map((item) => {
              const isSelected = mainGoal === item.value;
              const goalEmoji =
                item.value === 'emotional_control' ? '❤️' :
                item.value === 'build_confidence' ? '⭐' :
                item.value === 'manage_anger' ? '🔥' :
                item.value === 'reduce_stress' ? '🍃' :
                item.value === 'social_anxiety' ? '👥' : '🧠';
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                  onPress={() => {
                    console.log("[ProfileEdit] Main goal tapped:", item.value);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMainGoal(item.value);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.goalIcon}>{goalEmoji}</Text>
                  <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Confidence Level</Text>
          <View style={styles.levelRow}>
            {[1, 2, 3, 4, 5].map((n) => {
              const isSelected = confidenceLevel === n;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.levelCircle, isSelected && styles.levelCircleSelected]}
                  onPress={() => {
                    console.log("[ProfileEdit] Confidence level tapped:", n);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setConfidenceLevel(n);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.levelNumber, isSelected && styles.levelNumberSelected]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {confidenceLevel !== null && (
            <Text style={styles.levelHint}>{CONFIDENCE_LABELS[confidenceLevel]}</Text>
          )}

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Emotional Control Level</Text>
          <View style={styles.levelRow}>
            {[1, 2, 3, 4, 5].map((n) => {
              const isSelected = emotionalControlLevel === n;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.levelCircle, isSelected && styles.levelCircleSelected]}
                  onPress={() => {
                    console.log("[ProfileEdit] Emotional control level tapped:", n);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEmotionalControlLevel(n);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.levelNumber, isSelected && styles.levelNumberSelected]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {emotionalControlLevel !== null && (
            <Text style={styles.levelHint}>{EMOTIONAL_LABELS[emotionalControlLevel]}</Text>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 20 }, savingPreferences && styles.buttonDisabled]}
            onPress={handleSavePreferences}
            disabled={savingPreferences}
          >
            {savingPreferences ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Preferences</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={[styles.dangerButton, signingOut && styles.buttonDisabled]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.dangerButtonText}>Sign Out</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={feedbackModal.visible}
        transparent
        animationType="fade"
        onRequestClose={hideFeedback}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.feedbackModal}
          >
            <View
              style={[
                styles.feedbackIconContainer,
                { backgroundColor: feedbackModal.type === "error" ? "#FFF0F0" : "#F0FFF4" },
              ]}
            >
              <Text style={styles.feedbackIcon}>
                {feedbackModal.type === "error" ? "❌" : "✅"}
              </Text>
            </View>
            <Text style={styles.feedbackTitle}>{feedbackModal.title}</Text>
            <Text style={styles.feedbackMessage}>{feedbackModal.message}</Text>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                { backgroundColor: feedbackModal.type === "error" ? "#FF3B30" : colors.success },
              ]}
              onPress={hideFeedback}
              activeOpacity={0.8}
            >
              <Text style={styles.feedbackButtonText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  scrollContent: {
    padding: 20,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  avatarName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  verifiedBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    color: "#27AE60",
    fontSize: 12,
    fontWeight: "700",
  },
  unverifiedBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  unverifiedBadgeText: {
    color: "#E65100",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerSection: {
    borderColor: "#FFCDD2",
    backgroundColor: "#FFF8F8",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 16,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
    fontWeight: "500",
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  outlineButton: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  verifiedRow: {
    paddingVertical: 8,
  },
  verifiedText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27AE60",
  },
  dangerButton: {
    height: 52,
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  dangerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomPadding: {
    height: 40,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  goalCard: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  goalCardSelected: {
    backgroundColor: colors.highlight,
    borderColor: colors.primary,
  },
  goalIcon: {
    fontSize: 22,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  goalLabelSelected: {
    color: colors.primary,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  levelCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  levelNumberSelected: {
    color: '#FFFFFF',
  },
  levelHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  feedbackModal: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  feedbackIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  feedbackIcon: {
    fontSize: 36,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  feedbackMessage: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  feedbackButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  feedbackButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
