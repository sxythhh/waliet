(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__157bebbe._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/waliet/lib/supabase/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "updateSupabaseSession",
    ()=>updateSupabaseSession
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/@supabase/ssr/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
;
async function updateSupabaseSession(request) {
    // Skip if Supabase is not configured
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    let supabaseResponse = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request
    });
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://qjetxznqnlwvzmrqsjwa.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZXR4em5xbmx3dnptcnFzandhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMzY3MTYsImV4cCI6MjA4NDgxMjcxNn0.KYe-yPxe4J1Jj8bcQsP2obckZ5sQD1csV3wrBUXnthk"), {
        cookies: {
            getAll () {
                return request.cookies.getAll();
            },
            setAll (cookiesToSet) {
                cookiesToSet.forEach(({ name, value })=>request.cookies.set(name, value));
                supabaseResponse = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
                    request
                });
                cookiesToSet.forEach(({ name, value, options })=>supabaseResponse.cookies.set(name, value, options));
            }
        }
    });
    // Refresh session if it exists
    await supabase.auth.getUser();
    return supabaseResponse;
}
}),
"[project]/waliet/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$supabase$2f$middleware$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/supabase/middleware.ts [middleware-edge] (ecmascript)");
;
;
async function middleware(request) {
    // Get Whop token from various sources
    const devToken = request.nextUrl.searchParams.get("whop-dev-user-token");
    const headerToken = request.headers.get("x-whop-user-token");
    const cookieToken = request.cookies.get("whop-dev-user-token")?.value;
    const whopToken = headerToken || devToken || cookieToken;
    // Check for Supabase session
    const hasSupabaseSession = request.cookies.getAll().some((cookie)=>cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
    // If we have a dev token in URL, set cookie for future requests
    if (devToken) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-whop-user-token", devToken);
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
            request: {
                headers: requestHeaders
            }
        });
        // Also set cookie for future requests without the URL param
        response.cookies.set("whop-dev-user-token", devToken, {
            httpOnly: true,
            secure: ("TURBOPACK compile-time value", "development") === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24
        });
        return response;
    }
    // If we have Whop token from cookie but not header, add to headers
    if (cookieToken && !headerToken) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-whop-user-token", cookieToken);
        // Also update Supabase session
        const supabaseResponse = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$supabase$2f$middleware$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["updateSupabaseSession"])(request);
        // Merge headers
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
            request: {
                headers: requestHeaders
            }
        });
        // Copy Supabase cookies to response
        supabaseResponse.cookies.getAll().forEach((cookie)=>{
            response.cookies.set(cookie.name, cookie.value);
        });
        return response;
    }
    // For API routes, check authentication
    if (request.nextUrl.pathname.startsWith("/api/")) {
        // Allow these routes without auth
        if (request.nextUrl.pathname.startsWith("/api/webhooks/") || request.nextUrl.pathname.startsWith("/api/auth/") || request.nextUrl.pathname === "/api/health") {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$supabase$2f$middleware$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["updateSupabaseSession"])(request);
        }
        // Require either Whop token or Supabase session for other API routes
        if (!whopToken && !hasSupabaseSession) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Authentication required"
            }, {
                status: 401
            });
        }
    }
    // Update Supabase session for all other requests
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$supabase$2f$middleware$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["updateSupabaseSession"])(request);
}
const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__157bebbe._.js.map