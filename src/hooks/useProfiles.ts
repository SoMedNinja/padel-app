import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import { profileService } from "../services/profileService";

export const useProfiles = () => {
  return useQuery({
    queryKey: queryKeys.profiles(),
    queryFn: () => profileService.getProfiles(),
  });
};
