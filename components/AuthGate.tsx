import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

const PUBLIC_ROUTES = new Set([
  "auth",
  "signup",
  "forgot-password",
  "reset-password",
  "verify-email",
  "email-verification-pending",
  "auth-popup",
  "auth-callback",
]);

const POST_AUTH_REDIRECT_FROM = new Set([
  "auth",
  "signup",
  "forgot-password",
  "reset-password",
]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return; // wait for auth restore
    const first = segments[0] ?? "";
    const isPublic = PUBLIC_ROUTES.has(first);

    if (!user && !isPublic) {
      console.log("[AuthGate] unauthenticated user on protected route, redirecting to /auth");
      router.replace("/auth");
      return;
    }
    if (user && POST_AUTH_REDIRECT_FROM.has(first)) {
      console.log("[AuthGate] authenticated user on auth route, redirecting to /auth-callback");
      router.replace("/auth-callback");
      return;
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}
