import { useQuery } from "@tanstack/react-query";

export function useWalletBalances() {
  return useQuery({
    queryKey: ["wallet-balances"],
    queryFn: async () => {
      return { data: { balance: 0 }, isLoading: false };
    },
  });
}
