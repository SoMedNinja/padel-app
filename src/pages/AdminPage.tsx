import React from "react";
import AdminPanel from "../Components/AdminPanel";
import { useStore } from "../store/useStore";
import { useProfiles } from "../hooks/useProfiles";
import { useQueryClient } from "@tanstack/react-query";
import { Profile } from "../types";

export default function AdminPage() {
  const { user } = useStore();
  const { data: profiles = [] as Profile[] } = useProfiles();
  const queryClient = useQueryClient();

  const handleProfileUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
  };

  const handleProfileDelete = () => {
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
  };

  if (!user?.is_admin) return <div>Access denied.</div>;

  return (
    <section id="admin" className="page-section">
      <AdminPanel
        user={user}
        profiles={profiles}
        onProfileUpdate={handleProfileUpdate}
        onProfileDelete={handleProfileDelete}
      />
    </section>
  );
}
