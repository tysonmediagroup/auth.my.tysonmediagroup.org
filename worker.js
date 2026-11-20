function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  const ct = headers.get("Content-Type") || "";
  if (ct.includes("text/html")) {
    headers.set("X-Frame-Options", "DENY");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/sdk/")) {
        if (!env.MYTYSON_API) {
          return new Response(JSON.stringify({ error: "Service binding MYTYSON_API not configured" }), {
            status: 503,
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
        }
        return env.MYTYSON_API.fetch(request);
      }

      if (url.pathname === "/auth" || url.pathname === "/auth.html") {
        const rootUrl = new URL(request.url);
        rootUrl.pathname = "/";
        const resp = await env.ASSETS.fetch(new Request(rootUrl.toString(), request));
        return withSecurityHeaders(resp);
      }

      const resp = await env.ASSETS.fetch(request);
      return withSecurityHeaders(resp);
    } catch (err) {
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        event: "auth_worker_error",
        path: url.pathname,
        error: String(err?.message || err)
      }));
      return new Response("Internal auth worker error", { status: 500 });
    }
  }
};
