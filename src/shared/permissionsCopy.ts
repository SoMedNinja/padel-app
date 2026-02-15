import { PermissionCapability, SharedPermissionState } from "../types/permissions";
import { SHARED_PERMISSION_CAPABILITY_MATRIX } from "./permissionCapabilityMatrix";

// Note for non-coders:
// "copy" means user-facing text. Keeping one table avoids different wording in different screens.
export const SHARED_PERMISSION_STATE_LABELS: Record<SharedPermissionState, string> = {
  allowed: "Tillåten",
  blocked: "Blockerad",
  limited: "Begränsad",
  action_needed: "Åtgärd krävs",
};

export const SHARED_PERMISSION_CAPABILITY_LABELS: Record<PermissionCapability, string> = {
  notifications: "Notiser",
  background_refresh: "Bakgrundsuppdatering",
  biometric_passkey: "Biometri / passkey",
  calendar: "Kalender",
};

export const WEB_PERMISSION_CAPABILITY_HELP: Record<PermissionCapability, string> = {
  // Note for non-coders: these short helper texts explain each permission card in everyday Swedish.
  notifications: "Webbläsaraviseringar för matchpåminnelser och adminuppdateringar.",
  background_refresh: "Service worker-beredskap för att ta emot push även när sidan är stängd.",
  biometric_passkey: "Om den här webbläsaren/enheten kan använda plattformsnycklar (passkeys).",
  calendar: "Webben kan inte slå av/på operativsystemets kalenderbehörighet direkt; kalenderfunktioner beror på din kalenderapp.",
};

export const IOS_PERMISSION_LIMITATIONS_COPY = {
  notifications:
    "På iPhone/iPad fungerar notiser först när du har lagt appen på hemskärmen och tillåtit notiser i iOS-inställningar.",
  backgroundRefresh:
    "iOS kan pausa bakgrundsuppdateringar för att spara batteri. Behåll appen på hemskärmen och tillåt Bakgrundsuppdatering i Inställningar.",
};

export function sharedPermissionGuidance(capability: PermissionCapability, state: SharedPermissionState): string {
  return SHARED_PERMISSION_CAPABILITY_MATRIX[capability][state].explanation;
}

export function sharedPermissionActionLabel(capability: PermissionCapability, state: SharedPermissionState): string {
  return SHARED_PERMISSION_CAPABILITY_MATRIX[capability][state].actionLabel;
}
