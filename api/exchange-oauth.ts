// Vercel Serverless Function for OAuth Token Exchange
// Endpoint: POST /api/exchange-oauth
// Environment variables are read from Vercel Dashboard

import type { VercelRequest, VercelResponse } from "@vercel/node";

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
    const { code, codeVerifier, redirectUri, isTest } = req.body;

    if (!code || !codeVerifier || !redirectUri) {
      return res.status(400).json({
        error: "Missing required fields: code, codeVerifier, or redirectUri",
      });
    }

    // Select environment configuration from Vercel env vars
    const activeAuthBase = isTest
      ? process.env.QURAN_TEST_AUTH_BASE || "https://prelive-oauth2.quran.foundation"
      : process.env.QURAN_AUTH_BASE || "https://oauth2.quran.foundation";

    const activeClientId = isTest
      ? process.env.QURAN_TEST_CLIENT_ID
      : process.env.QURAN_CLIENT_ID;

    const activeClientSecret = isTest
      ? process.env.QURAN_TEST_CLIENT_SECRET
      : process.env.QURAN_CLIENT_SECRET;

    if (!activeClientId || !activeClientSecret) {
      console.error("Missing OAuth credentials:", {
        hasClientId: !!activeClientId,
        hasClientSecret: !!activeClientSecret,
        isTest,
      });
      return res.status(500).json({
        error: `Server configuration error: Missing ${isTest ? "test " : ""}OAuth credentials`,
      });
    }

    console.log(`Exchanging token for ${isTest ? "Test" : "Production"} environment`);

    // Build token exchange request
    const bodyParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    // Generate Basic Auth header
    const credentials = Buffer.from(`${activeClientId}:${activeClientSecret}`).toString("base64");

    // Exchange code for tokens
    const tokenResponse = await fetch(`${activeAuthBase}/oauth2/token`, {
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
      const profileResponse = await fetch(`${activeAuthBase}/oauth2/userinfo`, {
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
      console.warn("UserInfo fetch error:", e.message);
    }

    // Return combined response
    return res.status(200).json({
      ...tokenData,
      profile: userInfo,
    });
  } catch (error) {
    console.error("Exchange OAuth Error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
