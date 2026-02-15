export type UpdateUrgency = "optional" | "recommended" | "required";

export interface UpdateStateContent {
  title: string;
  message: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
}

// Note for non-coders:
// These three urgency levels are shared so web update prompts use the same words and button intent everywhere.
export const UPDATE_STATE_CONTENT: Record<UpdateUrgency, UpdateStateContent> = {
  optional: {
    title: "Uppdatering tillgänglig",
    message: "En ny version är redo. Uppdatera nu för senaste förbättringar, eller vänta till senare.",
    primaryActionLabel: "Uppdatera nu",
    secondaryActionLabel: "Senare",
  },
  recommended: {
    title: "Uppdatering rekommenderas",
    message: "En ny version finns. Uppdatera gärna snart för bättre stabilitet och nya förbättringar.",
    primaryActionLabel: "Uppdatera nu",
    secondaryActionLabel: "Senare",
  },
  required: {
    title: "Uppdatering krävs",
    message: "Din appversion är för gammal för den här miljön. Uppdatera nu för att fortsätta säkert.",
    primaryActionLabel: "Uppdatera nu",
  },
};
