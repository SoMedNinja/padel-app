import { supabase } from "../supabaseClient";
import { Profile } from "../types";
import { checkIsAdmin } from "./authUtils";

const MAX_AVATAR_LENGTH = 3_000_000; // Security: Limit avatar data size to ~2.2MB

export const profileService = {
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    return (data || []) as Profile[];
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;
    const isAdmin = await checkIsAdmin(currentUser?.id);

    const filteredUpdates = { ...updates };

    // Security: prevent non-admins from escalating privileges or updating others
    if (!isAdmin) {
      if (!currentUser || currentUser.id !== id) {
        throw new Error("Du har inte behörighet att uppdatera denna profil.");
      }
      delete filteredUpdates.id;
      delete filteredUpdates.is_admin;
      delete filteredUpdates.is_approved;
      delete filteredUpdates.is_deleted;
    }

    if (filteredUpdates.avatar_url && filteredUpdates.avatar_url.length > MAX_AVATAR_LENGTH) {
      throw new Error("Profilbilden är för stor.");
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
    const isAdmin = await checkIsAdmin(currentUser?.id);

    const filteredProfile = { ...profile };

    // Security: prevent non-admins from escalating privileges or updating others
    if (!isAdmin) {
      if (!currentUser || (filteredProfile.id && currentUser.id !== filteredProfile.id)) {
        throw new Error("Du har inte behörighet att uppdatera denna profil.");
      }
      delete filteredProfile.is_admin;
      delete filteredProfile.is_approved;
      delete filteredProfile.is_deleted;
    }

    if (filteredProfile.avatar_url && filteredProfile.avatar_url.length > MAX_AVATAR_LENGTH) {
      throw new Error("Profilbilden är för stor.");
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
