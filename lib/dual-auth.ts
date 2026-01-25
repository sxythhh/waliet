import { headers, cookies } from "next/headers";
import { createClient } from "./supabase/server";
import { whopsdk } from "./whop-sdk";
import { db, DbUser } from "./db";

export type AuthProvider = "whop" | "whop-oauth" | "supabase";

export interface DualAuthUser {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  provider: AuthProvider;
  providerId: string;
}

export interface DualAuthResult {
  user: DualAuthUser;
  dbUser: DbUser;
}

/**
 * Get authenticated user from either Whop or Supabase
 * Priority: Whop OAuth cookie → Whop header (app view) → Supabase session
 */
export async function getDualAuthUser(): Promise<DualAuthResult | null> {
  // Try Whop OAuth cookie FIRST (from "Continue with Whop" flow)
  const whopOAuthUser = await tryWhopOAuthCookie();
  if (whopOAuthUser) {
    console.log("[DualAuth] Authenticated via Whop OAuth cookie:", whopOAuthUser.user.id);
    return whopOAuthUser;
  }

  // Try Whop app view auth (x-whop-user-token header)
  const whopUser = await tryWhopAuth();
  if (whopUser) {
    console.log("[DualAuth] Authenticated via Whop app view:", whopUser.userId);
    const dbUser = await syncWhopUserToDatabase(whopUser);
    return {
      user: {
        id: dbUser.id,
        name: dbUser.name || whopUser.name,
        email: dbUser.email || whopUser.email || null,
        avatar: dbUser.avatar || whopUser.profilePicUrl || null,
        provider: "whop",
        providerId: whopUser.userId,
      },
      dbUser,
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
        providerId: supabaseUser.id,
      },
      dbUser,
    };
  }

  console.log("[DualAuth] No authentication found");
  return null;
}

interface WhopUserData {
  userId: string;
  name: string | null;
  username: string;
  email?: string;
  profilePicUrl?: string;
}

async function tryWhopAuth(): Promise<WhopUserData | null> {
  try {
    const cookieStore = await cookies();
    const loggedOutCookie = cookieStore.get("waliet-logged-out");
    if (loggedOutCookie?.value === "true") {
      console.log("[DualAuth] User logged out, skipping Whop auth");
      return null;
    }

    // In development, allow bypassing auth with DEV_WHOP_USER_ID
    if (process.env.NODE_ENV === "development" && process.env.DEV_WHOP_USER_ID) {
      const userId = process.env.DEV_WHOP_USER_ID;
      const user = await whopsdk.users.retrieve(userId);
      return {
        userId,
        name: user.name,
        username: user.username,
        profilePicUrl: user.profile_picture?.url || undefined,
      };
    }

    const headersList = await headers();
    const whopToken = headersList.get("x-whop-user-token");

    if (!whopToken) {
      return null;
    }

    try {
      const result = await whopsdk.verifyUserToken(headersList);
      const user = await whopsdk.users.retrieve(result.userId);
      return {
        userId: result.userId,
        name: user.name,
        username: user.username,
        profilePicUrl: user.profile_picture?.url || undefined,
      };
    } catch {
      // Fallback: Manually decode JWT
      try {
        const parts = whopToken.split(".");
        if (parts.length !== 3) return null;

        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
        const userId = payload.sub;
        if (!userId || !userId.startsWith("user_")) return null;

        const user = await whopsdk.users.retrieve(userId);
        return {
          userId,
          name: user.name,
          username: user.username,
          profilePicUrl: user.profile_picture?.url || undefined,
        };
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
}

async function tryWhopOAuthCookie(): Promise<DualAuthResult | null> {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("waliet-logged-out")?.value === "true") {
      return null;
    }

    const whopCookie = cookieStore.get("whop_oauth_user");
    if (!whopCookie) return null;

    const userData = JSON.parse(whopCookie.value);
    if (!userData.id) return null;

    const dbUser = await db.user.findById(userData.id);
    if (!dbUser) return null;

    return {
      user: {
        id: dbUser.id,
        name: dbUser.name || userData.name,
        email: dbUser.email || userData.email,
        avatar: dbUser.avatar,
        provider: "whop-oauth",
        providerId: userData.whopUserId || dbUser.whopUserId || dbUser.id,
      },
      dbUser,
    };
  } catch {
    return null;
  }
}

interface SupabaseUserData {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

async function trySupabaseAuth(): Promise<SupabaseUserData | null> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return null;
    }

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    };
  } catch {
    return null;
  }
}

async function syncWhopUserToDatabase(whopUser: WhopUserData): Promise<DbUser> {
  // Check if user exists by Whop ID
  const existingUser = await db.user.findByWhopUserId(whopUser.userId);

  if (existingUser) {
    // Also check if there's another user record with the same email
    // (e.g., from auth-standalone) and sync accountType from the most recently updated one
    if (whopUser.email) {
      const emailUser = await db.user.findByEmail(whopUser.email);
      if (emailUser && emailUser.id !== existingUser.id) {
        // There's a separate user record with the same email
        // Use the accountType from whichever record was updated more recently
        const emailUserDate = new Date(emailUser.updatedAt).getTime();
        const existingUserDate = new Date(existingUser.updatedAt).getTime();
        const useEmailUserAccountType = emailUserDate > existingUserDate && emailUser.accountType;

        console.log("[DualAuth] Found duplicate user records for email:", whopUser.email);
        console.log("[DualAuth] Existing (whop) user:", existingUser.id, "accountType:", existingUser.accountType, "updated:", existingUser.updatedAt);
        console.log("[DualAuth] Email user:", emailUser.id, "accountType:", emailUser.accountType, "updated:", emailUser.updatedAt);

        if (useEmailUserAccountType) {
          console.log("[DualAuth] Using accountType from email user:", emailUser.accountType);
          return db.user.update(existingUser.id, {
            name: whopUser.name,
            avatar: whopUser.profilePicUrl || null,
            email: whopUser.email || existingUser.email,
            username: whopUser.username,
            accountType: emailUser.accountType,
            onboardingCompleted: emailUser.onboardingCompleted || existingUser.onboardingCompleted,
            supabaseUserId: emailUser.supabaseUserId || existingUser.supabaseUserId,
          });
        }
      }
    }

    return db.user.update(existingUser.id, {
      name: whopUser.name,
      avatar: whopUser.profilePicUrl || null,
      email: whopUser.email || existingUser.email,
      username: whopUser.username,
    });
  }

  // Try email-based linking - find ANY user with this email (not just those without whopUserId)
  if (whopUser.email) {
    const emailMatch = await db.user.findByEmail(whopUser.email);
    if (emailMatch) {
      console.log("[DualAuth] Linking Whop user to existing email match:", emailMatch.id, "accountType:", emailMatch.accountType);
      return db.user.update(emailMatch.id, {
        whopUserId: whopUser.userId,
        username: whopUser.username || emailMatch.username,
        name: whopUser.name || emailMatch.name,
        avatar: whopUser.profilePicUrl || emailMatch.avatar,
        // Preserve accountType and onboarding status from existing record
      });
    }
  }

  // Try username-based linking
  if (whopUser.username) {
    const usernameMatch = await db.user.findByUsernameWithoutWhopId(whopUser.username);
    if (usernameMatch) {
      return db.user.update(usernameMatch.id, {
        whopUserId: whopUser.userId,
        email: whopUser.email || usernameMatch.email,
        name: whopUser.name || usernameMatch.name,
        avatar: whopUser.profilePicUrl || usernameMatch.avatar,
      });
    }
  }

  // Create new user
  return db.user.create({
    whopUserId: whopUser.userId,
    username: whopUser.username,
    name: whopUser.name,
    avatar: whopUser.profilePicUrl || null,
    email: whopUser.email || null,
  });
}

async function syncSupabaseUserToDatabase(supabaseUser: SupabaseUserData): Promise<DbUser> {
  // Check if user exists by Supabase ID
  const existing = await db.user.findBySupabaseUserId(supabaseUser.id);

  if (existing) {
    return db.user.update(existing.id, {
      name: supabaseUser.name || existing.name,
      avatar: supabaseUser.avatar || existing.avatar,
      email: supabaseUser.email || existing.email,
    });
  }

  // Try email-based linking
  if (supabaseUser.email) {
    const existingWhopUser = await db.user.findByEmailWithWhopIdNoSupabase(supabaseUser.email);
    if (existingWhopUser) {
      return db.user.update(existingWhopUser.id, {
        supabaseUserId: supabaseUser.id,
        name: supabaseUser.name || existingWhopUser.name,
        avatar: supabaseUser.avatar || existingWhopUser.avatar,
      });
    }
  }

  // Create new user
  return db.user.create({
    supabaseUserId: supabaseUser.id,
    name: supabaseUser.name,
    avatar: supabaseUser.avatar,
    email: supabaseUser.email,
  });
}
