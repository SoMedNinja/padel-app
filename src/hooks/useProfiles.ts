import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { Profile } from "../types";
import { queryKeys } from "../utils/queryKeys";

export const useProfiles = () => {
  return useQuery({
    queryKey: queryKeys.profiles(),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });
};
