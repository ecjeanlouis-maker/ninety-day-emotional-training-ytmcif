import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { authClient } from "@/lib/auth";
import { apiUrl, getAuthHeaders } from "@/utils/api";

type Status = "processing" | "success" | "error";

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState("Processing authentication...");
  const router = useRouter();

  useEffect(() => {
    // BRANCH A: Web OAuth popup bridge (only when ?better_auth_token=... or ?error=... is in URL)
    if (Platform.OS === "web") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("better_auth_token");
      const error = urlParams.get("error");
      if (token || error) {
        handleOAuthBridge(token, error);
        return;
      }
    }
    // BRANCH B: Post-login routing
    setMessage("Loading your dashboard...");
    routePostLogin();
  }, []);

  const handleOAuthBridge = (token: string | null, error: string | null) => {
    try {
      if (error) {
        setStatus("error");
        setMessage(`Authentication failed: ${error}`);
        window.opener?.postMessage({ type: "oauth-error", error }, "*");
        return;
      }

      if (token) {
        setStatus("success");
        setMessage("Authentication successful! Closing...");
        window.opener?.postMessage({ type: "oauth-success", token }, "*");
        setTimeout(() => window.close(), 1000);
      } else {
        setStatus("error");
        setMessage("No authentication token received");
        window.opener?.postMessage({ type: "oauth-error", error: "No token" }, "*");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Failed to process authentication");
      console.error("Auth callback error:", err);
    }
  };

  const routePostLogin = async () => {
    console.log("[Auth Callback] routing post-login user");
    const session = await authClient.getSession();
    if (!session?.data?.user) {
      console.log("[Auth Callback] no session → /auth");
      router.replace("/auth");
      return;
    }
    console.log("[Auth Callback] user authenticated:", session.data.user.email);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl("/api/profile"), { headers });
      console.log("[Auth Callback] profile fetch status:", res.status);
      if (res.status === 404) {
        console.warn("[Auth Callback] no profile row found, defaulting to /(tabs)");
        router.replace("/(tabs)");
        return;
      }
      if (!res.ok) {
        console.warn("[Auth Callback] profile fetch failed, defaulting to /(tabs)");
        router.replace("/(tabs)");
        return;
      }
      const profile = await res.json();
      console.log("[Auth Callback] onboarding_completed:", profile.onboarding_completed);
      // Both onboarding-completed and onboarding-incomplete users go to /(tabs).
      // The /onboarding route doesn't exist anymore — keeping the routing simple.
      router.replace("/(tabs)");
    } catch (err) {
      console.warn("[Auth Callback] profile fetch error, defaulting to /(tabs)", err);
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={styles.container}>
      {status === "processing" && <ActivityIndicator size="large" color="#007AFF" />}
      {status === "success" && <Text style={styles.successIcon}>✓</Text>}
      {status === "error" && <Text style={styles.errorIcon}>✗</Text>}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  successIcon: {
    fontSize: 48,
    color: "#34C759",
  },
  errorIcon: {
    fontSize: 48,
    color: "#FF3B30",
  },
  message: {
    fontSize: 18,
    marginTop: 20,
    textAlign: "center",
    color: "#333",
  },
});
