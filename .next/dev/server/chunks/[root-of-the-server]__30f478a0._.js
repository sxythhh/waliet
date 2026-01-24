module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/waliet/lib/prisma.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/waliet/node_modules/@prisma/client)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$adapter$2d$pg$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@prisma/adapter-pg/dist/index.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f$pg$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import, [project]/waliet/node_modules/pg)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$adapter$2d$pg$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f$pg$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$adapter$2d$pg$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f$pg$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
const globalForPrisma = globalThis;
function createPrismaClient() {
    const pool = new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f$pg$29$__["Pool"]({
        connectionString: process.env.DATABASE_URL
    });
    const adapter = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$adapter$2d$pg$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PrismaPg"](pool);
    return new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
        adapter
    });
}
const prisma = globalForPrisma.prisma ?? createPrismaClient();
if ("TURBOPACK compile-time truthy", 1) {
    globalForPrisma.prisma = prisma;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/waliet/lib/supabase/server.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/@supabase/ssr/dist/module/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/headers.js [app-route] (ecmascript)");
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://xalcertqfbvnerpzofxa.supabase.co"), ("TURBOPACK compile-time value", "sb_publishable_spNItwGDfqfHF4ohLDm1IA_LO1Lw12-"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing sessions.
                }
            }
        }
    });
}
}),
"[project]/waliet/lib/whop-sdk.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PLATFORM_COMPANY_ID",
    ()=>PLATFORM_COMPANY_ID,
    "createCheckoutConfig",
    ()=>createCheckoutConfig,
    "createPayoutTransfer",
    ()=>createPayoutTransfer,
    "getTransferStatus",
    ()=>getTransferStatus,
    "whopsdk",
    ()=>whopsdk
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/client.mjs [app-route] (ecmascript)");
;
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
if (!process.env.WHOP_API_KEY) {
    throw new Error("WHOP_API_KEY is not set");
}
const whopsdk = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Whop"]({
    appID: ("TURBOPACK compile-time value", "app_T5of943iJSW24E"),
    apiKey: process.env.WHOP_API_KEY,
    webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET || "")
});
const PLATFORM_COMPANY_ID = process.env.PLATFORM_COMPANY_ID;
async function createPayoutTransfer(params) {
    if (!PLATFORM_COMPANY_ID) {
        throw new Error("PLATFORM_COMPANY_ID is not set");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await whopsdk.transfers.create({
        origin: PLATFORM_COMPANY_ID,
        destination: params.recipientUserId,
        amount_cents: params.amountCents,
        currency: "usd",
        description: params.description,
        idempotency_key: params.idempotencyKey,
        metadata: params.metadata
    });
    return {
        transferId: response.id,
        status: response.status || "pending"
    };
}
async function getTransferStatus(transferId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await whopsdk.transfers.retrieve(transferId);
    return {
        status: response.status || "unknown",
        failureReason: response.status === "failed" ? response.failure_message : undefined
    };
}
async function createCheckoutConfig(params) {
    if (!PLATFORM_COMPANY_ID) {
        throw new Error("PLATFORM_COMPANY_ID is not set");
    }
    // Create checkout configuration with an inline plan
    // Note: Whop's initial_price expects dollars, not cents
    const response = await whopsdk.checkoutConfigurations.create({
        plan: {
            company_id: PLATFORM_COMPANY_ID,
            currency: params.currency,
            initial_price: params.amountCents / 100,
            plan_type: "one_time",
            title: params.name,
            visibility: "hidden",
            product: {
                external_identifier: `waliet_hours_${Date.now()}`,
                title: params.name,
                business_type: "coaching"
            }
        },
        metadata: params.metadata,
        redirect_url: params.redirectUrl
    });
    if (!response || !response.plan) {
        throw new Error("Failed to create checkout configuration");
    }
    return {
        id: response.id,
        planId: response.plan.id,
        purchaseUrl: response.purchase_url
    };
}
}),
"[project]/waliet/lib/dual-auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "getDualAuthUser",
    ()=>getDualAuthUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/whop-sdk.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/prisma.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
async function getDualAuthUser() {
    // Try Whop auth first
    const whopUser = await tryWhopAuth();
    if (whopUser) {
        console.log("[DualAuth] Authenticated via Whop:", whopUser.userId);
        const dbUser = await syncWhopUserToDatabase(whopUser);
        return {
            user: {
                id: dbUser.id,
                name: whopUser.name,
                email: whopUser.email || null,
                avatar: whopUser.profilePicUrl || null,
                provider: "whop",
                providerId: whopUser.userId
            },
            dbUser
        };
    }
    // Try Supabase auth
    const supabaseUser = await trySupabaseAuth();
    if (supabaseUser) {
        console.log("[DualAuth] Authenticated via Supabase:", supabaseUser.id);
        const dbUser = await syncSupabaseUserToDatabase(supabaseUser);
        return {
            user: {
                id: dbUser.id,
                name: supabaseUser.name,
                email: supabaseUser.email,
                avatar: supabaseUser.avatar,
                provider: "supabase",
                providerId: supabaseUser.id
            },
            dbUser
        };
    }
    console.log("[DualAuth] No authentication found");
    return null;
}
async function tryWhopAuth() {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
        // Check if user explicitly logged out - skip ALL Whop auth
        const loggedOutCookie = cookieStore.get("waliet-logged-out");
        const loggedOut = loggedOutCookie?.value === "true";
        console.log("[DualAuth] waliet-logged-out cookie:", loggedOutCookie?.value, "| loggedOut:", loggedOut);
        if (loggedOut) {
            console.log("[DualAuth] User logged out, skipping Whop auth");
            return null;
        }
        // In development, allow bypassing auth with DEV_WHOP_USER_ID
        if (("TURBOPACK compile-time value", "development") === "development" && process.env.DEV_WHOP_USER_ID) {
            const userId = process.env.DEV_WHOP_USER_ID;
            const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].users.retrieve(userId);
            const extendedUser = user;
            return {
                userId,
                name: user.name,
                username: user.username,
                email: extendedUser.email,
                profilePicUrl: user.profile_picture?.url || undefined
            };
        }
        // Normal auth flow - verify token from headers
        const headersList = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])();
        const whopToken = headersList.get("x-whop-user-token");
        if (!whopToken) {
            return null;
        }
        const result = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].verifyUserToken(headersList);
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].users.retrieve(result.userId);
        const extendedUser = user;
        return {
            userId: result.userId,
            name: user.name,
            username: user.username,
            email: extendedUser.email,
            profilePicUrl: user.profile_picture?.url || undefined
        };
    } catch  {
        return null;
    }
}
async function trySupabaseAuth() {
    try {
        // Check if Supabase is configured
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log("[DualAuth] Supabase auth check - user:", user?.id, "error:", error?.message);
        if (error || !user) {
            return null;
        }
        return {
            id: user.id,
            email: user.email || "",
            name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
        };
    } catch (e) {
        console.log("[DualAuth] Supabase auth error:", e);
        return null;
    }
}
async function syncWhopUserToDatabase(whopUser) {
    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.upsert({
        where: {
            whopUserId: whopUser.userId
        },
        update: {
            name: whopUser.name,
            avatar: whopUser.profilePicUrl || null,
            email: whopUser.email || undefined
        },
        create: {
            whopUserId: whopUser.userId,
            name: whopUser.name,
            avatar: whopUser.profilePicUrl || null,
            email: whopUser.email || null
        },
        include: {
            sellerProfile: {
                select: {
                    id: true,
                    hourlyRate: true,
                    bio: true,
                    tagline: true,
                    averageRating: true,
                    totalSessionsCompleted: true,
                    totalReviews: true,
                    isVerified: true,
                    isActive: true
                }
            }
        }
    });
    // Create seller profile if doesn't exist (everyone is a seller by default)
    if (!user.sellerProfile) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.create({
            data: {
                userId: user.id,
                hourlyRate: 0,
                isActive: true
            }
        });
        // Fetch the updated user with seller profile
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUniqueOrThrow({
            where: {
                id: user.id
            },
            include: {
                sellerProfile: {
                    select: {
                        id: true,
                        hourlyRate: true,
                        bio: true,
                        tagline: true,
                        averageRating: true,
                        totalSessionsCompleted: true,
                        totalReviews: true,
                        isVerified: true,
                        isActive: true
                    }
                }
            }
        });
    }
    return user;
}
async function syncSupabaseUserToDatabase(supabaseUser) {
    // For Supabase users, we use supabaseUserId field
    // First check if user exists by supabaseUserId
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
        where: {
            supabaseUserId: supabaseUser.id
        },
        include: {
            sellerProfile: {
                select: {
                    id: true,
                    hourlyRate: true,
                    bio: true,
                    tagline: true,
                    averageRating: true,
                    totalSessionsCompleted: true,
                    totalReviews: true,
                    isVerified: true,
                    isActive: true
                }
            }
        }
    });
    if (existing) {
        // Update existing user
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.update({
            where: {
                id: existing.id
            },
            data: {
                name: supabaseUser.name || existing.name,
                avatar: supabaseUser.avatar || existing.avatar,
                email: supabaseUser.email || existing.email
            },
            include: {
                sellerProfile: {
                    select: {
                        id: true,
                        hourlyRate: true,
                        bio: true,
                        tagline: true,
                        averageRating: true,
                        totalSessionsCompleted: true,
                        totalReviews: true,
                        isVerified: true,
                        isActive: true
                    }
                }
            }
        });
        // Create seller profile if doesn't exist (everyone is a seller by default)
        if (!user.sellerProfile) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.create({
                data: {
                    userId: user.id,
                    hourlyRate: 0,
                    isActive: true
                }
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUniqueOrThrow({
                where: {
                    id: user.id
                },
                include: {
                    sellerProfile: {
                        select: {
                            id: true,
                            hourlyRate: true,
                            bio: true,
                            tagline: true,
                            averageRating: true,
                            totalSessionsCompleted: true,
                            totalReviews: true,
                            isVerified: true,
                            isActive: true
                        }
                    }
                }
            });
        }
        return user;
    }
    // Create new user
    const newUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.create({
        data: {
            supabaseUserId: supabaseUser.id,
            name: supabaseUser.name,
            avatar: supabaseUser.avatar,
            email: supabaseUser.email
        }
    });
    // Create seller profile for new user
    await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.create({
        data: {
            userId: newUser.id,
            hourlyRate: 0,
            isActive: true
        }
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUniqueOrThrow({
        where: {
            id: newUser.id
        },
        include: {
            sellerProfile: {
                select: {
                    id: true,
                    hourlyRate: true,
                    bio: true,
                    tagline: true,
                    averageRating: true,
                    totalSessionsCompleted: true,
                    totalReviews: true,
                    isVerified: true,
                    isActive: true
                }
            }
        }
    });
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/waliet/app/api/app/home/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/dual-auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$date$2d$fns$2f$subDays$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/date-fns/subDays.js [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
async function GET() {
    try {
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDualAuthUser"])();
        if (!auth) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Unauthorized"
            }, {
                status: 401
            });
        }
        const userId = auth.dbUser.id;
        const sellerProfile = auth.dbUser.sellerProfile;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$date$2d$fns$2f$subDays$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["subDays"])(now, 7);
        const fourteenDaysAgo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$date$2d$fns$2f$subDays$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["subDays"])(now, 14);
        // Base user data
        const userData = {
            id: auth.dbUser.id,
            name: auth.dbUser.name,
            avatar: auth.dbUser.avatar,
            email: auth.dbUser.email
        };
        // If user has a seller profile, get seller-specific data
        if (sellerProfile) {
            // Get session stats
            const [completedSessions, pendingRequests, awaitingConfirmation, inProgressSessions, upcomingSessions] = await Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.count({
                    where: {
                        sellerId: userId,
                        status: {
                            in: [
                                "COMPLETED",
                                "RATED",
                                "PAID_OUT"
                            ]
                        }
                    }
                }),
                __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.count({
                    where: {
                        sellerId: userId,
                        status: "REQUESTED"
                    }
                }),
                __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.count({
                    where: {
                        sellerId: userId,
                        status: "AWAITING_CONFIRMATION"
                    }
                }),
                __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.count({
                    where: {
                        sellerId: userId,
                        status: "IN_PROGRESS"
                    }
                }),
                __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.findMany({
                    where: {
                        sellerId: userId,
                        status: {
                            in: [
                                "ACCEPTED",
                                "REQUESTED"
                            ]
                        },
                        scheduledAt: {
                            gte: now
                        }
                    },
                    include: {
                        buyer: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true
                            }
                        }
                    },
                    orderBy: {
                        scheduledAt: "asc"
                    },
                    take: 5
                })
            ]);
            // Calculate earnings from completed sessions
            const completedSessionsData = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.findMany({
                where: {
                    sellerId: userId,
                    status: {
                        in: [
                            "COMPLETED",
                            "RATED",
                            "PAID_OUT",
                            "AWAITING_CONFIRMATION"
                        ]
                    }
                },
                select: {
                    pricePerUnit: true,
                    units: true,
                    status: true,
                    completedAt: true,
                    createdAt: true
                }
            });
            const totalEarnings = completedSessionsData.filter((s)=>[
                    "COMPLETED",
                    "RATED",
                    "PAID_OUT"
                ].includes(s.status)).reduce((sum, s)=>sum + (s.pricePerUnit || 0) * s.units, 0);
            const pendingEarnings = completedSessionsData.filter((s)=>s.status === "AWAITING_CONFIRMATION").reduce((sum, s)=>sum + (s.pricePerUnit || 0) * s.units, 0);
            // Get pending payouts
            const pendingPayouts = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].payout.findMany({
                where: {
                    sellerId: userId,
                    status: {
                        in: [
                            "PENDING",
                            "PROCESSING"
                        ]
                    }
                },
                select: {
                    amount: true
                }
            });
            const pendingPayoutAmount = pendingPayouts.reduce((sum, p)=>sum + p.amount, 0);
            // Get earnings for last 7 days (for sparkline chart)
            const recentEarnings = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.findMany({
                where: {
                    sellerId: userId,
                    status: {
                        in: [
                            "COMPLETED",
                            "RATED",
                            "PAID_OUT"
                        ]
                    },
                    completedAt: {
                        gte: sevenDaysAgo
                    }
                },
                select: {
                    pricePerUnit: true,
                    units: true,
                    completedAt: true
                }
            });
            // Group earnings by day for sparkline
            const earningsByDay = {};
            for(let i = 6; i >= 0; i--){
                const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$date$2d$fns$2f$subDays$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["subDays"])(now, i);
                const dateKey = date.toISOString().slice(0, 10);
                earningsByDay[dateKey] = 0;
            }
            for (const session of recentEarnings){
                if (session.completedAt) {
                    const dateKey = session.completedAt.toISOString().slice(0, 10);
                    if (earningsByDay[dateKey] !== undefined) {
                        earningsByDay[dateKey] += (session.pricePerUnit || 0) * session.units;
                    }
                }
            }
            const earningsChart = Object.entries(earningsByDay).map(([date, amount])=>({
                    date,
                    amount: amount / 100
                }));
            // Calculate earnings change (this week vs last week)
            const thisWeekEarnings = recentEarnings.reduce((sum, s)=>sum + (s.pricePerUnit || 0) * s.units, 0);
            const lastWeekEarnings = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.findMany({
                where: {
                    sellerId: userId,
                    status: {
                        in: [
                            "COMPLETED",
                            "RATED",
                            "PAID_OUT"
                        ]
                    },
                    completedAt: {
                        gte: fourteenDaysAgo,
                        lt: sevenDaysAgo
                    }
                },
                select: {
                    pricePerUnit: true,
                    units: true
                }
            });
            const lastWeekTotal = lastWeekEarnings.reduce((sum, s)=>sum + (s.pricePerUnit || 0) * s.units, 0);
            const earningsChange = lastWeekTotal > 0 ? (thisWeekEarnings - lastWeekTotal) / lastWeekTotal * 100 : thisWeekEarnings > 0 ? 100 : 0;
            // Get unique buyers count
            const uniqueBuyers = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.groupBy({
                by: [
                    "buyerId"
                ],
                where: {
                    sellerId: userId,
                    status: {
                        in: [
                            "COMPLETED",
                            "RATED",
                            "PAID_OUT"
                        ]
                    }
                }
            });
            // Get recent activity
            const recentSessions = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.findMany({
                where: {
                    sellerId: userId
                },
                include: {
                    buyer: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
                take: 5
            });
            const recentPurchases = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].purchase.findMany({
                where: {
                    sellerId: userId
                },
                include: {
                    buyer: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
                take: 5
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                user: userData,
                isSeller: true,
                stats: {
                    totalEarnings: totalEarnings / 100,
                    pendingEarnings: pendingEarnings / 100,
                    pendingPayoutAmount: pendingPayoutAmount / 100,
                    totalSessions: completedSessions,
                    uniqueBuyers: uniqueBuyers.length,
                    averageRating: sellerProfile.averageRating,
                    totalReviews: sellerProfile.totalReviews,
                    hourlyRate: sellerProfile.hourlyRate / 100
                },
                earningsChart,
                earningsChange,
                pendingActions: {
                    sessionRequests: pendingRequests,
                    awaitingConfirmation,
                    inProgress: inProgressSessions,
                    pendingPayouts: pendingPayouts.length
                },
                upcomingSessions: upcomingSessions.map((s)=>({
                        id: s.id,
                        topic: s.topic,
                        scheduledAt: s.scheduledAt?.toISOString() || null,
                        status: s.status,
                        buyer: s.buyer
                    })),
                recentActivity: [
                    ...recentSessions.map((s)=>({
                            id: `session-${s.id}`,
                            type: "session",
                            title: s.status === "REQUESTED" ? "New session request" : s.status === "COMPLETED" ? "Session completed" : `Session ${s.status.toLowerCase().replace("_", " ")}`,
                            description: `${s.buyer?.name || "Someone"} - ${s.topic}`,
                            timestamp: s.createdAt.toISOString(),
                            status: s.status
                        })),
                    ...recentPurchases.map((p)=>({
                            id: `purchase-${p.id}`,
                            type: "purchase",
                            title: "New purchase",
                            description: `${p.buyer?.name || "Someone"} bought ${p.units} unit(s)`,
                            amount: p.sellerReceives / 100,
                            timestamp: p.createdAt.toISOString(),
                            status: p.status
                        }))
                ].sort((a, b)=>new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
            });
        }
        // Non-seller user (buyer only)
        const purchasesMade = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].purchase.count({
            where: {
                buyerId: userId
            }
        });
        const sessionsBooked = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.count({
            where: {
                buyerId: userId
            }
        });
        const totalSpent = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].purchase.aggregate({
            where: {
                buyerId: userId,
                status: "COMPLETED"
            },
            _sum: {
                totalAmount: true
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            user: userData,
            isSeller: false,
            stats: {
                totalSpent: (totalSpent._sum.totalAmount || 0) / 100,
                purchasesMade,
                sessionsBooked
            },
            pendingActions: {
                sessionRequests: 0,
                awaitingConfirmation: 0,
                inProgress: 0,
                pendingPayouts: 0
            },
            earningsChart: [],
            earningsChange: 0,
            upcomingSessions: [],
            recentActivity: []
        });
    } catch (error) {
        console.error("Error fetching home data:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Failed to fetch home data"
        }, {
            status: 500
        });
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__30f478a0._.js.map