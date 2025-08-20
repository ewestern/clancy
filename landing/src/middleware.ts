import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const originalUrl = new URL(request.url);

  const isAsset = originalUrl.pathname.startsWith("/ph-relay-8437f/static/");
  const targetHost = isAsset ? "us-assets.i.posthog.com" : "us.i.posthog.com";

  const rewrittenUrl = new URL(originalUrl);
  rewrittenUrl.protocol = "https:";
  rewrittenUrl.hostname = targetHost;
  rewrittenUrl.port = "443";
  rewrittenUrl.pathname = rewrittenUrl.pathname.replace(
    /^\/ph-relay-8437f/,
    "",
  );

  const headers = new Headers(request.headers);
  headers.set("host", targetHost);

  return NextResponse.rewrite(rewrittenUrl, { headers });
}

export const config = {
  matcher: "/ph-relay-8437f/:path*",
};
