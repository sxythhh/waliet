import { Whop } from "@whop/sdk";

// Initialize Whop SDK
export const whopsdk = new Whop({
  appApiKey: process.env.WHOP_API_KEY,
});
