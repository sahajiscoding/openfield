"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ToolId =
  | "claude-desktop"
  | "cursor"
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
  filePath: string[];
  steps: string[];
  getConfig: (endpoint: string, tokenPlaceholder: string) => string;
  cliCommand?: (endpoint: string, tokenPlaceholder: string) => string;
};

const TOKEN_PLACEHOLDER = "YOUR_SUPABASE_ACCESS_TOKEN";

function getConfigs(_endpoint: string): ToolConfig[] {
  return [
    {
      id: "cursor",
      name: "Cursor",
      subtitle: "Best for coding with Openfield context",
      badge: "Recommended",
      filePath: [".cursor/mcp.json  (project root)  or  ~/.cursor/mcp.json (global)"],
      steps: [
        "Create .cursor/mcp.json in your project root if it doesn't exist",
        "Paste the config below and replace YOUR_SUPABASE_ACCESS_TOKEN with your token",
        "Restart Cursor or run Cursor: Reload Window",
        "Open Cursor Settings → MCP → verify openfield shows 2 tools",
        "Ask Cursor: 'List Openfield models' to test",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
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
      subtitle: "Anthropic's desktop app",
      badge: "Popular",
      filePath: [
        "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json",
        "Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
        "Linux: ~/.config/Claude/claude_desktop_config.json",
      ],
      steps: [
        "Install mcp-remote bridge: npm install -g mcp-remote (or use npx)",
        "Open your Claude Desktop config file (path below)",
        "Add the openfield server block and replace YOUR_SUPABASE_ACCESS_TOKEN",
        "Restart Claude Desktop completely (quit from tray)",
        "Look for 🔌 icon → openfield should show openfield_models and openfield_pricing",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                command: "npx",
                args: ["-y", "mcp-remote", ep, "--header", `Authorization: Bearer ${token}`],
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
      subtitle: "Codeium's AI editor",
      badge: "",
      filePath: ["~/.codeium/windsurf/mcp_config.json"],
      steps: [
        "Open Windsurf → Settings → MCP Servers (or edit mcp_config.json directly)",
        "Paste the config below with your token",
        "Restart Windsurf",
        "Check MCP panel for openfield connection",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                serverUrl: ep,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
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
      subtitle: "VS Code 1.99+ with MCP support",
      badge: "New",
      filePath: [".vscode/mcp.json (workspace) or User Settings → mcp"],
      steps: [
        "Ensure VS Code 1.99+ and enable MCP: set chat.mcp.enabled = true",
        "Create .vscode/mcp.json in your workspace",
        "Paste config and replace token",
        "Open Command Palette → MCP: Show Servers",
        "Verify openfield is connected",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            servers: {
              openfield: {
                type: "http",
                url: ep,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
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
      subtitle: "Autonomous coding agent in VS Code",
      badge: "",
      filePath: [
        "VS Code: ~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
        "Or via Cline UI → MCP Servers → Edit Config",
      ],
      steps: [
        "Open Cline extension → MCP Servers tab",
        "Click Configure MCP Servers",
        "Add openfield server with the JSON below",
        "Save and restart Cline",
        "Cline will auto-discover openfield_models and openfield_pricing",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                command: "npx",
                args: ["-y", "mcp-remote", ep, "--header", `Authorization: Bearer ${token}`],
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
      subtitle: "Anthropic's CLI coding tool",
      badge: "CLI",
      filePath: ["Managed via CLI — no file needed"],
      steps: [
        "Copy your Supabase token (button below)",
        "Run the CLI command shown below in your terminal",
        "Restart Claude Code session",
        "Type /mcp to verify openfield is listed",
        "Ask: 'What Openfield models are available?'",
      ],
      getConfig: () =>
        `# No file needed — uses CLI command`,
      cliCommand: (ep, token) =>
        `claude mcp add --transport http openfield ${ep} --header "Authorization: Bearer ${token}"`,
    },
    {
      id: "codex",
      name: "Codex / OpenAI",
      subtitle: "For Codex and compatible clients",
      badge: "CLI",
      filePath: ["~/.codex/config.toml or MCP config file"],
      steps: [
        "Codex supports MCP via http transport",
        "Add openfield to your MCP config with the JSON below",
        "Set OPENFIELD_TOKEN env var or paste directly",
        "Restart Codex",
        "Test with: list available models from openfield",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
          },
          null,
          2
        ),
      cliCommand: (ep, token) =>
        `# Option: use mcp-remote bridge\nnpx -y mcp-remote ${ep} --header "Authorization: Bearer ${token}"`,
    },
    {
      id: "continue",
      name: "Continue.dev",
      subtitle: "Open-source VS Code + JetBrains extension",
      badge: "",
      filePath: ["~/.continue/config.json"],
      steps: [
        "Open ~/.continue/config.json",
        "Add openfield to mcpServers array",
        "Replace token placeholder",
        "Reload VS Code window",
        "Open Continue chat → check MCP tools",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            experimental: {
              modelContextProtocolServers: [
                {
                  transport: {
                    type: "http",
                    url: ep,
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  },
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
      subtitle: "Any MCP client with HTTP support",
      badge: "",
      filePath: ["Depends on client — look for mcpServers config"],
      steps: [
        "Find your client's MCP config file",
        "Add a server with type http and url = endpoint below",
        "Add Authorization header with Bearer YOUR_SUPABASE_ACCESS_TOKEN",
        "Restart client",
        "Client should call POST with JSON-RPC: initialize → tools/list → tools/call",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                description: "Openfield AI video & image models + token pricing",
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
  const [token, setToken] = useState<string>("");
  const [tokenStatus, setTokenStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [copied, setCopied] = useState<string | null>(null);

  const configs = useMemo(() => getConfigs(endpoint), [endpoint]);
  const active = useMemo(() => configs.find((c) => c.id === selected)!, [configs, selected]);

  useEffect(() => {
    async function fetchToken() {
      setTokenStatus("loading");
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const t = data.session?.access_token;
        if (t) {
          setToken(t);
          setTokenStatus("found");
        } else {
          setTokenStatus("notfound");
        }
      } catch {
        setTokenStatus("notfound");
      }
    }
    void fetchToken();
  }, []);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback
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

  const displayToken = token || TOKEN_PLACEHOLDER;
  const configText = active.getConfig(endpoint, displayToken);
  const cliText = active.cliCommand?.(endpoint, displayToken);

  return (
    <div className="of-mcp-enhanced">
      {/* Endpoint + Auth */}
      <div className="of-mcp-grid-2">
        <section className="of-mcp-card">
          <h2>🌐 Endpoint</h2>
          <div className="of-mcp-code-row">
            <code className="of-mcp-code">{endpoint}</code>
            <button className="of-mcp-copy" onClick={() => copy(endpoint, "endpoint")}>
              {copied === "endpoint" ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="of-mcp-muted">
            Streamable HTTP endpoint. Supports <code>initialize</code>, <code>tools/list</code>, <code>tools/call</code>. Auth via Bearer token.
          </p>
          <div className="of-mcp-pill-row">
            <span className="of-mcp-pill">JSON-RPC 2.0</span>
            <span className="of-mcp-pill">Bearer Auth</span>
            <span className="of-mcp-pill">2 tools</span>
          </div>
        </section>

        <section className="of-mcp-card of-mcp-card--token">
          <h2>🔑 Authentication</h2>
          {tokenStatus === "loading" && <p className="of-mcp-muted">Fetching your session token...</p>}
          {tokenStatus === "found" && (
            <>
              <p className="of-mcp-muted">Found your Supabase access token. It expires automatically — never share service-role keys.</p>
              <div className="of-mcp-code-row">
                <code className="of-mcp-code of-mcp-code--trunc">{token.slice(0, 24)}...{token.slice(-8)}</code>
                <button className="of-mcp-copy of-mcp-copy--lime" onClick={() => copy(token, "token")}>
                  {copied === "token" ? "Copied!" : "Copy token"}
                </button>
              </div>
              <p className="of-mcp-warn">⚠️ Keep this token private. It gives access to your Openfield account. Rotate by signing out/in.</p>
            </>
          )}
          {tokenStatus === "notfound" && (
            <>
              <p className="of-mcp-muted">No active session token found. Make sure you are signed in.</p>
              <ol className="of-mcp-steps">
                <li>Sign in to Openfield</li>
                <li>Open DevTools → Application → Local Storage → <code>sb-*-auth-token</code></li>
                <li>Or run in console: <code>{`localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('auth-token'))||'')`}</code> and extract access_token</li>
                <li>Better: let this page auto-detect after sign-in — refresh after login</li>
              </ol>
            </>
          )}
          {tokenStatus === "idle" && <p className="of-mcp-muted">Preparing...</p>}
        </section>
      </div>

      {/* Tool selector */}
      <section className="of-mcp-card of-mcp-card--full">
        <div className="of-mcp-header-row">
          <div>
            <h2>Choose your AI tool</h2>
            <p className="of-mcp-muted">Select your client to see exact file paths and config. All configs use the same endpoint + Bearer auth.</p>
          </div>
        </div>

        <div className="of-mcp-tabs">
          {configs.map((t) => (
            <button
              key={t.id}
              className={`of-mcp-tab ${selected === t.id ? "of-mcp-tab--active" : ""}`}
              onClick={() => setSelected(t.id)}
            >
              <span className="of-mcp-tab-name">{t.name}</span>
              {t.badge && <span className="of-mcp-tab-badge">{t.badge}</span>}
              <span className="of-mcp-tab-sub">{t.subtitle}</span>
            </button>
          ))}
        </div>

        <div className="of-mcp-detail">
          <div className="of-mcp-detail-head">
            <h3>{active.name}</h3>
            <span className="of-mcp-muted">{active.subtitle}</span>
          </div>

          <div className="of-mcp-detail-grid">
            <div>
              <h4>📁 Config file location</h4>
              <ul className="of-mcp-filelist">
                {active.filePath.map((fp) => (
                  <li key={fp}>
                    <code>{fp}</code>
                  </li>
                ))}
              </ul>

              <h4>🪜 Steps</h4>
              <ol className="of-mcp-steps">
                {active.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>

            <div>
              <div className="of-mcp-code-block-wrap">
                <div className="of-mcp-code-head">
                  <span>Config JSON</span>
                  <button className="of-mcp-copy" onClick={() => copy(configText, "config")}>
                    {copied === "config" ? "Copied!" : "Copy JSON"}
                  </button>
                </div>
                <pre className="of-mcp-pre">{configText}</pre>
              </div>

              {cliText && (
                <div className="of-mcp-code-block-wrap" style={{ marginTop: 16 }}>
                  <div className="of-mcp-code-head">
                    <span>CLI command</span>
                    <button className="of-mcp-copy" onClick={() => copy(cliText, "cli")}>
                      {copied === "cli" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="of-mcp-pre">{cliText}</pre>
                </div>
              )}

              <div className="of-mcp-tip">
                <strong>💡 Tip:</strong> Replace <code>{TOKEN_PLACEHOLDER}</code> with the token above. If you copied the token via button, it&apos;s already replaced.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools */}
      <div className="of-mcp-grid-2">
        <section className="of-mcp-card">
          <h2>🛠️ Available tools</h2>
          <div className="of-mcp-tool">
            <code>openfield_models</code>
            <p>List all 38 Higgsfield models with id, label, and surface (image/video). No auth beyond MCP header.</p>
            <pre className="of-mcp-pre-sm">{`// Example call\n{\n  "jsonrpc": "2.0",\n  "id": 1,\n  "method": "tools/call",\n  "params": { "name": "openfield_models", "arguments": {} }\n}`}</pre>
          </div>
          <div className="of-mcp-tool" style={{ marginTop: 16 }}>
            <code>openfield_pricing</code>
            <p>Get current token packs (INR via UroPay) and per-model token costs. Mirrors pricing page.</p>
            <pre className="of-mcp-pre-sm">{`{\n  "jsonrpc": "2.0",\n  "id": 2,\n  "method": "tools/call",\n  "params": { "name": "openfield_pricing", "arguments": {} }\n}`}</pre>
          </div>
        </section>

        <section className="of-mcp-card">
          <h2>✅ Verify & troubleshoot</h2>
          <ul className="of-mcp-checklist">
            <li><strong>Tools not showing?</strong> Restart client completely (quit from tray/dock, not just close window).</li>
            <li><strong>401 Unauthorized?</strong> Token expired or wrong. Copy fresh token from this page, ensure <code>Bearer </code> prefix.</li>
            <li><strong>Claude Desktop not connecting?</strong> Ensure <code>npx mcp-remote</code> works: run <code>{`npx -y mcp-remote ${endpoint} --header 'Authorization: Bearer TOKEN'`}</code> manually.</li>
            <li><strong>Cursor shows red?</strong> Check .cursor/mcp.json is valid JSON, no trailing commas.</li>
            <li><strong>Still failing?</strong> Test with curl:
              <pre className="of-mcp-pre-sm" style={{ marginTop: 8 }}>{`curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</pre>
            </li>
          </ul>
          <div className="of-mcp-pill-row" style={{ marginTop: 16 }}>
            <span className="of-mcp-pill">No service-role key</span>
            <span className="of-mcp-pill">Per-user auth</span>
            <span className="of-mcp-pill">Read-only tools</span>
          </div>
        </section>
      </div>

      {/* Quick start */}
      <section className="of-mcp-card of-mcp-card--full">
        <h2>🚀 Quick start (3 steps)</h2>
        <div className="of-mcp-quick">
          <div className="of-mcp-quick-step"><span>1</span><div><strong>Copy token</strong><p>Click &quot;Copy token&quot; above — it&apos;s your Supabase access token, auto-detected.</p></div></div>
          <div className="of-mcp-quick-step"><span>2</span><div><strong>Choose tool & paste config</strong><p>Select your AI tool tab, copy JSON, paste into its MCP config file, replace placeholder if needed.</p></div></div>
          <div className="of-mcp-quick-step"><span>3</span><div><strong>Restart & ask</strong><p>Restart client, then ask: &quot;What Openfield models can I use for a 9:16 video?&quot;</p></div></div>
        </div>
      </section>
    </div>
  );
}
