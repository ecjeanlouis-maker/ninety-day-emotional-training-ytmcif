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
import { useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { authClient } from "@/lib/auth";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
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

  const handleSendResetLink = async () => {
    console.log("[ForgotPassword] Send Reset Link pressed — email:", email);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!email) {
      showFeedback("Missing Email", "Please enter your email address.", "error");
      return;
    }
    if (!email.includes("@")) {
      showFeedback("Invalid Email", "Please enter a valid email address.", "error");
      return;
    }

    setLoading(true);
    try {
      const redirectTo = Linking.createURL("/reset-password");
      console.log("[ForgotPassword] Calling forgetPassword — redirectTo:", redirectTo);
      const result = await authClient.forgetPassword({ email, redirectTo });
      if (result.error) {
        throw new Error(result.error.message || "Failed to send reset link.");
      }
      console.log("[ForgotPassword] Reset link sent successfully");
      showFeedback(
        "Email Sent!",
        "Check your email for the password reset link.",
        "success",
        () => router.replace("/auth")
      );
    } catch (error: any) {
      console.log("[ForgotPassword] Failed to send reset link:", error.message);
      showFeedback("Request Failed", error.message || "Could not send reset link. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    console.log("[ForgotPassword] Back to Sign In tapped");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

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

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a link to reset your password.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSendResetLink}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
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
