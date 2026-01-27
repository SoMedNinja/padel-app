import { supabase } from "../supabaseClient";
import { Profile } from "../types";

export const profileService = {
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    return (data || []) as Profile[];
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async upsertProfile(profile: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(profile, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  }
};
