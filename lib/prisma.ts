// Stub Prisma client - returns mock data for development
// TODO: Replace with actual Supabase queries

const mockUser = {
  id: "mock-user-id",
  name: "Test User",
  email: null,
  avatar: null,
  username: null,
  whopUserId: null,
  supabaseUserId: null,
  bio: null,
  createdAt: new Date(),
  sellerProfile: {
    id: "mock-seller-id",
    hourlyRate: 5000,
    bio: null,
    tagline: null,
    averageRating: null,
    totalSessionsCompleted: 0,
    totalReviews: 0,
    isVerified: false,
    isActive: true,
  },
};

const createPrismaClient = () => {
  return {
    user: {
      findMany: async () => [],
      findUnique: async () => null,
      findFirst: async () => null,
      findUniqueOrThrow: async () => mockUser,
      create: async () => mockUser,
      update: async () => mockUser,
      delete: async () => null,
      upsert: async () => mockUser,
    },
    sellerProfile: {
      findMany: async () => [],
      findUnique: async () => null,
      findFirst: async () => null,
      create: async () => mockUser.sellerProfile,
      update: async () => mockUser.sellerProfile,
      delete: async () => null,
    },
  } as any;
};

export const prisma = createPrismaClient();
