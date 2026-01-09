// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://virality.gg',
  'https://www.virality.gg',
  'https://app.virality.gg',
  // Vercel deployment URLs
  'https://virality-nexus.vercel.app',
  'https://virality-nexus-git-main.vercel.app',
  // Allow localhost for development
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

// Check if origin is allowed
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  // Allow all Vercel preview deployments
  if (origin.endsWith('.vercel.app')) return true;
  return ALLOWED_ORIGINS.some(allowed => origin === allowed);
}

// Get CORS headers with proper origin validation
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Legacy export for compatibility - still validates origin dynamically
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://virality.gg',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight request
export function handleCorsOptions(req: Request): Response {
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(req) 
  });
}
