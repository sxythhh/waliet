module.exports = [
"[project]/waliet/app/favicon.ico.mjs { IMAGE => \"[project]/waliet/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/waliet/app/favicon.ico.mjs { IMAGE => \"[project]/waliet/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/waliet/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/waliet/app/layout.tsx [app-rsc] (ecmascript)"));
}),
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
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://xalcertqfbvnerpzofxa.supabase.co"), ("TURBOPACK compile-time value", "sb_publishable_spNItwGDfqfHF4ohLDm1IA_LO1Lw12-"), {
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
async function tryWhopAuth() {
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
async function syncWhopUserToDatabase(whopUser) {
    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.upsert({
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
    // Create new user
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
"[project]/waliet/app/login/LoginForm.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LoginForm",
    ()=>LoginForm
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const LoginForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call LoginForm() from the server but LoginForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/waliet/app/login/LoginForm.tsx <module evaluation>", "LoginForm");
}),
"[project]/waliet/app/login/LoginForm.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LoginForm",
    ()=>LoginForm
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const LoginForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call LoginForm() from the server but LoginForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/waliet/app/login/LoginForm.tsx", "LoginForm");
}),
"[project]/waliet/app/login/LoginForm.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$app$2f$login$2f$LoginForm$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/waliet/app/login/LoginForm.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$app$2f$login$2f$LoginForm$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/waliet/app/login/LoginForm.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$app$2f$login$2f$LoginForm$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/waliet/app/login/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "default",
    ()=>LoginPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/dual-auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$app$2f$login$2f$LoginForm$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/app/login/LoginForm.tsx [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
async function LoginPage({ searchParams }) {
    const { error, next } = await searchParams;
    // If already authenticated, redirect to browse
    const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$dual$2d$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDualAuthUser"])();
    if (auth) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(next || "/browse");
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen flex",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex-1 flex items-center justify-center p-8 lg:p-12 bg-background",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$app$2f$login$2f$LoginForm$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LoginForm"], {
                error: error,
                redirectTo: next || "/browse"
            }, void 0, false, {
                fileName: "[project]/waliet/app/login/page.tsx",
                lineNumber: 22,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/waliet/app/login/page.tsx",
            lineNumber: 21,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/waliet/app/login/page.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/waliet/app/login/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/waliet/app/login/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__96259ca4._.js.map