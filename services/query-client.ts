import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
      refetchOnWindowFocus: false, // mobile doesn't have window focus semantics
    },
    mutations: {
      retry: 1,
    },
  },
});
