import { useQuery } from "@tanstack/react-query";

export function useSellers() {
  return useQuery({
    queryKey: ["sellers"],
    queryFn: async () => {
      return { data: [], isLoading: false };
    },
  });
}
