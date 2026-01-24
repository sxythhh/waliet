import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const headersList = await headers();

  // Get all headers
  const allHeaders: Record<string, string> = {};
  headersList.forEach((value, key) => {
    allHeaders[key] = value;
  });

  // Check for specific Whop-related headers
  const whopHeaders = {
    "x-whop-user-token": headersList.get("x-whop-user-token"),
    "x-whop-user-id": headersList.get("x-whop-user-id"),
    "authorization": headersList.get("authorization"),
  };

  return NextResponse.json({
    whopHeaders,
    allHeaders,
    url: request.url,
    cookies: request.cookies.getAll(),
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  });
}
