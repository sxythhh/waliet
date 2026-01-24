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
"[project]/waliet/lib/utils.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/clsx/dist/clsx.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-route] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clsx"])(inputs));
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
"[project]/waliet/lib/commissions.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "getEffectiveCommissionRates",
    ()=>getEffectiveCommissionRates,
    "setCommunityCommissionRate",
    ()=>setCommunityCommissionRate,
    "setSellerCommissionRate",
    ()=>setSellerCommissionRate,
    "validateCommissionRates",
    ()=>validateCommissionRates
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/utils.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
async function getEffectiveCommissionRates(sellerId, companyId) {
    // Fetch seller profile and community config in parallel
    const [sellerProfile, communityConfig] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.findFirst({
            where: {
                userId: sellerId
            },
            select: {
                customPlatformFeeBps: true,
                customCommunityFeeBps: true
            }
        }),
        companyId ? __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].communityConfig.findUnique({
            where: {
                whopCompanyId: companyId
            },
            select: {
                customPlatformFeeBps: true,
                communityFeeBps: true
            }
        }) : null
    ]);
    // Determine platform fee (seller override > community override > default)
    let platformFeeBps = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_PLATFORM_FEE_BPS"];
    let platformSource = "default";
    if (sellerProfile?.customPlatformFeeBps !== null && sellerProfile?.customPlatformFeeBps !== undefined) {
        platformFeeBps = sellerProfile.customPlatformFeeBps;
        platformSource = "seller";
    } else if (communityConfig?.customPlatformFeeBps !== null && communityConfig?.customPlatformFeeBps !== undefined) {
        platformFeeBps = communityConfig.customPlatformFeeBps;
        platformSource = "community";
    }
    // Determine community fee (seller override > community config > default)
    let communityFeeBps = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_COMMUNITY_FEE_BPS"];
    let communitySource = "default";
    if (sellerProfile?.customCommunityFeeBps !== null && sellerProfile?.customCommunityFeeBps !== undefined) {
        communityFeeBps = sellerProfile.customCommunityFeeBps;
        communitySource = "seller";
    } else if (communityConfig?.communityFeeBps !== null && communityConfig?.communityFeeBps !== undefined) {
        communityFeeBps = communityConfig.communityFeeBps;
        communitySource = "community";
    }
    return {
        platformFeeBps,
        communityFeeBps,
        totalFeeBps: platformFeeBps + communityFeeBps,
        source: {
            platform: platformSource,
            community: communitySource
        }
    };
}
function validateCommissionRates(platformBps, communityBps) {
    if (platformBps < 0 || communityBps < 0) {
        return {
            valid: false,
            error: "Commission rates cannot be negative"
        };
    }
    if (platformBps > __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_TOTAL_FEE_BPS"]) {
        return {
            valid: false,
            error: `Platform fee cannot exceed ${__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_TOTAL_FEE_BPS"] / 100}%`
        };
    }
    if (communityBps > __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_TOTAL_FEE_BPS"]) {
        return {
            valid: false,
            error: `Community fee cannot exceed ${__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_TOTAL_FEE_BPS"] / 100}%`
        };
    }
    const total = platformBps + communityBps;
    if (total > __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_TOTAL_FEE_BPS"]) {
        return {
            valid: false,
            error: `Total fees (${total / 100}%) cannot exceed ${__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_TOTAL_FEE_BPS"] / 100}%`
        };
    }
    return {
        valid: true
    };
}
async function setSellerCommissionRate(sellerProfileId, feeType, newBps, changedBy, reason) {
    const sellerProfile = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.findUnique({
        where: {
            id: sellerProfileId
        },
        select: {
            customPlatformFeeBps: true,
            customCommunityFeeBps: true
        }
    });
    if (!sellerProfile) {
        throw new Error("Seller profile not found");
    }
    const previousBps = feeType === "platform" ? sellerProfile.customPlatformFeeBps : sellerProfile.customCommunityFeeBps;
    // Validate the new rate if setting (not clearing)
    if (newBps !== null) {
        const otherBps = feeType === "platform" ? sellerProfile.customCommunityFeeBps ?? __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_COMMUNITY_FEE_BPS"] : sellerProfile.customPlatformFeeBps ?? __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_PLATFORM_FEE_BPS"];
        const validation = validateCommissionRates(feeType === "platform" ? newBps : otherBps, feeType === "community" ? newBps : otherBps);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].$transaction([
        // Update the seller profile
        __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.update({
            where: {
                id: sellerProfileId
            },
            data: {
                ...feeType === "platform" ? {
                    customPlatformFeeBps: newBps
                } : {
                    customCommunityFeeBps: newBps
                },
                commissionUpdatedAt: new Date(),
                commissionUpdatedBy: changedBy
            }
        }),
        // Create audit log
        __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].commissionChange.create({
            data: {
                sellerProfileId,
                feeType,
                previousBps,
                newBps,
                reason,
                changedBy
            }
        })
    ]);
}
async function setCommunityCommissionRate(communityConfigId, feeType, newBps, changedBy, reason) {
    const communityConfig = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].communityConfig.findUnique({
        where: {
            id: communityConfigId
        },
        select: {
            customPlatformFeeBps: true,
            communityFeeBps: true
        }
    });
    if (!communityConfig) {
        throw new Error("Community config not found");
    }
    const previousBps = feeType === "platform" ? communityConfig.customPlatformFeeBps : communityConfig.communityFeeBps;
    // Validate the new rate
    if (newBps !== null) {
        const otherBps = feeType === "platform" ? communityConfig.communityFeeBps : communityConfig.customPlatformFeeBps ?? __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_PLATFORM_FEE_BPS"];
        const validation = validateCommissionRates(feeType === "platform" ? newBps : otherBps, feeType === "community" ? newBps : otherBps);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].$transaction([
        // Update the community config
        __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].communityConfig.update({
            where: {
                id: communityConfigId
            },
            data: feeType === "platform" ? {
                customPlatformFeeBps: newBps
            } : {
                communityFeeBps: newBps ?? __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_COMMUNITY_FEE_BPS"]
            }
        }),
        // Create audit log
        __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].commissionChange.create({
            data: {
                communityConfigId,
                feeType,
                previousBps,
                newBps,
                reason,
                changedBy
            }
        })
    ]);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/waliet/app/api/sellers/commissions/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/whop-sdk.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$commissions$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/commissions.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/utils.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$commissions$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$commissions$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
async function GET(request) {
    try {
        const { userId: whopUserId } = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].verifyUserToken(request.headers);
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
            where: {
                whopUserId
            },
            include: {
                sellerProfile: true
            }
        });
        if (!user) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "User not found"
            }, {
                status: 404
            });
        }
        if (!user.sellerProfile) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Seller profile not found"
            }, {
                status: 404
            });
        }
        // Get community context from query params (optional)
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get("companyId");
        // Get effective rates
        const rates = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$commissions$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getEffectiveCommissionRates"])(user.id, companyId);
        // Calculate net percentage the seller receives
        const netPercentage = 100 - (rates.platformFeeBps + rates.communityFeeBps) / 100;
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            platformFeeBps: rates.platformFeeBps,
            communityFeeBps: rates.communityFeeBps,
            totalFeeBps: rates.totalFeeBps,
            netPercentage,
            source: rates.source,
            defaults: {
                platformFeeBps: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_PLATFORM_FEE_BPS"],
                communityFeeBps: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_COMMUNITY_FEE_BPS"]
            },
            hasCustomRate: rates.source.platform !== "default" || rates.source.community !== "default"
        });
    } catch (error) {
        console.error("Error fetching commission rates:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Failed to fetch commission rates"
        }, {
            status: 500
        });
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8734ba0d._.js.map