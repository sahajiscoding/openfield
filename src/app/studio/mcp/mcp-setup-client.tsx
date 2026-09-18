"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
      subtitle: "Best for coding with Openfield",
      badge: "Recommended",
      icon: "◐",
      filePath: [".cursor/mcp.json (project) or ~/.cursor/mcp.json (global)"],
      steps: [
        "Create .cursor/mcp.json in your project root",
        "Paste config below, replace token placeholder",
        "Reload Window (Cmd+Shift+P → Reload)",
        "Settings → MCP → verify openfield shows 2 tools",
        "Ask: 'List Openfield models'",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
                headers: { Authorization: `Bearer ${token}` },
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
      steps: [
        "Install bridge: npm i -g mcp-remote (or use npx)",
        "Open Claude config file (path below)",
        "Add openfield server block + your token",
        "Quit Claude completely from tray/dock",
        "Reopen → look for 🔌 → openfield → 2 tools",
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
      subtitle: "Codeium AI editor",
      badge: "",
      icon: "≋",
      filePath: ["~/.codeium/windsurf/mcp_config.json"],
      steps: [
        "Open Windsurf → Settings → MCP Servers",
        "Paste config below with your token",
        "Restart Windsurf",
        "Check MCP panel for openfield",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                serverUrl: ep,
                headers: { Authorization: `Bearer ${token}` },
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
      subtitle: "1.99+ with MCP support",
      badge: "New",
      icon: "▞",
      filePath: [".vscode/mcp.json (workspace) or User Settings"],
      steps: [
        "Enable MCP: settings → chat.mcp.enabled = true",
        "Create .vscode/mcp.json",
        "Paste config + token",
        "Command Palette → MCP: Show Servers",
        "Verify openfield connected",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            servers: {
              openfield: {
                type: "http",
                url: ep,
                headers: { Authorization: `Bearer ${token}` },
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
      subtitle: "Autonomous agent in VS Code",
      badge: "",
      icon: "⬢",
      filePath: ["Cline UI → MCP Servers → Configure"],
      steps: [
        "Open Cline → MCP Servers tab",
        "Click Configure MCP Servers",
        "Add openfield JSON below",
        "Save, restart Cline",
        "Auto-discovers 2 tools",
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
      subtitle: "Anthropic CLI coding",
      badge: "CLI",
      icon: "⌘",
      filePath: ["No file — managed via CLI"],
      steps: [
        "Copy token (button below)",
        "Run CLI command below",
        "Restart Claude Code session",
        "Type /mcp to verify",
        "Ask: 'What models are available?'",
      ],
      getConfig: () => "# No file needed — uses CLI command",
      cliCommand: (ep, token) => `claude mcp add --transport http openfield ${ep} --header "Authorization: Bearer ${token}"`,
    },
    {
      id: "codex",
      name: "Codex",
      subtitle: "OpenAI compatible",
      badge: "CLI",
      icon: "◍",
      filePath: ["~/.codex/config.toml or MCP config"],
      steps: [
        "Add openfield to MCP config",
        "Set token env or paste directly",
        "Restart Codex",
        "Test: list models from openfield",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
                headers: { Authorization: `Bearer ${token}` },
              },
            },
          },
          null,
          2
        ),
      cliCommand: (ep, token) => `npx -y mcp-remote ${ep} --header "Authorization: Bearer ${token}"`,
    },
    {
      id: "continue",
      name: "Continue.dev",
      subtitle: "VS Code + JetBrains",
      badge: "",
      icon: "↗",
      filePath: ["~/.continue/config.json"],
      steps: [
        "Open ~/.continue/config.json",
        "Add to mcpServers",
        "Replace token",
        "Reload window",
        "Check Continue chat → MCP tools",
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
                    headers: { Authorization: `Bearer ${token}` },
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
      subtitle: "Any MCP client",
      badge: "",
      icon: "↔",
      filePath: ["Look for mcpServers in client config"],
      steps: [
        "Find client's MCP config",
        "Add server type http, url = endpoint",
        "Add Authorization Bearer header",
        "Restart client",
        "Should call initialize → tools/list → tools/call",
      ],
      getConfig: (ep, token) =>
        JSON.stringify(
          {
            mcpServers: {
              openfield: {
                url: ep,
                headers: { Authorization: `Bearer ${token}` },
                description: "Openfield — 38 models + pricing",
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
  const [token, setToken] = useState("");
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
    <div className="of-mcp-v2">
      {/* Top cards */}
      <div className="of-mcp-v2-grid2">
        <div className="of-card of-mcp-v2-card">
          <div className="of-mcp-v2-card-head">
            <span className="n">ENDPOINT</span>
            <span className="of-pill of-pill--lime">Live</span>
          </div>
          <h3>Streamable HTTP</h3>
          <div className="of-mcp-v2-code-row">
            <code>{endpoint}</code>
            <button className="of-btn of-btn--ghost" style={{ padding: "8px 14px", fontSize: 12 }} onClick={() => copy(endpoint, "ep")}>
              {copied === "ep" ? "Copied" : "Copy"}
            </button>
          </div>
          <p>
            JSON-RPC 2.0 over POST. Methods: <code>initialize</code>, <code>tools/list</code>, <code>tools/call</code>. Auth via Bearer.
          </p>
          <div className="of-mcp-v2-pills">
            <span>JSON-RPC 2.0</span>
            <span>Bearer Auth</span>
            <span>2 tools</span>
            <span>38 models</span>
          </div>
        </div>

        <div className="of-card of-mcp-v2-card of-mcp-v2-card--lime">
          <div className="of-mcp-v2-card-head">
            <span className="n">AUTHENTICATION</span>
            <span className="of-flag of-flag--lime" style={{ fontSize: 10 }}>
              {tokenStatus === "found" ? "Token found" : "Sign in required"}
            </span>
          </div>
          <h3>Your Supabase token</h3>

          {tokenStatus === "loading" && <p>Fetching your session…</p>}
          {tokenStatus === "found" && (
            <>
              <p>Auto-detected from your Openfield session. Expires automatically — never share service-role keys.</p>
              <div className="of-mcp-v2-code-row">
                <code style={{ fontSize: 12 }}>
                  {token.slice(0, 20)}••••••••••••{token.slice(-8)}
                </code>
                <button className="of-btn of-btn--lime" style={{ padding: "8px 14px", fontSize: 12 }} onClick={() => copy(token, "tok")}>
                  {copied === "tok" ? "Copied!" : "Copy token"}
                </button>
              </div>
              <p className="of-mcp-v2-warn">⚠️ Keep private. Gives access to your Openfield account. Rotate by signing out/in.</p>
            </>
          )}
          {tokenStatus === "notfound" && (
            <>
              <p>No active token. Sign in, then refresh. Or get it manually:</p>
              <ol>
                <li>
                  DevTools → Application → Local Storage → <code>sb-*-auth-token</code>
                </li>
                <li>
                  Console: <code>{`JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('auth-token'))||'{}')||'{}').access_token`}</code>
                </li>
              </ol>
              <div style={{ marginTop: 12 }}>
                <a href="/login?next=/mcp" className="of-btn of-btn--lime">
                  Sign in →
                </a>
              </div>
            </>
          )}
          {tokenStatus === "idle" && <p>Preparing…</p>}
        </div>
      </div>

      {/* Tool chooser */}
      <div className="of-card of-mcp-v2-card of-mcp-v2-card--full">
        <div className="of-mcp-v2-section-head">
          <div>
            <span className="n">STEP 1</span>
            <h3>Choose your AI tool</h3>
            <p>Select your client — file paths and exact JSON update automatically. All use same endpoint + Bearer.</p>
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
              <h5>Steps</h5>
              <ol>
                {active.steps.map((s, i) => (
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
                <span>Config JSON</span>
                <button className="of-btn" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => copy(configText, "cfg")}>
                  {copied === "cfg" ? "Copied!" : "Copy JSON"}
                </button>
              </div>
              <pre>{configText}</pre>
            </div>

            {cliText && (
              <div className="of-mcp-v2-code-card" style={{ marginTop: 14 }}>
                <div className="of-mcp-v2-code-head">
                  <span>CLI command</span>
                  <button className="of-btn" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => copy(cliText, "cli")}>
                    {copied === "cli" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre>{cliText}</pre>
              </div>
            )}

            <div className="of-mcp-v2-tip">
              <b>Tip</b> Replace <code>{TOKEN_PLACEHOLDER}</code> with token above. If you used “Copy token”, it’s already filled.
            </div>
          </div>
        </div>
      </div>

      {/* Tools + Troubleshoot */}
      <div className="of-mcp-v2-grid2">
        <div className="of-card of-mcp-v2-card">
          <span className="n">TOOLS</span>
          <h3>2 tools, read-only</h3>

          <div className="of-mcp-v2-tool-doc">
            <code>openfield_models</code>
            <p>List all 38 Higgsfield models — id, label, surface (image/video). Perfect for “which model for 9:16?”.</p>
            <pre>{`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": { "name": "openfield_models", "arguments": {} }
}`}</pre>
          </div>

          <div className="of-mcp-v2-tool-doc">
            <code>openfield_pricing</code>
            <p>Token packs (INR via UroPay) + per-model costs. Mirrors /pricing rate card.</p>
            <pre>{`{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": { "name": "openfield_pricing", "arguments": {} }
}`}</pre>
          </div>
        </div>

        <div className="of-card of-mcp-v2-card">
          <span className="n">DEBUG</span>
          <h3>Verify & troubleshoot</h3>

          <ul className="of-mcp-v2-list">
            <li>
              <b>Tools not showing?</b> Quit client from tray/dock, not just close window. Then reopen.
            </li>
            <li>
              <b>401 Unauthorized?</b> Token expired. Copy fresh token from this page. Must include <code>Bearer </code> prefix.
            </li>
            <li>
              <b>Claude Desktop?</b> Test bridge: <code>{`npx -y mcp-remote ${endpoint} --header 'Authorization: Bearer TOKEN'`}</code>
            </li>
            <li>
              <b>Cursor red?</b> Check <code>.cursor/mcp.json</code> is valid JSON — no trailing commas.
            </li>
            <li>
              <b>Test with curl:</b>
              <pre>{`curl -X POST ${endpoint} \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</pre>
            </li>
          </ul>

          <div className="of-mcp-v2-pills" style={{ marginTop: 16 }}>
            <span>No service-role key</span>
            <span>Per-user auth</span>
            <span>Read-only</span>
          </div>
        </div>
      </div>

      {/* Quick start */}
      <div className="of-card of-mcp-v2-card of-mcp-v2-card--full of-mcp-v2-quick">
        <span className="n">QUICK START</span>
        <h3>3 steps to first call</h3>
        <div className="of-mcp-v2-quick-grid">
          <div>
            <b>1</b>
            <strong>Copy token</strong>
            <p>Sign in, click “Copy token” above. It’s your Supabase access token, auto-detected.</p>
          </div>
          <div>
            <b>2</b>
            <strong>Choose tool & paste</strong>
            <p>Select your AI tool, copy JSON, paste into its MCP config, replace placeholder if needed.</p>
          </div>
          <div>
            <b>3</b>
            <strong>Restart & ask</strong>
            <p>Restart client, then ask: “What Openfield models can I use for 9:16 video?”</p>
          </div>
        </div>
      </div>
    </div>
  );
}
