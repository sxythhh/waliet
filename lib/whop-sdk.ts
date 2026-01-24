import { Whop } from "@whop/sdk";

// Lazy initialize Whop SDK to avoid build-time errors
let _whopsdk: Whop | null = null;

export const whopsdk = new Proxy({} as Whop, {
  get(_, prop) {
    if (!_whopsdk) {
      _whopsdk = new Whop({
        appApiKey: process.env.WHOP_API_KEY,
      });
    }
    return (_whopsdk as any)[prop];
  },
});
