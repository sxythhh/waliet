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
"[project]/waliet/lib/validations.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "acceptSessionSchema",
    ()=>acceptSessionSchema,
    "cancelSessionSchema",
    ()=>cancelSessionSchema,
    "createPurchaseSchema",
    ()=>createPurchaseSchema,
    "createRefundRequestSchema",
    ()=>createRefundRequestSchema,
    "createReviewSchema",
    ()=>createReviewSchema,
    "createSellerSchema",
    ()=>createSellerSchema,
    "createSessionSchema",
    ()=>createSessionSchema,
    "disputeSessionSchema",
    ()=>disputeSessionSchema,
    "endSessionSchema",
    ()=>endSessionSchema,
    "resolveDisputeSchema",
    ()=>resolveDisputeSchema,
    "sellerQuerySchema",
    ()=>sellerQuerySchema,
    "sessionQuerySchema",
    ()=>sessionQuerySchema,
    "updateCommunityConfigSchema",
    ()=>updateCommunityConfigSchema,
    "updateSellerRateSchema",
    ()=>updateSellerRateSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
;
const createSellerSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    hourlyRate: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1).max(10000),
    bio: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional(),
    tagline: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(100).optional(),
    timezone: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
});
const updateSellerRateSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    hourlyRate: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1).max(10000)
});
const sellerQuerySchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    experienceId: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    companyId: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    minRating: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().min(1).max(5).optional(),
    maxRate: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().optional(),
    cursor: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    limit: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().min(1).max(50).default(20),
    sort: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "rating",
        "sessions",
        "rate_asc",
        "rate_desc",
        "newest"
    ]).default("rating")
});
const createPurchaseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    sellerId: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    units: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(20),
    experienceId: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    companyId: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
});
const createSessionSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    sellerId: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    units: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(4),
    topic: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(20).max(500),
    proposedTimes: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()).min(1).max(5),
    timezone: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const acceptSessionSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    scheduledAt: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()
});
const endSessionSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    actualMinutes: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1)
});
const cancelSessionSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    reason: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional()
});
const sessionQuerySchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    role: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "buyer",
        "seller"
    ]).optional(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    cursor: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    limit: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().min(1).max(50).default(20)
});
const disputeSessionSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    reason: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(20).max(1000)
});
const resolveDisputeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    action: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "approve",
        "deny"
    ]),
    amountApproved: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).optional(),
    reviewNotes: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(1000).optional()
});
const createReviewSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    rating: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(5),
    text: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(1000).optional(),
    isAnonymous: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional()
});
const updateCommunityConfigSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    communityFeeBps: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).max(5000).optional(),
    minSellerRating: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1).max(5).optional().nullable(),
    requireApproval: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional()
});
const createRefundRequestSchema = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    purchaseId: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    sessionId: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    reason: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(10).max(1000),
    amountRequested: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1)
});
}),
"[project]/waliet/lib/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/whop-sdk.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/prisma.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
async function getWhopUser() {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
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
            const headersList = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])();
            const whopToken = headersList.get("x-whop-user-token");
            console.log("[Auth] Token present:", !!whopToken);
            if (!whopToken) {
                console.error("[Auth] No Whop token found in headers");
                return null;
            }
            try {
                const result = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].verifyUserToken(headersList);
                userId = result.userId;
                console.log("[Auth] Verified userId:", userId);
            } catch (err) {
                console.error("[Auth] Token verification failed:", err);
                return null;
            }
        }
        if (!userId) return null;
        // Fetch full user data from Whop
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].users.retrieve(userId);
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
    return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.upsert({
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
        const access = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].users.checkAccess(experienceId, {
            id: userId
        });
        return access.has_access;
    } catch  {
        return false;
    }
}
async function checkCompanyAdmin(companyId, userId) {
    try {
        const access = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].users.checkAccess(companyId, {
            id: userId
        });
        return access.access_level === "admin";
    } catch  {
        return false;
    }
}
async function getOrCreateUser(whopUserId) {
    const existingUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
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
    const whopUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].users.retrieve(whopUserId);
    const extendedUser = whopUser;
    const newUser = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.create({
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
"[project]/waliet/app/api/sellers/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/whop-sdk.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$validations$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/validations.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/lib/auth.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
async function GET(request) {
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].verifyUserToken(request.headers);
        const { searchParams } = new URL(request.url);
        const query = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$validations$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sellerQuerySchema"].parse(Object.fromEntries(searchParams));
        const orderBy = {
            rating: {
                averageRating: "desc"
            },
            sessions: {
                totalSessionsCompleted: "desc"
            },
            rate_asc: {
                hourlyRate: "asc"
            },
            rate_desc: {
                hourlyRate: "desc"
            },
            newest: {
                createdAt: "desc"
            }
        }[query.sort];
        const sellers = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.findMany({
            where: {
                isActive: true,
                ...query.minRating && {
                    averageRating: {
                        gte: query.minRating
                    }
                },
                ...query.maxRate && {
                    hourlyRate: {
                        lte: query.maxRate
                    }
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            },
            orderBy,
            take: query.limit + 1,
            ...query.cursor && {
                cursor: {
                    id: query.cursor
                },
                skip: 1
            }
        });
        const hasMore = sellers.length > query.limit;
        const results = hasMore ? sellers.slice(0, -1) : sellers;
        // Transform to match SellerData format
        const transformedSellers = results.map((seller)=>({
                id: seller.id,
                userId: seller.user.id,
                hourlyRate: seller.hourlyRate,
                bio: seller.bio,
                tagline: seller.tagline,
                averageRating: seller.averageRating,
                totalSessionsCompleted: seller.totalSessionsCompleted,
                isVerified: seller.isVerified,
                hasSellerProfile: true,
                user: seller.user
            }));
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            sellers: transformedSellers,
            nextCursor: hasMore ? results[results.length - 1].id : null
        });
    } catch (error) {
        console.error("Error fetching sellers:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Failed to fetch sellers"
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const { userId: whopUserId } = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$whop$2d$sdk$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["whopsdk"].verifyUserToken(request.headers);
        const body = await request.json();
        const { hourlyRate, bio, tagline, timezone } = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$validations$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createSellerSchema"].parse(body);
        // Get or create user
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getOrCreateUser"])(whopUserId);
        if (!user) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to get or create user"
            }, {
                status: 500
            });
        }
        // Check if already has seller profile
        const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.findUnique({
            where: {
                userId: user.id
            }
        });
        if (existing) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Seller profile already exists"
            }, {
                status: 400
            });
        }
        // Create seller profile
        const sellerProfile = await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].sellerProfile.create({
            data: {
                userId: user.id,
                hourlyRate: Math.round(hourlyRate * 100),
                bio,
                tagline,
                timezone: timezone || "America/New_York",
                rateHistory: {
                    create: {
                        previousRate: 0,
                        newRate: Math.round(hourlyRate * 100)
                    }
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            sellerProfile
        }, {
            status: 201
        });
    } catch (error) {
        console.error("Error creating seller profile:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Failed to create seller profile"
        }, {
            status: 500
        });
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7bd4856e._.js.map