import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl, getOAuthSecret, createAuthorizationCode, verifyClientId } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

function htmlPage(content: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Authorize Openfield MCP</title>
<style>
  :root { --void:#08090a; --bone:#EDEAE0; --lime:#D4F921; --smoke:#9aa08c; --line:#1d2124; --panel:#131618; }
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:radial-gradient(800px 400px at 70% -10%, rgba(212,249,33,0.08), transparent 60%), var(--void);color:var(--bone);font-family: ui-sans-system, -apple-system, Segoe UI, Roboto, Helvetica, Arial; display:grid; place-items:center; padding:24px}
  .card{width:min(480px,100%); background: linear-gradient(180deg, rgba(237,234,224,0.05), rgba(237,234,224,0.01)), var(--panel); border:1px solid var(--line); border-radius:20px; padding:28px; box-shadow: 0 20px 60px rgba(0,0,0,0.5)}
  .kicker{font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--lime); margin:0 0 10px}
  h1{font-family: Syne, sans-serif; font-weight:800; font-size:28px; line-height:1.1; letter-spacing:-.02em; margin:0 0 12px}
  p{color:var(--smoke); font-size:14px; line-height:1.6; margin:0 0 16px}
  .client{padding:12px; background:#08090a; border:1px solid var(--line); border-radius:12px; margin:16px 0; font-size:13px; color:var(--bone)}
  .client b{color:var(--lime)}
  .row{display:flex; gap:10px; margin-top:20px}
  .btn{appearance:none; border:1px solid var(--line); background:transparent; color:var(--bone); font:700 14px/1 ui-sans-system; padding:12px 18px; border-radius:999px; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; flex:1; transition:.16s}
  .btn:hover{transform:translateY(-1px); border-color:rgba(237,234,224,.3)}
  .btn--lime{background:var(--lime); border-color:var(--lime); color:#131600}
  .btn--lime:hover{background:#e2ff4d}
  code{font-family: ui-monospace, monospace; background:#08090a; border:1px solid var(--line); padding:2px 6px; border-radius:6px; font-size:12px}
  .foot{margin-top:18px; font-size:11px; color:var(--smoke); text-align:center}
</style>
</head>
<body>
  <div class="card">
    ${content}
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = getBaseUrl(request);

  const client_id = url.searchParams.get("client_id") || "unknown-client";
  const redirect_uri = url.searchParams.get("redirect_uri");
  const response_type = url.searchParams.get("response_type") || "code";
  const scope = url.searchParams.get("scope") || "mcp";
  const state = url.searchParams.get("state") || "";
  const code_challenge = url.searchParams.get("code_challenge") || "";
  const code_challenge_method = url.searchParams.get("code_challenge_method") || "S256";
  let secret: string;
  try {
    secret = getOAuthSecret();
  } catch (caught) {
    console.error("[oauth] authorize failed", caught instanceof Error ? caught.message : caught);
    return new NextResponse(
      htmlPage(`<p class="kicker">Error</p><h1>OAuth unavailable</h1><p>Sign-in with Openfield is not configured right now — try again later.</p>`),
      { status: 500, headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
    );
  }
  const client = verifyClientId(client_id, secret);

  // Validate required params
  if (!client) {
    return new NextResponse(
      htmlPage(`<p class="kicker">Error</p><h1>Unknown OAuth client</h1><p>The MCP client registration is missing or invalid. Re-add the server so the client can register again.</p>`),
      { status: 400, headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
    );
  }

  if (!redirect_uri) {
    return new NextResponse(
      htmlPage(`<p class="kicker">Error</p><h1>Missing redirect_uri</h1><p>MCP client must provide redirect_uri.</p>`),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (!client.response_types.includes(response_type) || !client.grant_types.includes("authorization_code")) {
    return new NextResponse(
      htmlPage(`<p class="kicker">Error</p><h1>Unsupported OAuth request</h1><p>This client is not registered for the authorization code flow.</p>`),
      { status: 400, headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
    );
  }

  if (!client.redirect_uris.includes(redirect_uri)) {
    return new NextResponse(
      htmlPage(`<p class="kicker">Error</p><h1>Redirect URI mismatch</h1><p>The redirect URI is not one of the URIs registered for this client.</p>`),
      { status: 400, headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
    );
  }

  if (response_type !== "code") {
    return new NextResponse(
      htmlPage(`<p class="kicker">Error</p><h1>Unsupported response_type</h1><p>Only <code>code</code> is supported.</p>`),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (code_challenge_method !== "S256" || !code_challenge) {
    return new NextResponse(
      htmlPage(`<p class="kicker">Error</p><h1>PKCE required</h1><p>Openfield MCP requires OAuth PKCE with S256.</p>`),
      { status: 400, headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
    );
  }

  // Check user session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user || !session) {
    // Redirect to login with next
    const loginUrl = new URL(`${base}/login`);
    loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(loginUrl.toString());
  }

  // Show consent page with hidden fields POST to same endpoint
  const content = `
    <p class="kicker">Openfield MCP · OAuth</p>
    <h1>Allow <b style="color:var(--lime)">${escapeHtml(client.client_name)}</b> to access Openfield?</h1>
    <p>This will let <b>${escapeHtml(client.client_name)}</b> list your available models and token pricing via MCP. No payment credentials or service keys are ever exposed. You can revoke by signing out.</p>
    <div class="client">
      <div><b>Client:</b> ${escapeHtml(client_id)}</div>
      <div><b>Scope:</b> ${escapeHtml(scope)}</div>
      <div><b>User:</b> ${escapeHtml(user.email || user.id)}</div>
      <div><b>Redirect:</b> ${escapeHtml(redirect_uri)}</div>
    </div>
    <form method="POST" action="${escapeHtml(url.pathname + url.search)}">
      <input type="hidden" name="client_id" value="${escapeHtml(client_id)}"/>
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirect_uri)}"/>
      <input type="hidden" name="scope" value="${escapeHtml(scope)}"/>
      <input type="hidden" name="state" value="${escapeHtml(state)}"/>
      <input type="hidden" name="code_challenge" value="${escapeHtml(code_challenge)}"/>
      <input type="hidden" name="code_challenge_method" value="${escapeHtml(code_challenge_method)}"/>
      <div class="row">
        <a class="btn" href="${escapeHtml(redirect_uri)}?error=access_denied&state=${encodeURIComponent(state)}">Deny</a>
        <button class="btn btn--lime" type="submit">Allow access →</button>
      </div>
    </form>
    <p class="foot">You will be redirected to <code>${escapeHtml(redirect_uri)}</code> with an authorization code. Code expires in 10 minutes.</p>
  `;

  return new NextResponse(htmlPage(content), {
    headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const base = getBaseUrl(request);
  let secret: string;
  try {
    secret = getOAuthSecret();
  } catch (caught) {
    console.error("[oauth] consent failed", caught instanceof Error ? caught.message : caught);
    return new NextResponse("OAuth is not configured — try again later.", { status: 500 });
  }

  // Parse form body
  const contentType = request.headers.get("content-type") || "";
  let params: Record<string, string> = {};
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    for (const [k, v] of form.entries()) {
      params[k] = v.toString();
    }
  } else {
    // Also support query params for POST (in case form action includes them)
    const formText = await request.text().catch(() => "");
    if (formText) {
      const sp = new URLSearchParams(formText);
      for (const [k, v] of sp.entries()) params[k] = v;
    }
    // Merge with URL search params
    for (const [k, v] of url.searchParams.entries()) {
      if (!params[k]) params[k] = v;
    }
  }

  const client_id = params.client_id || url.searchParams.get("client_id") || "unknown-client";
  const redirect_uri = params.redirect_uri || url.searchParams.get("redirect_uri") || "";
  const scope = params.scope || url.searchParams.get("scope") || "mcp";
  const state = params.state || url.searchParams.get("state") || "";
  const code_challenge = params.code_challenge || url.searchParams.get("code_challenge") || "";
  const code_challenge_method = params.code_challenge_method || url.searchParams.get("code_challenge_method") || "S256";

  const client = verifyClientId(client_id, secret);
  if (!client || !redirect_uri || !client.redirect_uris.includes(redirect_uri) || !client.response_types.includes("code")) {
    return new NextResponse("Invalid OAuth client or redirect_uri", { status: 400 });
  }
  if (code_challenge_method !== "S256" || !code_challenge) {
    return new NextResponse("PKCE S256 is required", { status: 400 });
  }

  // Check session again
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user || !session) {
    const loginUrl = new URL(`${base}/login`);
    loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(loginUrl.toString());
  }

  // Create authorization code containing supabase access token
  const code = createAuthorizationCode(
    {
      sub: user.id,
      email: user.email,
      client_id,
      redirect_uri,
      scope,
      code_challenge,
      code_challenge_method,
      access_token: session.access_token,
    },
    secret
  );

  // Redirect with code
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);
  // RFC 9207 issuer binding: clients must validate this before redeeming the code.
  redirectUrl.searchParams.set("iss", base);

  return NextResponse.redirect(redirectUrl.toString());
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
