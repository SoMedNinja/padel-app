import { PermissionCapabilityMatrix } from "../types/permissions";

// Note for non-coders:
// This is the shared capability matrix used as the source of truth for guidance text.
export const SHARED_PERMISSION_CAPABILITY_MATRIX: PermissionCapabilityMatrix = {
  notifications: {
    allowed: {
      explanation: "Tillåten: påminnelser och adminuppdateringar kan levereras.",
      actionLabel: "Kontrollera igen",
    },
    blocked: {
      explanation: "Blockerad: notiser är avstängda för appen. Öppna systemets/webbläsarens inställningar och tillåt notiser.",
      actionLabel: "Öppna inställningar",
    },
    limited: {
      explanation: "Begränsad: endast vissa notisytor är tillgängliga på den här enheten/webbläsaren.",
      actionLabel: "Öppna inställningar",
    },
    action_needed: {
      explanation: "Åtgärd krävs: ge notisbehörighet för att få påminnelser.",
      actionLabel: "Begär",
    },
  },
  background_refresh: {
    allowed: {
      explanation: "Tillåten: bakgrundsleverans/-uppdatering är tillgänglig.",
      actionLabel: "Kontrollera igen",
    },
    blocked: {
      explanation: "Blockerad: bakgrundsaktivitet är avstängd i systeminställningar.",
      actionLabel: "Öppna inställningar",
    },
    limited: {
      explanation: "Begränsad: bakgrundsbeteende beror på begränsningar i webbläsare eller operativsystem.",
      actionLabel: "Öppna inställningar",
    },
    action_needed: {
      explanation: "Åtgärd krävs: aktivera stöd för bakgrundsaktivitet och försök igen.",
      actionLabel: "Öppna inställningar",
    },
  },
  biometric_passkey: {
    allowed: {
      explanation: "Tillåten: biometrisk/passkey-funktionalitet är redo att användas.",
      actionLabel: "Kontrollera igen",
    },
    blocked: {
      explanation: "Blockerad: användning av biometri/passkey är avstängd i systeminställningar.",
      actionLabel: "Öppna inställningar",
    },
    limited: {
      explanation: "Begränsad: den här enheten/webbläsaren har inte fullt stöd för biometri eller passkey.",
      actionLabel: "Öppna inställningar",
    },
    action_needed: {
      explanation: "Åtgärd krävs: aktivera biometri/passkey och bekräfta konfigurationen.",
      actionLabel: "Begär",
    },
  },
  calendar: {
    allowed: {
      explanation: "Tillåten: kalenderåtkomst finns för att spara matcher.",
      actionLabel: "Kontrollera igen",
    },
    blocked: {
      explanation: "Blockerad: kalenderbehörighet nekas. Öppna inställningar och tillåt kalenderåtkomst.",
      actionLabel: "Öppna inställningar",
    },
    limited: {
      explanation: "Begränsad: webben kan inte slå av/på operativsystemets kalenderbehörighet direkt.",
      actionLabel: "Öppna kalenderinställningar",
    },
    action_needed: {
      explanation: "Åtgärd krävs: ge kalenderåtkomst för att spara matcher automatiskt.",
      actionLabel: "Begär",
    },
  },
};

export const SHARED_PERMISSION_PLATFORM_DIFFERENCES =
  "Plattformsskillnader: webben kan begära notisbehörighet, men bakgrundsbeteende beror på service workers/webbläsarpolicyer och kalenderbehörighet kan inte ändras direkt; iOS kan begära notis- och kalenderbehörighet, medan Bakgrundsuppdatering och biometrisk tillgänglighet beror på iOS-inställningar/enhetsstöd.";
