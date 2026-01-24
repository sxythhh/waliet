import { useQuery } from "@tanstack/react-query";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      return {
        data: {
          id: "",
          name: "",
          avatar: "",
          email: "",
          bio: "",
          createdAt: new Date().toISOString(),
          sellerProfile: null,
        },
        isLoading: false,
      };
    },
  });
}
