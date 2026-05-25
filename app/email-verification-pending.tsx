import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { authClient } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function EmailVerificationPendingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "error" | "success";
  }>({ visible: false, title: "", message: "", type: "error" });

  const showFeedback = (title: string, message: string, type: "error" | "success" = "error") => {
    setFeedbackModal({ visible: true, title, message, type });
  };

  const hideFeedback = () => {
    setFeedbackModal((prev) => ({ ...prev, visible: false }));
  };

  const handleResend = async () => {
    console.log("[EmailVerification] Resend Verification Email pressed — email:", user?.email);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!user?.email) {
      showFeedback("Not Signed In", "Please sign in to resend the verification email.", "error");
      return;
    }

    setLoading(true);
    try {
      console.log("[EmailVerification] Calling sendVerificationEmail...");
      const result = await authClient.sendVerificationEmail({
        email: user.email,
        callbackURL: "/",
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to send verification email.");
      }
      console.log("[EmailVerification] Verification email sent successfully");
      showFeedback("Email Sent!", "A new verification link has been sent to your email.", "success");
    } catch (error: any) {
      console.log("[EmailVerification] Failed to resend:", error.message);
      showFeedback("Send Failed", error.message || "Could not send verification email. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    console.log("[EmailVerification] Continue to App pressed");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/");
  };

  const userEmail = user?.email || "your email";
  const isVerified = user?.emailVerified === true;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.mailIcon}>✉️</Text>
        </View>

        <Text style={styles.title}>Verify Your Email</Text>

        {isVerified ? (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
          </View>
        ) : null}

        <Text style={styles.subtitle}>
          We sent a verification link to
        </Text>
        <Text style={styles.emailText}>{userEmail}</Text>
        <Text style={styles.subtitleContinued}>
          Click the link in your email to verify your account.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleResend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Resend Verification Email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleContinue}>
          <Text style={styles.secondaryButtonText}>Continue to App</Text>
        </TouchableOpacity>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.highlight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  mailIcon: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  verifiedBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  verifiedBadgeText: {
    color: "#27AE60",
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  emailText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "center",
    marginVertical: 4,
  },
  subtitleContinued: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  primaryButton: {
    width: "100%",
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
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
  secondaryButton: {
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
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
