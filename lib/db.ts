import { createClient } from "@supabase/supabase-js";

// Admin client for server-side operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Types
export interface DbUser {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  username: string | null;
  bio: string | null;
  whopUserId: string | null;
  supabaseUserId: string | null;
  accountType: "creator" | "brand" | null;
  onboardingCompleted: boolean;
  website: string | null;
  referralSource: string | null;
  monthlyBudget: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerProfile {
  id: string;
  userId: string;
  hourlyRate: number;
  bio: string | null;
  tagline: string | null;
  timezone: string | null;
  averageRating: number | null;
  totalSessionsCompleted: number;
  totalHoursDelivered: number;
  totalReviews: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbUserWithSellerProfile extends DbUser {
  sellerProfile: SellerProfile | null;
}

// Database operations
export const db = {
  user: {
    // Merge a Whop-only user with a Supabase user that has the complete data
    async mergeUsersIfNeeded(whopUser: DbUser): Promise<DbUser> {
      // If the Whop user already has accountType set, no merge needed
      if (whopUser.accountType) {
        return whopUser;
      }

      // Try to find another user with the same email that has accountType set
      if (whopUser.email) {
        const { data: emailUsers } = await supabaseAdmin
          .from("User")
          .select("*")
          .eq("email", whopUser.email)
          .neq("id", whopUser.id)
          .not("accountType", "is", null);

        if (emailUsers && emailUsers.length > 0) {
          const sourceUser = emailUsers[0] as DbUser;
          console.log("[DB] Merging user data from:", sourceUser.id, "to:", whopUser.id);

          // Update the Whop user with data from the source user
          const { data: updated } = await supabaseAdmin
            .from("User")
            .update({
              accountType: sourceUser.accountType,
              supabaseUserId: sourceUser.supabaseUserId || whopUser.supabaseUserId,
              onboardingCompleted: sourceUser.onboardingCompleted || whopUser.onboardingCompleted,
              website: sourceUser.website || whopUser.website,
              referralSource: sourceUser.referralSource || whopUser.referralSource,
              monthlyBudget: sourceUser.monthlyBudget || whopUser.monthlyBudget,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", whopUser.id)
            .select("*")
            .single();

          if (updated) {
            console.log("[DB] Merged successfully, accountType:", updated.accountType);
            return updated as DbUser;
          }
        }
      }

      return whopUser;
    },

    async findById(id: string): Promise<DbUser | null> {
      const { data, error } = await supabaseAdmin
        .from("User")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) return null;
      return data as DbUser;
    },

    async findByIdOrThrow(id: string): Promise<DbUser> {
      const user = await this.findById(id);
      if (!user) throw new Error(`User not found: ${id}`);
      return user;
    },

    async findByWhopUserId(whopUserId: string): Promise<DbUser | null> {
      const { data, error } = await supabaseAdmin
        .from("User")
        .select("*")
        .eq("whopUserId", whopUserId)
        .single();

      if (error || !data) return null;
      return data as DbUser;
    },

    async findBySupabaseUserId(supabaseUserId: string): Promise<DbUser | null> {
      const { data, error } = await supabaseAdmin
        .from("User")
        .select("*")
        .eq("supabaseUserId", supabaseUserId)
        .single();

      if (error || !data) return null;
      return data as DbUser;
    },

    async findByEmail(email: string): Promise<DbUser | null> {
      const { data, error } = await supabaseAdmin
        .from("User")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error || !data) return null;
      return data as DbUser;
    },

    async findByEmailWithoutWhopId(email: string): Promise<DbUser | null> {
      const { data, error } = await supabaseAdmin
        .from("User")
        .select("*")
        .eq("email", email)
        .is("whopUserId", null)
        .maybeSingle();

      if (error || !data) return null;
      return data as DbUser;
    },

    async findByUsernameWithoutWhopId(username: string): Promise<DbUser | null> {
      const { data, error } = await supabaseAdmin
        .from("User")
        .select("*")
        .eq("username", username)
        .is("whopUserId", null)
        .maybeSingle();

      if (error || !data) return null;
      return data as DbUser;
    },

    async findByEmailWithWhopIdNoSupabase(email: string): Promise<DbUser | null> {
      const { data, error } = await supabaseAdmin
        .from("User")
        .select("*")
        .eq("email", email)
        .not("whopUserId", "is", null)
        .is("supabaseUserId", null)
        .maybeSingle();

      if (error || !data) return null;
      return data as DbUser;
    },

    async create(userData: Partial<DbUser>): Promise<DbUser> {
      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("User")
        .insert({
          id: userData.id || crypto.randomUUID(),
          ...userData,
          createdAt: now,
          updatedAt: now,
        })
        .select("*")
        .single();

      if (error) throw new Error(`Failed to create user: ${error.message}`);
      return data as DbUser;
    },

    async update(id: string, userData: Partial<DbUser>): Promise<DbUser> {
      const { data, error } = await supabaseAdmin
        .from("User")
        .update({
          ...userData,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw new Error(`Failed to update user: ${error.message}`);
      return data as DbUser;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabaseAdmin
        .from("User")
        .delete()
        .eq("id", id);

      if (error) throw new Error(`Failed to delete user: ${error.message}`);
    },

    async findActiveSellersExcept(excludeUserId: string): Promise<DbUserWithSellerProfile[]> {
      // Get all users with their seller profiles
      const { data: users, error: usersError } = await supabaseAdmin
        .from("User")
        .select("*")
        .neq("id", excludeUserId);

      if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);
      if (!users) return [];

      // Get all active seller profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("SellerProfile")
        .select("*")
        .eq("isActive", true);

      if (profilesError) throw new Error(`Failed to fetch seller profiles: ${profilesError.message}`);

      // Map profiles to users
      const profileMap = new Map<string, SellerProfile>();
      for (const profile of profiles || []) {
        profileMap.set(profile.userId, profile as SellerProfile);
      }

      return users.map((user) => ({
        ...user,
        sellerProfile: profileMap.get(user.id) || null,
      })) as DbUserWithSellerProfile[];
    },
  },

  onboarding: {
    async getProgress(userId: string): Promise<string[]> {
      const { data, error } = await supabaseAdmin
        .from("OnboardingProgress")
        .select("completedTasks")
        .eq("userId", userId)
        .single();

      if (error || !data) return [];
      return data.completedTasks || [];
    },

    async saveProgress(userId: string, completedTasks: string[]): Promise<void> {
      const { error } = await supabaseAdmin
        .from("OnboardingProgress")
        .upsert({
          userId,
          completedTasks,
          lastUpdated: new Date().toISOString(),
        });

      if (error) throw new Error(`Failed to save progress: ${error.message}`);
    },

    async toggleTask(userId: string, taskId: string): Promise<string[]> {
      const currentProgress = await this.getProgress(userId);
      const taskSet = new Set(currentProgress);

      if (taskSet.has(taskId)) {
        taskSet.delete(taskId);
      } else {
        taskSet.add(taskId);
      }

      const newProgress = Array.from(taskSet);
      await this.saveProgress(userId, newProgress);
      return newProgress;
    },
  },
};
