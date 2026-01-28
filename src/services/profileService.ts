import { supabase } from "../supabaseClient";
import { Profile } from "../types";

export const profileService = {
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    return (data || []) as Profile[];
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    const filteredUpdates = { ...updates };

    // Security: prevent users from escalating their own privileges
    if (currentUser && currentUser.id === id) {
      delete filteredUpdates.is_admin;
      delete filteredUpdates.is_approved;
    }

    if (filteredUpdates.name) {
      filteredUpdates.name = filteredUpdates.name.trim();
      if (!filteredUpdates.name) {
        throw new Error("Namn får inte vara tomt");
      }
      if (filteredUpdates.name.length > 50) {
        throw new Error("Namnet är för långt (max 50 tecken)");
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(filteredUpdates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async upsertProfile(profile: Partial<Profile>): Promise<Profile> {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    const filteredProfile = { ...profile };

    // Security: prevent users from escalating their own privileges
    if (currentUser && currentUser.id === filteredProfile.id) {
      delete filteredProfile.is_admin;
      delete filteredProfile.is_approved;
    }

    if (filteredProfile.name) {
      filteredProfile.name = filteredProfile.name.trim();
      if (!filteredProfile.name) {
        throw new Error("Namn får inte vara tomt");
      }
      if (filteredProfile.name.length > 50) {
        throw new Error("Namnet är för långt (max 50 tecken)");
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(filteredProfile, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  }
};
