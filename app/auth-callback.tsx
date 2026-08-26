import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { colors } from "@/styles/commonStyles";
import { trackEvent } from "@/utils/analytics";

function resolveReturnTo(returnTo: string | undefined): string | null {
  if (!returnTo) return null;
  const dayMatch = returnTo.match(/^day_(\d+)$/);
  if (dayMatch) {
    const n = parseInt(dayMatch[1], 10);
    if (n >= 1 && n <= 90) return `/day/${n}`;
  }
  const allowed = ['/(tabs)/program', '/(tabs)/(home)', '/program-intro'];
  if (allowed.includes(returnTo)) return returnTo;
  return null;
}

type State = "loading" | "timeout" | "error";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
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
      const { authenticatedGet } = await import("@/utils/api");
      // Check if profile exists
      let profileExists = false;
      try {
        await authenticatedGet("/api/profile");
        profileExists = true;
        console.log("[Auth Callback] profile found");
      } catch (profileErr: any) {
        const msg = profileErr?.message ?? "";
        if (msg.includes("404") || msg.includes("profile_not_found")) {
          console.log("[Auth Callback] no profile found — routing to /program-intro");
          router.replace("/program-intro");
          return;
        }
        console.warn("[Auth Callback] profile fetch error, defaulting to /program-intro:", msg);
        router.replace("/program-intro");
        return;
      }

      if (!profileExists) {
        console.log("[Auth Callback] no profile — routing to /program-intro");
        router.replace("/program-intro");
        return;
      }

      // Profile exists — check onboarding completion
      try {
        const onboarding = await authenticatedGet<{ completed_at: string | null }>("/api/onboarding");
        if (onboarding?.completed_at) {
          const destination = resolveReturnTo(returnTo);
          if (destination) {
            console.log("[Auth Callback] onboarding complete — routing to returnTo:", destination);
            trackEvent('auth_return_completed', { destination });
            router.replace(destination as any);
          } else {
            console.log("[Auth Callback] onboarding complete — routing to /(tabs)/(home)");
            router.replace("/(tabs)/(home)");
          }
        } else {
          console.log("[Auth Callback] onboarding incomplete — routing to /program-intro");
          router.replace("/program-intro");
        }
      } catch {
        console.log("[Auth Callback] onboarding check failed (404) — routing to /program-intro");
        router.replace("/program-intro");
      }
    } catch (err: any) {
      console.warn("[Auth Callback] unexpected error, defaulting to /program-intro:", err?.message);
      router.replace("/program-intro");
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
