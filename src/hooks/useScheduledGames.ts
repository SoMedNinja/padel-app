import { useQuery } from "@tanstack/react-query";
import { availabilityService } from "../services/availabilityService";
import { queryKeys } from "../utils/queryKeys";

// Note for non-coders: this hook loads the scheduled games list so multiple pages can reuse it.
export const useScheduledGames = () => {
  return useQuery({
    queryKey: queryKeys.scheduledGames(),
    queryFn: () => availabilityService.getScheduledGames(),
  });
};
