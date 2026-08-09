import { NextResponse } from "next/server";
import { handleOAuthLogin } from "@/lib/actions/auth.action";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // For quick local development: If no Google client credentials are set,
  // we can use a mock query parameter to simulate Google OAuth success.
  const mockEmail = searchParams.get("mock_email");
  const mockName = searchParams.get("mock_name");

  if (mockEmail && mockName && process.env.NODE_ENV === "development") {
    console.log(`OAuth simulated for: ${mockEmail} (${mockName})`);
    const loginResult = await handleOAuthLogin(mockEmail, mockName);
    if (loginResult.success) {
      const targetPath = loginResult.isAdmin ? "/admin" : "/";
      return NextResponse.redirect(new URL(targetPath, request.url));
    }
  }

  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing_auth_code", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const host = request.headers.get("host") || "localhost:4001";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/auth/google`;

  if (!clientId || !clientSecret) {
    console.error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables are not set");
    return NextResponse.redirect(
      new URL("/sign-in?error=google_oauth_not_configured_use_mock_for_dev", request.url)
    );
  }

  try {
    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/sign-in?error=token_exchange_failed", request.url));
    }

    // 2. Fetch user information using access token
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error("Failed to fetch Google user info:", userData);
      return NextResponse.redirect(new URL("/sign-in?error=failed_to_fetch_user_info", request.url));
    }

    const { email, name } = userData;

    if (!email) {
      return NextResponse.redirect(new URL("/sign-in?error=email_not_provided_by_google", request.url));
    }

    // 3. Register/Login user in Firestore and sign custom JWT
    const loginResult = await handleOAuthLogin(email, name || "Google User");

    if (loginResult.success) {
      const targetPath = loginResult.isAdmin ? "/admin" : "/";
      return NextResponse.redirect(new URL(targetPath, request.url));
    } else {
      return NextResponse.redirect(
        new URL(`/sign-in?error=${encodeURIComponent(loginResult.message || "login_failed")}`, request.url)
      );
    }
  } catch (err) {
    console.error("OAuth exception:", err);
    return NextResponse.redirect(new URL("/sign-in?error=internal_oauth_error", request.url));
  }
}
