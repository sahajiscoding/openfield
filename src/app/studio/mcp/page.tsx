import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/supabase/server";
import "../studio.css";

export default async function McpPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/studio/mcp");
  const endpoint = "https://openfieldai.vercel.app/api/mcp";
  const config = JSON.stringify({ mcpServers: { openfield: { url: endpoint } } }, null, 2);

  return (
    <main className="of-mcp-page">
      <Link href="/studio" className="of-mcp-back">← Back to Studio</Link>
      <p className="of-mcp-kicker">Model Context Protocol</p>
      <h1>Connect Openfield to your AI tools.</h1>
      <p className="of-mcp-lede">Use Openfield from Codex, Claude Desktop, Cursor, or any MCP-compatible client. The server exposes your model catalog and token pricing without exposing payment or service credentials.</p>
      <section className="of-mcp-card">
        <h2>Endpoint</h2>
        <code>{endpoint}</code>
        <p>Authenticate requests with your Supabase access token as a Bearer token. Never paste a service-role key into a client.</p>
      </section>
      <section className="of-mcp-card">
        <h2>Claude Desktop, Cursor, and compatible clients</h2>
        <pre>{config}</pre>
        <p>After adding the server, sign in through your client’s OAuth or token settings using the same Openfield account.</p>
      </section>
      <section className="of-mcp-card">
        <h2>Available tools</h2>
        <ul><li><code>openfield_models</code> — browse available image and video models</li><li><code>openfield_pricing</code> — read current token rates</li></ul>
      </section>
    </main>
  );
}
