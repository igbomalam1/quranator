import { supabase } from "@/integrations/supabase/client";

// TEST OAuth configuration - hardcoded to diagnose scope issues
const QURAN_AUTH_BASE = "https://prelive-oauth2.quran.foundation";
const CLIENT_ID = "9c656e3f-4cd0-4588-af77-dcf96da42264";

// Redirect URI must be explicitly set in environment to match Quran.com registration exactly
// No fallback allowed - prevents security issues from mismatched origins
export const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;

// Runtime validation - fail fast if redirect URI is not configured
if (!REDIRECT_URI) {
  throw new Error(
    "FATAL: VITE_REDIRECT_URI environment variable is required. " +
    "Set it to the exact URL registered on Quran.com (e.g., https://yourapp.com/callback)"
  );
}

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

export async function initiateOAuth() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  localStorage.setItem("oauth_code_verifier", codeVerifier);
  localStorage.setItem("oauth_state", state);

  // Using OAuth2 only scopes (openid removed - client not registered for OIDC)
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "offline_access user collection bookmark reading_session",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const finalUrl = `${QURAN_AUTH_BASE}/oauth2/auth?${params.toString()}`;
  console.log("Initiating OAuth redirect to:", finalUrl);
  window.location.href = finalUrl;
}

export async function handleOAuthCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
  const savedState = localStorage.getItem("oauth_state");
  const codeVerifier = localStorage.getItem("oauth_code_verifier");

  if (state !== savedState || !codeVerifier) {
    console.error("OAuth state mismatch or missing verifier");
    return { success: false, error: "OAuth state mismatch or missing session verifier" };
  }

  try {
    // Call Vercel API Route for secure server-side token exchange
    const apiUrl = import.meta.env.DEV 
      ? "http://localhost:3000/api/exchange-oauth"
      : "/api/exchange-oauth";
      
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code,
        codeVerifier: codeVerifier,
        redirectUri: REDIRECT_URI,
      }),
    });

    const tokenData = await response.json();
    
    if (!response.ok || tokenData.error) {
      const actualError = tokenData?.error?.error_description || tokenData?.error || "Token exchange failed";
      console.error("Token exchange failed:", actualError);
      return { success: false, error: actualError };
    }

    const tokens: AuthTokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + tokenData.expires_in * 1000,
    };

    localStorage.setItem("auth_tokens", JSON.stringify(tokens));

    // API returns: { email, first_name, last_name }
    const userInfo = tokenData.profile;
    let profile = {
      name: "Quran Learner",
      email: "user@quran.com",
    };

    if (userInfo) {
      const firstName = userInfo.first_name || "";
      const lastName = userInfo.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      
      profile = {
        name: fullName || userInfo.email?.split("@")[0] || "Quran Learner",
        email: userInfo.email || profile.email,
      };
    }

    localStorage.setItem("auth_user", JSON.stringify(profile));

    // Upsert user profile into Supabase
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

  await supabase.from("profiles").upsert({
    email: user.email,
    name: user.name,
  });
}
