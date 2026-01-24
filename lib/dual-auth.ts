import { headers, cookies } from "next/headers";
import { createClient } from "./supabase/server";
import { whopsdk } from "./whop-sdk";
import { prisma } from "./prisma";

export type AuthProvider = "whop" | "supabase";

export interface DualAuthUser {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  provider: AuthProvider;
  providerId: string; // The ID from the auth provider (whopUserId or supabase user id)
}

export interface DualAuthResult {
  user: DualAuthUser;
  dbUser: {
    id: string;
    name: string | null;
    avatar: string | null;
    email: string | null;
    sellerProfile: {
      id: string;
      hourlyRate: number;
      bio: string | null;
      tagline: string | null;
      averageRating: number | null;
      totalSessionsCompleted: number;
      totalReviews: number;
      isVerified: boolean;
      isActive: boolean;
    } | null;
  };
}

/**
 * Get authenticated user from either Whop or Supabase
 * Tries Whop first (for in-app usage), then falls back to Supabase
 */
export async function getDualAuthUser(): Promise<DualAuthResult | null> {
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
 */
async function tryWhopAuth(): Promise<WhopUserData | null> {
  try {
    const cookieStore = await cookies();

    // Check if user explicitly logged out - skip ALL Whop auth
    const loggedOutCookie = cookieStore.get("waliet-logged-out");
    const loggedOut = loggedOutCookie?.value === "true";

    console.log("[DualAuth] waliet-logged-out cookie:", loggedOutCookie?.value, "| loggedOut:", loggedOut);

    if (loggedOut) {
      console.log("[DualAuth] User logged out, skipping Whop auth");
      return null;
    }

    // In development, allow bypassing auth with DEV_WHOP_USER_ID
    if (process.env.NODE_ENV === "development" && process.env.DEV_WHOP_USER_ID) {
      const userId = process.env.DEV_WHOP_USER_ID;
      const user = await whopsdk.users.retrieve(userId);
      type ExtendedWhopUser = { email?: string };
      const extendedUser = user as unknown as ExtendedWhopUser;
      return {
        userId,
        name: user.name,
        username: user.username,
        email: extendedUser.email,
        profilePicUrl: user.profile_picture?.url || undefined,
      };
    }

    // Normal auth flow - verify token from headers
    const headersList = await headers();
    const whopToken = headersList.get("x-whop-user-token");

    if (!whopToken) {
      return null;
    }

    const result = await whopsdk.verifyUserToken(headersList);
    const user = await whopsdk.users.retrieve(result.userId);
    type ExtendedWhopUser = { email?: string };
    const extendedUser = user as unknown as ExtendedWhopUser;

    return {
      userId: result.userId,
      name: user.name,
      username: user.username,
      email: extendedUser.email,
      profilePicUrl: user.profile_picture?.url || undefined,
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
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log("[DualAuth] Supabase not configured");
      return null;
    }

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    console.log("[DualAuth] Supabase auth check - user:", user?.id, "error:", error?.message);

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
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
 */
async function syncWhopUserToDatabase(whopUser: WhopUserData) {
  console.log("[DualAuth] Syncing Whop app view user:", {
    userId: whopUser.userId,
    username: whopUser.username,
    hasEmail: !!whopUser.email,
  });

  // First check if user already exists by Whop ID
  const existingWhopUser = await prisma.user.findUnique({
    where: { whopUserId: whopUser.userId },
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
          isActive: true,
        },
      },
    },
  });

  if (existingWhopUser) {
    // User already exists, just update
    const user = await prisma.user.update({
      where: { id: existingWhopUser.id },
      data: {
        name: whopUser.name,
        avatar: whopUser.profilePicUrl || null,
        email: whopUser.email || existingWhopUser.email, // Preserve existing email if available
        username: whopUser.username, // Update username
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
            isActive: true,
          },
        },
      },
    });

    // Create seller profile if doesn't exist
    if (!user.sellerProfile) {
      await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          hourlyRate: 0,
          isActive: true,
        },
      });

      return prisma.user.findUniqueOrThrow({
        where: { id: user.id },
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
              isActive: true,
            },
          },
        },
      });
    }

    return user;
  }

  // User doesn't exist by Whop ID
  // Try email-based linking first (if email available)
  if (whopUser.email) {
    const emailMatch = await prisma.user.findFirst({
      where: {
        email: whopUser.email,
        whopUserId: null,
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
            isActive: true,
          },
        },
      },
    });

    if (emailMatch) {
      console.log("[DualAuth] Linking Whop account via email:", {
        email: whopUser.email,
        whopUserId: whopUser.userId,
        existingUserId: emailMatch.id,
      });

      return prisma.user.update({
        where: { id: emailMatch.id },
        data: {
          whopUserId: whopUser.userId,
          username: whopUser.username,
          name: whopUser.name || emailMatch.name,
          avatar: whopUser.profilePicUrl || emailMatch.avatar,
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
              isActive: true,
            },
          },
        },
      });
    }
  }

  // Try username-based linking as fallback (less reliable)
  if (whopUser.username) {
    const usernameMatch = await prisma.user.findFirst({
      where: {
        username: whopUser.username,
        whopUserId: null,
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
            isActive: true,
          },
        },
      },
    });

    if (usernameMatch) {
      console.log("[DualAuth] Linking Whop account via username (fallback):", {
        username: whopUser.username,
        whopUserId: whopUser.userId,
        existingUserId: usernameMatch.id,
      });

      return prisma.user.update({
        where: { id: usernameMatch.id },
        data: {
          whopUserId: whopUser.userId,
          email: whopUser.email || usernameMatch.email,
          name: whopUser.name || usernameMatch.name,
          avatar: whopUser.profilePicUrl || usernameMatch.avatar,
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
              isActive: true,
            },
          },
        },
      });
    }
  }

  // No existing account found - create new user
  const user = await prisma.user.create({
    data: {
      whopUserId: whopUser.userId,
      username: whopUser.username,
      name: whopUser.name,
      avatar: whopUser.profilePicUrl || null,
      email: whopUser.email || null, // Usually null for app view users
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
          isActive: true,
        },
      },
    },
  });

  // Create seller profile if doesn't exist (everyone is a seller by default)
  if (!user.sellerProfile) {
    await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        hourlyRate: 0, // Default rate, user can set later
        isActive: true,
      },
    });

    // Fetch the updated user with seller profile
    return prisma.user.findUniqueOrThrow({
      where: { id: user.id },
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
            isActive: true,
          },
        },
      },
    });
  }

  return user;
}

async function syncSupabaseUserToDatabase(supabaseUser: SupabaseUserData) {
  // For Supabase users, we use supabaseUserId field
  // First check if user exists by supabaseUserId
  const existing = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
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
          isActive: true,
        },
      },
    },
  });

  if (existing) {
    // Update existing user
    console.log("[DualAuth] Supabase user already exists:", supabaseUser.id);
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: supabaseUser.name || existing.name,
        avatar: supabaseUser.avatar || existing.avatar,
        email: supabaseUser.email || existing.email,
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
            isActive: true,
          },
        },
      },
    });

    // Create seller profile if doesn't exist (everyone is a seller by default)
    if (!user.sellerProfile) {
      await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          hourlyRate: 0,
          isActive: true,
        },
      });

      return prisma.user.findUniqueOrThrow({
        where: { id: user.id },
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
              isActive: true,
            },
          },
        },
      });
    }

    return user;
  }

  // User doesn't exist by Supabase ID
  // Try email-based linking first (most reliable)
  if (supabaseUser.email) {
    const existingWhopUser = await prisma.user.findFirst({
      where: {
        email: supabaseUser.email,
        whopUserId: { not: null },
        supabaseUserId: null, // Make sure not already linked
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
            isActive: true,
          },
        },
      },
    });

    if (existingWhopUser) {
      // Found existing Whop account with same email - link accounts!
      console.log("[DualAuth] Linking Supabase ID to existing Whop account via email:", {
        email: supabaseUser.email,
        supabaseUserId: supabaseUser.id,
        existingUserId: existingWhopUser.id,
      });

      const linkedUser = await prisma.user.update({
        where: { id: existingWhopUser.id },
        data: {
          supabaseUserId: supabaseUser.id, // Link the Supabase ID
          name: supabaseUser.name || existingWhopUser.name,
          avatar: supabaseUser.avatar || existingWhopUser.avatar,
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
              isActive: true,
            },
          },
        },
      });

      return linkedUser;
    }
  }

  // Try username-based linking as fallback (only if Whop username is set)
  // Note: Supabase users don't have usernames by default, but Whop users do
  const potentialUsernameMatch = await prisma.user.findFirst({
    where: {
      username: { not: null },
      supabaseUserId: null,
      whopUserId: { not: null },
      email: supabaseUser.email, // Extra safety: only link if email also matches
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
          isActive: true,
        },
      },
    },
  });

  if (potentialUsernameMatch) {
    console.log("[DualAuth] Linking Supabase ID to existing Whop account via username+email:", {
      email: supabaseUser.email,
      username: potentialUsernameMatch.username,
      supabaseUserId: supabaseUser.id,
      existingUserId: potentialUsernameMatch.id,
    });

    const linkedUser = await prisma.user.update({
      where: { id: potentialUsernameMatch.id },
      data: {
        supabaseUserId: supabaseUser.id,
        name: supabaseUser.name || potentialUsernameMatch.name,
        avatar: supabaseUser.avatar || potentialUsernameMatch.avatar,
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
            isActive: true,
          },
        },
      },
    });

    return linkedUser;
  }

  // No existing account found - create new user
  console.log("[DualAuth] Creating new Supabase user:", supabaseUser.id);
  const newUser = await prisma.user.create({
    data: {
      supabaseUserId: supabaseUser.id,
      name: supabaseUser.name,
      avatar: supabaseUser.avatar,
      email: supabaseUser.email,
    },
  });

  // Create seller profile for new user
  await prisma.sellerProfile.create({
    data: {
      userId: newUser.id,
      hourlyRate: 0,
      isActive: true,
    },
  });

  return prisma.user.findUniqueOrThrow({
    where: { id: newUser.id },
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
          isActive: true,
        },
      },
    },
  });
}
