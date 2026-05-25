import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { authClient } from "@/lib/auth";
import * as Haptics from "expo-haptics";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      console.log("[VerifyEmail] No token found in params");
      setState("error");
      setErrorMessage("No verification token found.");
      return;
    }

    const verify = async () => {
      console.log("[VerifyEmail] Verifying email with token...");
      try {
        const result = await authClient.verifyEmail({ query: { token } });
        if (result.error) {
          throw new Error(result.error.message || "Verification failed.");
        }
        console.log("[VerifyEmail] Email verified successfully");
        setState("success");
      } catch (error: any) {
        console.log("[VerifyEmail] Verification failed:", error.message);
        setState("error");
        setErrorMessage(error.message || "Could not verify your email. The link may have expired.");
      }
    };

    verify();
  }, [token]);

  const handleContinue = () => {
    console.log("[VerifyEmail] Continue button pressed — state:", state);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (state === "success") {
      router.replace("/");
    } else {
      router.replace("/email-verification-pending");
    }
  };

  if (state === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Verifying your email...</Text>
      </View>
    );
  }

  const isSuccess = state === "success";
  const iconBg = isSuccess ? "#F0FFF4" : "#FFF0F0";
  const icon = isSuccess ? "✅" : "❌";
  const titleText = isSuccess ? "Email Verified!" : "Verification Failed";
  const subtitleText = isSuccess
    ? "Your email has been verified. You're all set!"
    : errorMessage || "The verification link may have expired. Please request a new one.";
  const buttonText = isSuccess ? "Continue" : "Try Again";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
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
    elevation: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
