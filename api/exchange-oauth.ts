// Vercel Serverless Function for OAuth Token Exchange
// Endpoint: POST /api/exchange-oauth
// Environment variables are read from Vercel Dashboard

import type { VercelRequest, VercelResponse } from "@vercel/node";

const QURAN_AUTH_BASE = "https://oauth2.quran.foundation";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, codeVerifier, redirectUri } = req.body;

    if (!code || !codeVerifier || !redirectUri) {
      return res.status(400).json({
        error: "Missing required fields: code, codeVerifier, or redirectUri",
      });
    }

    // Production credentials only from Vercel env vars
    const clientId = process.env.QURAN_CLIENT_ID;
    const clientSecret = process.env.QURAN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing OAuth credentials:", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      });
      return res.status(500).json({
        error: "Server configuration error: Missing OAuth credentials",
      });
    }

    console.log("Exchanging token for Production environment");

    // Build token exchange request
    const bodyParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    // Generate Basic Auth header
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    // Exchange code for tokens
    const tokenResponse = await fetch(`${QURAN_AUTH_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: bodyParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Quran OAuth Token Error:", tokenData);
      return res.status(tokenResponse.status).json({
        error: tokenData.error_description || tokenData.error || "Token exchange failed",
      });
    }

    // Fetch user profile
    let userInfo = null;
    try {
      const profileResponse = await fetch(`${QURAN_AUTH_BASE}/oauth2/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (profileResponse.ok) {
        userInfo = await profileResponse.json();
        console.log("UserInfo fetched:", userInfo);
      } else {
        console.warn("UserInfo fetch failed:", profileResponse.status);
      }
    } catch (e) {
      console.warn("UserInfo fetch error:", (e as Error).message);
    }

    // Return combined response
    return res.status(200).json({
      ...tokenData,
      profile: userInfo,
    });
  } catch (error) {
    console.error("Exchange OAuth Error:", error);
    return res.status(500).json({
      error: (error as Error).message || "Internal server error",
    });
  }
}
