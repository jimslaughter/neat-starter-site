// functions/api/auth.js
// Cloudflare Pages Function for Decap (Netlify) CMS GitHub OAuth

export async function onRequest(context) {
  const { request, env } = context;

  const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
  const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

  const url = new URL(request.url);

  // Step 1: redirect user to GitHub authorize page
  if (url.pathname.endsWith("/auth") && !url.searchParams.get("code")) {
    const redirectUri = `${url.origin}/api/auth/callback`;
    // If your repo is PUBLIC, use "public_repo" instead of "repo" (narrower scope)
    const scope = "public_repo user:email"; // or "repo user:email" for private repos
    const authUrl =
      `${GITHUB_AUTHORIZE_URL}?client_id=${encodeURIComponent(env.OAUTH_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    return Response.redirect(authUrl, 302);
  }

  // Step 2: handle callback from GitHub with ?code=...
  if (url.pathname.endsWith("/auth/callback")) {
    const code = url.searchParams.get("code");
    if (!code) {
      return new Response("Missing code", { status: 400 });
    }

    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({
        client_id: env.OAUTH_CLIENT_ID,
        client_secret: env.OAUTH_CLIENT_SECRET,
        code,
      }),
    });

    const data = await tokenResponse.json();

    if (data.error) {
      return new Response(JSON.stringify(data), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Decap CMS expects JSON with access_token, token_type, scope, etc.
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not found", { status: 404 });
}
