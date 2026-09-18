"use client";

import { useMemo, useState } from "react";

type ToolId =
  | "cursor"
  | "claude-desktop"
  | "windsurf"
  | "vscode"
  | "cline"
  | "claude-code"
  | "codex"
  | "continue"
  | "generic";

type ToolConfig = {
  id: ToolId;
  name: string;
  subtitle: string;
  badge: string;
  icon: string;
  filePath: string[];
  oauthSteps: string[];
  getOAuthConfig: (endpoint: string) => string;
  oauthCliCommand?: (endpoint: string) => string;
};

function getConfigs(_endpoint: string): ToolConfig[] {
  return [
    {
      id: "cursor",
      name: "Cursor",
      subtitle: "Best for coding with Openfield",
      badge: "Recommended",
      icon: "◐",
      filePath: [".cursor/mcp.json (project) or ~/.cursor/mcp.json (global)"],
      oauthSteps: [
        "In Cursor, open Settings → MCP → Add Server",
        "Paste MCP URL below, leave auth empty — Cursor will detect OAuth",
        "Click Authenticate — browser opens to Openfield login",
        "Sign in and click Allow access",
        "Cursor redirects back, shows green connected + 3 tools",
      ],
      getOAuthConfig: (ep) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
              },
            },
          },
          null,
          2
        ),
    },
    {
      id: "claude-desktop",
      name: "Claude Desktop",
      subtitle: "Anthropic desktop app",
      badge: "Popular",
      icon: "✦",
      filePath: [
        "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json",
        "Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
        "Linux: ~/.config/Claude/claude_desktop_config.json",
      ],
      oauthSteps: [
        "Claude Desktop now supports OAuth for HTTP MCP servers",
        "Add server with URL below — no token needed",
        "Claude will open browser to Openfield for auth",
        "Sign in → Allow → back to Claude, 3 tools appear",
        "OAuth is required — add the server URL and authenticate in the browser",
      ],
      getOAuthConfig: (ep) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
              },
            },
          },
          null,
          2
        ),
    },
    {
      id: "windsurf",
      name: "Windsurf",
      subtitle: "Codeium AI editor",
      badge: "",
      icon: "≋",
      filePath: ["~/.codeium/windsurf/mcp_config.json"],
      oauthSteps: [
        "Windsurf → Settings → MCP Servers → Add",
        "Paste URL, click Authenticate",
        "Browser opens → sign in → Allow",
        "Back to Windsurf, connected",
      ],
      getOAuthConfig: (ep) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                serverUrl: ep,
              },
            },
          },
          null,
          2
        ),
    },
    {
      id: "vscode",
      name: "VS Code",
      subtitle: "1.99+ with MCP",
      badge: "New",
      icon: "▞",
      filePath: [".vscode/mcp.json"],
      oauthSteps: [
        "Enable chat.mcp.enabled = true",
        "Create .vscode/mcp.json with OAuth config (URL only)",
        "VS Code will prompt to authenticate — browser opens",
        "Sign in → Allow → back to VS Code, Show Servers → openfield",
      ],
      getOAuthConfig: (ep) =>
        JSON.stringify(
          {
            servers: {
              openfield: {
                type: "http",
                url: ep,
              },
            },
          },
          null,
          2
        ),
    },
    {
      id: "cline",
      name: "Cline",
      subtitle: "Autonomous agent",
      badge: "",
      icon: "⬢",
      filePath: ["Cline UI → MCP Servers → Configure"],
      oauthSteps: [
        "Cline now supports OAuth — add server with URL only",
        "Cline opens browser for auth",
        "Sign in → Allow → Cline shows 3 tools",
      ],
      getOAuthConfig: (ep) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
                disabled: false,
                autoApprove: ["openfield_models", "openfield_pricing"],
              },
            },
          },
          null,
          2
        ),
    },
    {
      id: "claude-code",
      name: "Claude Code",
      subtitle: "Anthropic CLI",
      badge: "CLI",
      icon: "⌘",
      filePath: ["CLI managed"],
      oauthSteps: [
        "Run OAuth CLI command below",
        "Browser opens → sign in → Allow",
        "Claude Code stores token, verify with /mcp",
      ],
      getOAuthConfig: () => `# OAuth — no file, use CLI`,
      oauthCliCommand: (ep) => `claude mcp add --transport http openfield ${ep}`,
    },
    {
      id: "codex",
      name: "Codex",
      subtitle: "OpenAI compatible",
      badge: "CLI",
      icon: "◍",
      filePath: ["~/.codex/config.toml"],
      oauthSteps: ["Add URL only, Codex will handle OAuth via browser"],
      getOAuthConfig: (ep) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
              },
            },
          },
          null,
          2
        ),
      oauthCliCommand: (ep) => `npx -y mcp-remote ${ep}`,
    },
    {
      id: "continue",
      name: "Continue.dev",
      subtitle: "VS Code + JetBrains",
      badge: "",
      icon: "↗",
      filePath: ["~/.continue/config.json"],
      oauthSteps: ["Add server with URL only, Continue will open browser for auth"],
      getOAuthConfig: (ep) =>
        JSON.stringify(
          {
            experimental: {
              modelContextProtocolServers: [
                {
                  transport: { type: "http", url: ep },
                },
              ],
            },
          },
          null,
          2
        ),
    },
    {
      id: "generic",
      name: "Generic HTTP",
      subtitle: "Any MCP client",
      badge: "",
      icon: "↔",
      filePath: ["Client MCP config"],
      oauthSteps: [
        "Add server with type http, url = endpoint",
        "Client should auto-discover OAuth via 401 + resource_metadata",
        "Browser opens → sign in → Allow → connected",
      ],
      getOAuthConfig: (ep) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
                description: "Openfield — 38 models + pricing (OAuth)",
              },
            },
          },
          null,
          2
        ),
    },
  ];
}

export function McpSetupClient({ endpoint }: { endpoint: string }) {
  const [selected, setSelected] = useState<ToolId>("cursor");
  const [copied, setCopied] = useState<string | null>(null);

  const configs = useMemo(() => getConfigs(endpoint), [endpoint]);
  const active = useMemo(() => configs.find((c) => c.id === selected)!, [configs, selected]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  const configText = active.getOAuthConfig(endpoint);
  const cliText = active.oauthCliCommand?.(endpoint);

  return (
    <div className="of-mcp-v2">
      {/* OAuth banner */}
      <div className="of-card of-mcp-v2-card of-mcp-v2-card--hero">
        <div className="of-mcp-v2-hero">
          <div>
            <span className="n">NEW · OAUTH 2.0</span>
            <h3>One-click connect — no token copy needed</h3>
            <p>
              Add MCP server URL, click <b>Authenticate</b>, browser opens to Openfield, sign in, Allow, and you&apos;re
              connected. Your client stores the OAuth credentials securely.
            </p>
          </div>
          <div className="of-mcp-v2-hero-steps">
            <div>
              <b>1</b>
              <span>Add URL</span>
            </div>
            <div>
              <b>2</b>
              <span>Authenticate</span>
            </div>
            <div>
              <b>3</b>
              <span>Allow → Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top cards */}
      <div className="of-mcp-v2-grid2">
        <div className="of-card of-mcp-v2-card">
          <div className="of-mcp-v2-card-head">
            <span className="n">ENDPOINT</span>
            <span className="of-pill of-pill--lime">OAuth 2.0</span>
          </div>
          <h3>MCP Server URL</h3>
          <div className="of-mcp-v2-code-row">
            <code>{endpoint}</code>
            <button className="of-btn of-btn--ghost" style={{ padding: "8px 14px", fontSize: 12 }} onClick={() => copy(endpoint, "ep")}>
              {copied === "ep" ? "Copied" : "Copy"}
            </button>
          </div>
          <p>
            Paste this URL in your AI tool&apos;s <b>Add MCP Server</b>. Tool will auto-discover OAuth via{" "}
            <code>/.well-known/oauth-protected-resource</code>. No token needed for OAuth.
          </p>
          <div className="of-mcp-v2-pills">
            <span>OAuth 2.0</span>
            <span>PKCE S256</span>
            <span>JSON-RPC 2.0</span>
            <span>3 tools</span>
          </div>
        </div>

        <div className="of-card of-mcp-v2-card of-mcp-v2-card--lime">
          <div className="of-mcp-v2-card-head">
            <span className="n">AUTHENTICATION</span>
            <span className="of-flag of-flag--lime" style={{ fontSize: 10 }}>
              OAuth only
            </span>
          </div>
          <h3>OAuth — browser flow</h3>

          <p>
            No token copy. Your AI tool opens <code>{endpoint.replace("/api/mcp", "")}/login</code>, you sign in,
            click Allow, OAuth credentials are issued automatically and stored by the client. Works in Cursor,
            Claude Desktop, VS Code, Windsurf, etc.
          </p>
          <div className="of-mcp-v2-oauth-visual">
            <span>Tool</span>
            <i>→</i>
            <span>401 + resource_metadata</span>
            <i>→</i>
            <span>Browser → Openfield → Allow</span>
            <i>→</i>
            <span>OAuth → Connected</span>
          </div>
        </div>
      </div>

      {/* Tool chooser */}
      <div className="of-card of-mcp-v2-card of-mcp-v2-card--full">
        <div className="of-mcp-v2-section-head">
          <div>
            <span className="n">STEP 1</span>
            <h3>Choose your AI tool</h3>
            <p>Pick your client — Openfield MCP uses OAuth for sign-in and connection.</p>
          </div>
        </div>

        <div className="of-mcp-v2-tools">
          {configs.map((t) => (
            <button
              key={t.id}
              className={`of-mcp-v2-tool ${selected === t.id ? "of-mcp-v2-tool--on" : ""}`}
              onClick={() => setSelected(t.id)}
            >
              <span className="of-mcp-v2-tool-icon">{t.icon}</span>
              <span className="of-mcp-v2-tool-main">
                <b>
                  {t.name} {t.badge && <i>{t.badge}</i>}
                </b>
                <small>{t.subtitle}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="of-mcp-v2-detail">
          <div className="of-mcp-v2-detail-left">
            <h4>
              <span>{active.icon}</span> {active.name}
            </h4>
            <p className="of-mcp-v2-muted">{active.subtitle}</p>

            <div className="of-mcp-v2-block">
              <h5>Config file</h5>
              {active.filePath.map((fp) => (
                <code key={fp}>{fp}</code>
              ))}
            </div>

            <div className="of-mcp-v2-block">
              <h5>OAuth steps</h5>
              <ol>
                {active.oauthSteps.map((s, i) => (
                  <li key={i}>
                    <span>{i + 1}</span>
                    <p>{s}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="of-mcp-v2-detail-right">
            <div className="of-mcp-v2-code-card">
              <div className="of-mcp-v2-code-head">
                <span>OAuth config — URL only</span>
                <button className="of-btn" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => copy(configText, "cfg")}>
                  {copied === "cfg" ? "Copied!" : "Copy JSON"}
                </button>
              </div>
              <pre>{configText}</pre>
            </div>

            {cliText && (
              <div className="of-mcp-v2-code-card" style={{ marginTop: 14 }}>
                <div className="of-mcp-v2-code-head">
                  <span>OAuth CLI</span>
                  <button className="of-btn" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => copy(cliText, "cli")}>
                    {copied === "cli" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre>{cliText}</pre>
              </div>
            )}

            <div className="of-mcp-v2-tip">
              <b>OAuth tip:</b>{" "}
              Just URL — no token copy. Your client will open the browser automatically when authentication is required.
            </div>
          </div>
        </div>
      </div>

      {/* Tools + Troubleshoot */}
      <div className="of-mcp-v2-grid2">
        <div className="of-card of-mcp-v2-card">
          <span className="n">TOOLS</span>
          <h3>3 tools</h3>

          <div className="of-mcp-v2-tool-doc">
            <code>openfield_models</code>
            <p>List 38 Higgsfield models — id, label, surface. Perfect for “which model for 9:16?”.</p>
            <pre>{`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": { "name": "openfield_models", "arguments": {} }
}`}</pre>
          </div>

          <div className="of-mcp-v2-tool-doc">
            <code>openfield_pricing</code>
            <p>Token packs + per-model costs. Mirrors /pricing.</p>
            <pre>{`{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": { "name": "openfield_pricing", "arguments": {} }
}`}</pre>
          </div>


          <div className="of-mcp-v2-tool-doc">
            <code>openfield_generate</code>
            <p>Generate with an Openfield model. Before the provider request starts, Openfield calculates the token cost, verifies your wallet, atomically deducts the cost, and only then submits to Higgsfield. A failed submit is automatically refunded.</p>
            <pre>{`{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "openfield_generate",
    "arguments": {
      "model": "seedance-2.5",
      "prompt": "Cinematic city at night, rain reflections"
    }
  }
}`}</pre>
          </div>

        </div>

        <div className="of-card of-mcp-v2-card">
          <span className="n">DEBUG</span>
          <h3>Verify & troubleshoot</h3>

          <ul className="of-mcp-v2-list">
            <li>
              <b>OAuth not opening browser?</b> Ensure client supports MCP OAuth (Cursor 0.45+, Claude Desktop latest, VS Code 1.99+). Check client logs for <code>resource_metadata</code>.
            </li>
            <li>
              <b>Tools not showing?</b> Quit client from tray/dock, reopen. For OAuth, check <code>/api/mcp/.well-known/oauth-protected-resource</code> is reachable.
            </li>
            <li>
              <b>401 after OAuth?</b> Token expired (24h). Re-authenticate in client, or clear MCP cache and re-add server.
            </li>
            <li>
              <b>Test OAuth discovery:</b>
              <pre>{`curl ${endpoint}/.well-known/oauth-protected-resource
curl ${endpoint}/.well-known/oauth-authorization-server`}</pre>
            </li>
            <li>
              <b>Test MCP with OAuth token:</b>
              <pre>{`curl -X POST ${endpoint} \\
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</pre>
            </li>
          </ul>

          <div className="of-mcp-v2-pills" style={{ marginTop: 16 }}>
            <span>OAuth 2.0</span>
            <span>PKCE S256</span>
            <span>Per-user auth</span>
            <span>Token-gated</span>
          </div>
        </div>
      </div>

      {/* Quick start */}
      <div className="of-card of-mcp-v2-card of-mcp-v2-card--full of-mcp-v2-quick">
        <span className="n">QUICK START</span>
        <h3>OAuth in 3 clicks</h3>
        <div className="of-mcp-v2-quick-grid">
          <div>
            <b>1</b>
            <strong>Add server URL</strong>
            <p>Paste {endpoint} in your AI tool → Add MCP Server.</p>
          </div>
          <div>
            <b>2</b>
            <strong>Authenticate</strong>
            <p>Click Authenticate → browser opens → sign in to Openfield → Allow.</p>
          </div>
          <div>
            <b>3</b>
            <strong>Ask</strong>
            <p>Back in tool, ask: “What Openfield models can I use for 9:16 video?”</p>
          </div>
        </div>
      </div>
    </div>
  );
}
