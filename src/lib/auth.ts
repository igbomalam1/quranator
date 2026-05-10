import { supabase } from "@/integrations/supabase/client";

// Auth credentials with runtime safety fallback cascade
const QURAN_AUTH_BASE = import.meta.env.VITE_QURAN_AUTH_BASE || "https://oauth2.quran.foundation";
const CLIENT_ID = import.meta.env.VITE_QURAN_CLIENT_ID || "74b4fce7-1591-401d-93de-c27a2b0cac85";

const QURAN_TEST_AUTH_BASE = import.meta.env.VITE_QURAN_TEST_AUTH_BASE || "https://prelive-oauth2.quran.foundation";
const TEST_CLIENT_ID = import.meta.env.VITE_QURAN_TEST_CLIENT_ID || "9c656e3f-4cd0-4588-af77-dcf96da42264";

// Dynamically compute URI if env fails, resolving edge deployment (Vercel) undefined breaks
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || `${window.location.origin}/callback`;

export interface AuthUser {
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function initiateOAuth(isTest: boolean = false) {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  localStorage.setItem("oauth_code_verifier", codeVerifier);
  localStorage.setItem("oauth_state", state);
  localStorage.setItem("oauth_is_test", isTest ? "true" : "false");

  const activeAuthBase = isTest ? QURAN_TEST_AUTH_BASE : QURAN_AUTH_BASE;
  const activeClientId = isTest ? TEST_CLIENT_ID : CLIENT_ID;

  const nonce = crypto.randomUUID();
  localStorage.setItem("oauth_nonce", nonce);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: activeClientId,
    redirect_uri: REDIRECT_URI,
    scope: "openid offline_access user collection",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  window.location.href = `${activeAuthBase}/oauth2/auth?${params.toString()}`;
}

export async function handleOAuthCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
  const savedState = localStorage.getItem("oauth_state");
  const codeVerifier = localStorage.getItem("oauth_code_verifier");
  const isTest = localStorage.getItem("oauth_is_test") === "true";

  if (state !== savedState || !codeVerifier) {
    console.error("OAuth state mismatch or missing verifier");
    return { success: false, error: "OAuth state mismatch or missing session verifier" };
  }

  const activeAuthBase = isTest ? QURAN_TEST_AUTH_BASE : QURAN_AUTH_BASE;
  const activeClientId = isTest ? TEST_CLIENT_ID : CLIENT_ID;

  try {
    // Securely execute the server-side token exchange inside your Supabase Postgres instance to eliminate CORS errors.
    // No CLI required! Simply paste the SQL snippet provided into the Supabase SQL Editor.
    const { data: rpcResult, error: rpcError } = await supabase.rpc("exchange_oauth_token", {
      p_code: code,
      p_code_verifier: codeVerifier,
      p_redirect_uri: REDIRECT_URI,
      p_is_test: isTest,
    });

    const tokenData = rpcResult as any;

    if (rpcError || !tokenData || tokenData.error) {
      const actualError = tokenData?.error?.error_description || tokenData?.error?.message || tokenData?.error || rpcError?.message || "Database refused the secure token exchange.";
      console.error("Database token exchange failed:", actualError);
      return { success: false, error: actualError };
    }

    const tokens: AuthTokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + tokenData.expires_in * 1000,
    };

    localStorage.setItem("auth_tokens", JSON.stringify(tokens));

    // Use the pre-fetched profile provided securely by the Edge function
    const userInfo = tokenData.profile;
    let profile = {
      name: isTest ? "Quran Test Learner" : "Quran Learner",
      email: isTest ? "test-user@quran.com" : "user@quran.com",
    };

    if (userInfo) {
      profile = {
        name: `${userInfo.first_name || ""} ${userInfo.last_name || ""}`.trim() || userInfo.email?.split("@")[0] || "Quran Learner",
        email: userInfo.email || profile.email,
      };
    }

    localStorage.setItem("auth_user", JSON.stringify(profile));

    // Upsert real user profile into Supabase
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({
        email: profile.email,
        name: profile.name,
      });

    if (upsertError) {
      console.error("Failed to upsert user profile into Supabase:", upsertError);
    }

    localStorage.removeItem("oauth_code_verifier");
    localStorage.removeItem("oauth_state");
    localStorage.removeItem("oauth_is_test");
    localStorage.removeItem("oauth_nonce");

    return { success: true };
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return { success: false, error: err.message || "An unexpected network or security error occurred during token exchange" };
  }
}

export function getTokens(): AuthTokens | null {
  const raw = localStorage.getItem("auth_tokens");
  if (!raw) return null;
  return JSON.parse(raw);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  return JSON.parse(raw);
}

export function isAuthenticated(): boolean {
  const tokens = getTokens();
  return tokens !== null && tokens.expires_at > Date.now();
}

export function logout() {
  localStorage.removeItem("auth_tokens");
  localStorage.removeItem("auth_user");
  window.location.href = "/";
}

// Demo login for testing without OAuth
export async function demoLogin() {
  const tokens: AuthTokens = {
    access_token: "demo_token",
    expires_at: Date.now() + 24 * 60 * 60 * 1000,
  };
  const user: AuthUser = {
    name: "Demo User",
    email: "demo@quranai.app",
  };
  localStorage.setItem("auth_tokens", JSON.stringify(tokens));
  localStorage.setItem("auth_user", JSON.stringify(user));

  // Upsert demo profile into Supabase
  await supabase.from("profiles").upsert({
    email: user.email,
    name: user.name,
  });
}
