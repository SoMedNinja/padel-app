import { useQuery } from "@tanstack/react-query";
import { MatchFilter } from "../types";
import { queryKeys } from "../utils/queryKeys";
import { padelData } from "../data/padelData";

// Note for non-coders: this keeps the last response visible while new filters load.
const keepPreviousData = <T,>(previousData: T | undefined) => previousData;

export const useMatches = (filter: MatchFilter) => {
  return useQuery({
    queryKey: queryKeys.matches(filter),
    placeholderData: keepPreviousData,
    queryFn: () => padelData.matches.list(filter),
  });
};
