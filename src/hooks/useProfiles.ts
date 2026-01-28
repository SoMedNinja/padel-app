import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import { padelData } from "../data/padelData";

export const useProfiles = () => {
  return useQuery({
    queryKey: queryKeys.profiles(),
    queryFn: () => padelData.profiles.list(),
  });
};
