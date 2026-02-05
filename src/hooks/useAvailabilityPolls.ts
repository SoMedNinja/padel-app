import { useQuery } from "@tanstack/react-query";
import { availabilityService } from "../services/availabilityService";
import { queryKeys } from "../utils/queryKeys";

export const useAvailabilityPolls = () => {
  return useQuery({
    queryKey: queryKeys.availabilityPolls(),
    queryFn: () => availabilityService.getPolls(),
  });
};
