import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl, getAuthHeaders } from "@/utils/api";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // BRANCH A: Web OAuth popup bridge
    if (Platform.OS === "web") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("better_auth_token");
      const error = urlParams.get("error");
      if (token || error) {
        if (error) {
          window.opener?.postMessage({ type: "oauth-error", error }, "*");
        } else if (token) {
          window.opener?.postMessage({ type: "oauth-success", token }, "*");
          setTimeout(() => window.close(), 500);
        }
        return;
      }
    }
    // BRANCH B: Wait for auth to resolve, then route
    if (loading) return;
    if (!user) {
      console.log("[Auth Callback] no session → /auth");
      router.replace("/auth");
      return;
    }
    console.log("[Auth Callback] user authenticated:", user.email);
    routePostLogin();
  }, [user, loading]);

  const routePostLogin = async () => {
    console.log("[Auth Callback] routing post-login user");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl("/api/profile"), { headers });
      console.log("[Auth Callback] profile fetch status:", res.status);
      // Always route to tabs regardless of profile state
      router.replace("/(tabs)");
    } catch (err) {
      console.warn("[Auth Callback] profile fetch error, defaulting to /(tabs)", err);
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6B4CE6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
});
