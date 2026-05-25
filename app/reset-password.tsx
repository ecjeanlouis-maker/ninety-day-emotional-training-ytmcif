import React, { useState } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { authClient } from "@/lib/auth";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleResetPassword = async () => {
    console.log("[ResetPassword] Reset Password button pressed");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!newPassword || !confirmPassword) {
      showFeedback("Missing Fields", "Please fill in both password fields.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showFeedback("Weak Password", "Password must be at least 8 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showFeedback("Password Mismatch", "Passwords do not match. Please try again.", "error");
      return;
    }

    setLoading(true);
    try {
      console.log("[ResetPassword] Calling resetPassword with token...");
      const result = await authClient.resetPassword({ newPassword, token: token as string });
      if (result.error) {
        throw new Error(result.error.message || "Failed to reset password.");
      }
      console.log("[ResetPassword] Password reset successfully");
      showFeedback(
        "Password Reset!",
        "Your password has been reset. Please sign in with your new password.",
        "success",
        () => router.replace("/auth")
      );
    } catch (error: any) {
      console.log("[ResetPassword] Reset failed:", error.message);
      showFeedback("Reset Failed", error.message || "Could not reset password. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToAuth = () => {
    console.log("[ResetPassword] Go to Sign In tapped");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/auth");
  };

  if (!token) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.errorIconContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
        </View>
        <Text style={styles.errorTitle}>Invalid Reset Link</Text>
        <Text style={styles.errorSubtitle}>
          This password reset link is invalid or has expired. Please request a new one.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleGoToAuth}>
          <Text style={styles.primaryButtonText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>CC</Text>
            </View>
            <Text style={styles.appName}>Control & Confidence</Text>
          </View>

          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>Choose a strong password for your account.</Text>

          <TextInput
            style={styles.input}
            placeholder="New Password (min. 8 characters)"
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={handleGoToAuth}>
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
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
  centeredContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  appName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
    fontWeight: "500",
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
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
  backButton: {
    marginTop: 16,
    alignItems: "center",
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
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
