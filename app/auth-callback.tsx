import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl, getAuthHeaders } from "@/utils/api";
import { colors } from "@/styles/commonStyles";

type State = "loading" | "timeout" | "error";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("Loading your dashboard...");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routedRef = useRef(false);

  // 10-second timeout
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!routedRef.current) {
        console.log("[Auth Callback] 10s timeout reached — showing timeout state");
        setState("timeout");
        setMessage("Taking longer than expected.");
      }
    }, 10000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    // BRANCH A: Web OAuth popup bridge
    if (Platform.OS === "web") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("better_auth_token");
      const error = urlParams.get("error");
      if (token || error) {
        if (error) {
          console.log("[Auth Callback] Web OAuth error:", error);
          window.opener?.postMessage({ type: "oauth-error", error }, "*");
        } else if (token) {
          console.log("[Auth Callback] Web OAuth success — posting token to opener");
          window.opener?.postMessage({ type: "oauth-success", token }, "*");
          setTimeout(() => window.close(), 500);
        }
        return;
      }
    }
    // BRANCH B: Wait for auth to resolve
    if (loading) return;
    if (!user) {
      console.log("[Auth Callback] no session → /auth");
      routedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      router.replace("/auth");
      return;
    }
    console.log("[Auth Callback] user authenticated:", user.email);
    routedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    routePostLogin();
  }, [user, loading]);

  const routePostLogin = async () => {
    console.log("[Auth Callback] routing post-login user");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl("/api/profile"), { headers });
      console.log("[Auth Callback] profile fetch status:", res.status);
      router.replace("/(tabs)");
    } catch (err) {
      console.warn("[Auth Callback] profile fetch error, defaulting to /(tabs)", err);
      router.replace("/(tabs)");
    }
  };

  if (state === "timeout" || state === "error") {
    return (
      <View style={styles.container} accessibilityLiveRegion="assertive">
        <Text style={styles.icon}>⏱</Text>
        <Text style={styles.title} accessibilityRole="header">
          {state === "timeout" ? "Still loading…" : "Something went wrong"}
        </Text>
        <Text style={styles.subtitle}>{message}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            console.log("[Auth Callback] Go to Sign In tapped from", state, "state");
            routedRef.current = true;
            router.replace("/auth");
          }}
          accessibilityLabel="Go to Sign In"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel="Loading your dashboard, please wait"
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading" />
      <Text style={styles.subtitle} accessibilityLiveRegion="polite">{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, padding: 32, gap: 16 },
  icon: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
  button: { marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
