import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/supabase/server";
import "../studio.css";
import "./mcp.css";
import { McpSetupClient } from "./mcp-setup-client";

export default async function McpPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/studio/mcp");
  const endpoint = "https://openfieldai.vercel.app/api/mcp";

  return (
    <main className="of-mcp-page">
      <Link href="/studio" className="of-mcp-back">
        ← Back to Studio
      </Link>
      <p className="of-mcp-kicker">Model Context Protocol</p>
      <h1>Connect Openfield to your AI tools.</h1>
      <p className="of-mcp-lede">
        Use Openfield from Codex, Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. The server
        exposes your model catalog and token pricing without exposing payment or service credentials. Choose your tool
        below for exact file paths and config.
      </p>

      <McpSetupClient endpoint={endpoint} />
    </main>
  );
}
