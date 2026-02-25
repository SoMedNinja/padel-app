import { z } from "zod";
import { GUEST_ID } from "./guest";

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, "Spelarnamn krävs")
    .max(50, "Spelarnamn får vara max 50 tecken"),
  avatar_url: z.string().nullable().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const matchSubmissionSchema = z.object({
  team1: z.array(z.string().min(1, "Välj alla spelare")),
  team2: z.array(z.string().min(1, "Välj alla spelare")),
  team1_sets: z.number({ invalid_type_error: "Ange giltigt resultat" }).min(0, "Set kan inte vara negativt"),
  team2_sets: z.number({ invalid_type_error: "Ange giltigt resultat" }).min(0, "Set kan inte vara negativt"),
}).refine((data) => {
    // Check for duplicates across teams (excluding guest)
    const t1 = data.team1.filter(p => p !== GUEST_ID);
    const t2 = data.team2.filter(p => p !== GUEST_ID);
    const combined = [...t1, ...t2];
    const unique = new Set(combined);
    // Also ensure no player is in both teams (t1 and t2 intersection)
    // Actually `unique.size === combined.length` covers duplicates within same team AND across teams.
    return unique.size === combined.length;
}, {
    message: "Samma spelare kan inte vara med i båda lagen (och inte dubbletter i samma lag)",
    path: ["root"]
});

export type MatchSubmissionValues = z.infer<typeof matchSubmissionSchema>;
