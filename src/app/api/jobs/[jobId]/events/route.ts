import { NextResponse } from "next/server";
import { BACKEND_URL, freshToken, setSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The backend reports PDF-import progress over a WebSocket that takes the token in its URL.
 * We open that socket here, server-side, and relay it to the browser as Server-Sent Events,
 * so the token never has to leave the httpOnly cookie.
 */
export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  // The socket checks the token once, when it opens, so make sure it hasn't run out.
  const { token, renewed } = await freshToken();
  if (!token) return new Response("Unauthorized", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return new Response("Bad job id", { status: 400 });

  const wsUrl = `${BACKEND_URL.replace(/^http/, "ws")}/api/v1/jobs/ws?job_id=${jobId}&token=${encodeURIComponent(token)}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const ws = new WebSocket(wsUrl);
      let closed = false;
      let terminal = false; // the backend sent its last word (completed / failed / error)
      const write = (chunk: string) => { if (!closed) controller.enqueue(encoder.encode(chunk)); };
      const send = (data: string) => write(`data: ${data}\n\n`);
      // A big PDF can sit on one status for a while; comments keep proxies from dropping the idle stream.
      const beat = setInterval(() => write(": keep-alive\n\n"), 20_000);
      const end = () => {
        if (closed) return;
        closed = true;
        clearInterval(beat);
        try { ws.close(); } catch { /* already closed */ }
        controller.close();
      };
      const lost = () => { if (!terminal) send(JSON.stringify({ status: "error", error: "Lost the connection to the import job." })); end(); };

      ws.onmessage = (e) => {
        if (typeof e.data !== "string") return;
        try { terminal = ["completed", "failed", "error"].includes(JSON.parse(e.data).status); } catch { /* relay as-is */ }
        send(e.data);
      };
      ws.onerror = lost;
      // The backend closes with 1000 after completed/failed and 1008 after a rejection, each preceded by a message.
      ws.onclose = lost;
      req.signal.addEventListener("abort", end);
    },
  });

  const res = new NextResponse(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
  if (renewed) setSession(res, renewed, renewed.user);
  return res;
}
