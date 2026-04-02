import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export function proxyPlugin(): Plugin {
  return {
    name: "api-proxy",
    configureServer(server) {
      server.middlewares.use("/api/proxy", async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          });
          res.end();
          return;
        }

        if (req.method !== "POST") {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const raw = await readBody(req);
          const { targetUrl, method, headers, body, stream } = JSON.parse(raw) as {
            targetUrl: string;
            method: string;
            headers: Record<string, string>;
            body?: unknown;
            stream?: boolean;
          };

          const fetchRes = await fetch(targetUrl, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          });

          // Forward status and selected headers
          const resHeaders: Record<string, string> = {
            "Access-Control-Allow-Origin": "*",
            "X-Proxy-Status": String(fetchRes.status),
          };

          // Forward response headers we care about
          for (const key of ["content-type", "x-ratelimit-limit-requests", "x-ratelimit-remaining-requests", "retry-after"]) {
            const val = fetchRes.headers.get(key);
            if (val) resHeaders[`X-Upstream-${key}`] = val;
          }

          // Forward all upstream headers as JSON in a special header
          const upstreamHeaders: Record<string, string> = {};
          fetchRes.headers.forEach((v, k) => {
            upstreamHeaders[k] = v;
          });
          resHeaders["X-Upstream-Headers"] = JSON.stringify(upstreamHeaders);

          if (stream && fetchRes.body) {
            resHeaders["Content-Type"] = "text/event-stream";
            resHeaders["Cache-Control"] = "no-cache";
            resHeaders["Connection"] = "keep-alive";
            resHeaders["X-Accel-Buffering"] = "no";
            res.writeHead(200, resHeaders);

            const reader = fetchRes.body.getReader();
            const pump = async () => {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                  res.end();
                  return;
                }
                res.write(value);
              }
            };
            await pump();
          } else {
            const text = await fetchRes.text();
            resHeaders["Content-Type"] = fetchRes.headers.get("content-type") || "application/json";
            res.writeHead(fetchRes.status, resHeaders);
            res.end(text);
          }
        } catch (e) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}
