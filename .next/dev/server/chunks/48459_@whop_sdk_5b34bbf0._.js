module.exports = [
"[project]/waliet/node_modules/@whop/sdk/internal/tslib.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__classPrivateFieldGet",
    ()=>__classPrivateFieldGet,
    "__classPrivateFieldSet",
    ()=>__classPrivateFieldSet
]);
function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
;
}),
"[project]/waliet/node_modules/@whop/sdk/internal/utils/uuid.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
/**
 * https://stackoverflow.com/a/2117523
 */ __turbopack_context__.s([
    "uuid4",
    ()=>uuid4
]);
let uuid4 = function() {
    const { crypto } = globalThis;
    if (crypto?.randomUUID) {
        uuid4 = crypto.randomUUID.bind(crypto);
        return crypto.randomUUID();
    }
    const u8 = new Uint8Array(1);
    const randomByte = crypto ? ()=>crypto.getRandomValues(u8)[0] : ()=>Math.random() * 0xff & 0xff;
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c)=>(+c ^ randomByte() & 15 >> +c / 4).toString(16));
}; //# sourceMappingURL=uuid.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/errors.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
__turbopack_context__.s([
    "castToError",
    ()=>castToError,
    "isAbortError",
    ()=>isAbortError
]);
function isAbortError(err) {
    return typeof err === 'object' && err !== null && // Spec-compliant fetch implementations
    ('name' in err && err.name === 'AbortError' || 'message' in err && String(err.message).includes('FetchRequestCanceledException'));
}
const castToError = (err)=>{
    if (err instanceof Error) return err;
    if (typeof err === 'object' && err !== null) {
        try {
            if (Object.prototype.toString.call(err) === '[object Error]') {
                // @ts-ignore - not all envs have native support for cause yet
                const error = new Error(err.message, err.cause ? {
                    cause: err.cause
                } : {});
                if (err.stack) error.stack = err.stack;
                // @ts-ignore - not all envs have native support for cause yet
                if (err.cause && !error.cause) error.cause = err.cause;
                if (err.name) error.name = err.name;
                return error;
            }
        } catch  {}
        try {
            return new Error(JSON.stringify(err));
        } catch  {}
    }
    return new Error(err);
}; //# sourceMappingURL=errors.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/core/error.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "APIConnectionError",
    ()=>APIConnectionError,
    "APIConnectionTimeoutError",
    ()=>APIConnectionTimeoutError,
    "APIError",
    ()=>APIError,
    "APIUserAbortError",
    ()=>APIUserAbortError,
    "AuthenticationError",
    ()=>AuthenticationError,
    "BadRequestError",
    ()=>BadRequestError,
    "ConflictError",
    ()=>ConflictError,
    "InternalServerError",
    ()=>InternalServerError,
    "NotFoundError",
    ()=>NotFoundError,
    "PermissionDeniedError",
    ()=>PermissionDeniedError,
    "RateLimitError",
    ()=>RateLimitError,
    "UnprocessableEntityError",
    ()=>UnprocessableEntityError,
    "WhopError",
    ()=>WhopError
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$errors$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/errors.mjs [app-route] (ecmascript)");
;
class WhopError extends Error {
}
class APIError extends WhopError {
    constructor(status, error, message, headers){
        super(`${APIError.makeMessage(status, error, message)}`);
        this.status = status;
        this.headers = headers;
        this.error = error;
    }
    static makeMessage(status, error, message) {
        const msg = error?.message ? typeof error.message === 'string' ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
        if (status && msg) {
            return `${status} ${msg}`;
        }
        if (status) {
            return `${status} status code (no body)`;
        }
        if (msg) {
            return msg;
        }
        return '(no status code or body)';
    }
    static generate(status, errorResponse, message, headers) {
        if (!status || !headers) {
            return new APIConnectionError({
                message,
                cause: (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$errors$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["castToError"])(errorResponse)
            });
        }
        const error = errorResponse;
        if (status === 400) {
            return new BadRequestError(status, error, message, headers);
        }
        if (status === 401) {
            return new AuthenticationError(status, error, message, headers);
        }
        if (status === 403) {
            return new PermissionDeniedError(status, error, message, headers);
        }
        if (status === 404) {
            return new NotFoundError(status, error, message, headers);
        }
        if (status === 409) {
            return new ConflictError(status, error, message, headers);
        }
        if (status === 422) {
            return new UnprocessableEntityError(status, error, message, headers);
        }
        if (status === 429) {
            return new RateLimitError(status, error, message, headers);
        }
        if (status >= 500) {
            return new InternalServerError(status, error, message, headers);
        }
        return new APIError(status, error, message, headers);
    }
}
class APIUserAbortError extends APIError {
    constructor({ message } = {}){
        super(undefined, undefined, message || 'Request was aborted.', undefined);
    }
}
class APIConnectionError extends APIError {
    constructor({ message, cause }){
        super(undefined, undefined, message || 'Connection error.', undefined);
        // in some environments the 'cause' property is already declared
        // @ts-ignore
        if (cause) this.cause = cause;
    }
}
class APIConnectionTimeoutError extends APIConnectionError {
    constructor({ message } = {}){
        super({
            message: message ?? 'Request timed out.'
        });
    }
}
class BadRequestError extends APIError {
}
class AuthenticationError extends APIError {
}
class PermissionDeniedError extends APIError {
}
class NotFoundError extends APIError {
}
class ConflictError extends APIError {
}
class UnprocessableEntityError extends APIError {
}
class RateLimitError extends APIError {
}
class InternalServerError extends APIError {
} //# sourceMappingURL=error.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/utils/values.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "coerceBoolean",
    ()=>coerceBoolean,
    "coerceFloat",
    ()=>coerceFloat,
    "coerceInteger",
    ()=>coerceInteger,
    "ensurePresent",
    ()=>ensurePresent,
    "hasOwn",
    ()=>hasOwn,
    "isAbsoluteURL",
    ()=>isAbsoluteURL,
    "isArray",
    ()=>isArray,
    "isEmptyObj",
    ()=>isEmptyObj,
    "isObj",
    ()=>isObj,
    "isReadonlyArray",
    ()=>isReadonlyArray,
    "maybeCoerceBoolean",
    ()=>maybeCoerceBoolean,
    "maybeCoerceFloat",
    ()=>maybeCoerceFloat,
    "maybeCoerceInteger",
    ()=>maybeCoerceInteger,
    "maybeObj",
    ()=>maybeObj,
    "safeJSON",
    ()=>safeJSON,
    "validatePositiveInteger",
    ()=>validatePositiveInteger
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/error.mjs [app-route] (ecmascript)");
;
// https://url.spec.whatwg.org/#url-scheme-string
const startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
const isAbsoluteURL = (url)=>{
    return startsWithSchemeRegexp.test(url);
};
let isArray = (val)=>(isArray = Array.isArray, isArray(val));
let isReadonlyArray = isArray;
function maybeObj(x) {
    if (typeof x !== 'object') {
        return {};
    }
    return x ?? {};
}
function isEmptyObj(obj) {
    if (!obj) return true;
    for(const _k in obj)return false;
    return true;
}
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
function isObj(obj) {
    return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}
const ensurePresent = (value)=>{
    if (value == null) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WhopError"](`Expected a value to be given but received ${value} instead.`);
    }
    return value;
};
const validatePositiveInteger = (name, n)=>{
    if (typeof n !== 'number' || !Number.isInteger(n)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WhopError"](`${name} must be an integer`);
    }
    if (n < 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WhopError"](`${name} must be a positive integer`);
    }
    return n;
};
const coerceInteger = (value)=>{
    if (typeof value === 'number') return Math.round(value);
    if (typeof value === 'string') return parseInt(value, 10);
    throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WhopError"](`Could not coerce ${value} (type: ${typeof value}) into a number`);
};
const coerceFloat = (value)=>{
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value);
    throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WhopError"](`Could not coerce ${value} (type: ${typeof value}) into a number`);
};
const coerceBoolean = (value)=>{
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return Boolean(value);
};
const maybeCoerceInteger = (value)=>{
    if (value == null) {
        return undefined;
    }
    return coerceInteger(value);
};
const maybeCoerceFloat = (value)=>{
    if (value == null) {
        return undefined;
    }
    return coerceFloat(value);
};
const maybeCoerceBoolean = (value)=>{
    if (value == null) {
        return undefined;
    }
    return coerceBoolean(value);
};
const safeJSON = (text)=>{
    try {
        return JSON.parse(text);
    } catch (err) {
        return undefined;
    }
}; //# sourceMappingURL=values.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/utils/sleep.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
__turbopack_context__.s([
    "sleep",
    ()=>sleep
]);
const sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms)); //# sourceMappingURL=sleep.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/version.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "VERSION",
    ()=>VERSION
]);
const VERSION = '0.0.23'; // x-release-please-version
 //# sourceMappingURL=version.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/detect-platform.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getPlatformHeaders",
    ()=>getPlatformHeaders,
    "isRunningInBrowser",
    ()=>isRunningInBrowser
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$version$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/version.mjs [app-route] (ecmascript)");
;
const isRunningInBrowser = ()=>{
    return(// @ts-ignore
    ("TURBOPACK compile-time value", "undefined") !== 'undefined' && // @ts-ignore
    typeof window.document !== 'undefined' && // @ts-ignore
    typeof navigator !== 'undefined');
};
/**
 * Note this does not detect 'browser'; for that, use getBrowserInfo().
 */ function getDetectedPlatform() {
    if (typeof Deno !== 'undefined' && Deno.build != null) {
        return 'deno';
    }
    if (typeof EdgeRuntime !== 'undefined') {
        return 'edge';
    }
    if (Object.prototype.toString.call(typeof globalThis.process !== 'undefined' ? globalThis.process : 0) === '[object process]') {
        return 'node';
    }
    return 'unknown';
}
const getPlatformProperties = ()=>{
    const detectedPlatform = getDetectedPlatform();
    if (detectedPlatform === 'deno') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$version$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VERSION"],
            'X-Stainless-OS': normalizePlatform(Deno.build.os),
            'X-Stainless-Arch': normalizeArch(Deno.build.arch),
            'X-Stainless-Runtime': 'deno',
            'X-Stainless-Runtime-Version': typeof Deno.version === 'string' ? Deno.version : Deno.version?.deno ?? 'unknown'
        };
    }
    if (typeof EdgeRuntime !== 'undefined') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$version$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VERSION"],
            'X-Stainless-OS': 'Unknown',
            'X-Stainless-Arch': `other:${EdgeRuntime}`,
            'X-Stainless-Runtime': 'edge',
            'X-Stainless-Runtime-Version': globalThis.process.version
        };
    }
    // Check if Node.js
    if (detectedPlatform === 'node') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$version$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VERSION"],
            'X-Stainless-OS': normalizePlatform(globalThis.process.platform ?? 'unknown'),
            'X-Stainless-Arch': normalizeArch(globalThis.process.arch ?? 'unknown'),
            'X-Stainless-Runtime': 'node',
            'X-Stainless-Runtime-Version': globalThis.process.version ?? 'unknown'
        };
    }
    const browserInfo = getBrowserInfo();
    if (browserInfo) {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$version$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VERSION"],
            'X-Stainless-OS': 'Unknown',
            'X-Stainless-Arch': 'unknown',
            'X-Stainless-Runtime': `browser:${browserInfo.browser}`,
            'X-Stainless-Runtime-Version': browserInfo.version
        };
    }
    // TODO add support for Cloudflare workers, etc.
    return {
        'X-Stainless-Lang': 'js',
        'X-Stainless-Package-Version': __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$version$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VERSION"],
        'X-Stainless-OS': 'Unknown',
        'X-Stainless-Arch': 'unknown',
        'X-Stainless-Runtime': 'unknown',
        'X-Stainless-Runtime-Version': 'unknown'
    };
};
// Note: modified from https://github.com/JS-DevTools/host-environment/blob/b1ab79ecde37db5d6e163c050e54fe7d287d7c92/src/isomorphic.browser.ts
function getBrowserInfo() {
    if (typeof navigator === 'undefined' || !navigator) {
        return null;
    }
    // NOTE: The order matters here!
    const browserPatterns = [
        {
            key: 'edge',
            pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
        },
        {
            key: 'ie',
            pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
        },
        {
            key: 'ie',
            pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/
        },
        {
            key: 'chrome',
            pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
        },
        {
            key: 'firefox',
            pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
        },
        {
            key: 'safari',
            pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/
        }
    ];
    // Find the FIRST matching browser
    for (const { key, pattern } of browserPatterns){
        const match = pattern.exec(navigator.userAgent);
        if (match) {
            const major = match[1] || 0;
            const minor = match[2] || 0;
            const patch = match[3] || 0;
            return {
                browser: key,
                version: `${major}.${minor}.${patch}`
            };
        }
    }
    return null;
}
const normalizeArch = (arch)=>{
    // Node docs:
    // - https://nodejs.org/api/process.html#processarch
    // Deno docs:
    // - https://doc.deno.land/deno/stable/~/Deno.build
    if (arch === 'x32') return 'x32';
    if (arch === 'x86_64' || arch === 'x64') return 'x64';
    if (arch === 'arm') return 'arm';
    if (arch === 'aarch64' || arch === 'arm64') return 'arm64';
    if (arch) return `other:${arch}`;
    return 'unknown';
};
const normalizePlatform = (platform)=>{
    // Node platforms:
    // - https://nodejs.org/api/process.html#processplatform
    // Deno platforms:
    // - https://doc.deno.land/deno/stable/~/Deno.build
    // - https://github.com/denoland/deno/issues/14799
    platform = platform.toLowerCase();
    // NOTE: this iOS check is untested and may not work
    // Node does not work natively on IOS, there is a fork at
    // https://github.com/nodejs-mobile/nodejs-mobile
    // however it is unknown at the time of writing how to detect if it is running
    if (platform.includes('ios')) return 'iOS';
    if (platform === 'android') return 'Android';
    if (platform === 'darwin') return 'MacOS';
    if (platform === 'win32') return 'Windows';
    if (platform === 'freebsd') return 'FreeBSD';
    if (platform === 'openbsd') return 'OpenBSD';
    if (platform === 'linux') return 'Linux';
    if (platform) return `Other:${platform}`;
    return 'Unknown';
};
let _platformHeaders;
const getPlatformHeaders = ()=>{
    return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
}; //# sourceMappingURL=detect-platform.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/shims.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
__turbopack_context__.s([
    "CancelReadableStream",
    ()=>CancelReadableStream,
    "ReadableStreamFrom",
    ()=>ReadableStreamFrom,
    "ReadableStreamToAsyncIterable",
    ()=>ReadableStreamToAsyncIterable,
    "getDefaultFetch",
    ()=>getDefaultFetch,
    "makeReadableStream",
    ()=>makeReadableStream
]);
function getDefaultFetch() {
    if (typeof fetch !== 'undefined') {
        return fetch;
    }
    throw new Error('`fetch` is not defined as a global; Either pass `fetch` to the client, `new Whop({ fetch })` or polyfill the global, `globalThis.fetch = fetch`');
}
function makeReadableStream(...args) {
    const ReadableStream = globalThis.ReadableStream;
    if (typeof ReadableStream === 'undefined') {
        // Note: All of the platforms / runtimes we officially support already define
        // `ReadableStream` as a global, so this should only ever be hit on unsupported runtimes.
        throw new Error('`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`');
    }
    return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
    let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
    return makeReadableStream({
        start () {},
        async pull (controller) {
            const { done, value } = await iter.next();
            if (done) {
                controller.close();
            } else {
                controller.enqueue(value);
            }
        },
        async cancel () {
            await iter.return?.();
        }
    });
}
function ReadableStreamToAsyncIterable(stream) {
    if (stream[Symbol.asyncIterator]) return stream;
    const reader = stream.getReader();
    return {
        async next () {
            try {
                const result = await reader.read();
                if (result?.done) reader.releaseLock(); // release lock when stream becomes closed
                return result;
            } catch (e) {
                reader.releaseLock(); // release lock when stream becomes errored
                throw e;
            }
        },
        async return () {
            const cancelPromise = reader.cancel();
            reader.releaseLock();
            await cancelPromise;
            return {
                done: true,
                value: undefined
            };
        },
        [Symbol.asyncIterator] () {
            return this;
        }
    };
}
async function CancelReadableStream(stream) {
    if (stream === null || typeof stream !== 'object') return;
    if (stream[Symbol.asyncIterator]) {
        await stream[Symbol.asyncIterator]().return?.();
        return;
    }
    const reader = stream.getReader();
    const cancelPromise = reader.cancel();
    reader.releaseLock();
    await cancelPromise;
} //# sourceMappingURL=shims.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/request-options.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
__turbopack_context__.s([
    "FallbackEncoder",
    ()=>FallbackEncoder
]);
const FallbackEncoder = ({ headers, body })=>{
    return {
        bodyHeaders: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}; //# sourceMappingURL=request-options.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/qs/formats.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RFC1738",
    ()=>RFC1738,
    "RFC3986",
    ()=>RFC3986,
    "default_format",
    ()=>default_format,
    "default_formatter",
    ()=>default_formatter,
    "formatters",
    ()=>formatters
]);
const default_format = 'RFC3986';
const default_formatter = (v)=>String(v);
const formatters = {
    RFC1738: (v)=>String(v).replace(/%20/g, '+'),
    RFC3986: default_formatter
};
const RFC1738 = 'RFC1738';
const RFC3986 = 'RFC3986'; //# sourceMappingURL=formats.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/qs/utils.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "assign_single_source",
    ()=>assign_single_source,
    "combine",
    ()=>combine,
    "compact",
    ()=>compact,
    "decode",
    ()=>decode,
    "encode",
    ()=>encode,
    "has",
    ()=>has,
    "is_buffer",
    ()=>is_buffer,
    "is_regexp",
    ()=>is_regexp,
    "maybe_map",
    ()=>maybe_map,
    "merge",
    ()=>merge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/qs/formats.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/values.mjs [app-route] (ecmascript)");
;
;
let has = (obj, key)=>(has = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty), has(obj, key));
const hex_table = /* @__PURE__ */ (()=>{
    const array = [];
    for(let i = 0; i < 256; ++i){
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }
    return array;
})();
function compact_queue(queue) {
    while(queue.length > 1){
        const item = queue.pop();
        if (!item) continue;
        const obj = item.obj[item.prop];
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(obj)) {
            const compacted = [];
            for(let j = 0; j < obj.length; ++j){
                if (typeof obj[j] !== 'undefined') {
                    compacted.push(obj[j]);
                }
            }
            // @ts-ignore
            item.obj[item.prop] = compacted;
        }
    }
}
function array_to_object(source, options) {
    const obj = options && options.plainObjects ? Object.create(null) : {};
    for(let i = 0; i < source.length; ++i){
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }
    return obj;
}
function merge(target, source, options = {}) {
    if (!source) {
        return target;
    }
    if (typeof source !== 'object') {
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(target)) {
            target.push(source);
        } else if (target && typeof target === 'object') {
            if (options && (options.plainObjects || options.allowPrototypes) || !has(Object.prototype, source)) {
                target[source] = true;
            }
        } else {
            return [
                target,
                source
            ];
        }
        return target;
    }
    if (!target || typeof target !== 'object') {
        return [
            target
        ].concat(source);
    }
    let mergeTarget = target;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(target) && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(source)) {
        // @ts-ignore
        mergeTarget = array_to_object(target, options);
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(target) && (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(source)) {
        source.forEach(function(item, i) {
            if (has(target, i)) {
                const targetItem = target[i];
                if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
                    target[i] = merge(targetItem, item, options);
                } else {
                    target.push(item);
                }
            } else {
                target[i] = item;
            }
        });
        return target;
    }
    return Object.keys(source).reduce(function(acc, key) {
        const value = source[key];
        if (has(acc, key)) {
            acc[key] = merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
}
function assign_single_source(target, source) {
    return Object.keys(source).reduce(function(acc, key) {
        acc[key] = source[key];
        return acc;
    }, target);
}
function decode(str, _, charset) {
    const strWithoutPlus = str.replace(/\+/g, ' ');
    if (charset === 'iso-8859-1') {
        // unescape never throws, no try...catch needed:
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
    }
    // utf-8
    try {
        return decodeURIComponent(strWithoutPlus);
    } catch (e) {
        return strWithoutPlus;
    }
}
const limit = 1024;
const encode = (str, _defaultEncoder, charset, _kind, format)=>{
    // This code was originally written by Brian White for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }
    let string = str;
    if (typeof str === 'symbol') {
        string = Symbol.prototype.toString.call(str);
    } else if (typeof str !== 'string') {
        string = String(str);
    }
    if (charset === 'iso-8859-1') {
        return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
            return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
        });
    }
    let out = '';
    for(let j = 0; j < string.length; j += limit){
        const segment = string.length >= limit ? string.slice(j, j + limit) : string;
        const arr = [];
        for(let i = 0; i < segment.length; ++i){
            let c = segment.charCodeAt(i);
            if (c === 0x2d || // -
            c === 0x2e || // .
            c === 0x5f || // _
            c === 0x7e || c >= 0x30 && c <= 0x39 || c >= 0x41 && c <= 0x5a || c >= 0x61 && c <= 0x7a || format === __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RFC1738"] && (c === 0x28 || c === 0x29) // ( )
            ) {
                arr[arr.length] = segment.charAt(i);
                continue;
            }
            if (c < 0x80) {
                arr[arr.length] = hex_table[c];
                continue;
            }
            if (c < 0x800) {
                arr[arr.length] = hex_table[0xc0 | c >> 6] + hex_table[0x80 | c & 0x3f];
                continue;
            }
            if (c < 0xd800 || c >= 0xe000) {
                arr[arr.length] = hex_table[0xe0 | c >> 12] + hex_table[0x80 | c >> 6 & 0x3f] + hex_table[0x80 | c & 0x3f];
                continue;
            }
            i += 1;
            c = 0x10000 + ((c & 0x3ff) << 10 | segment.charCodeAt(i) & 0x3ff);
            arr[arr.length] = hex_table[0xf0 | c >> 18] + hex_table[0x80 | c >> 12 & 0x3f] + hex_table[0x80 | c >> 6 & 0x3f] + hex_table[0x80 | c & 0x3f];
        }
        out += arr.join('');
    }
    return out;
};
function compact(value) {
    const queue = [
        {
            obj: {
                o: value
            },
            prop: 'o'
        }
    ];
    const refs = [];
    for(let i = 0; i < queue.length; ++i){
        const item = queue[i];
        // @ts-ignore
        const obj = item.obj[item.prop];
        const keys = Object.keys(obj);
        for(let j = 0; j < keys.length; ++j){
            const key = keys[j];
            const val = obj[key];
            if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                queue.push({
                    obj: obj,
                    prop: key
                });
                refs.push(val);
            }
        }
    }
    compact_queue(queue);
    return value;
}
function is_regexp(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
}
function is_buffer(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
function combine(a, b) {
    return [].concat(a, b);
}
function maybe_map(val, fn) {
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(val)) {
        const mapped = [];
        for(let i = 0; i < val.length; i += 1){
            mapped.push(fn(val[i]));
        }
        return mapped;
    }
    return fn(val);
} //# sourceMappingURL=utils.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/qs/stringify.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "stringify",
    ()=>stringify
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$utils$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/qs/utils.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/qs/formats.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/values.mjs [app-route] (ecmascript)");
;
;
;
const array_prefix_generators = {
    brackets (prefix) {
        return String(prefix) + '[]';
    },
    comma: 'comma',
    indices (prefix, key) {
        return String(prefix) + '[' + key + ']';
    },
    repeat (prefix) {
        return String(prefix);
    }
};
const push_to_array = function(arr, value_or_array) {
    Array.prototype.push.apply(arr, (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(value_or_array) ? value_or_array : [
        value_or_array
    ]);
};
let toISOString;
const defaults = {
    addQueryPrefix: false,
    allowDots: false,
    allowEmptyArrays: false,
    arrayFormat: 'indices',
    charset: 'utf-8',
    charsetSentinel: false,
    delimiter: '&',
    encode: true,
    encodeDotInKeys: false,
    encoder: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$utils$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["encode"],
    encodeValuesOnly: false,
    format: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default_format"],
    formatter: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default_formatter"],
    /** @deprecated */ indices: false,
    serializeDate (date) {
        return (toISOString ?? (toISOString = Function.prototype.call.bind(Date.prototype.toISOString)))(date);
    },
    skipNulls: false,
    strictNullHandling: false
};
function is_non_nullish_primitive(v) {
    return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'symbol' || typeof v === 'bigint';
}
const sentinel = {};
function inner_stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
    let obj = object;
    let tmp_sc = sideChannel;
    let step = 0;
    let find_flag = false;
    while((tmp_sc = tmp_sc.get(sentinel)) !== void undefined && !find_flag){
        // Where object last appeared in the ref tree
        const pos = tmp_sc.get(object);
        step += 1;
        if (typeof pos !== 'undefined') {
            if (pos === step) {
                throw new RangeError('Cyclic object value');
            } else {
                find_flag = true; // Break while
            }
        }
        if (typeof tmp_sc.get(sentinel) === 'undefined') {
            step = 0;
        }
    }
    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = serializeDate?.(obj);
    } else if (generateArrayPrefix === 'comma' && (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(obj)) {
        obj = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$utils$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["maybe_map"])(obj, function(value) {
            if (value instanceof Date) {
                return serializeDate?.(value);
            }
            return value;
        });
    }
    if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ? // @ts-expect-error
            encoder(prefix, defaults.encoder, charset, 'key', format) : prefix;
        }
        obj = '';
    }
    if (is_non_nullish_primitive(obj) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$utils$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["is_buffer"])(obj)) {
        if (encoder) {
            const key_value = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, 'key', format);
            return [
                formatter?.(key_value) + '=' + // @ts-expect-error
                formatter?.(encoder(obj, defaults.encoder, charset, 'value', format))
            ];
        }
        return [
            formatter?.(prefix) + '=' + formatter?.(String(obj))
        ];
    }
    const values = [];
    if (typeof obj === 'undefined') {
        return values;
    }
    let obj_keys;
    if (generateArrayPrefix === 'comma' && (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(obj)) {
        // we need to join elements in
        if (encodeValuesOnly && encoder) {
            // @ts-expect-error values only
            obj = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$utils$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["maybe_map"])(obj, encoder);
        }
        obj_keys = [
            {
                value: obj.length > 0 ? obj.join(',') || null : void undefined
            }
        ];
    } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(filter)) {
        obj_keys = filter;
    } else {
        const keys = Object.keys(obj);
        obj_keys = sort ? keys.sort(sort) : keys;
    }
    const encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, '%2E') : String(prefix);
    const adjusted_prefix = commaRoundTrip && (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(obj) && obj.length === 1 ? encoded_prefix + '[]' : encoded_prefix;
    if (allowEmptyArrays && (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(obj) && obj.length === 0) {
        return adjusted_prefix + '[]';
    }
    for(let j = 0; j < obj_keys.length; ++j){
        const key = obj_keys[j];
        const value = // @ts-ignore
        typeof key === 'object' && typeof key.value !== 'undefined' ? key.value : obj[key];
        if (skipNulls && value === null) {
            continue;
        }
        // @ts-ignore
        const encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, '%2E') : key;
        const key_prefix = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(obj) ? typeof generateArrayPrefix === 'function' ? generateArrayPrefix(adjusted_prefix, encoded_key) : adjusted_prefix : adjusted_prefix + (allowDots ? '.' + encoded_key : '[' + encoded_key + ']');
        sideChannel.set(object, step);
        const valueSideChannel = new WeakMap();
        valueSideChannel.set(sentinel, sideChannel);
        push_to_array(values, inner_stringify(value, key_prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, // @ts-ignore
        generateArrayPrefix === 'comma' && encodeValuesOnly && (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(obj) ? null : encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, valueSideChannel));
    }
    return values;
}
function normalize_stringify_options(opts = defaults) {
    if (typeof opts.allowEmptyArrays !== 'undefined' && typeof opts.allowEmptyArrays !== 'boolean') {
        throw new TypeError('`allowEmptyArrays` option can only be `true` or `false`, when provided');
    }
    if (typeof opts.encodeDotInKeys !== 'undefined' && typeof opts.encodeDotInKeys !== 'boolean') {
        throw new TypeError('`encodeDotInKeys` option can only be `true` or `false`, when provided');
    }
    if (opts.encoder !== null && typeof opts.encoder !== 'undefined' && typeof opts.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }
    const charset = opts.charset || defaults.charset;
    if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
        throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
    }
    let format = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default_format"];
    if (typeof opts.format !== 'undefined') {
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$utils$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["has"])(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatters"], opts.format)) {
            throw new TypeError('Unknown format option provided.');
        }
        format = opts.format;
    }
    const formatter = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatters"][format];
    let filter = defaults.filter;
    if (typeof opts.filter === 'function' || (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(opts.filter)) {
        filter = opts.filter;
    }
    let arrayFormat;
    if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators) {
        arrayFormat = opts.arrayFormat;
    } else if ('indices' in opts) {
        arrayFormat = opts.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = defaults.arrayFormat;
    }
    if ('commaRoundTrip' in opts && typeof opts.commaRoundTrip !== 'boolean') {
        throw new TypeError('`commaRoundTrip` must be a boolean, or absent');
    }
    const allowDots = typeof opts.allowDots === 'undefined' ? !!opts.encodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;
    return {
        addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
        // @ts-ignore
        allowDots: allowDots,
        allowEmptyArrays: typeof opts.allowEmptyArrays === 'boolean' ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
        arrayFormat: arrayFormat,
        charset: charset,
        charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
        commaRoundTrip: !!opts.commaRoundTrip,
        delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
        encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
        encodeDotInKeys: typeof opts.encodeDotInKeys === 'boolean' ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
        encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
        encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
        filter: filter,
        format: format,
        formatter: formatter,
        serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
        skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
        // @ts-ignore
        sort: typeof opts.sort === 'function' ? opts.sort : null,
        strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
    };
}
function stringify(object, opts = {}) {
    let obj = object;
    const options = normalize_stringify_options(opts);
    let obj_keys;
    let filter;
    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isArray"])(options.filter)) {
        filter = options.filter;
        obj_keys = filter;
    }
    const keys = [];
    if (typeof obj !== 'object' || obj === null) {
        return '';
    }
    const generateArrayPrefix = array_prefix_generators[options.arrayFormat];
    const commaRoundTrip = generateArrayPrefix === 'comma' && options.commaRoundTrip;
    if (!obj_keys) {
        obj_keys = Object.keys(obj);
    }
    if (options.sort) {
        obj_keys.sort(options.sort);
    }
    const sideChannel = new WeakMap();
    for(let i = 0; i < obj_keys.length; ++i){
        const key = obj_keys[i];
        if (options.skipNulls && obj[key] === null) {
            continue;
        }
        push_to_array(keys, inner_stringify(obj[key], key, // @ts-expect-error
        generateArrayPrefix, commaRoundTrip, options.allowEmptyArrays, options.strictNullHandling, options.skipNulls, options.encodeDotInKeys, options.encode ? options.encoder : null, options.filter, options.sort, options.allowDots, options.serializeDate, options.format, options.formatter, options.encodeValuesOnly, options.charset, sideChannel));
    }
    const joined = keys.join(options.delimiter);
    let prefix = options.addQueryPrefix === true ? '?' : '';
    if (options.charsetSentinel) {
        if (options.charset === 'iso-8859-1') {
            // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
            prefix += 'utf8=%26%2310003%3B&';
        } else {
            // encodeURIComponent('✓')
            prefix += 'utf8=%E2%9C%93&';
        }
    }
    return joined.length > 0 ? prefix + joined : '';
} //# sourceMappingURL=stringify.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/qs/index.mjs [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formats",
    ()=>formats
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/qs/formats.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$stringify$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/qs/stringify.mjs [app-route] (ecmascript)");
;
const formats = {
    formatters: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatters"],
    RFC1738: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RFC1738"],
    RFC3986: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RFC3986"],
    default: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$formats$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default_format"]
};
;
;
 //# sourceMappingURL=index.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/utils/log.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatRequestDetails",
    ()=>formatRequestDetails,
    "loggerFor",
    ()=>loggerFor,
    "parseLogLevel",
    ()=>parseLogLevel
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/values.mjs [app-route] (ecmascript)");
;
const levelNumbers = {
    off: 0,
    error: 200,
    warn: 300,
    info: 400,
    debug: 500
};
const parseLogLevel = (maybeLevel, sourceName, client)=>{
    if (!maybeLevel) {
        return undefined;
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hasOwn"])(levelNumbers, maybeLevel)) {
        return maybeLevel;
    }
    loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
    return undefined;
};
function noop() {}
function makeLogFn(fnLevel, logger, logLevel) {
    if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
        return noop;
    } else {
        // Don't wrap logger functions, we want the stacktrace intact!
        return logger[fnLevel].bind(logger);
    }
}
const noopLogger = {
    error: noop,
    warn: noop,
    info: noop,
    debug: noop
};
let cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
    const logger = client.logger;
    const logLevel = client.logLevel ?? 'off';
    if (!logger) {
        return noopLogger;
    }
    const cachedLogger = cachedLoggers.get(logger);
    if (cachedLogger && cachedLogger[0] === logLevel) {
        return cachedLogger[1];
    }
    const levelLogger = {
        error: makeLogFn('error', logger, logLevel),
        warn: makeLogFn('warn', logger, logLevel),
        info: makeLogFn('info', logger, logLevel),
        debug: makeLogFn('debug', logger, logLevel)
    };
    cachedLoggers.set(logger, [
        logLevel,
        levelLogger
    ]);
    return levelLogger;
}
const formatRequestDetails = (details)=>{
    if (details.options) {
        details.options = {
            ...details.options
        };
        delete details.options['headers']; // redundant + leaks internals
    }
    if (details.headers) {
        details.headers = Object.fromEntries((details.headers instanceof Headers ? [
            ...details.headers
        ] : Object.entries(details.headers)).map(([name, value])=>[
                name,
                name.toLowerCase() === 'authorization' || name.toLowerCase() === 'cookie' || name.toLowerCase() === 'set-cookie' ? '***' : value
            ]));
    }
    if ('retryOfRequestLogID' in details) {
        if (details.retryOfRequestLogID) {
            details.retryOf = details.retryOfRequestLogID;
        }
        delete details.retryOfRequestLogID;
    }
    return details;
}; //# sourceMappingURL=log.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/parse.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "defaultParseResponse",
    ()=>defaultParseResponse
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/log.mjs [app-route] (ecmascript)");
;
async function defaultParseResponse(client, props) {
    const { response, requestLogID, retryOfRequestLogID, startTime } = props;
    const body = await (async ()=>{
        // fetch refuses to read the body when the status code is 204.
        if (response.status === 204) {
            return null;
        }
        if (props.options.__binaryResponse) {
            return response;
        }
        const contentType = response.headers.get('content-type');
        const mediaType = contentType?.split(';')[0]?.trim();
        const isJSON = mediaType?.includes('application/json') || mediaType?.endsWith('+json');
        if (isJSON) {
            const json = await response.json();
            return json;
        }
        const text = await response.text();
        return text;
    })();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(client).debug(`[${requestLogID}] response parsed`, (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatRequestDetails"])({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        body,
        durationMs: Date.now() - startTime
    }));
    return body;
} //# sourceMappingURL=parse.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/core/api-promise.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "APIPromise",
    ()=>APIPromise
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/tslib.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$parse$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/parse.mjs [app-route] (ecmascript)");
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _APIPromise_client;
;
;
class APIPromise extends Promise {
    constructor(client, responsePromise, parseResponse = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$parse$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["defaultParseResponse"]){
        super((resolve)=>{
            // this is maybe a bit weird but this has to be a no-op to not implicitly
            // parse the response body; instead .then, .catch, .finally are overridden
            // to parse the response
            resolve(null);
        });
        this.responsePromise = responsePromise;
        this.parseResponse = parseResponse;
        _APIPromise_client.set(this, void 0);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["__classPrivateFieldSet"])(this, _APIPromise_client, client, "f");
    }
    _thenUnwrap(transform) {
        return new APIPromise((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["__classPrivateFieldGet"])(this, _APIPromise_client, "f"), this.responsePromise, async (client, props)=>transform(await this.parseResponse(client, props), props));
    }
    /**
     * Gets the raw `Response` instance instead of parsing the response
     * data.
     *
     * If you want to parse the response body but still get the `Response`
     * instance, you can use {@link withResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
     * to your `tsconfig.json`.
     */ asResponse() {
        return this.responsePromise.then((p)=>p.response);
    }
    /**
     * Gets the parsed response data and the raw `Response` instance.
     *
     * If you just want to get the raw `Response` instance without parsing it,
     * you can use {@link asResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
     * to your `tsconfig.json`.
     */ async withResponse() {
        const [data, response] = await Promise.all([
            this.parse(),
            this.asResponse()
        ]);
        return {
            data,
            response
        };
    }
    parse() {
        if (!this.parsedPromise) {
            this.parsedPromise = this.responsePromise.then((data)=>this.parseResponse((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["__classPrivateFieldGet"])(this, _APIPromise_client, "f"), data));
        }
        return this.parsedPromise;
    }
    then(onfulfilled, onrejected) {
        return this.parse().then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        return this.parse().catch(onrejected);
    }
    finally(onfinally) {
        return this.parse().finally(onfinally);
    }
}
_APIPromise_client = new WeakMap(); //# sourceMappingURL=api-promise.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AbstractPage",
    ()=>AbstractPage,
    "CursorPage",
    ()=>CursorPage,
    "PagePromise",
    ()=>PagePromise
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/tslib.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/error.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$parse$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/parse.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$api$2d$promise$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/api-promise.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/values.mjs [app-route] (ecmascript)");
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _AbstractPage_client;
;
;
;
;
;
class AbstractPage {
    constructor(client, response, body, options){
        _AbstractPage_client.set(this, void 0);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["__classPrivateFieldSet"])(this, _AbstractPage_client, client, "f");
        this.options = options;
        this.response = response;
        this.body = body;
    }
    hasNextPage() {
        const items = this.getPaginatedItems();
        if (!items.length) return false;
        return this.nextPageRequestOptions() != null;
    }
    async getNextPage() {
        const nextOptions = this.nextPageRequestOptions();
        if (!nextOptions) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WhopError"]('No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.');
        }
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["__classPrivateFieldGet"])(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
    }
    async *iterPages() {
        let page = this;
        yield page;
        while(page.hasNextPage()){
            page = await page.getNextPage();
            yield page;
        }
    }
    async *[(_AbstractPage_client = new WeakMap(), Symbol.asyncIterator)]() {
        for await (const page of this.iterPages()){
            for (const item of page.getPaginatedItems()){
                yield item;
            }
        }
    }
}
class PagePromise extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$api$2d$promise$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIPromise"] {
    constructor(client, request, Page){
        super(client, request, async (client, props)=>new Page(client, props.response, await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$parse$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["defaultParseResponse"])(client, props), props.options));
    }
    /**
     * Allow auto-paginating iteration on an unawaited list call, eg:
     *
     *    for await (const item of client.items.list()) {
     *      console.log(item)
     *    }
     */ async *[Symbol.asyncIterator]() {
        const page = await this;
        for await (const item of page){
            yield item;
        }
    }
}
class CursorPage extends AbstractPage {
    constructor(client, response, body, options){
        super(client, response, body, options);
        this.data = body.data || [];
        this.page_info = body.page_info || {};
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    nextPageRequestOptions() {
        const cursor = this.page_info?.end_cursor;
        if (!cursor) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["maybeObj"])(this.options.query),
                after: cursor
            }
        };
    }
} //# sourceMappingURL=pagination.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/uploads.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkFileSupport",
    ()=>checkFileSupport,
    "createForm",
    ()=>createForm,
    "getName",
    ()=>getName,
    "isAsyncIterable",
    ()=>isAsyncIterable,
    "makeFile",
    ()=>makeFile,
    "maybeMultipartFormRequestOptions",
    ()=>maybeMultipartFormRequestOptions,
    "multipartFormRequestOptions",
    ()=>multipartFormRequestOptions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$shims$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/shims.mjs [app-route] (ecmascript)");
;
const checkFileSupport = ()=>{
    if (typeof File === 'undefined') {
        const { process } = globalThis;
        const isOldNode = typeof process?.versions?.node === 'string' && parseInt(process.versions.node.split('.')) < 20;
        throw new Error('`File` is not defined as a global, which is required for file uploads.' + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ''));
    }
};
function makeFile(fileBits, fileName, options) {
    checkFileSupport();
    return new File(fileBits, fileName ?? 'unknown_file', options);
}
function getName(value) {
    return (typeof value === 'object' && value !== null && ('name' in value && value.name && String(value.name) || 'url' in value && value.url && String(value.url) || 'filename' in value && value.filename && String(value.filename) || 'path' in value && value.path && String(value.path)) || '').split(/[\\/]/).pop() || undefined;
}
const isAsyncIterable = (value)=>value != null && typeof value === 'object' && typeof value[Symbol.asyncIterator] === 'function';
const maybeMultipartFormRequestOptions = async (opts, fetch)=>{
    if (!hasUploadableValue(opts.body)) return opts;
    return {
        ...opts,
        body: await createForm(opts.body, fetch)
    };
};
const multipartFormRequestOptions = async (opts, fetch)=>{
    return {
        ...opts,
        body: await createForm(opts.body, fetch)
    };
};
const supportsFormDataMap = /* @__PURE__ */ new WeakMap();
/**
 * node-fetch doesn't support the global FormData object in recent node versions. Instead of sending
 * properly-encoded form data, it just stringifies the object, resulting in a request body of "[object FormData]".
 * This function detects if the fetch function provided supports the global FormData object to avoid
 * confusing error messages later on.
 */ function supportsFormData(fetchObject) {
    const fetch = typeof fetchObject === 'function' ? fetchObject : fetchObject.fetch;
    const cached = supportsFormDataMap.get(fetch);
    if (cached) return cached;
    const promise = (async ()=>{
        try {
            const FetchResponse = 'Response' in fetch ? fetch.Response : (await fetch('data:,')).constructor;
            const data = new FormData();
            if (data.toString() === await new FetchResponse(data).text()) {
                return false;
            }
            return true;
        } catch  {
            // avoid false negatives
            return true;
        }
    })();
    supportsFormDataMap.set(fetch, promise);
    return promise;
}
const createForm = async (body, fetch)=>{
    if (!await supportsFormData(fetch)) {
        throw new TypeError('The provided fetch function does not support file uploads with the current global FormData class.');
    }
    const form = new FormData();
    await Promise.all(Object.entries(body || {}).map(([key, value])=>addFormValue(form, key, value)));
    return form;
};
// We check for Blob not File because Bun.File doesn't inherit from File,
// but they both inherit from Blob and have a `name` property at runtime.
const isNamedBlob = (value)=>value instanceof Blob && 'name' in value;
const isUploadable = (value)=>typeof value === 'object' && value !== null && (value instanceof Response || isAsyncIterable(value) || isNamedBlob(value));
const hasUploadableValue = (value)=>{
    if (isUploadable(value)) return true;
    if (Array.isArray(value)) return value.some(hasUploadableValue);
    if (value && typeof value === 'object') {
        for(const k in value){
            if (hasUploadableValue(value[k])) return true;
        }
    }
    return false;
};
const addFormValue = async (form, key, value)=>{
    if (value === undefined) return;
    if (value == null) {
        throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
    }
    // TODO: make nested formats configurable
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        form.append(key, String(value));
    } else if (value instanceof Response) {
        form.append(key, makeFile([
            await value.blob()
        ], getName(value)));
    } else if (isAsyncIterable(value)) {
        form.append(key, makeFile([
            await new Response((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$shims$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ReadableStreamFrom"])(value)).blob()
        ], getName(value)));
    } else if (isNamedBlob(value)) {
        form.append(key, value, getName(value));
    } else if (Array.isArray(value)) {
        await Promise.all(value.map((entry)=>addFormValue(form, key + '[]', entry)));
    } else if (typeof value === 'object') {
        await Promise.all(Object.entries(value).map(([name, prop])=>addFormValue(form, `${key}[${name}]`, prop)));
    } else {
        throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
    }
}; //# sourceMappingURL=uploads.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/to-file.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "toFile",
    ()=>toFile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$uploads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/uploads.mjs [app-route] (ecmascript)");
;
;
/**
 * This check adds the arrayBuffer() method type because it is available and used at runtime
 */ const isBlobLike = (value)=>value != null && typeof value === 'object' && typeof value.size === 'number' && typeof value.type === 'string' && typeof value.text === 'function' && typeof value.slice === 'function' && typeof value.arrayBuffer === 'function';
/**
 * This check adds the arrayBuffer() method type because it is available and used at runtime
 */ const isFileLike = (value)=>value != null && typeof value === 'object' && typeof value.name === 'string' && typeof value.lastModified === 'number' && isBlobLike(value);
const isResponseLike = (value)=>value != null && typeof value === 'object' && typeof value.url === 'string' && typeof value.blob === 'function';
async function toFile(value, name, options) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$uploads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkFileSupport"])();
    // If it's a promise, resolve it.
    value = await value;
    // If we've been given a `File` we don't need to do anything
    if (isFileLike(value)) {
        if (value instanceof File) {
            return value;
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$uploads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeFile"])([
            await value.arrayBuffer()
        ], value.name);
    }
    if (isResponseLike(value)) {
        const blob = await value.blob();
        name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$uploads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeFile"])(await getBytes(blob), name, options);
    }
    const parts = await getBytes(value);
    name || (name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$uploads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getName"])(value));
    if (!options?.type) {
        const type = parts.find((part)=>typeof part === 'object' && 'type' in part && part.type);
        if (typeof type === 'string') {
            options = {
                ...options,
                type
            };
        }
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$uploads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeFile"])(parts, name, options);
}
async function getBytes(value) {
    let parts = [];
    if (typeof value === 'string' || ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
    value instanceof ArrayBuffer) {
        parts.push(value);
    } else if (isBlobLike(value)) {
        parts.push(value instanceof Blob ? value : await value.arrayBuffer());
    } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$uploads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isAsyncIterable"])(value) // includes Readable, ReadableStream, etc.
    ) {
        for await (const chunk of value){
            parts.push(...await getBytes(chunk)); // TODO, consider validating?
        }
    } else {
        const constructor = value?.constructor?.name;
        throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ''}${propsForError(value)}`);
    }
    return parts;
}
function propsForError(value) {
    if (typeof value !== 'object' || value === null) return '';
    const props = Object.getOwnPropertyNames(value);
    return `; props: [${props.map((p)=>`"${p}"`).join(', ')}]`;
} //# sourceMappingURL=to-file.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/core/uploads.mjs [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$to$2d$file$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/to-file.mjs [app-route] (ecmascript)"); //# sourceMappingURL=uploads.mjs.map
;
}),
"[project]/waliet/node_modules/@whop/sdk/resources/shared.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
__turbopack_context__.s([]);
;
 //# sourceMappingURL=shared.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
__turbopack_context__.s([
    "APIResource",
    ()=>APIResource
]);
class APIResource {
    constructor(client){
        this._client = client;
    }
} //# sourceMappingURL=resource.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/access-tokens.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AccessTokens",
    ()=>AccessTokens
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
;
class AccessTokens extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Create a short-lived access token to authenticate API requests on behalf of a
     * Company or User. This token should be used with Whop's web and mobile embedded
     * components. You must provide either a company_id or a user_id argument, but not
     * both.
     *
     * @example
     * ```ts
     * const accessToken = await client.accessTokens.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/access_tokens', {
            body,
            ...options
        });
    }
} //# sourceMappingURL=access-tokens.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/account-links.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AccountLinks",
    ()=>AccountLinks
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
;
class AccountLinks extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Generates a url that a user can be directed to in order to access their
     * sub-merchant account. For example, they can visit the hosted payouts portal or
     * the hosted KYC onboarding flow.
     *
     * @example
     * ```ts
     * const accountLink = await client.accountLinks.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   refresh_url: 'refresh_url',
     *   return_url: 'return_url',
     *   use_case: 'account_onboarding',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/account_links', {
            body,
            ...options
        });
    }
} //# sourceMappingURL=account-links.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createPathTagFunction",
    ()=>createPathTagFunction,
    "encodeURIPath",
    ()=>encodeURIPath,
    "path",
    ()=>path
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/error.mjs [app-route] (ecmascript)");
;
function encodeURIPath(str) {
    return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
const EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
const createPathTagFunction = (pathEncoder = encodeURIPath)=>function path(statics, ...params) {
        // If there are no params, no processing is needed.
        if (statics.length === 1) return statics[0];
        let postPath = false;
        const invalidSegments = [];
        const path1 = statics.reduce((previousValue, currentValue, index)=>{
            if (/[?#]/.test(currentValue)) {
                postPath = true;
            }
            const value = params[index];
            let encoded = (postPath ? encodeURIComponent : pathEncoder)('' + value);
            if (index !== params.length && (value == null || typeof value === 'object' && // handle values from other realms
            value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString)) {
                encoded = value + '';
                invalidSegments.push({
                    start: previousValue.length + currentValue.length,
                    length: encoded.length,
                    error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
                });
            }
            return previousValue + currentValue + (index === params.length ? '' : encoded);
        }, '');
        const pathOnly = path1.split(/[?#]/, 1)[0];
        const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
        let match;
        // Find all invalid segments
        while((match = invalidSegmentPattern.exec(pathOnly)) !== null){
            invalidSegments.push({
                start: match.index,
                length: match[0].length,
                error: `Value "${match[0]}" can\'t be safely passed as a path parameter`
            });
        }
        invalidSegments.sort((a, b)=>a.start - b.start);
        if (invalidSegments.length > 0) {
            let lastEnd = 0;
            const underline = invalidSegments.reduce((acc, segment)=>{
                const spaces = ' '.repeat(segment.start - lastEnd);
                const arrows = '^'.repeat(segment.length);
                lastEnd = segment.start + segment.length;
                return acc + spaces + arrows;
            }, '');
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WhopError"](`Path parameters result in path with invalid segments:\n${invalidSegments.map((e)=>e.error).join('\n')}\n${path1}\n${underline}`);
        }
        return path1;
    };
const path = /* @__PURE__ */ createPathTagFunction(encodeURIPath); //# sourceMappingURL=path.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/app-builds.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppBuilds",
    ()=>AppBuilds
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class AppBuilds extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new app build
     *
     * Required permissions:
     *
     * - `developer:manage_builds`
     *
     * @example
     * ```ts
     * const appBuild = await client.appBuilds.create({
     *   attachment: { direct_upload_id: 'direct_upload_id' },
     *   checksum: 'checksum',
     *   platform: 'ios',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/app_builds', {
            body,
            ...options
        });
    }
    /**
     * Retrieves an app build by ID
     *
     * Required permissions:
     *
     * - `developer:manage_builds`
     *
     * @example
     * ```ts
     * const appBuild = await client.appBuilds.retrieve(
     *   'apbu_xxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/app_builds/${id}`, options);
    }
    /**
     * Lists app builds for an app
     *
     * Required permissions:
     *
     * - `developer:manage_builds`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const appBuildListResponse of client.appBuilds.list(
     *   { app_id: 'app_xxxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/app_builds', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Promotes an app build to production
     *
     * Required permissions:
     *
     * - `developer:manage_builds`
     *
     * @example
     * ```ts
     * const appBuild = await client.appBuilds.promote(
     *   'apbu_xxxxxxxxxxxxx',
     * );
     * ```
     */ promote(id, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/app_builds/${id}/promote`, options);
    }
} //# sourceMappingURL=app-builds.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/apps.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Apps",
    ()=>Apps
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Apps extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Create a new App
     *
     * Required permissions:
     *
     * - `developer:create_app`
     * - `developer:manage_api_key`
     *
     * @example
     * ```ts
     * const app = await client.apps.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   name: 'name',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/apps', {
            body,
            ...options
        });
    }
    /**
     * Retrieves an app by ID
     *
     * Required permissions:
     *
     * - `developer:manage_api_key`
     *
     * @example
     * ```ts
     * const app = await client.apps.retrieve(
     *   'app_xxxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/apps/${id}`, options);
    }
    /**
     * Update an existing App
     *
     * Required permissions:
     *
     * - `developer:update_app`
     * - `developer:manage_api_key`
     *
     * @example
     * ```ts
     * const app = await client.apps.update('app_xxxxxxxxxxxxxx');
     * ```
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/apps/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Fetches a list of apps
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const appListResponse of client.apps.list()) {
     *   // ...
     * }
     * ```
     */ list(query = {}, options) {
        return this._client.getAPIList('/apps', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=apps.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/authorized-users.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthorizedUsers",
    ()=>AuthorizedUsers
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class AuthorizedUsers extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a authorized user by ID
     *
     * Required permissions:
     *
     * - `company:authorized_user:read`
     * - `member:email:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/authorized_users/${id}`, options);
    }
    /**
     * Lists authorized users
     *
     * Required permissions:
     *
     * - `company:authorized_user:read`
     * - `member:email:read`
     */ list(query, options) {
        return this._client.getAPIList('/authorized_users', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=authorized-users.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/chat-channels.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChatChannels",
    ()=>ChatChannels
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class ChatChannels extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a chat channel
     *
     * Required permissions:
     *
     * - `chat:read`
     *
     * @example
     * ```ts
     * const chatChannel = await client.chatChannels.retrieve(
     *   'id',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/chat_channels/${id}`, options);
    }
    /**
     * Updates a chat channel
     *
     * Required permissions:
     *
     * - `chat:moderate`
     *
     * @example
     * ```ts
     * const chatChannel = await client.chatChannels.update('id');
     * ```
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/chat_channels/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists chat channels inside a company
     *
     * Required permissions:
     *
     * - `chat:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const chatChannelListResponse of client.chatChannels.list(
     *   { company_id: 'biz_xxxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/chat_channels', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=chat-channels.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/checkout-configurations.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CheckoutConfigurations",
    ()=>CheckoutConfigurations
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class CheckoutConfigurations extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new checkout configuration
     *
     * Required permissions:
     *
     * - `checkout_configuration:create`
     * - `plan:create`
     * - `access_pass:create`
     * - `access_pass:update`
     * - `checkout_configuration:basic:read`
     *
     * @example
     * ```ts
     * const checkoutConfiguration =
     *   await client.checkoutConfigurations.create({
     *     plan_id: 'plan_xxxxxxxxxxxxx',
     *   });
     * ```
     */ create(body, options) {
        return this._client.post('/checkout_configurations', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a checkout configuration by ID
     *
     * Required permissions:
     *
     * - `checkout_configuration:basic:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/checkout_configurations/${id}`, options);
    }
    /**
     * Lists checkout configurations
     *
     * Required permissions:
     *
     * - `checkout_configuration:basic:read`
     */ list(query, options) {
        return this._client.getAPIList('/checkout_configurations', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=checkout-configurations.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/companies.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Companies",
    ()=>Companies
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Companies extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Create a new connected account for your platform
     *
     * Required permissions:
     *
     * - `company:create_child`
     * - `company:basic:read`
     */ create(body, options) {
        return this._client.post('/companies', {
            body,
            ...options
        });
    }
    /**
     * Retrieves an company by ID or its url route
     *
     * Required permissions:
     *
     * - `company:basic:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/companies/${id}`, options);
    }
    /**
     * Update an existing company. Either a regular company, platform company, or one
     * of a platform's connected accounts
     *
     * Required permissions:
     *
     * - `company:update`
     * - `company:basic:read`
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/companies/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists companies the current user has access to
     *
     * Required permissions:
     *
     * - `company:basic:read`
     */ list(query, options) {
        return this._client.getAPIList('/companies', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=companies.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/course-chapters.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CourseChapters",
    ()=>CourseChapters
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class CourseChapters extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new course chapter
     *
     * Required permissions:
     *
     * - `courses:update`
     *
     * @example
     * ```ts
     * const courseChapter = await client.courseChapters.create({
     *   course_id: 'cors_xxxxxxxxxxxxx',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/course_chapters', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a course chapter by ID
     *
     * Required permissions:
     *
     * - `courses:read`
     *
     * @example
     * ```ts
     * const courseChapter = await client.courseChapters.retrieve(
     *   'chap_xxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_chapters/${id}`, options);
    }
    /**
     * Updates a course chapter
     *
     * Required permissions:
     *
     * - `courses:update`
     *
     * @example
     * ```ts
     * const courseChapter = await client.courseChapters.update(
     *   'chap_xxxxxxxxxxxxx',
     *   { title: 'title' },
     * );
     * ```
     */ update(id, body, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_chapters/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists chapters for a course
     *
     * Required permissions:
     *
     * - `courses:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const courseChapterListResponse of client.courseChapters.list(
     *   { course_id: 'cors_xxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/course_chapters', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Deletes a course chapter
     *
     * Required permissions:
     *
     * - `courses:update`
     *
     * @example
     * ```ts
     * const courseChapter = await client.courseChapters.delete(
     *   'chap_xxxxxxxxxxxxx',
     * );
     * ```
     */ delete(id, options) {
        return this._client.delete(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_chapters/${id}`, options);
    }
} //# sourceMappingURL=course-chapters.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/course-lesson-interactions.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CourseLessonInteractions",
    ()=>CourseLessonInteractions
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class CourseLessonInteractions extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a course lesson interaction by ID
     *
     * Required permissions:
     *
     * - `courses:read`
     * - `course_analytics:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_lesson_interactions/${id}`, options);
    }
    /**
     * Lists course lesson interactions
     *
     * Required permissions:
     *
     * - `courses:read`
     * - `course_analytics:read`
     */ list(query = {}, options) {
        return this._client.getAPIList('/course_lesson_interactions', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=course-lesson-interactions.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/course-lessons.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CourseLessons",
    ()=>CourseLessons
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class CourseLessons extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new course lesson
     *
     * Required permissions:
     *
     * - `courses:update`
     *
     * @example
     * ```ts
     * const lesson = await client.courseLessons.create({
     *   chapter_id: 'chap_xxxxxxxxxxxxx',
     *   lesson_type: 'text',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/course_lessons', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a course lesson by ID
     *
     * Required permissions:
     *
     * - `courses:read`
     *
     * @example
     * ```ts
     * const lesson = await client.courseLessons.retrieve(
     *   'lesn_xxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_lessons/${id}`, options);
    }
    /**
     * Updates a course lesson
     *
     * Required permissions:
     *
     * - `courses:update`
     *
     * @example
     * ```ts
     * const lesson = await client.courseLessons.update(
     *   'lesn_xxxxxxxxxxxxx',
     * );
     * ```
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_lessons/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists lessons for a course or chapter
     *
     * Required permissions:
     *
     * - `courses:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const courseLessonListResponse of client.courseLessons.list()) {
     *   // ...
     * }
     * ```
     */ list(query = {}, options) {
        return this._client.getAPIList('/course_lessons', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Deletes a course lesson
     *
     * Required permissions:
     *
     * - `courses:update`
     *
     * @example
     * ```ts
     * const courseLesson = await client.courseLessons.delete(
     *   'lesn_xxxxxxxxxxxxx',
     * );
     * ```
     */ delete(id, options) {
        return this._client.delete(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_lessons/${id}`, options);
    }
    /**
     * Marks a course lesson as completed
     *
     * @example
     * ```ts
     * const response = await client.courseLessons.markAsCompleted(
     *   'lesson_id',
     * );
     * ```
     */ markAsCompleted(lessonID, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_lessons/${lessonID}/mark_as_completed`, options);
    }
    /**
     * Starts a course lesson
     *
     * @example
     * ```ts
     * const response = await client.courseLessons.start(
     *   'lesson_id',
     * );
     * ```
     */ start(lessonID, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_lessons/${lessonID}/start`, options);
    }
    /**
     * Submits answers for a course assessment
     *
     * @example
     * ```ts
     * const response =
     *   await client.courseLessons.submitAssessment('lesson_id', {
     *     answers: [{ question_id: 'question_id' }],
     *   });
     * ```
     */ submitAssessment(lessonID, body, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_lessons/${lessonID}/submit_assessment`, {
            body,
            ...options
        });
    }
} //# sourceMappingURL=course-lessons.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/course-students.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CourseStudents",
    ()=>CourseStudents
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class CourseStudents extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a course student by interaction ID
     *
     * Required permissions:
     *
     * - `courses:read`
     * - `course_analytics:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/course_students/${id}`, options);
    }
    /**
     * Lists students for a course
     *
     * Required permissions:
     *
     * - `courses:read`
     * - `course_analytics:read`
     */ list(query, options) {
        return this._client.getAPIList('/course_students', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=course-students.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/courses.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Courses",
    ()=>Courses
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Courses extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new course module in an experience
     *
     * Required permissions:
     *
     * - `courses:update`
     *
     * @example
     * ```ts
     * const course = await client.courses.create({
     *   experience_id: 'exp_xxxxxxxxxxxxxx',
     *   title: 'title',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/courses', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a course by ID
     *
     * Required permissions:
     *
     * - `courses:read`
     *
     * @example
     * ```ts
     * const course = await client.courses.retrieve(
     *   'cors_xxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/courses/${id}`, options);
    }
    /**
     * Updates a course
     *
     * Required permissions:
     *
     * - `courses:update`
     *
     * @example
     * ```ts
     * const course = await client.courses.update(
     *   'cors_xxxxxxxxxxxxx',
     * );
     * ```
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/courses/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists courses for an experience or company
     *
     * Required permissions:
     *
     * - `courses:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const courseListResponse of client.courses.list()) {
     *   // ...
     * }
     * ```
     */ list(query = {}, options) {
        return this._client.getAPIList('/courses', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Deletes a course
     *
     * Required permissions:
     *
     * - `courses:update`
     *
     * @example
     * ```ts
     * const course = await client.courses.delete(
     *   'cors_xxxxxxxxxxxxx',
     * );
     * ```
     */ delete(id, options) {
        return this._client.delete(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/courses/${id}`, options);
    }
} //# sourceMappingURL=courses.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/disputes.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Disputes",
    ()=>Disputes
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Disputes extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a Dispute by ID
     *
     * Required permissions:
     *
     * - `payment:dispute:read`
     * - `plan:basic:read`
     * - `access_pass:basic:read`
     * - `company:basic:read`
     * - `payment:basic:read`
     * - `member:email:read`
     * - `member:basic:read`
     * - `member:phone:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/disputes/${id}`, options);
    }
    /**
     * Lists disputes the current actor has access to
     *
     * Required permissions:
     *
     * - `payment:dispute:read`
     * - `plan:basic:read`
     * - `access_pass:basic:read`
     * - `company:basic:read`
     * - `payment:basic:read`
     */ list(query, options) {
        return this._client.getAPIList('/disputes', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Submit a payment dispute to the payment processor for review. Once submitted, no
     * further edits can be made.
     *
     * Required permissions:
     *
     * - `payment:dispute`
     * - `plan:basic:read`
     * - `access_pass:basic:read`
     * - `company:basic:read`
     * - `payment:basic:read`
     * - `member:email:read`
     * - `member:basic:read`
     * - `member:phone:read`
     */ submitEvidence(id, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/disputes/${id}/submit_evidence`, options);
    }
    /**
     * Update a dispute with evidence data to attempt to win the dispute.
     *
     * Required permissions:
     *
     * - `payment:dispute`
     * - `plan:basic:read`
     * - `access_pass:basic:read`
     * - `company:basic:read`
     * - `payment:basic:read`
     * - `member:email:read`
     * - `member:basic:read`
     * - `member:phone:read`
     */ updateEvidence(id, body = {}, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/disputes/${id}/update_evidence`, {
            body,
            ...options
        });
    }
} //# sourceMappingURL=disputes.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/entries.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Entries",
    ()=>Entries
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Entries extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves an entry by ID
     *
     * Required permissions:
     *
     * - `plan:waitlist:read`
     * - `member:email:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/entries/${id}`, options);
    }
    /**
     * Lists entries for a company
     *
     * Required permissions:
     *
     * - `plan:waitlist:read`
     * - `member:email:read`
     */ list(query, options) {
        return this._client.getAPIList('/entries', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Approve an entry
     *
     * Required permissions:
     *
     * - `plan:waitlist:manage`
     */ approve(id, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/entries/${id}/approve`, options);
    }
    /**
     * Deny an entry
     *
     * Required permissions:
     *
     * - `plan:waitlist:manage`
     * - `plan:basic:read`
     * - `member:email:read`
     */ deny(id, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/entries/${id}/deny`, options);
    }
} //# sourceMappingURL=entries.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/experiences.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Experiences",
    ()=>Experiences
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Experiences extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Required permissions:
     *
     * - `experience:create`
     *
     * @example
     * ```ts
     * const experience = await client.experiences.create({
     *   app_id: 'app_xxxxxxxxxxxxxx',
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/experiences', {
            body,
            ...options
        });
    }
    /**
     * Retrieves an experience by ID
     *
     * @example
     * ```ts
     * const experience = await client.experiences.retrieve(
     *   'exp_xxxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/experiences/${id}`, options);
    }
    /**
     * Required permissions:
     *
     * - `experience:update`
     *
     * @example
     * ```ts
     * const experience = await client.experiences.update(
     *   'exp_xxxxxxxxxxxxxx',
     * );
     * ```
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/experiences/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists experiences for a company
     *
     * Required permissions:
     *
     * - `experience:hidden_experience:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const experienceListResponse of client.experiences.list(
     *   { company_id: 'biz_xxxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/experiences', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Required permissions:
     *
     * - `experience:delete`
     *
     * @example
     * ```ts
     * const experience = await client.experiences.delete(
     *   'exp_xxxxxxxxxxxxxx',
     * );
     * ```
     */ delete(id, options) {
        return this._client.delete(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/experiences/${id}`, options);
    }
    /**
     * Adds an experience to an product, making it accessible to the product's
     * customers.
     *
     * Required permissions:
     *
     * - `experience:attach`
     *
     * @example
     * ```ts
     * const experience = await client.experiences.attach(
     *   'exp_xxxxxxxxxxxxxx',
     *   { product_id: 'prod_xxxxxxxxxxxxx' },
     * );
     * ```
     */ attach(id, body, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/experiences/${id}/attach`, {
            body,
            ...options
        });
    }
    /**
     * Removes an experience from an product, making it inaccessible to the product's
     * customers.
     *
     * Required permissions:
     *
     * - `experience:detach`
     *
     * @example
     * ```ts
     * const experience = await client.experiences.detach(
     *   'exp_xxxxxxxxxxxxxx',
     *   { product_id: 'prod_xxxxxxxxxxxxx' },
     * );
     * ```
     */ detach(id, body, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/experiences/${id}/detach`, {
            body,
            ...options
        });
    }
    /**
     * Duplicates an existing experience. The name will be copied, unless provided. The
     * new experience will be attached to the same products as the original experience.
     * If duplicating a Forum or Chat experience, the new experience will have the same
     * settings as the original experience, e.g. who can post, who can comment, etc. No
     * content, e.g. posts, messages, lessons from within the original experience will
     * be copied.
     *
     * Required permissions:
     *
     * - `experience:create`
     *
     * @example
     * ```ts
     * const experience = await client.experiences.duplicate(
     *   'exp_xxxxxxxxxxxxxx',
     * );
     * ```
     */ duplicate(id, body = {}, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/experiences/${id}/duplicate`, {
            body,
            ...options
        });
    }
} //# sourceMappingURL=experiences.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/fee-markups.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FeeMarkups",
    ()=>FeeMarkups
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class FeeMarkups extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates or updates a fee markup for a company.
     *
     * Required permissions:
     *
     * - `company:update_child_fees`
     *
     * @example
     * ```ts
     * const feeMarkup = await client.feeMarkups.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   fee_type: 'crypto_withdrawal_markup',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/fee_markups', {
            body,
            ...options
        });
    }
    /**
     * Lists fee markups for a company.
     *
     * Required permissions:
     *
     * - `company:update_child_fees`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const feeMarkupListResponse of client.feeMarkups.list(
     *   { company_id: 'biz_xxxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/fee_markups', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Deletes a fee markup for a company.
     *
     * Required permissions:
     *
     * - `company:update_child_fees`
     *
     * @example
     * ```ts
     * const feeMarkup = await client.feeMarkups.delete('id');
     * ```
     */ delete(id, options) {
        return this._client.delete(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/fee_markups/${id}`, options);
    }
} //# sourceMappingURL=fee-markups.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/lib/upload-file.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "uploadFile",
    ()=>uploadFile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$shims$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/shims.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$sleep$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/sleep.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$uploads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/uploads.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$to$2d$file$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/to-file.mjs [app-route] (ecmascript)");
;
;
;
function normalizeUploadHeaders(headers) {
    if (!headers) return undefined;
    const out = {};
    for (const [key, value] of Object.entries(headers)){
        if (value === null || value === undefined) continue;
        out[key] = String(value);
    }
    return out;
}
async function uploadFile(client, file, options) {
    const pollIntervalMs = options?.pollIntervalMs ?? 1000;
    const pollTimeoutMs = options?.pollTimeoutMs ?? 120000;
    const requestOptions = options?.requestOptions ?? undefined;
    const normalized = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$to$2d$file$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toFile"])(file, options?.filename ?? undefined);
    const filename = (options?.filename ?? normalized.name)?.trim();
    if (!filename) {
        throw new Error('uploadFile: could not determine a filename; pass { filename } or provide a named File.');
    }
    const created = await client.files.create({
        filename
    }, requestOptions);
    if (created.upload_status === 'failed') {
        throw new Error(`uploadFile: file creation failed (id: ${created.id}).`);
    }
    // Some backends may immediately mark the record ready (e.g. for remote/import flows).
    if (created.upload_status !== 'ready') {
        if (!created.upload_url) {
            throw new Error('uploadFile: missing upload_url from files.create response.');
        }
        const fetchImpl = client.fetch ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$shims$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDefaultFetch"])();
        const uploadResponse = await fetchImpl(created.upload_url, {
            method: 'PUT',
            headers: normalizeUploadHeaders(created.upload_headers) ?? {},
            body: normalized
        });
        if (!uploadResponse.ok) {
            throw new Error(`uploadFile: upload failed (status ${uploadResponse.status} ${uploadResponse.statusText}).`);
        }
    }
    const deadline = Date.now() + pollTimeoutMs;
    while(true){
        const current = await client.files.retrieve(created.id, requestOptions);
        if (current.upload_status === 'ready') return current;
        if (current.upload_status === 'failed') {
            throw new Error(`uploadFile: processing failed (id: ${current.id}).`);
        }
        if (Date.now() >= deadline) {
            throw new Error(`uploadFile: timed out waiting for file to become ready (id: ${current.id}).`);
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$sleep$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sleep"])(pollIntervalMs);
    }
} //# sourceMappingURL=upload-file.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/files.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Files",
    ()=>Files
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$lib$2f$upload$2d$file$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/lib/upload-file.mjs [app-route] (ecmascript)");
;
;
;
class Files extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a file and returns a presigned URL for upload
     */ create(body, options) {
        return this._client.post('/files', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a file by its ID
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/files/${id}`, options);
    }
    /**
     * Upload a file (create -> upload to presigned URL -> poll retrieve until ready).
     *
     * Polls for up to 2 minutes by default.
     */ upload(file, options) {
        const { filename, ...requestOptions } = options ?? {};
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$lib$2f$upload$2d$file$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uploadFile"])(this._client, file, {
            filename,
            requestOptions
        });
    }
} //# sourceMappingURL=files.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/forum-posts.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ForumPosts",
    ()=>ForumPosts
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class ForumPosts extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Create a new forum post
     *
     * Required permissions:
     *
     * - `forum:post:create`
     *
     * @example
     * ```ts
     * const forumPost = await client.forumPosts.create({
     *   experience_id: 'exp_xxxxxxxxxxxxxx',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/forum_posts', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a forum post by ID
     *
     * Required permissions:
     *
     * - `forum:read`
     *
     * @example
     * ```ts
     * const forumPost = await client.forumPosts.retrieve('id');
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/forum_posts/${id}`, options);
    }
    /**
     * Update an existing forum post
     *
     * @example
     * ```ts
     * const forumPost = await client.forumPosts.update('id');
     * ```
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/forum_posts/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists forum posts
     *
     * Required permissions:
     *
     * - `forum:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const forumPostListResponse of client.forumPosts.list(
     *   { experience_id: 'exp_xxxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/forum_posts', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=forum-posts.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/forums.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Forums",
    ()=>Forums
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Forums extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a forum
     *
     * Required permissions:
     *
     * - `forum:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/forums/${id}`, options);
    }
    /**
     * Updates a forum
     *
     * Required permissions:
     *
     * - `forum:moderate`
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/forums/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists forums inside a company
     *
     * Required permissions:
     *
     * - `forum:read`
     */ list(query, options) {
        return this._client.getAPIList('/forums', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=forums.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/invoices.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Invoices",
    ()=>Invoices
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Invoices extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates an invoice
     *
     * Required permissions:
     *
     * - `invoice:create`
     * - `plan:basic:read`
     *
     * @example
     * ```ts
     * const invoice = await client.invoices.create({
     *   collection_method: 'send_invoice',
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   due_date: '2023-12-01T05:00:00.401Z',
     *   member_id: 'mber_xxxxxxxxxxxxx',
     *   plan: {},
     *   product: { title: 'title' },
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/invoices', {
            body,
            ...options
        });
    }
    /**
     * Retrieves an invoice by ID or token
     *
     * Required permissions:
     *
     * - `invoice:basic:read`
     * - `plan:basic:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/invoices/${id}`, options);
    }
    /**
     * Lists invoices
     *
     * Required permissions:
     *
     * - `invoice:basic:read`
     * - `plan:basic:read`
     */ list(query, options) {
        return this._client.getAPIList('/invoices', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Void an invoice
     *
     * Required permissions:
     *
     * - `invoice:update`
     */ void(id, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/invoices/${id}/void`, options);
    }
} //# sourceMappingURL=invoices.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/leads.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Leads",
    ()=>Leads
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Leads extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new lead
     *
     * Required permissions:
     *
     * - `lead:manage`
     * - `member:email:read`
     * - `access_pass:basic:read`
     * - `member:basic:read`
     *
     * @example
     * ```ts
     * const lead = await client.leads.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/leads', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a lead by ID
     *
     * Required permissions:
     *
     * - `lead:basic:read`
     * - `member:email:read`
     * - `access_pass:basic:read`
     * - `member:basic:read`
     *
     * @example
     * ```ts
     * const lead = await client.leads.retrieve(
     *   'lead_xxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/leads/${id}`, options);
    }
    /**
     * Updates a lead
     *
     * Required permissions:
     *
     * - `lead:manage`
     * - `member:email:read`
     * - `access_pass:basic:read`
     * - `member:basic:read`
     *
     * @example
     * ```ts
     * const lead = await client.leads.update(
     *   'lead_xxxxxxxxxxxxx',
     * );
     * ```
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/leads/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists leads for a company
     *
     * Required permissions:
     *
     * - `lead:basic:read`
     * - `member:email:read`
     * - `access_pass:basic:read`
     * - `member:basic:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const leadListResponse of client.leads.list({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     * })) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/leads', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=leads.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/ledger-accounts.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LedgerAccounts",
    ()=>LedgerAccounts
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
class LedgerAccounts extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a ledger account by its ID, company ID or user ID
     *
     * Required permissions:
     *
     * - `company:balance:read`
     * - `payout:account:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/ledger_accounts/${id}`, options);
    }
} //# sourceMappingURL=ledger-accounts.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/members.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Members",
    ()=>Members
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Members extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a member of a company by ID
     *
     * Required permissions:
     *
     * - `member:basic:read`
     * - `member:email:read`
     * - `member:phone:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/members/${id}`, options);
    }
    /**
     * List the members of a company
     *
     * Required permissions:
     *
     * - `member:basic:read`
     * - `member:email:read`
     * - `member:phone:read`
     */ list(query, options) {
        return this._client.getAPIList('/members', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=members.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/memberships.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Memberships",
    ()=>Memberships
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Memberships extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a membership by ID or license key
     *
     * Required permissions:
     *
     * - `member:basic:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/memberships/${id}`, options);
    }
    /**
     * Update a membership
     *
     * Required permissions:
     *
     * - `member:manage`
     * - `member:basic:read`
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/memberships/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists memberships
     *
     * Required permissions:
     *
     * - `member:basic:read`
     */ list(query = {}, options) {
        return this._client.getAPIList('/memberships', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Cancels a membership either immediately or at the end of the current billing
     * period
     *
     * Required permissions:
     *
     * - `member:manage`
     * - `member:basic:read`
     */ cancel(id, body = {}, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/memberships/${id}/cancel`, {
            body,
            ...options
        });
    }
    /**
     * Pauses a membership's payments
     *
     * Required permissions:
     *
     * - `member:manage`
     * - `member:basic:read`
     */ pause(id, body = {}, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/memberships/${id}/pause`, {
            body,
            ...options
        });
    }
    /**
     * Resumes a membership's payments
     *
     * Required permissions:
     *
     * - `member:manage`
     * - `member:basic:read`
     */ resume(id, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/memberships/${id}/resume`, options);
    }
} //# sourceMappingURL=memberships.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/messages.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Messages",
    ()=>Messages
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Messages extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new message
     *
     * Required permissions:
     *
     * - `chat:message:create`
     */ create(body, options) {
        return this._client.post('/messages', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a message
     *
     * Required permissions:
     *
     * - `chat:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/messages/${id}`, options);
    }
    /**
     * Updates an existing message
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/messages/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists messages inside a channel
     *
     * Required permissions:
     *
     * - `chat:read`
     */ list(query, options) {
        return this._client.getAPIList('/messages', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=messages.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/notifications.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Notifications",
    ()=>Notifications
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
;
class Notifications extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Queues a notification to be sent to users in an experience or company team
     *
     * @example
     * ```ts
     * const notification = await client.notifications.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   content: 'content',
     *   title: 'title',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/notifications', {
            body,
            ...options
        });
    }
} //# sourceMappingURL=notifications.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/payment-methods.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PaymentMethods",
    ()=>PaymentMethods
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class PaymentMethods extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * A payment method is a stored representation of how a customer intends to pay,
     * such as a card, bank account, or digital wallet. It holds the necessary billing
     * details and can be attached to a member for future one-time or recurring
     * charges. This lets you reuse the same payment credentials across multiple
     * payments. You must provide exactly one of company_id or member_id.
     *
     * Required permissions:
     *
     * - `member:payment_methods:read`
     */ retrieve(id, query = {}, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/payment_methods/${id}`, {
            query,
            ...options
        });
    }
    /**
     * A payment method is a stored representation of how a customer intends to pay,
     * such as a card, bank account, or digital wallet. It holds the necessary billing
     * details and can be attached to a member for future one-time or recurring
     * charges. This lets you reuse the same payment credentials across multiple
     * payments.
     *
     * Required permissions:
     *
     * - `member:payment_methods:read`
     */ list(query = {}, options) {
        return this._client.getAPIList('/payment_methods', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=payment-methods.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/payments.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Payments",
    ()=>Payments
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Payments extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Charge an existing member off-session using one of their stored payment methods.
     * You can provide an existing plan, or create a new one in-line. This endpoint
     * will respond with a payment object immediately, but the payment is processed
     * asynchronously in the background. Use webhooks to be notified when the payment
     * succeeds or fails.
     *
     * Required permissions:
     *
     * - `payment:charge`
     * - `plan:create`
     * - `access_pass:create`
     * - `access_pass:update`
     * - `plan:basic:read`
     * - `access_pass:basic:read`
     * - `member:email:read`
     * - `member:basic:read`
     * - `member:phone:read`
     * - `promo_code:basic:read`
     *
     * @example
     * ```ts
     * const payment = await client.payments.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   member_id: 'mber_xxxxxxxxxxxxx',
     *   payment_method_id: 'pmt_xxxxxxxxxxxxxx',
     *   plan: { currency: 'usd' },
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/payments', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a payment by ID
     *
     * Required permissions:
     *
     * - `payment:basic:read`
     * - `plan:basic:read`
     * - `access_pass:basic:read`
     * - `member:email:read`
     * - `member:basic:read`
     * - `member:phone:read`
     * - `promo_code:basic:read`
     *
     * @example
     * ```ts
     * const payment = await client.payments.retrieve(
     *   'pay_xxxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/payments/${id}`, options);
    }
    /**
     * Lists payments
     *
     * Required permissions:
     *
     * - `payment:basic:read`
     * - `plan:basic:read`
     * - `access_pass:basic:read`
     * - `member:email:read`
     * - `member:basic:read`
     * - `member:phone:read`
     * - `promo_code:basic:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const paymentListResponse of client.payments.list(
     *   { company_id: 'biz_xxxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/payments', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Lists fees for a payment
     *
     * Required permissions:
     *
     * - `payment:basic:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const paymentListFeesResponse of client.payments.listFees(
     *   'pay_xxxxxxxxxxxxxx',
     * )) {
     *   // ...
     * }
     * ```
     */ listFees(id, query = {}, options) {
        return this._client.getAPIList(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/payments/${id}/fees`, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Refunds a payment
     *
     * Required permissions:
     *
     * - `payment:manage`
     * - `plan:basic:read`
     * - `access_pass:basic:read`
     * - `member:email:read`
     * - `member:basic:read`
     * - `member:phone:read`
     * - `promo_code:basic:read`
     *
     * @example
     * ```ts
     * const payment = await client.payments.refund(
     *   'pay_xxxxxxxxxxxxxx',
     * );
     * ```
     */ refund(id, body = {}, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/payments/${id}/refund`, {
            body,
            ...options
        });
    }
    /**
     * Retries a payment
     *
     * Required permissions:
     *
     * - `payment:manage`
     * - `plan:basic:read`
     * - `access_pass:basic:read`
     * - `member:email:read`
     * - `member:basic:read`
     * - `member:phone:read`
     * - `promo_code:basic:read`
     *
     * @example
     * ```ts
     * const payment = await client.payments.retry(
     *   'pay_xxxxxxxxxxxxxx',
     * );
     * ```
     */ retry(id, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/payments/${id}/retry`, options);
    }
    /**
     * Voids a payment
     *
     * Required permissions:
     *
     * - `payment:manage`
     * - `plan:basic:read`
     * - `access_pass:basic:read`
     * - `member:email:read`
     * - `member:basic:read`
     * - `member:phone:read`
     * - `promo_code:basic:read`
     *
     * @example
     * ```ts
     * const payment = await client.payments.void(
     *   'pay_xxxxxxxxxxxxxx',
     * );
     * ```
     */ void(id, options) {
        return this._client.post(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/payments/${id}/void`, options);
    }
} //# sourceMappingURL=payments.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/payout-methods.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PayoutMethods",
    ()=>PayoutMethods
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class PayoutMethods extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a payout method by ID
     *
     * Required permissions:
     *
     * - `payout:destination:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/payout_methods/${id}`, options);
    }
    /**
     * Lists payout destinations for a company
     *
     * Required permissions:
     *
     * - `payout:destination:read`
     */ list(query, options) {
        return this._client.getAPIList('/payout_methods', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=payout-methods.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/plans.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Plans",
    ()=>Plans
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Plans extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Create a new Plan
     *
     * Required permissions:
     *
     * - `plan:create`
     * - `access_pass:basic:read`
     * - `plan:basic:read`
     *
     * @example
     * ```ts
     * const plan = await client.plans.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   product_id: 'prod_xxxxxxxxxxxxx',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/plans', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a plan by ID
     *
     * Required permissions:
     *
     * - `plan:basic:read`
     *
     * @example
     * ```ts
     * const plan = await client.plans.retrieve(
     *   'plan_xxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/plans/${id}`, options);
    }
    /**
     * Update an existing Plan
     *
     * Required permissions:
     *
     * - `plan:update`
     * - `access_pass:basic:read`
     * - `plan:basic:read`
     *
     * @example
     * ```ts
     * const plan = await client.plans.update(
     *   'plan_xxxxxxxxxxxxx',
     * );
     * ```
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/plans/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists plans for a company
     *
     * Required permissions:
     *
     * - `plan:basic:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const planListResponse of client.plans.list({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     * })) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/plans', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Delete an existing Plan
     *
     * Required permissions:
     *
     * - `plan:delete`
     *
     * @example
     * ```ts
     * const plan = await client.plans.delete(
     *   'plan_xxxxxxxxxxxxx',
     * );
     * ```
     */ delete(id, options) {
        return this._client.delete(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/plans/${id}`, options);
    }
} //# sourceMappingURL=plans.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/products.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Products",
    ()=>Products
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Products extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new Product
     *
     * Required permissions:
     *
     * - `access_pass:create`
     * - `access_pass:basic:read`
     *
     * @example
     * ```ts
     * const product = await client.products.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   title: 'title',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/products', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a product by ID or route
     *
     * Required permissions:
     *
     * - `access_pass:basic:read`
     *
     * @example
     * ```ts
     * const product = await client.products.retrieve(
     *   'prod_xxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/products/${id}`, options);
    }
    /**
     * Updates an existing Product
     *
     * Required permissions:
     *
     * - `access_pass:update`
     * - `access_pass:basic:read`
     *
     * @example
     * ```ts
     * const product = await client.products.update(
     *   'prod_xxxxxxxxxxxxx',
     * );
     * ```
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/products/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists products for a company
     *
     * Required permissions:
     *
     * - `access_pass:basic:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const productListItem of client.products.list({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     * })) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/products', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Deletes an existing Product
     *
     * Required permissions:
     *
     * - `access_pass:delete`
     *
     * @example
     * ```ts
     * const product = await client.products.delete(
     *   'prod_xxxxxxxxxxxxx',
     * );
     * ```
     */ delete(id, options) {
        return this._client.delete(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/products/${id}`, options);
    }
} //# sourceMappingURL=products.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/promo-codes.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PromoCodes",
    ()=>PromoCodes
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class PromoCodes extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Create a new promo code for a product or plan
     *
     * Required permissions:
     *
     * - `promo_code:create`
     * - `access_pass:basic:read`
     *
     * @example
     * ```ts
     * const promoCode = await client.promoCodes.create({
     *   amount_off: 6.9,
     *   base_currency: 'usd',
     *   code: 'code',
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   new_users_only: true,
     *   promo_duration_months: 42,
     *   promo_type: 'percentage',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/promo_codes', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a promo code by ID
     *
     * Required permissions:
     *
     * - `promo_code:basic:read`
     * - `access_pass:basic:read`
     *
     * @example
     * ```ts
     * const promoCode = await client.promoCodes.retrieve(
     *   'promo_xxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/promo_codes/${id}`, options);
    }
    /**
     * Lists promo codes for a company
     *
     * Required permissions:
     *
     * - `promo_code:basic:read`
     * - `access_pass:basic:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const promoCodeListResponse of client.promoCodes.list(
     *   { company_id: 'biz_xxxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/promo_codes', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Archive a promo code, preventing further use
     *
     * Required permissions:
     *
     * - `promo_code:delete`
     *
     * @example
     * ```ts
     * const promoCode = await client.promoCodes.delete(
     *   'promo_xxxxxxxxxxxx',
     * );
     * ```
     */ delete(id, options) {
        return this._client.delete(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/promo_codes/${id}`, options);
    }
} //# sourceMappingURL=promo-codes.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/reactions.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Reactions",
    ()=>Reactions
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Reactions extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new reaction
     *
     * Required permissions:
     *
     * - `chat:read`
     */ create(body, options) {
        return this._client.post('/reactions', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a reaction
     *
     * Required permissions:
     *
     * - `chat:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/reactions/${id}`, options);
    }
    /**
     * Lists reactions for a post or a message
     *
     * Required permissions:
     *
     * - `chat:read`
     */ list(query, options) {
        return this._client.getAPIList('/reactions', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=reactions.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/refunds.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Refunds",
    ()=>Refunds
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Refunds extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a Refund by ID
     *
     * Required permissions:
     *
     * - `payment:basic:read`
     * - `member:email:read`
     * - `member:basic:read`
     * - `member:phone:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/refunds/${id}`, options);
    }
    /**
     * Lists Refunds for a payment.
     *
     * Required permissions:
     *
     * - `payment:basic:read`
     */ list(query, options) {
        return this._client.getAPIList('/refunds', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=refunds.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/reviews.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Reviews",
    ()=>Reviews
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Reviews extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieve a review by its ID
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/reviews/${id}`, options);
    }
    /**
     * List all reviews
     */ list(query, options) {
        return this._client.getAPIList('/reviews', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=reviews.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/setup-intents.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SetupIntents",
    ()=>SetupIntents
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class SetupIntents extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * A setup intent is an object used to securely collect and store a member’s
     * payment method for future use without charging them immediately. It handles
     * authentication steps up front so future off-session payments can be completed
     * smoothly. This ensures the payment method is verified and ready for later
     * billing.
     *
     * Required permissions:
     *
     * - `payment:setup_intent:read`
     * - `member:basic:read`
     * - `member:email:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/setup_intents/${id}`, options);
    }
    /**
     * A setup intent is an object used to securely collect and store a member’s
     * payment method for future use without charging them immediately. It handles
     * authentication steps up front so future off-session payments can be completed
     * smoothly. This ensures the payment method is verified and ready for later
     * billing.
     *
     * Required permissions:
     *
     * - `payment:setup_intent:read`
     * - `member:basic:read`
     * - `member:email:read`
     */ list(query, options) {
        return this._client.getAPIList('/setup_intents', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=setup-intents.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/shipments.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Shipments",
    ()=>Shipments
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Shipments extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new shipment
     *
     * Required permissions:
     *
     * - `shipment:create`
     * - `payment:basic:read`
     *
     * @example
     * ```ts
     * const shipment = await client.shipments.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   payment_id: 'pay_xxxxxxxxxxxxxx',
     *   tracking_code: 'tracking_code',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/shipments', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a shipment by ID
     *
     * Required permissions:
     *
     * - `shipment:basic:read`
     * - `payment:basic:read`
     *
     * @example
     * ```ts
     * const shipment = await client.shipments.retrieve(
     *   'ship_xxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/shipments/${id}`, options);
    }
    /**
     * Lists shipments for a payment
     *
     * Required permissions:
     *
     * - `shipment:basic:read`
     * - `payment:basic:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const shipmentListResponse of client.shipments.list()) {
     *   // ...
     * }
     * ```
     */ list(query = {}, options) {
        return this._client.getAPIList('/shipments', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=shipments.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/support-channels.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SupportChannels",
    ()=>SupportChannels
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class SupportChannels extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Create a new support channel for a user in a company. If one already exists, it
     * will return the existing one.
     *
     * Required permissions:
     *
     * - `support_chat:create`
     *
     * @example
     * ```ts
     * const supportChannel = await client.supportChannels.create({
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   user_id: 'user_xxxxxxxxxxxxx',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/support_channels', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a support channel
     *
     * Required permissions:
     *
     * - `support_chat:read`
     *
     * @example
     * ```ts
     * const supportChannel =
     *   await client.supportChannels.retrieve('id');
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/support_channels/${id}`, options);
    }
    /**
     * Lists chat channels inside a company
     *
     * Required permissions:
     *
     * - `support_chat:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const supportChannelListResponse of client.supportChannels.list(
     *   { company_id: 'biz_xxxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/support_channels', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=support-channels.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/topups.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Topups",
    ()=>Topups
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
;
class Topups extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Add funds to your platform balance by charging a stored payment method.
     *
     * Required permissions:
     *
     * - `payment:charge`
     *
     * @example
     * ```ts
     * const topup = await client.topups.create({
     *   amount: 6.9,
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   currency: 'usd',
     *   payment_method_id: 'pmt_xxxxxxxxxxxxxx',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/topups', {
            body,
            ...options
        });
    }
} //# sourceMappingURL=topups.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/transfers.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Transfers",
    ()=>Transfers
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Transfers extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new transfer between ledger accounts
     *
     * Required permissions:
     *
     * - `payout:transfer_funds`
     *
     * @example
     * ```ts
     * const transfer = await client.transfers.create({
     *   amount: 6.9,
     *   currency: 'usd',
     *   destination_id: 'destination_id',
     *   origin_id: 'origin_id',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/transfers', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a transfer by ID
     *
     * Required permissions:
     *
     * - `payout:transfer:read`
     *
     * @example
     * ```ts
     * const transfer = await client.transfers.retrieve(
     *   'ctt_xxxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/transfers/${id}`, options);
    }
    /**
     * Lists transfers
     *
     * Required permissions:
     *
     * - `payout:transfer:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const transferListResponse of client.transfers.list()) {
     *   // ...
     * }
     * ```
     */ list(query = {}, options) {
        return this._client.getAPIList('/transfers', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=transfers.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/users.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Users",
    ()=>Users
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
class Users extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a user by ID or username
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/users/${id}`, options);
    }
    /**
     * Check if a user has access (and their access level) to a resource
     */ checkAccess(resourceID, params, options) {
        const { id } = params;
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/users/${id}/access/${resourceID}`, options);
    }
} //# sourceMappingURL=users.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/verifications.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Verifications",
    ()=>Verifications
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
class Verifications extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Retrieves a verification by ID
     *
     * Required permissions:
     *
     * - `payout:account:read`
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/verifications/${id}`, options);
    }
} //# sourceMappingURL=verifications.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/webhooks.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Webhooks",
    ()=>Webhooks
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$standardwebhooks$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/standardwebhooks/dist/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
;
class Webhooks extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a new webhook
     *
     * Required permissions:
     *
     * - `developer:manage_webhook`
     *
     * @example
     * ```ts
     * const webhook = await client.webhooks.create({
     *   url: 'https://example.com/path',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/webhooks', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a webhook by ID
     *
     * Required permissions:
     *
     * - `developer:manage_webhook`
     *
     * @example
     * ```ts
     * const webhook = await client.webhooks.retrieve(
     *   'hook_xxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/webhooks/${id}`, options);
    }
    /**
     * Updates a webhook
     *
     * Required permissions:
     *
     * - `developer:manage_webhook`
     *
     * @example
     * ```ts
     * const webhook = await client.webhooks.update(
     *   'hook_xxxxxxxxxxxxx',
     * );
     * ```
     */ update(id, body = {}, options) {
        return this._client.patch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/webhooks/${id}`, {
            body,
            ...options
        });
    }
    /**
     * Lists webhooks for a company
     *
     * Required permissions:
     *
     * - `developer:manage_webhook`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const webhookListResponse of client.webhooks.list(
     *   { company_id: 'biz_xxxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/webhooks', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
    /**
     * Deletes a webhook
     *
     * Required permissions:
     *
     * - `developer:manage_webhook`
     *
     * @example
     * ```ts
     * const webhook = await client.webhooks.delete(
     *   'hook_xxxxxxxxxxxxx',
     * );
     * ```
     */ delete(id, options) {
        return this._client.delete(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/webhooks/${id}`, options);
    }
    unwrap(body, { headers, key }) {
        if (headers !== undefined) {
            const keyStr = key === undefined ? this._client.webhookKey : key;
            if (keyStr === null) throw new Error('Webhook key must not be null in order to unwrap');
            const wh = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$standardwebhooks$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Webhook"](keyStr);
            wh.verify(body, headers);
        }
        return JSON.parse(body);
    }
} //# sourceMappingURL=webhooks.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/withdrawals.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Withdrawals",
    ()=>Withdrawals
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/resource.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/path.mjs [app-route] (ecmascript)");
;
;
;
class Withdrawals extends __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$resource$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIResource"] {
    /**
     * Creates a withdrawal request for a ledger account
     *
     * Required permissions:
     *
     * - `payout:withdraw_funds`
     * - `payout:destination:read`
     *
     * @example
     * ```ts
     * const withdrawal = await client.withdrawals.create({
     *   amount: 6.9,
     *   company_id: 'biz_xxxxxxxxxxxxxx',
     *   currency: 'usd',
     * });
     * ```
     */ create(body, options) {
        return this._client.post('/withdrawals', {
            body,
            ...options
        });
    }
    /**
     * Retrieves a withdrawal by ID
     *
     * Required permissions:
     *
     * - `payout:withdrawal:read`
     * - `payout:destination:read`
     *
     * @example
     * ```ts
     * const withdrawal = await client.withdrawals.retrieve(
     *   'wdrl_xxxxxxxxxxxxx',
     * );
     * ```
     */ retrieve(id, options) {
        return this._client.get(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$path$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["path"]`/withdrawals/${id}`, options);
    }
    /**
     * Lists withdrawals
     *
     * Required permissions:
     *
     * - `payout:withdrawal:read`
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const withdrawalListResponse of client.withdrawals.list(
     *   { company_id: 'biz_xxxxxxxxxxxxxx' },
     * )) {
     *   // ...
     * }
     * ```
     */ list(query, options) {
        return this._client.getAPIList('/withdrawals', __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CursorPage"], {
            query,
            ...options
        });
    }
} //# sourceMappingURL=withdrawals.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/resources/index.mjs [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$shared$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/shared.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$access$2d$tokens$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/access-tokens.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$account$2d$links$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/account-links.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$app$2d$builds$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/app-builds.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$apps$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/apps.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$authorized$2d$users$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/authorized-users.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$chat$2d$channels$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/chat-channels.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$checkout$2d$configurations$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/checkout-configurations.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$companies$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/companies.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$chapters$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/course-chapters.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$lesson$2d$interactions$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/course-lesson-interactions.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$lessons$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/course-lessons.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$students$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/course-students.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$courses$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/courses.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$disputes$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/disputes.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$entries$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/entries.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$experiences$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/experiences.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$fee$2d$markups$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/fee-markups.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$files$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/files.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$forum$2d$posts$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/forum-posts.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$forums$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/forums.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$invoices$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/invoices.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$leads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/leads.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$ledger$2d$accounts$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/ledger-accounts.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$members$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/members.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$memberships$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/memberships.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$messages$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/messages.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$notifications$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/notifications.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payment$2d$methods$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/payment-methods.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payments$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/payments.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payout$2d$methods$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/payout-methods.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$plans$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/plans.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$products$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/products.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$promo$2d$codes$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/promo-codes.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$reactions$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/reactions.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$refunds$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/refunds.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$reviews$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/reviews.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$setup$2d$intents$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/setup-intents.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$shipments$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/shipments.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$support$2d$channels$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/support-channels.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$topups$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/topups.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$transfers$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/transfers.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$users$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/users.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$verifications$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/verifications.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$webhooks$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/webhooks.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$withdrawals$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/withdrawals.mjs [app-route] (ecmascript)"); //# sourceMappingURL=index.mjs.map
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
}),
"[project]/waliet/node_modules/@whop/sdk/internal/headers.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildHeaders",
    ()=>buildHeaders,
    "isEmptyHeaders",
    ()=>isEmptyHeaders
]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/values.mjs [app-route] (ecmascript)");
;
const brand_privateNullableHeaders = /* @__PURE__ */ Symbol('brand.privateNullableHeaders');
function* iterateHeaders(headers) {
    if (!headers) return;
    if (brand_privateNullableHeaders in headers) {
        const { values, nulls } = headers;
        yield* values.entries();
        for (const name of nulls){
            yield [
                name,
                null
            ];
        }
        return;
    }
    let shouldClear = false;
    let iter;
    if (headers instanceof Headers) {
        iter = headers.entries();
    } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isReadonlyArray"])(headers)) {
        iter = headers;
    } else {
        shouldClear = true;
        iter = Object.entries(headers ?? {});
    }
    for (let row of iter){
        const name = row[0];
        if (typeof name !== 'string') throw new TypeError('expected header name to be a string');
        const values = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isReadonlyArray"])(row[1]) ? row[1] : [
            row[1]
        ];
        let didClear = false;
        for (const value of values){
            if (value === undefined) continue;
            // Objects keys always overwrite older headers, they never append.
            // Yield a null to clear the header before adding the new values.
            if (shouldClear && !didClear) {
                didClear = true;
                yield [
                    name,
                    null
                ];
            }
            yield [
                name,
                value
            ];
        }
    }
}
const buildHeaders = (newHeaders)=>{
    const targetHeaders = new Headers();
    const nullHeaders = new Set();
    for (const headers of newHeaders){
        const seenHeaders = new Set();
        for (const [name, value] of iterateHeaders(headers)){
            const lowerName = name.toLowerCase();
            if (!seenHeaders.has(lowerName)) {
                targetHeaders.delete(name);
                seenHeaders.add(lowerName);
            }
            if (value === null) {
                targetHeaders.delete(name);
                nullHeaders.add(lowerName);
            } else {
                targetHeaders.append(name, value);
                nullHeaders.delete(lowerName);
            }
        }
    }
    return {
        [brand_privateNullableHeaders]: true,
        values: targetHeaders,
        nulls: nullHeaders
    };
};
const isEmptyHeaders = (headers)=>{
    for (const _ of iterateHeaders(headers))return false;
    return true;
}; //# sourceMappingURL=headers.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/internal/utils/env.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
/**
 * Read an environment variable.
 *
 * Trims beginning and trailing whitespace.
 *
 * Will return undefined if the environment variable doesn't exist or cannot be accessed.
 */ __turbopack_context__.s([
    "readEnv",
    ()=>readEnv
]);
const readEnv = (env)=>{
    if (typeof globalThis.process !== 'undefined') {
        return globalThis.process.env?.[env]?.trim() ?? undefined;
    }
    if (typeof globalThis.Deno !== 'undefined') {
        return globalThis.Deno.env?.get?.(env)?.trim();
    }
    return undefined;
}; //# sourceMappingURL=env.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/lib/verify-user-token.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getUserToken",
    ()=>getUserToken,
    "makeUserTokenVerifierFromSdk",
    ()=>makeUserTokenVerifierFromSdk,
    "verifyUserToken",
    ()=>verifyUserToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$key$2f$import$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/jose/dist/webapi/key/import.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/jose/dist/webapi/jwt/verify.js [app-route] (ecmascript)");
;
const USER_TOKEN_HEADER_NAME = 'x-whop-user-token';
const USER_TOKEN_VERIFICATION_KEY = '{"kty":"EC","x":"rz8a8vxvexHC0TLT91g7llOdDOsNuYiGEfic4Qhni-E","y":"zH0QblKYToexd5PEIMGXPVJS9AB5smKrW4S_TbiXrOs","crv":"P-256"}';
function getUserToken(tokenOrHeadersOrRequest, options) {
    const headerName = options?.headerName ?? USER_TOKEN_HEADER_NAME;
    if (typeof tokenOrHeadersOrRequest === 'string') return tokenOrHeadersOrRequest;
    if (tokenOrHeadersOrRequest instanceof Headers) return tokenOrHeadersOrRequest.get(headerName);
    if (tokenOrHeadersOrRequest instanceof Request) return tokenOrHeadersOrRequest.headers.get(headerName);
    return null;
}
function makeUserTokenVerifierFromSdk(client) {
    return async function verifyUserToken(tokenOrHeadersOrRequest, options) {
        if (!client.appID) {
            throw Error('You must set appID in the Whop client constructor if you want to verify user tokens.');
        }
        const baseOptions = {
            appId: client.appID
        };
        return await internalVerifyUserToken(tokenOrHeadersOrRequest, {
            ...baseOptions,
            ...options
        });
    };
}
function verifyUserToken(tokenOrHeadersOrRequest, overrideOptions) {
    return internalVerifyUserToken(tokenOrHeadersOrRequest, {
        ...overrideOptions
    });
}
async function internalVerifyUserToken(tokenOrHeadersOrRequest, options) {
    try {
        const tokenString = getUserToken(tokenOrHeadersOrRequest, {
            headerName: options?.headerName
        });
        if (!tokenString) {
            throw new Error('Whop user token not found. If you are the app developer, ensure you are developing in the whop.com iframe and have the dev proxy enabled.');
        }
        const jwkString = options.publicKey ?? USER_TOKEN_VERIFICATION_KEY;
        const key = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$key$2f$import$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["importJWK"])(JSON.parse(jwkString), 'ES256').catch(()=>{
            throw new Error('Invalid public key provided to verifyUserToken');
        });
        const token = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jwtVerify"])(tokenString, key, {
            issuer: 'urn:whopcom:exp-proxy'
        }).catch((_e)=>{
            throw new Error('Invalid user token provided to verifyUserToken');
        });
        if (!(token.payload.sub && token.payload.aud) || Array.isArray(token.payload.aud)) {
            throw new Error('Invalid user token provided to verifyUserToken');
        }
        if (options.appId && token.payload.aud !== options.appId) throw new Error('Invalid app id provided to verifyUserToken');
        return {
            appId: token.payload.aud,
            userId: token.payload.sub
        };
    } catch (e) {
        if (options.dontThrow) {
            return null;
        }
        throw e;
    }
} //# sourceMappingURL=verify-user-token.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/client.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Whop",
    ()=>Whop
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/tslib.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$uuid$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/uuid.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/values.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$sleep$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/sleep.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$errors$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/errors.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$detect$2d$platform$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/detect-platform.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$shims$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/shims.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$request$2d$options$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/request-options.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/qs/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$stringify$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/qs/stringify.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$version$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/version.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/error.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$uploads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/uploads.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$to$2d$file$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/to-file.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$apps$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/apps.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$invoices$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/invoices.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$lesson$2d$interactions$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/course-lesson-interactions.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$products$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/products.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$companies$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/companies.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$webhooks$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/webhooks.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$plans$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/plans.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$entries$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/entries.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$forum$2d$posts$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/forum-posts.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$transfers$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/transfers.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$ledger$2d$accounts$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/ledger-accounts.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$memberships$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/memberships.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$authorized$2d$users$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/authorized-users.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$app$2d$builds$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/app-builds.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$shipments$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/shipments.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$checkout$2d$configurations$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/checkout-configurations.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$messages$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/messages.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$chat$2d$channels$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/chat-channels.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$users$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/users.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payments$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/payments.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$support$2d$channels$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/support-channels.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$experiences$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/experiences.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$reactions$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/reactions.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$members$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/members.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$forums$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/forums.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$promo$2d$codes$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/promo-codes.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$courses$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/courses.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$chapters$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/course-chapters.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$lessons$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/course-lessons.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$reviews$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/reviews.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$students$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/course-students.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$access$2d$tokens$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/access-tokens.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$notifications$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/notifications.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$disputes$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/disputes.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$refunds$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/refunds.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$withdrawals$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/withdrawals.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$account$2d$links$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/account-links.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$setup$2d$intents$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/setup-intents.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payment$2d$methods$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/payment-methods.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$fee$2d$markups$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/fee-markups.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payout$2d$methods$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/payout-methods.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$verifications$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/verifications.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$leads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/leads.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$topups$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/topups.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$files$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/resources/files.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$api$2d$promise$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/api-promise.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$headers$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/headers.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$env$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/env.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/internal/utils/log.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$lib$2f$verify$2d$user$2d$token$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/lib/verify-user-token.mjs [app-route] (ecmascript)");
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _Whop_instances, _a, _Whop_encoder, _Whop_baseURLOverridden;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
class Whop {
    /**
     * API Client for interfacing with the Whop API.
     *
     * @param {string | undefined} [opts.apiKey=process.env['WHOP_API_KEY'] ?? undefined]
     * @param {string | null | undefined} [opts.webhookKey=process.env['WHOP_WEBHOOK_SECRET'] ?? null]
     * @param {string | null | undefined} [opts.appID=process.env['WHOP_APP_ID'] ?? null]
     * @param {string} [opts.baseURL=process.env['WHOP_BASE_URL'] ?? https://api.whop.com/api/v1] - Override the default base URL for the API.
     * @param {number} [opts.timeout=1 minute] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
     * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
     * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
     * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
     */ constructor({ baseURL = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$env$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["readEnv"])('WHOP_BASE_URL'), apiKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$env$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["readEnv"])('WHOP_API_KEY'), webhookKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$env$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["readEnv"])('WHOP_WEBHOOK_SECRET') ?? null, appID = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$env$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["readEnv"])('WHOP_APP_ID') ?? null, ...opts } = {}){
        _Whop_instances.add(this);
        _Whop_encoder.set(this, void 0);
        this.verifyUserToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$lib$2f$verify$2d$user$2d$token$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeUserTokenVerifierFromSdk"])(this);
        this.apps = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$apps$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Apps"](this);
        this.invoices = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$invoices$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Invoices"](this);
        this.courseLessonInteractions = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$lesson$2d$interactions$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CourseLessonInteractions"](this);
        this.products = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$products$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Products"](this);
        this.companies = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$companies$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Companies"](this);
        this.webhooks = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$webhooks$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Webhooks"](this);
        this.plans = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$plans$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Plans"](this);
        this.entries = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$entries$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Entries"](this);
        this.forumPosts = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$forum$2d$posts$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ForumPosts"](this);
        this.transfers = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$transfers$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Transfers"](this);
        this.ledgerAccounts = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$ledger$2d$accounts$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LedgerAccounts"](this);
        this.memberships = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$memberships$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Memberships"](this);
        this.authorizedUsers = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$authorized$2d$users$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AuthorizedUsers"](this);
        this.appBuilds = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$app$2d$builds$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AppBuilds"](this);
        this.shipments = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$shipments$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Shipments"](this);
        this.checkoutConfigurations = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$checkout$2d$configurations$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CheckoutConfigurations"](this);
        this.messages = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$messages$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Messages"](this);
        this.chatChannels = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$chat$2d$channels$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ChatChannels"](this);
        this.users = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$users$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Users"](this);
        this.payments = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payments$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Payments"](this);
        this.supportChannels = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$support$2d$channels$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SupportChannels"](this);
        this.experiences = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$experiences$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Experiences"](this);
        this.reactions = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$reactions$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Reactions"](this);
        this.members = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$members$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Members"](this);
        this.forums = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$forums$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Forums"](this);
        this.promoCodes = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$promo$2d$codes$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PromoCodes"](this);
        this.courses = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$courses$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Courses"](this);
        this.courseChapters = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$chapters$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CourseChapters"](this);
        this.courseLessons = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$lessons$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CourseLessons"](this);
        this.reviews = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$reviews$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Reviews"](this);
        this.courseStudents = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$students$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CourseStudents"](this);
        this.accessTokens = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$access$2d$tokens$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AccessTokens"](this);
        this.notifications = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$notifications$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Notifications"](this);
        this.disputes = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$disputes$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Disputes"](this);
        this.refunds = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$refunds$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Refunds"](this);
        this.withdrawals = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$withdrawals$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Withdrawals"](this);
        this.accountLinks = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$account$2d$links$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AccountLinks"](this);
        this.setupIntents = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$setup$2d$intents$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SetupIntents"](this);
        this.paymentMethods = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payment$2d$methods$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PaymentMethods"](this);
        this.feeMarkups = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$fee$2d$markups$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FeeMarkups"](this);
        this.payoutMethods = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payout$2d$methods$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PayoutMethods"](this);
        this.verifications = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$verifications$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Verifications"](this);
        this.leads = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$leads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Leads"](this);
        this.topups = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$topups$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Topups"](this);
        this.files = new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$files$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Files"](this);
        if (apiKey === undefined) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WhopError"]("The WHOP_API_KEY environment variable is missing or empty; either provide it, or instantiate the Whop client with an apiKey option, like new Whop({ apiKey: 'My API Key' }).");
        }
        const options = {
            apiKey,
            webhookKey,
            appID,
            ...opts,
            baseURL: baseURL || `https://api.whop.com/api/v1`
        };
        this.baseURL = options.baseURL;
        this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT /* 1 minute */ ;
        this.logger = options.logger ?? console;
        const defaultLogLevel = 'warn';
        // Set default logLevel early so that we can log a warning in parseLogLevel.
        this.logLevel = defaultLogLevel;
        this.logLevel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseLogLevel"])(options.logLevel, 'ClientOptions.logLevel', this) ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseLogLevel"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$env$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["readEnv"])('WHOP_LOG'), "process.env['WHOP_LOG']", this) ?? defaultLogLevel;
        this.fetchOptions = options.fetchOptions;
        this.maxRetries = options.maxRetries ?? 2;
        this.fetch = options.fetch ?? __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$shims$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDefaultFetch"]();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["__classPrivateFieldSet"])(this, _Whop_encoder, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$request$2d$options$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FallbackEncoder"], "f");
        this._options = options;
        this.apiKey = apiKey;
        this.webhookKey = webhookKey;
        this.appID = appID;
    }
    /**
     * Create a new client instance re-using the same options given to the current client with optional overriding.
     */ withOptions(options) {
        const client = new this.constructor({
            ...this._options,
            baseURL: this.baseURL,
            maxRetries: this.maxRetries,
            timeout: this.timeout,
            logger: this.logger,
            logLevel: this.logLevel,
            fetch: this.fetch,
            fetchOptions: this.fetchOptions,
            apiKey: this.apiKey,
            webhookKey: this.webhookKey,
            appID: this.appID,
            ...options
        });
        return client;
    }
    defaultQuery() {
        return this._options.defaultQuery;
    }
    validateHeaders({ values, nulls }) {
        return;
    }
    async authHeaders(opts) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$headers$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildHeaders"])([
            {
                Authorization: `Bearer ${this.apiKey}`
            }
        ]);
    }
    stringifyQuery(query) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$qs$2f$stringify$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stringify"](query, {
            arrayFormat: 'brackets'
        });
    }
    getUserAgent() {
        return `${this.constructor.name}/JS ${__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$version$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VERSION"]}`;
    }
    defaultIdempotencyKey() {
        return `stainless-node-retry-${(0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$uuid$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uuid4"])()}`;
    }
    makeStatusError(status, error, message, headers) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIError"].generate(status, error, message, headers);
    }
    buildURL(path, query, defaultBaseURL) {
        const baseURL = !(0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["__classPrivateFieldGet"])(this, _Whop_instances, "m", _Whop_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
        const url = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isAbsoluteURL"])(path) ? new URL(path) : new URL(baseURL + (baseURL.endsWith('/') && path.startsWith('/') ? path.slice(1) : path));
        const defaultQuery = this.defaultQuery();
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isEmptyObj"])(defaultQuery)) {
            query = {
                ...defaultQuery,
                ...query
            };
        }
        if (typeof query === 'object' && query && !Array.isArray(query)) {
            url.search = this.stringifyQuery(query);
        }
        return url.toString();
    }
    /**
     * Used as a callback for mutating the given `FinalRequestOptions` object.
     */ async prepareOptions(options) {}
    /**
     * Used as a callback for mutating the given `RequestInit` object.
     *
     * This is useful for cases where you want to add certain headers based off of
     * the request properties, e.g. `method` or `url`.
     */ async prepareRequest(request, { url, options }) {}
    get(path, opts) {
        return this.methodRequest('get', path, opts);
    }
    post(path, opts) {
        return this.methodRequest('post', path, opts);
    }
    patch(path, opts) {
        return this.methodRequest('patch', path, opts);
    }
    put(path, opts) {
        return this.methodRequest('put', path, opts);
    }
    delete(path, opts) {
        return this.methodRequest('delete', path, opts);
    }
    methodRequest(method, path, opts) {
        return this.request(Promise.resolve(opts).then((opts)=>{
            return {
                method,
                path,
                ...opts
            };
        }));
    }
    request(options, remainingRetries = null) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$api$2d$promise$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIPromise"](this, this.makeRequest(options, remainingRetries, undefined));
    }
    async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
        const options = await optionsInput;
        const maxRetries = options.maxRetries ?? this.maxRetries;
        if (retriesRemaining == null) {
            retriesRemaining = maxRetries;
        }
        await this.prepareOptions(options);
        const { req, url, timeout } = await this.buildRequest(options, {
            retryCount: maxRetries - retriesRemaining
        });
        await this.prepareRequest(req, {
            url,
            options
        });
        /** Not an API request ID, just for correlating local log entries. */ const requestLogID = 'log_' + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, '0');
        const retryLogStr = retryOfRequestLogID === undefined ? '' : `, retryOf: ${retryOfRequestLogID}`;
        const startTime = Date.now();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).debug(`[${requestLogID}] sending request`, (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatRequestDetails"])({
            retryOfRequestLogID,
            method: options.method,
            url,
            options,
            headers: req.headers
        }));
        if (options.signal?.aborted) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIUserAbortError"]();
        }
        const controller = new AbortController();
        const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(__TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$errors$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["castToError"]);
        const headersTime = Date.now();
        if (response instanceof globalThis.Error) {
            const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
            if (options.signal?.aborted) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIUserAbortError"]();
            }
            // detect native connection timeout errors
            // deno throws "TypeError: error sending request for url (https://example/): client error (Connect): tcp connect error: Operation timed out (os error 60): Operation timed out (os error 60)"
            // undici throws "TypeError: fetch failed" with cause "ConnectTimeoutError: Connect Timeout Error (attempted address: example:443, timeout: 1ms)"
            // others do not provide enough information to distinguish timeouts from other connection errors
            const isTimeout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$errors$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isAbortError"])(response) || /timed? ?out/i.test(String(response) + ('cause' in response ? String(response.cause) : ''));
            if (retriesRemaining) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).info(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - ${retryMessage}`);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).debug(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} (${retryMessage})`, (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatRequestDetails"])({
                    retryOfRequestLogID,
                    url,
                    durationMs: headersTime - startTime,
                    message: response.message
                }));
                return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).info(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - error; no more retries left`);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).debug(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} (error; no more retries left)`, (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatRequestDetails"])({
                retryOfRequestLogID,
                url,
                durationMs: headersTime - startTime,
                message: response.message
            }));
            if (isTimeout) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIConnectionTimeoutError"]();
            }
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIConnectionError"]({
                cause: response
            });
        }
        const responseInfo = `[${requestLogID}${retryLogStr}] ${req.method} ${url} ${response.ok ? 'succeeded' : 'failed'} with status ${response.status} in ${headersTime - startTime}ms`;
        if (!response.ok) {
            const shouldRetry = await this.shouldRetry(response);
            if (retriesRemaining && shouldRetry) {
                const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
                // We don't need the body of this response.
                await __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$shims$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CancelReadableStream"](response.body);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).info(`${responseInfo} - ${retryMessage}`);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).debug(`[${requestLogID}] response error (${retryMessage})`, (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatRequestDetails"])({
                    retryOfRequestLogID,
                    url: response.url,
                    status: response.status,
                    headers: response.headers,
                    durationMs: headersTime - startTime
                }));
                return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
            }
            const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).info(`${responseInfo} - ${retryMessage}`);
            const errText = await response.text().catch((err)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$errors$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["castToError"])(err).message);
            const errJSON = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["safeJSON"])(errText);
            const errMessage = errJSON ? undefined : errText;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).debug(`[${requestLogID}] response error (${retryMessage})`, (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatRequestDetails"])({
                retryOfRequestLogID,
                url: response.url,
                status: response.status,
                headers: response.headers,
                message: errMessage,
                durationMs: Date.now() - startTime
            }));
            const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
            throw err;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).info(responseInfo);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loggerFor"])(this).debug(`[${requestLogID}] response start`, (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$log$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatRequestDetails"])({
            retryOfRequestLogID,
            url: response.url,
            status: response.status,
            headers: response.headers,
            durationMs: headersTime - startTime
        }));
        return {
            response,
            options,
            controller,
            requestLogID,
            retryOfRequestLogID,
            startTime
        };
    }
    getAPIList(path, Page, opts) {
        return this.requestAPIList(Page, {
            method: 'get',
            path,
            ...opts
        });
    }
    requestAPIList(Page, options) {
        const request = this.makeRequest(options, null, undefined);
        return new __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PagePromise"](this, request, Page);
    }
    async fetchWithTimeout(url, init, ms, controller) {
        const { signal, method, ...options } = init || {};
        if (signal) signal.addEventListener('abort', ()=>controller.abort());
        const timeout = setTimeout(()=>controller.abort(), ms);
        const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === 'object' && options.body !== null && Symbol.asyncIterator in options.body;
        const fetchOptions = {
            signal: controller.signal,
            ...isReadableBody ? {
                duplex: 'half'
            } : {},
            method: 'GET',
            ...options
        };
        if (method) {
            // Custom methods like 'patch' need to be uppercased
            // See https://github.com/nodejs/undici/issues/2294
            fetchOptions.method = method.toUpperCase();
        }
        try {
            // use undefined this binding; fetch errors if bound to something else in browser/cloudflare
            return await this.fetch.call(undefined, url, fetchOptions);
        } finally{
            clearTimeout(timeout);
        }
    }
    async shouldRetry(response) {
        // Note this is not a standard header.
        const shouldRetryHeader = response.headers.get('x-should-retry');
        // If the server explicitly says whether or not to retry, obey.
        if (shouldRetryHeader === 'true') return true;
        if (shouldRetryHeader === 'false') return false;
        // Retry on request timeouts.
        if (response.status === 408) return true;
        // Retry on lock timeouts.
        if (response.status === 409) return true;
        // Retry on rate limits.
        if (response.status === 429) return true;
        // Retry internal errors.
        if (response.status >= 500) return true;
        return false;
    }
    async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
        let timeoutMillis;
        // Note the `retry-after-ms` header may not be standard, but is a good idea and we'd like proactive support for it.
        const retryAfterMillisHeader = responseHeaders?.get('retry-after-ms');
        if (retryAfterMillisHeader) {
            const timeoutMs = parseFloat(retryAfterMillisHeader);
            if (!Number.isNaN(timeoutMs)) {
                timeoutMillis = timeoutMs;
            }
        }
        // About the Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
        const retryAfterHeader = responseHeaders?.get('retry-after');
        if (retryAfterHeader && !timeoutMillis) {
            const timeoutSeconds = parseFloat(retryAfterHeader);
            if (!Number.isNaN(timeoutSeconds)) {
                timeoutMillis = timeoutSeconds * 1000;
            } else {
                timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
            }
        }
        // If the API asks us to wait a certain amount of time (and it's a reasonable amount),
        // just do what it says, but otherwise calculate a default
        if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1000)) {
            const maxRetries = options.maxRetries ?? this.maxRetries;
            timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$sleep$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sleep"])(timeoutMillis);
        return this.makeRequest(options, retriesRemaining - 1, requestLogID);
    }
    calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
        const initialRetryDelay = 0.5;
        const maxRetryDelay = 8.0;
        const numRetries = maxRetries - retriesRemaining;
        // Apply exponential backoff, but not more than the max.
        const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
        // Apply some jitter, take up to at most 25 percent of the retry time.
        const jitter = 1 - Math.random() * 0.25;
        return sleepSeconds * jitter * 1000;
    }
    async buildRequest(inputOptions, { retryCount = 0 } = {}) {
        const options = {
            ...inputOptions
        };
        const { method, path, query, defaultBaseURL } = options;
        const url = this.buildURL(path, query, defaultBaseURL);
        if ('timeout' in options) (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$utils$2f$values$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validatePositiveInteger"])('timeout', options.timeout);
        options.timeout = options.timeout ?? this.timeout;
        const { bodyHeaders, body } = this.buildBody({
            options
        });
        const reqHeaders = await this.buildHeaders({
            options: inputOptions,
            method,
            bodyHeaders,
            retryCount
        });
        const req = {
            method,
            headers: reqHeaders,
            ...options.signal && {
                signal: options.signal
            },
            ...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && {
                duplex: 'half'
            },
            ...body && {
                body
            },
            ...this.fetchOptions ?? {},
            ...options.fetchOptions ?? {}
        };
        return {
            req,
            url,
            timeout: options.timeout
        };
    }
    async buildHeaders({ options, method, bodyHeaders, retryCount }) {
        let idempotencyHeaders = {};
        if (this.idempotencyHeader && method !== 'get') {
            if (!options.idempotencyKey) options.idempotencyKey = this.defaultIdempotencyKey();
            idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
        }
        const headers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$headers$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildHeaders"])([
            idempotencyHeaders,
            {
                Accept: 'application/json',
                'User-Agent': this.getUserAgent(),
                'X-Stainless-Retry-Count': String(retryCount),
                ...options.timeout ? {
                    'X-Stainless-Timeout': String(Math.trunc(options.timeout / 1000))
                } : {},
                ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$detect$2d$platform$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlatformHeaders"])(),
                'X-Whop-App-Id': this.appID
            },
            await this.authHeaders(options),
            this._options.defaultHeaders,
            bodyHeaders,
            options.headers
        ]);
        this.validateHeaders(headers);
        return headers.values;
    }
    buildBody({ options: { body, headers: rawHeaders } }) {
        if (!body) {
            return {
                bodyHeaders: undefined,
                body: undefined
            };
        }
        const headers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$headers$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildHeaders"])([
            rawHeaders
        ]);
        if (// Pass raw type verbatim
        ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === 'string' && // Preserve legacy string encoding behavior for now
        headers.values.has('content-type') || globalThis.Blob && body instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
        body instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
        body instanceof URLSearchParams || globalThis.ReadableStream && body instanceof globalThis.ReadableStream) {
            return {
                bodyHeaders: undefined,
                body: body
            };
        } else if (typeof body === 'object' && (Symbol.asyncIterator in body || Symbol.iterator in body && 'next' in body && typeof body.next === 'function')) {
            return {
                bodyHeaders: undefined,
                body: __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$shims$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ReadableStreamFrom"](body)
            };
        } else {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$tslib$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["__classPrivateFieldGet"])(this, _Whop_encoder, "f").call(this, {
                body,
                headers
            });
        }
    }
}
_a = Whop, _Whop_encoder = new WeakMap(), _Whop_instances = new WeakSet(), _Whop_baseURLOverridden = function _Whop_baseURLOverridden() {
    return this.baseURL !== 'https://api.whop.com/api/v1';
};
Whop.Whop = _a;
Whop.DEFAULT_TIMEOUT = 60000; // 1 minute
Whop.WhopError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WhopError"];
Whop.APIError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIError"];
Whop.APIConnectionError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIConnectionError"];
Whop.APIConnectionTimeoutError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIConnectionTimeoutError"];
Whop.APIUserAbortError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APIUserAbortError"];
Whop.NotFoundError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NotFoundError"];
Whop.ConflictError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ConflictError"];
Whop.RateLimitError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RateLimitError"];
Whop.BadRequestError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BadRequestError"];
Whop.AuthenticationError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AuthenticationError"];
Whop.InternalServerError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["InternalServerError"];
Whop.PermissionDeniedError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PermissionDeniedError"];
Whop.UnprocessableEntityError = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UnprocessableEntityError"];
Whop.toFile = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$internal$2f$to$2d$file$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toFile"];
Whop.Apps = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$apps$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Apps"];
Whop.Invoices = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$invoices$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Invoices"];
Whop.CourseLessonInteractions = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$lesson$2d$interactions$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CourseLessonInteractions"];
Whop.Products = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$products$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Products"];
Whop.Companies = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$companies$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Companies"];
Whop.Webhooks = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$webhooks$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Webhooks"];
Whop.Plans = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$plans$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Plans"];
Whop.Entries = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$entries$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Entries"];
Whop.ForumPosts = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$forum$2d$posts$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ForumPosts"];
Whop.Transfers = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$transfers$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Transfers"];
Whop.LedgerAccounts = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$ledger$2d$accounts$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LedgerAccounts"];
Whop.Memberships = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$memberships$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Memberships"];
Whop.AuthorizedUsers = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$authorized$2d$users$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AuthorizedUsers"];
Whop.AppBuilds = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$app$2d$builds$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AppBuilds"];
Whop.Shipments = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$shipments$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Shipments"];
Whop.CheckoutConfigurations = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$checkout$2d$configurations$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CheckoutConfigurations"];
Whop.Messages = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$messages$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Messages"];
Whop.ChatChannels = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$chat$2d$channels$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ChatChannels"];
Whop.Users = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$users$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Users"];
Whop.Payments = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payments$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Payments"];
Whop.SupportChannels = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$support$2d$channels$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SupportChannels"];
Whop.Experiences = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$experiences$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Experiences"];
Whop.Reactions = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$reactions$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Reactions"];
Whop.Members = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$members$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Members"];
Whop.Forums = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$forums$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Forums"];
Whop.PromoCodes = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$promo$2d$codes$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PromoCodes"];
Whop.Courses = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$courses$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Courses"];
Whop.CourseChapters = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$chapters$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CourseChapters"];
Whop.CourseLessons = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$lessons$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CourseLessons"];
Whop.Reviews = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$reviews$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Reviews"];
Whop.CourseStudents = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$course$2d$students$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CourseStudents"];
Whop.AccessTokens = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$access$2d$tokens$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AccessTokens"];
Whop.Notifications = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$notifications$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Notifications"];
Whop.Disputes = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$disputes$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Disputes"];
Whop.Refunds = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$refunds$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Refunds"];
Whop.Withdrawals = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$withdrawals$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Withdrawals"];
Whop.AccountLinks = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$account$2d$links$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AccountLinks"];
Whop.SetupIntents = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$setup$2d$intents$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SetupIntents"];
Whop.PaymentMethods = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payment$2d$methods$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PaymentMethods"];
Whop.FeeMarkups = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$fee$2d$markups$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FeeMarkups"];
Whop.PayoutMethods = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$payout$2d$methods$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PayoutMethods"];
Whop.Verifications = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$verifications$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Verifications"];
Whop.Leads = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$leads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Leads"];
Whop.Topups = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$topups$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Topups"];
Whop.Files = __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$resources$2f$files$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Files"]; //# sourceMappingURL=client.mjs.map
}),
"[project]/waliet/node_modules/@whop/sdk/index.mjs [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/client.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$uploads$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/uploads.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$api$2d$promise$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/api-promise.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$pagination$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/pagination.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$waliet$2f$node_modules$2f40$whop$2f$sdk$2f$core$2f$error$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/waliet/node_modules/@whop/sdk/core/error.mjs [app-route] (ecmascript)"); //# sourceMappingURL=index.mjs.map
;
;
;
;
;
;
}),
];

//# sourceMappingURL=48459_%40whop_sdk_5b34bbf0._.js.map