import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, codeVerifier, redirectUri, isTest } = await req.json();

    if (!code || !codeVerifier || !redirectUri) {
      throw new Error("Missing required payload: code, codeVerifier, or redirectUri");
    }

    // 1. Select the correct environment configuration
    const activeAuthBase = isTest
      ? Deno.env.get("QURAN_TEST_AUTH_BASE") || "https://prelive-oauth2.quran.foundation"
      : Deno.env.get("QURAN_AUTH_BASE") || "https://oauth2.quran.foundation";

    const activeClientId = isTest
      ? Deno.env.get("QURAN_TEST_CLIENT_ID")
      : Deno.env.get("QURAN_CLIENT_ID");

    const activeClientSecret = isTest
      ? Deno.env.get("QURAN_TEST_CLIENT_SECRET")
      : Deno.env.get("QURAN_CLIENT_SECRET");

    if (!activeClientId || !activeClientSecret) {
      throw new Error(`Supabase Secret Missing: QURAN_CLIENT_ID or QURAN_CLIENT_SECRET is not defined on the server.`);
    }

    console.log(`Exchanging token for ${isTest ? 'Test' : 'Production'} with base: ${activeAuthBase}`);

    // 2. Build Token Exchange Request Body
    const bodyParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    // 3. Generate Basic Auth Header (Standard for Confidential Clients)
    const credentials = btoa(`${activeClientId}:${activeClientSecret}`);

    // 4. Execute Token Request on Server-side (Bypassing CORS)
    const tokenEndpoint = `${activeAuthBase}/oauth2/token`;
    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: bodyParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Quran OAuth Token Error:", tokenData);
      return new Response(JSON.stringify({ error: tokenData }), {
        status: tokenResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Immediately fetch the OIDC profile while we're securely server-side
    let userInfo = null;
    try {
      const profileResponse = await fetch(`${activeAuthBase}/oauth2/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      
      if (profileResponse.ok) {
        userInfo = await profileResponse.json();
      }
    } catch (e) {
      console.warn("User profile fetch failed, continuing without profile:", e.message);
    }

    // Combined response back to browser client securely
    return new Response(JSON.stringify({
      ...tokenData,
      profile: userInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
