/// <reference lib="deno.ns" />
/**
 * HTTP server with TypeScript transpilation for the bong simulator
 */

const PORT = 8000;

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let pathname = url.pathname;

  // Default to index.html
  if (pathname === "/") {
    pathname = "/index.html";
  }

  try {
    // Build file path
    const filePath = `.${pathname}`;

    // Read the file
    const file = await Deno.readFile(filePath);

    // Determine content type
    let contentType = "text/plain";
    if (pathname.endsWith(".html")) {
      contentType = "text/html";
    } else if (pathname.endsWith(".css")) {
      contentType = "text/css";
    } else if (pathname.endsWith(".js")) {
      contentType = "application/javascript";
    } else if (pathname.endsWith(".ts")) {
      // Transpile TypeScript to JavaScript
      contentType = "application/javascript";
      const text = new TextDecoder().decode(file);

      // Simple transpilation: remove type annotations
      // For production, use proper TypeScript compiler
      const js = text
        .replace(/: (string|number|boolean|void|any|BongState|BongParams|AudioEngine|Bubble)\b/g, '')
        .replace(/: \{[^}]+\}/g, '')
        .replace(/interface \w+ \{[^}]+\}/g, '')
        .replace(/export interface[^}]+\}/g, '')
        .replace(/import \{[^}]+\} from ["'][^"']+["'];/g, (match) => {
          // Convert .ts imports to .js
          return match.replace(/\.ts/g, '.js');
        })
        .replace(/\.ts/g, '.js');

      return new Response(js, {
        headers: {
          "content-type": contentType,
          "Access-Control-Allow-Origin": "*",
        },
      });
    } else if (pathname.endsWith(".json")) {
      contentType = "application/json";
    }

    return new Response(file, {
      headers: {
        "content-type": contentType,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return new Response("404 Not Found", { status: 404 });
    }
    console.error("Error serving file:", err);
    return new Response("500 Internal Server Error", { status: 500 });
  }
}

Deno.serve({ port: PORT }, handleRequest);

console.log(`\n🌊 Bong Simulator running at http://localhost:${PORT}/\n`);
console.log(`   Open http://localhost:${PORT}/ in your browser\n`);
