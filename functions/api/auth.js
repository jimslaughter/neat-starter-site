// functions/api/auth.js
// Cloudflare Pages Function for Decap CMS GitHub OAuth with postMessage callback

export async function onRequest(context) {
  const { request, env } = context;

  const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
  const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

  const url = new URL(request.url);

  // Step 1: redirect user to GitHub authorize page (popup window)
  if (url.pathname.endsWith("/auth") && !url.searchParams.get("code")) {
    const redirectUri = `${url.origin}/api/auth/callback`;
    const scope = "public_repo user:email"; // use "repo user:email" if the repo is private

    if (!env.OAUTH_CLIENT_ID) {
      return new Response("Missing OAuth client ID", { status: 500 });
    }

    const authUrl =
      `${GITHUB_AUTHORIZE_URL}?client_id=${encodeURIComponent(env.OAUTH_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    return Response.redirect(authUrl, 302);
  }

  // Step 2: GitHub callback with ?code=...
  if (url.pathname.endsWith("/auth/callback")) {
    const code = url.searchParams.get("code");
    if (!code) {
      return htmlPostMessage({ error: "missing_code" }, false);
    }
    if (!env.OAUTH_CLIENT_ID || !env.OAUTH_CLIENT_SECRET) {
      return htmlPostMessage({ error: "missing_oauth_env" }, false);
    }

    // Exchange code for access token
    const tokenResp = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({
        client_id: env.OAUTH_CLIENT_ID,
        client_secret: env.OAUTH_CLIENT_SECRET,
        code,
      }),
    });
    const data = await tokenResp.json();

    if (!tokenResp.ok || data.error || !data.access_token) {
      return htmlPostMessage({ error: "oauth_exchange_failed", details: data }, false);
    }

    // SUCCESS: signal Decap in the opener window and close the popup
    const payload = {
      token: data.access_token,
      provider: "github",
      token_type: data.token_type || "bearer",
      scope: data.scope || "public_repo,user:email",
    };
    return htmlPostMessage(payload, true);
  }

  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

// Return a tiny HTML page that posts a message back to the opener and closes the window.
// Decap listens for `authorization:github:success:<json>` or `authorization:github:error:<json>`.
function htmlPostMessage(obj, success) {
  const channel = success ? "authorization:github:success" : "authorization:github:error";
  const json = JSON.stringify(obj).replace(/</g, "\\u003c"); // avoid </script> issues
  const body = `<!doctype html>
<html><body>
<script>
  (function () {
    try {
      var msg = "${channel}:" + ${JSON.stringify(json)};
      if (window.opener && typeof window.opener.postMessage === "function") {
        window.opener.postMessage(msg, "*");
      }
    } catch (e) {}
    window.close();
  })();
</script>
</body></html>`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
