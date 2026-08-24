import React, { useState, useRef } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, signInWithApple, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);
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

  if (authLoading) {
    return (
      <View
        style={styles.loadingContainer}
        accessible={true}
        accessibilityLabel="Loading, please wait"
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleSignIn = async () => {
    console.log("[Auth] Sign In button pressed — email:", email);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      showFeedback("Email Required", "Please enter your email address.", "error");
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      showFeedback("Invalid Email", "Please enter a valid email address (e.g. name@example.com).", "error");
      return;
    }
    if (!password) {
      showFeedback("Password Required", "Please enter your password.", "error");
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      console.log("[Auth] Calling signInWithEmail...");
      await signInWithEmail(trimmedEmail, password);
      console.log("[Auth] Sign in successful, navigating to /auth-callback");
      router.replace("/auth-callback");
    } catch (error: any) {
      const msg = error?.message ?? "";
      const isNetwork = /fetch|network|failed to fetch|timeout/i.test(msg);
      console.log("[Auth] Sign in failed — isNetwork:", isNetwork, "msg:", msg);
      showFeedback(
        isNetwork ? "No Connection" : "Sign In Failed",
        isNetwork ? "Check your internet connection and try again." : "Incorrect email or password. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleForgotPassword = () => {
    console.log("[Auth] Forgot Password tapped");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/forgot-password");
  };

  const handleGoToSignUp = () => {
    console.log("[Auth] Navigate to Sign Up tapped");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/signup");
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    console.log("[Auth] Social auth tapped — provider:", provider);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
      // On web, navigate to callback to process the popup token
      // On native, the OAuth deep link handles session restoration — AuthGate routes automatically
      if (Platform.OS === "web") {
        console.log("[Auth] Social auth successful (web), navigating to /auth-callback");
        router.replace("/auth-callback");
      } else {
        console.log("[Auth] Social auth initiated (native), waiting for deep link redirect");
      }
    } catch (error: any) {
      if (error?.message !== "Authentication cancelled") {
        const msg = error?.message ?? "";
        const isNetwork = msg.includes("fetch") || msg.includes("network") || msg.includes("Network") || msg.toLowerCase().includes("failed to fetch");
        console.log("[Auth] Social auth failed — isNetwork:", isNetwork, "msg:", msg);
        showFeedback(
          isNetwork ? "No Connection" : "Sign In Failed",
          isNetwork ? "Check your internet connection and try again." : "Social authentication failed. Please try again.",
          "error"
        );
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
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

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to access your programs and progress</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            onBlur={() => setEmail((v) => v.trim())}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email address"
            accessibilityHint="Enter your email address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <View style={styles.inputRow}>
            <TextInput
              ref={passwordRef}
              style={[styles.input, styles.inputFlex]}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              accessibilityLabel="Password"
              accessibilityHint="Enter your password"
              returnKeyType="go"
              onSubmitEditing={handleSignIn}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeButtonText}>{showPassword ? "🙈" : "👁"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
            accessibilityLabel="Forgot password"
            accessibilityRole="link"
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            accessibilityLabel={loading ? "Signing in, please wait" : "Sign In"}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={handleGoToSignUp}
            accessibilityLabel="Don't have an account? Sign Up"
            accessibilityRole="link"
          >
            <Text style={styles.switchModeText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialAuth("google")}
            disabled={loading}
            accessibilityLabel="Continue with Google"
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={styles.socialButtonText}>🌐  Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={() => handleSocialAuth("apple")}
              disabled={loading}
              accessibilityLabel="Continue with Apple"
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                🍎  Continue with Apple
              </Text>
            </TouchableOpacity>
          )}
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
            accessibilityViewIsModal={true}
            accessibilityLiveRegion="assertive"
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
            <Text style={styles.feedbackTitle} accessibilityRole="header">{feedbackModal.title}</Text>
            <Text style={styles.feedbackMessage}>{feedbackModal.message}</Text>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                { backgroundColor: feedbackModal.type === "error" ? "#FF3B30" : colors.success },
              ]}
              onPress={hideFeedback}
              activeOpacity={0.8}
              accessibilityLabel="Dismiss error"
              accessibilityRole="button"
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: 16,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
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
  switchModeButton: {
    marginTop: 16,
    alignItems: "center",
  },
  switchModeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  socialButton: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: colors.card,
  },
  socialButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  appleButtonText: {
    color: "#fff",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  inputFlex: {
    flex: 1,
    marginBottom: 0,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  eyeButtonText: {
    fontSize: 18,
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
