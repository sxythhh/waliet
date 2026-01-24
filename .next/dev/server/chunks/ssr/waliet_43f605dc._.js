module.exports = [
"[project]/waliet/lib/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://qjetxznqnlwvzmrqsjwa.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZXR4em5xbmx3dnptcnFzandhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMzY3MTYsImV4cCI6MjA4NDgxMjcxNn0.KYe-yPxe4J1Jj8bcQsP2obckZ5sQD1csV3wrBUXnthk"), {
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
"[project]/waliet/lib/whop-sdk.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$client$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/client.mjs [app-rsc] (ecmascript)");
;
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
if (!process.env.WHOP_API_KEY) {
    throw new Error("WHOP_API_KEY is not set");
}
const whopsdk = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$client$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Whop"]({
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
"[project]/waliet/lib/prisma.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/waliet/node_modules/@prisma/client)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$adapter$2d$pg$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@prisma/adapter-pg/dist/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f$pg$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import, [project]/waliet/node_modules/pg)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$adapter$2d$pg$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f$pg$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$adapter$2d$pg$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f$pg$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
const globalForPrisma = globalThis;
function createPrismaClient() {
    const pool = new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$waliet$2f$node_modules$2f$pg$29$__["Pool"]({
        connectionString: process.env.DATABASE_URL
    });
    const adapter = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$prisma$2f$adapter$2d$pg$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PrismaPg"](pool);
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
"[project]/waliet/lib/dual-auth.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "getDualAuthUser",
    ()=>getDualAuthUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/whop-sdk.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/prisma.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
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
/**
 * Attempt Whop authentication
 *
 * IMPORTANT: Email availability depends on auth method:
 *
 * 1. App View (iframe): Email is NOT available
 *    - Uses whopsdk.verifyUserToken() + users.retrieve()
 *    - Whop API does not return email in user object
 *    - Users created via app view will have null email
 *
 * 2. OAuth ("Continue with Whop"): Email IS available
 *    - Uses /oauth/userinfo endpoint with email scope
 *    - Email is returned and used for account linking
 *
 * This means:
 * - App view users can't be linked to Supabase accounts (no email)
 * - OAuth users CAN be linked via email matching
 * - If user accesses via app view first, then uses OAuth, they'll have
 *   separate accounts unless they use the same email and we implement
 *   a retroactive linking mechanism
 */ async function tryWhopAuth() {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
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
            const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["whopsdk"].users.retrieve(userId);
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
        const headersList = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["headers"])();
        const whopToken = headersList.get("x-whop-user-token");
        if (!whopToken) {
            return null;
        }
        const result = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["whopsdk"].verifyUserToken(headersList);
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["whopsdk"].users.retrieve(result.userId);
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
        const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
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
/**
 * Sync Whop app view user to database
 *
 * NOTE: This is used for app view (iframe) authentication where email
 * is NOT available from Whop API. For OAuth flow, see the callback handler
 * in app/api/auth/whop/callback/route.ts which implements account linking.
 *
 * Users created here will have whopUserId but may have null email.
 */ async function syncWhopUserToDatabase(whopUser) {
    console.log("[DualAuth] Syncing Whop app view user:", {
        userId: whopUser.userId,
        username: whopUser.username,
        hasEmail: !!whopUser.email
    });
    // First check if user already exists by Whop ID
    const existingWhopUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
        where: {
            whopUserId: whopUser.userId
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
    if (existingWhopUser) {
        // User already exists, just update
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.update({
            where: {
                id: existingWhopUser.id
            },
            data: {
                name: whopUser.name,
                avatar: whopUser.profilePicUrl || null,
                email: whopUser.email || existingWhopUser.email,
                username: whopUser.username
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
        // Create seller profile if doesn't exist
        if (!user.sellerProfile) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.create({
                data: {
                    userId: user.id,
                    hourlyRate: 0,
                    isActive: true
                }
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findUniqueOrThrow({
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
    // User doesn't exist by Whop ID
    // Try email-based linking first (if email available)
    if (whopUser.email) {
        const emailMatch = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findFirst({
            where: {
                email: whopUser.email,
                whopUserId: null
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
        if (emailMatch) {
            console.log("[DualAuth] Linking Whop account via email:", {
                email: whopUser.email,
                whopUserId: whopUser.userId,
                existingUserId: emailMatch.id
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.update({
                where: {
                    id: emailMatch.id
                },
                data: {
                    whopUserId: whopUser.userId,
                    username: whopUser.username,
                    name: whopUser.name || emailMatch.name,
                    avatar: whopUser.profilePicUrl || emailMatch.avatar
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
    }
    // Try username-based linking as fallback (less reliable)
    if (whopUser.username) {
        const usernameMatch = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findFirst({
            where: {
                username: whopUser.username,
                whopUserId: null
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
        if (usernameMatch) {
            console.log("[DualAuth] Linking Whop account via username (fallback):", {
                username: whopUser.username,
                whopUserId: whopUser.userId,
                existingUserId: usernameMatch.id
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.update({
                where: {
                    id: usernameMatch.id
                },
                data: {
                    whopUserId: whopUser.userId,
                    email: whopUser.email || usernameMatch.email,
                    name: whopUser.name || usernameMatch.name,
                    avatar: whopUser.profilePicUrl || usernameMatch.avatar
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
    }
    // No existing account found - create new user
    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.create({
        data: {
            whopUserId: whopUser.userId,
            username: whopUser.username,
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
        await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.create({
            data: {
                userId: user.id,
                hourlyRate: 0,
                isActive: true
            }
        });
        // Fetch the updated user with seller profile
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findUniqueOrThrow({
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
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
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
        console.log("[DualAuth] Supabase user already exists:", supabaseUser.id);
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.update({
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
            await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.create({
                data: {
                    userId: user.id,
                    hourlyRate: 0,
                    isActive: true
                }
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findUniqueOrThrow({
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
    // User doesn't exist by Supabase ID
    // Try email-based linking first (most reliable)
    if (supabaseUser.email) {
        const existingWhopUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findFirst({
            where: {
                email: supabaseUser.email,
                whopUserId: {
                    not: null
                },
                supabaseUserId: null
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
        if (existingWhopUser) {
            // Found existing Whop account with same email - link accounts!
            console.log("[DualAuth] Linking Supabase ID to existing Whop account via email:", {
                email: supabaseUser.email,
                supabaseUserId: supabaseUser.id,
                existingUserId: existingWhopUser.id
            });
            const linkedUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.update({
                where: {
                    id: existingWhopUser.id
                },
                data: {
                    supabaseUserId: supabaseUser.id,
                    name: supabaseUser.name || existingWhopUser.name,
                    avatar: supabaseUser.avatar || existingWhopUser.avatar
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
            return linkedUser;
        }
    }
    // Try username-based linking as fallback (only if Whop username is set)
    // Note: Supabase users don't have usernames by default, but Whop users do
    const potentialUsernameMatch = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findFirst({
        where: {
            username: {
                not: null
            },
            supabaseUserId: null,
            whopUserId: {
                not: null
            },
            email: supabaseUser.email
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
    if (potentialUsernameMatch) {
        console.log("[DualAuth] Linking Supabase ID to existing Whop account via username+email:", {
            email: supabaseUser.email,
            username: potentialUsernameMatch.username,
            supabaseUserId: supabaseUser.id,
            existingUserId: potentialUsernameMatch.id
        });
        const linkedUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.update({
            where: {
                id: potentialUsernameMatch.id
            },
            data: {
                supabaseUserId: supabaseUser.id,
                name: supabaseUser.name || potentialUsernameMatch.name,
                avatar: supabaseUser.avatar || potentialUsernameMatch.avatar
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
        return linkedUser;
    }
    // No existing account found - create new user
    console.log("[DualAuth] Creating new Supabase user:", supabaseUser.id);
    const newUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.create({
        data: {
            supabaseUserId: supabaseUser.id,
            name: supabaseUser.name,
            avatar: supabaseUser.avatar,
            email: supabaseUser.email
        }
    });
    // Create seller profile for new user
    await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.create({
        data: {
            userId: newUser.id,
            hourlyRate: 0,
            isActive: true
        }
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findUniqueOrThrow({
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
"[project]/waliet/lib/auth.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "checkCompanyAdmin",
    ()=>checkCompanyAdmin,
    "checkExperienceAccess",
    ()=>checkExperienceAccess,
    "getAuthenticatedUser",
    ()=>getAuthenticatedUser,
    "getOrCreateUser",
    ()=>getOrCreateUser,
    "getWhopUser",
    ()=>getWhopUser,
    "syncUserToDatabase",
    ()=>syncUserToDatabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/whop-sdk.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/prisma.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
async function getWhopUser() {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
        // Check if user explicitly logged out - skip ALL Whop auth
        const loggedOut = cookieStore.get("waliet-logged-out")?.value === "true";
        if (loggedOut) {
            return null;
        }
        let userId = null;
        // In development, allow bypassing auth with DEV_WHOP_USER_ID
        if (("TURBOPACK compile-time value", "development") === "development" && process.env.DEV_WHOP_USER_ID) {
            userId = process.env.DEV_WHOP_USER_ID;
        } else {
            // Normal auth flow - verify token from headers (middleware handles dev token)
            const headersList = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["headers"])();
            const whopToken = headersList.get("x-whop-user-token");
            console.log("[Auth] Token present:", !!whopToken);
            if (!whopToken) {
                console.error("[Auth] No Whop token found in headers");
                return null;
            }
            try {
                const result = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["whopsdk"].verifyUserToken(headersList);
                userId = result.userId;
                console.log("[Auth] Verified userId:", userId);
            } catch (err) {
                console.error("[Auth] Token verification failed:", err);
                return null;
            }
        }
        if (!userId) return null;
        // Fetch full user data from Whop
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["whopsdk"].users.retrieve(userId);
        const extendedUser = user;
        return {
            userId,
            name: user.name,
            username: user.username,
            email: extendedUser.email,
            profilePicUrl: user.profile_picture?.url || undefined
        };
    } catch  {
        return null;
    }
}
async function syncUserToDatabase(whopUser) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.upsert({
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
            sellerProfile: true
        }
    });
}
async function getAuthenticatedUser() {
    const whopUser = await getWhopUser();
    if (!whopUser) return null;
    const user = await syncUserToDatabase(whopUser);
    return {
        ...whopUser,
        user
    };
}
async function checkExperienceAccess(experienceId, userId) {
    // In development with dev user, bypass access check
    if (("TURBOPACK compile-time value", "development") === "development" && process.env.DEV_WHOP_USER_ID) {
        return true;
    }
    try {
        const access = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["whopsdk"].users.checkAccess(experienceId, {
            id: userId
        });
        return access.has_access;
    } catch  {
        return false;
    }
}
async function checkCompanyAdmin(companyId, userId) {
    try {
        const access = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["whopsdk"].users.checkAccess(companyId, {
            id: userId
        });
        return access.access_level === "admin";
    } catch  {
        return false;
    }
}
async function getOrCreateUser(whopUserId) {
    const existingUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
        where: {
            whopUserId
        },
        include: {
            sellerProfile: true
        }
    });
    if (existingUser) {
        return existingUser;
    }
    // Fetch user details from Whop
    const whopUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["whopsdk"].users.retrieve(whopUserId);
    const extendedUser = whopUser;
    const newUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.create({
        data: {
            whopUserId,
            email: extendedUser.email ?? null,
            name: whopUser.name,
            avatar: whopUser.profile_picture?.url ?? null
        },
        include: {
            sellerProfile: true
        }
    });
    return newUser;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/waliet/lib/utils.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_COMMUNITY_FEE_BPS",
    ()=>DEFAULT_COMMUNITY_FEE_BPS,
    "DEFAULT_PLATFORM_FEE_BPS",
    ()=>DEFAULT_PLATFORM_FEE_BPS,
    "MAX_TOTAL_FEE_BPS",
    ()=>MAX_TOTAL_FEE_BPS,
    "calculateCommunityFee",
    ()=>calculateCommunityFee,
    "calculateFeeFromBps",
    ()=>calculateFeeFromBps,
    "calculatePlatformFee",
    ()=>calculatePlatformFee,
    "centsToDollars",
    ()=>centsToDollars,
    "cn",
    ()=>cn,
    "debounce",
    ()=>debounce,
    "dollarsToCents",
    ()=>dollarsToCents,
    "formatBpsAsPercent",
    ()=>formatBpsAsPercent,
    "formatCents",
    ()=>formatCents,
    "formatDate",
    ()=>formatDate,
    "formatDateTime",
    ()=>formatDateTime,
    "formatRelativeTime",
    ()=>formatRelativeTime,
    "formatUnitsToHours",
    ()=>formatUnitsToHours,
    "getInitials",
    ()=>getInitials
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/clsx/dist/clsx.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-rsc] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
function debounce(func, wait) {
    let timeout = null;
    return (...args)=>{
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(()=>func(...args), wait);
    };
}
function formatCents(cents) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(cents / 100);
}
function dollarsToCents(dollars) {
    return Math.round(dollars * 100);
}
function centsToDollars(cents) {
    return cents / 100;
}
function formatUnitsToHours(units) {
    const hours = units / 2;
    if (hours === 1) return "1 hour";
    if (hours < 1) return `${units * 30} minutes`;
    return `${hours} hours`;
}
const DEFAULT_PLATFORM_FEE_BPS = 800; // 8%
const DEFAULT_COMMUNITY_FEE_BPS = 500; // 5%
const MAX_TOTAL_FEE_BPS = 9000; // 90% - max allowed combined fees
function calculateFeeFromBps(amount, bps) {
    return Math.round(amount * (bps / 10000));
}
function calculatePlatformFee(amount, bps = DEFAULT_PLATFORM_FEE_BPS) {
    return calculateFeeFromBps(amount, bps);
}
function calculateCommunityFee(amount, bps) {
    return calculateFeeFromBps(amount, bps);
}
function formatBpsAsPercent(bps) {
    return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}
function getInitials(name) {
    if (!name) return "?";
    return name.split(" ").map((n)=>n[0]).join("").toUpperCase().slice(0, 2);
}
function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(new Date(date));
}
function formatDateTime(date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(new Date(date));
}
function formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffSecs < 60) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
}
}),
"[project]/waliet/components/ui/card.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardContent",
    ()=>CardContent,
    "CardDescription",
    ()=>CardDescription,
    "CardFooter",
    ()=>CardFooter,
    "CardHeader",
    ()=>CardHeader,
    "CardTitle",
    ()=>CardTitle,
    "cardContentVariants",
    ()=>cardContentVariants,
    "cardFooterVariants",
    ()=>cardFooterVariants,
    "cardHeaderVariants",
    ()=>cardHeaderVariants,
    "cardVariants",
    ()=>cardVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/class-variance-authority/dist/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/utils.ts [app-rsc] (ecmascript)");
;
;
;
;
const cardVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cva"])("rounded-lg bg-card text-card-foreground transition-all duration-[var(--duration-normal)]", {
    variants: {
        variant: {
            default: "",
            bordered: "border border-border",
            ghost: "border-none bg-transparent",
            elevated: "border border-border/50 shadow-[var(--shadow-sm)]",
            outlined: "border-2 border-border bg-transparent",
            // New marketplace variants
            interactive: "border border-border hover:border-primary/50 hover:shadow-[var(--shadow-md)] cursor-pointer",
            stat: "border border-border p-0",
            featured: "border-2 border-primary/20 shadow-[var(--shadow-md)]",
            muted: "bg-muted/30 border border-border-subtle"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
const Card = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, variant, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])(cardVariants({
            variant,
            className
        })),
        ...props
    }, void 0, false, {
        fileName: "[project]/waliet/components/ui/card.tsx",
        lineNumber: 32,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
Card.displayName = "Card";
const cardHeaderVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cva"])("flex flex-col", {
    variants: {
        spacing: {
            none: "space-y-0",
            sm: "space-y-1",
            default: "space-y-1.5",
            lg: "space-y-2"
        },
        padding: {
            none: "p-0",
            sm: "p-3",
            default: "p-6",
            lg: "p-8"
        }
    },
    defaultVariants: {
        spacing: "default",
        padding: "default"
    }
});
const CardHeader = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, spacing, padding, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])(cardHeaderVariants({
            spacing,
            padding,
            className
        })),
        ...props
    }, void 0, false, {
        fileName: "[project]/waliet/components/ui/card.tsx",
        lineNumber: 68,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
CardHeader.displayName = "CardHeader";
const CardTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("text-2xl font-semibold leading-none tracking-tight", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/waliet/components/ui/card.tsx",
        lineNumber: 81,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
CardTitle.displayName = "CardTitle";
const CardDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("text-sm text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/waliet/components/ui/card.tsx",
        lineNumber: 96,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
CardDescription.displayName = "CardDescription";
const cardContentVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cva"])("", {
    variants: {
        padding: {
            none: "p-0",
            sm: "p-3 pt-0",
            default: "p-6 pt-0",
            lg: "p-8 pt-0"
        }
    },
    defaultVariants: {
        padding: "default"
    }
});
const CardContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, padding, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])(cardContentVariants({
            padding,
            className
        })),
        ...props
    }, void 0, false, {
        fileName: "[project]/waliet/components/ui/card.tsx",
        lineNumber: 124,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
CardContent.displayName = "CardContent";
const cardFooterVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cva"])("flex items-center", {
    variants: {
        padding: {
            none: "p-0",
            sm: "p-3 pt-0",
            default: "p-6 pt-0",
            lg: "p-8 pt-0"
        },
        justify: {
            start: "justify-start",
            center: "justify-center",
            end: "justify-end",
            between: "justify-between"
        }
    },
    defaultVariants: {
        padding: "default",
        justify: "start"
    }
});
const CardFooter = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, padding, justify, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])(cardFooterVariants({
            padding,
            justify,
            className
        })),
        ...props
    }, void 0, false, {
        fileName: "[project]/waliet/components/ui/card.tsx",
        lineNumber: 160,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
CardFooter.displayName = "CardFooter";
;
}),
"[project]/waliet/app/example/[experienceId]/layout.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "default",
    ()=>ExampleLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/dual-auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/components/ui/card.tsx [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
async function ExampleLayout({ children, params }) {
    const { experienceId } = await params;
    // Get authenticated user (handles token verification + profile sync)
    const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDualAuthUser"])();
    if (!auth) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-background flex items-center justify-center p-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Card"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "py-8 text-center",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-xl font-semibold text-foreground mb-2",
                            children: "Authentication Required"
                        }, void 0, false, {
                            fileName: "[project]/waliet/app/example/[experienceId]/layout.tsx",
                            lineNumber: 25,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-muted-foreground",
                            children: "Please access this page through your Whop community."
                        }, void 0, false, {
                            fileName: "[project]/waliet/app/example/[experienceId]/layout.tsx",
                            lineNumber: 28,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/waliet/app/example/[experienceId]/layout.tsx",
                    lineNumber: 24,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/waliet/app/example/[experienceId]/layout.tsx",
                lineNumber: 23,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/waliet/app/example/[experienceId]/layout.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this);
    }
    // Check access to this experience
    const hasAccess = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkExperienceAccess"])(experienceId, auth.user.providerId);
    if (!hasAccess) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-background flex items-center justify-center p-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Card"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "py-8 text-center",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-xl font-semibold text-foreground mb-2",
                            children: "Access Denied"
                        }, void 0, false, {
                            fileName: "[project]/waliet/app/example/[experienceId]/layout.tsx",
                            lineNumber: 45,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-muted-foreground",
                            children: "You don't have access to this experience."
                        }, void 0, false, {
                            fileName: "[project]/waliet/app/example/[experienceId]/layout.tsx",
                            lineNumber: 48,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/waliet/app/example/[experienceId]/layout.tsx",
                    lineNumber: 44,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/waliet/app/example/[experienceId]/layout.tsx",
                lineNumber: 43,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/waliet/app/example/[experienceId]/layout.tsx",
            lineNumber: 42,
            columnNumber: 7
        }, this);
    }
    // Simple layout without DashboardLayout - just render children
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
        children: children
    }, void 0, false);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=waliet_43f605dc._.js.map