import { useQuery } from "@tanstack/react-query";

export function useBuyerSessions() {
  return useQuery({
    queryKey: ["buyer-sessions"],
    queryFn: async () => {
      return { data: [], isLoading: false };
    },
  });
}
