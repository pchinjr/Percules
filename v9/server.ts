// server.ts
import { getSnapshot, reset, setParams, tick } from "./sim.ts";

// Simple static file helper (no std deps)
async function serveFile(path: string) {
  try {
    const data = await Deno.readFile(path);
    const ext = path.split(".").pop() || "";
    const types: Record<string, string> = {
      html: "text/html; charset=utf-8",
      js: "text/javascript; charset=utf-8",
      css: "text/css; charset=utf-8",
      json: "application/json",
    };
    const type = types[ext] ?? "application/octet-stream";
    return new Response(data, { headers: { "content-type": type } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function sseHeaders() {
  return new Headers({
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
    "access-control-allow-origin": "*",
  });
}

// Minimal router for the UI, control endpoint, and live SSE stream.
Deno.serve({ port: 8080 }, (req) => {
  const { pathname } = new URL(req.url);

  // Static
  if (pathname === "/") return serveFile("./public/index.html");
  if (pathname === "/app.js") return serveFile("./public/app.js");
  if (pathname === "/audio.js") return serveFile("./public/audio.js");
  if (pathname === "/audioScheduler.js") {
    return serveFile("./public/audioScheduler.js");
  }
  if (pathname === "/plinkSynth.js") {
    return serveFile("./public/plinkSynth.js");
  }

  // Controls (optional live tuning)
  if (pathname === "/controls" && req.method === "POST") {
    return req.json().then((body) => {
      if (body.reset) reset();
      if (body.params) setParams(body.params);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    });
  }

  // SSE stream
  if (pathname === "/events") {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        let acc = 0; // accumulate elapsed wall time between physics steps
        const dt = 0.002; // 2 ms physics tick
        const SEND_INTERVAL_S = 0.05; // push to client every 50 ms

        let last = Date.now();
        // Run a fixed-step integrator but only emit snapshots every ~50 ms.
        const interval = setInterval(() => {
          const now = Date.now();
          const elapsed = (now - last) / 1000;
          last = now;
          acc += elapsed;

          // fixed-step physics
          while (acc >= dt) {
            tick(dt);
            acc -= dt;
          }

          // snapshot @ ~20Hz
          const snap = getSnapshot();
          const line = `data: ${JSON.stringify(snap)}\n\n`;
          controller.enqueue(encoder.encode(line));
        }, SEND_INTERVAL_S * 1000);

        req.signal.addEventListener("abort", () => clearInterval(interval));
      },
    });

    return new Response(stream, { headers: sseHeaders() });
  }

  return new Response("Not found", { status: 404 });
});

console.log("Percules server running: http://localhost:8080");
