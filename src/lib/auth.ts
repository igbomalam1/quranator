// Auth utilities for Quran.com OAuth + local storage
const QURAN_AUTH_BASE = "https://prelive-oauth2.quran.foundation";
const QURAN_API_BASE = "https://apis-prelive.quran.foundation";
const CLIENT_ID = "9c656e3f-4cd0-4588-af77-dcf96da42264";
const REDIRECT_URI = `${window.location.origin}/callback`;

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

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid offline_access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  window.location.href = `${QURAN_AUTH_BASE}/oauth2/auth?${params.toString()}`;
}

export async function handleOAuthCallback(code: string, state: string): Promise<boolean> {
  const savedState = localStorage.getItem("oauth_state");
  const codeVerifier = localStorage.getItem("oauth_code_verifier");

  if (state !== savedState || !codeVerifier) {
    console.error("OAuth state mismatch or missing verifier");
    return false;
  }

  try {
    const response = await fetch(`${QURAN_AUTH_BASE}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      console.error("Token exchange failed:", await response.text());
      return false;
    }

    const data = await response.json();
    const tokens: AuthTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    localStorage.setItem("auth_tokens", JSON.stringify(tokens));
    localStorage.setItem("auth_user", JSON.stringify({
      name: "Quran Learner",
      email: "user@quran.com",
    }));

    localStorage.removeItem("oauth_code_verifier");
    localStorage.removeItem("oauth_state");

    return true;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return false;
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
export function demoLogin() {
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
}

export { QURAN_API_BASE };
