/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Note for non-coders: this file is generated from docs/permissions-capability-matrix.json
 * so web and iOS use the same permission wording source.
 */

import { PermissionCapabilityMatrix, PermissionCapability, SharedPermissionState } from "../types/permissions";

export const SUPPORTED_PERMISSION_COPY_LOCALES = ["sv","en"] as const;
export type PermissionCopyLocale = (typeof SUPPORTED_PERMISSION_COPY_LOCALES)[number];

export const DEFAULT_PERMISSION_LOCALE_BY_CLIENT = {
  "web": "sv",
  "ios": "en"
} as const;

export const SHARED_PERMISSION_STATE_LABELS_BY_LOCALE = {
  "sv": {
    "allowed": "Tillåten",
    "blocked": "Blockerad",
    "limited": "Begränsad",
    "action_needed": "Åtgärd krävs"
  },
  "en": {
    "allowed": "Allowed",
    "blocked": "Blocked",
    "limited": "Limited",
    "action_needed": "Action needed"
  }
} as const;

export const SHARED_PERMISSION_CAPABILITY_LABELS_BY_LOCALE = {
  "notifications": {
    "sv": "Notiser",
    "en": "Notifications"
  },
  "background_refresh": {
    "sv": "Bakgrundsuppdatering",
    "en": "Background refresh"
  },
  "biometric_passkey": {
    "sv": "Biometri / passkey",
    "en": "Biometric / passkey"
  },
  "calendar": {
    "sv": "Kalender",
    "en": "Calendar"
  }
} as const;

export const SHARED_PERMISSION_CAPABILITY_MATRIX_BY_LOCALE = {
  "sv": {
    "notifications": {
      "allowed": {
        "explanation": "Tillåten: påminnelser och adminuppdateringar kan levereras.",
        "actionLabel": "Kontrollera igen"
      },
      "blocked": {
        "explanation": "Blockerad: notiser är avstängda för appen. Öppna systemets/webbläsarens inställningar och tillåt notiser.",
        "actionLabel": "Öppna inställningar"
      },
      "limited": {
        "explanation": "Begränsad: endast vissa notisytor är tillgängliga på den här enheten/webbläsaren.",
        "actionLabel": "Öppna inställningar"
      },
      "action_needed": {
        "explanation": "Åtgärd krävs: ge notisbehörighet för att få påminnelser.",
        "actionLabel": "Begär"
      }
    },
    "background_refresh": {
      "allowed": {
        "explanation": "Tillåten: bakgrundsleverans/-uppdatering är tillgänglig.",
        "actionLabel": "Kontrollera igen"
      },
      "blocked": {
        "explanation": "Blockerad: bakgrundsaktivitet är avstängd i systeminställningar.",
        "actionLabel": "Öppna inställningar"
      },
      "limited": {
        "explanation": "Begränsad: bakgrundsbeteende beror på begränsningar i webbläsare eller operativsystem.",
        "actionLabel": "Öppna inställningar"
      },
      "action_needed": {
        "explanation": "Åtgärd krävs: aktivera stöd för bakgrundsaktivitet och försök igen.",
        "actionLabel": "Öppna inställningar"
      }
    },
    "biometric_passkey": {
      "allowed": {
        "explanation": "Tillåten: biometrisk/passkey-funktionalitet är redo att användas.",
        "actionLabel": "Kontrollera igen"
      },
      "blocked": {
        "explanation": "Blockerad: användning av biometri/passkey är avstängd i systeminställningar.",
        "actionLabel": "Öppna inställningar"
      },
      "limited": {
        "explanation": "Begränsad: den här enheten/webbläsaren har inte fullt stöd för biometri eller passkey.",
        "actionLabel": "Öppna inställningar"
      },
      "action_needed": {
        "explanation": "Åtgärd krävs: aktivera biometri/passkey och bekräfta konfigurationen.",
        "actionLabel": "Begär"
      }
    },
    "calendar": {
      "allowed": {
        "explanation": "Tillåten: kalenderåtkomst finns för att spara matcher.",
        "actionLabel": "Kontrollera igen"
      },
      "blocked": {
        "explanation": "Blockerad: kalenderbehörighet nekas. Öppna inställningar och tillåt kalenderåtkomst.",
        "actionLabel": "Öppna inställningar"
      },
      "limited": {
        "explanation": "Begränsad: webben kan inte slå av/på operativsystemets kalenderbehörighet direkt.",
        "actionLabel": "Öppna kalenderinställningar"
      },
      "action_needed": {
        "explanation": "Åtgärd krävs: ge kalenderåtkomst för att spara matcher automatiskt.",
        "actionLabel": "Begär"
      }
    }
  },
  "en": {
    "notifications": {
      "allowed": {
        "explanation": "Allowed: reminders and admin updates can be delivered.",
        "actionLabel": "Retry check"
      },
      "blocked": {
        "explanation": "Blocked: notifications are off for this app. Open system/browser settings and allow notifications.",
        "actionLabel": "Open Settings"
      },
      "limited": {
        "explanation": "Limited: only partial notification surfaces are available on this device/browser.",
        "actionLabel": "Open Settings"
      },
      "action_needed": {
        "explanation": "Action needed: grant notification permission to receive reminders.",
        "actionLabel": "Request"
      }
    },
    "background_refresh": {
      "allowed": {
        "explanation": "Allowed: background delivery/refresh is available.",
        "actionLabel": "Retry check"
      },
      "blocked": {
        "explanation": "Blocked: background activity is disabled in system settings.",
        "actionLabel": "Open Settings"
      },
      "limited": {
        "explanation": "Limited: background behavior depends on browser or OS constraints.",
        "actionLabel": "Open Settings"
      },
      "action_needed": {
        "explanation": "Action needed: enable background activity support, then retry.",
        "actionLabel": "Open Settings"
      }
    },
    "biometric_passkey": {
      "allowed": {
        "explanation": "Allowed: biometric/passkey features are ready to use.",
        "actionLabel": "Retry check"
      },
      "blocked": {
        "explanation": "Blocked: biometric/passkey usage is disabled in system settings.",
        "actionLabel": "Open Settings"
      },
      "limited": {
        "explanation": "Limited: this device/browser does not fully support biometric or passkey features.",
        "actionLabel": "Open Settings"
      },
      "action_needed": {
        "explanation": "Action needed: enable biometric/passkey and confirm setup.",
        "actionLabel": "Request"
      }
    },
    "calendar": {
      "allowed": {
        "explanation": "Allowed: calendar access is available for saving matches.",
        "actionLabel": "Retry check"
      },
      "blocked": {
        "explanation": "Blocked: calendar permission is denied. Open settings and allow calendar access.",
        "actionLabel": "Open Settings"
      },
      "limited": {
        "explanation": "Limited: web cannot directly toggle OS calendar permission.",
        "actionLabel": "Open calendar settings"
      },
      "action_needed": {
        "explanation": "Action needed: grant calendar access to save matches automatically.",
        "actionLabel": "Request"
      }
    }
  }
} as const;

export const SHARED_PERMISSION_PLATFORM_DIFFERENCES_BY_LOCALE = {
  "sv": "Plattformsskillnader: webben kan begära notisbehörighet, men bakgrundsbeteende beror på service workers/webbläsarpolicyer och kalenderbehörighet kan inte ändras direkt; iOS kan begära notis- och kalenderbehörighet, medan Bakgrundsuppdatering och biometrisk tillgänglighet beror på iOS-inställningar/enhetsstöd.",
  "en": "Platform differences: web can request Notifications, but background behavior depends on service workers/browser policies and calendar permission cannot be toggled directly; iOS can request Notifications and Calendar, while Background App Refresh and biometric availability depend on iOS Settings/device support."
} as const;

// Note for non-coders:
// Existing web screens default to Swedish. These constants keep old imports working.
export const SHARED_PERMISSION_CAPABILITY_MATRIX: PermissionCapabilityMatrix = {
  "notifications": {
    "allowed": {
      "explanation": "Tillåten: påminnelser och adminuppdateringar kan levereras.",
      "actionLabel": "Kontrollera igen"
    },
    "blocked": {
      "explanation": "Blockerad: notiser är avstängda för appen. Öppna systemets/webbläsarens inställningar och tillåt notiser.",
      "actionLabel": "Öppna inställningar"
    },
    "limited": {
      "explanation": "Begränsad: endast vissa notisytor är tillgängliga på den här enheten/webbläsaren.",
      "actionLabel": "Öppna inställningar"
    },
    "action_needed": {
      "explanation": "Åtgärd krävs: ge notisbehörighet för att få påminnelser.",
      "actionLabel": "Begär"
    }
  },
  "background_refresh": {
    "allowed": {
      "explanation": "Tillåten: bakgrundsleverans/-uppdatering är tillgänglig.",
      "actionLabel": "Kontrollera igen"
    },
    "blocked": {
      "explanation": "Blockerad: bakgrundsaktivitet är avstängd i systeminställningar.",
      "actionLabel": "Öppna inställningar"
    },
    "limited": {
      "explanation": "Begränsad: bakgrundsbeteende beror på begränsningar i webbläsare eller operativsystem.",
      "actionLabel": "Öppna inställningar"
    },
    "action_needed": {
      "explanation": "Åtgärd krävs: aktivera stöd för bakgrundsaktivitet och försök igen.",
      "actionLabel": "Öppna inställningar"
    }
  },
  "biometric_passkey": {
    "allowed": {
      "explanation": "Tillåten: biometrisk/passkey-funktionalitet är redo att användas.",
      "actionLabel": "Kontrollera igen"
    },
    "blocked": {
      "explanation": "Blockerad: användning av biometri/passkey är avstängd i systeminställningar.",
      "actionLabel": "Öppna inställningar"
    },
    "limited": {
      "explanation": "Begränsad: den här enheten/webbläsaren har inte fullt stöd för biometri eller passkey.",
      "actionLabel": "Öppna inställningar"
    },
    "action_needed": {
      "explanation": "Åtgärd krävs: aktivera biometri/passkey och bekräfta konfigurationen.",
      "actionLabel": "Begär"
    }
  },
  "calendar": {
    "allowed": {
      "explanation": "Tillåten: kalenderåtkomst finns för att spara matcher.",
      "actionLabel": "Kontrollera igen"
    },
    "blocked": {
      "explanation": "Blockerad: kalenderbehörighet nekas. Öppna inställningar och tillåt kalenderåtkomst.",
      "actionLabel": "Öppna inställningar"
    },
    "limited": {
      "explanation": "Begränsad: webben kan inte slå av/på operativsystemets kalenderbehörighet direkt.",
      "actionLabel": "Öppna kalenderinställningar"
    },
    "action_needed": {
      "explanation": "Åtgärd krävs: ge kalenderåtkomst för att spara matcher automatiskt.",
      "actionLabel": "Begär"
    }
  }
};

export const SHARED_PERMISSION_PLATFORM_DIFFERENCES = SHARED_PERMISSION_PLATFORM_DIFFERENCES_BY_LOCALE[DEFAULT_PERMISSION_LOCALE_BY_CLIENT.web];

export const SHARED_PERMISSION_STATE_LABELS: Record<SharedPermissionState, string> = SHARED_PERMISSION_STATE_LABELS_BY_LOCALE[DEFAULT_PERMISSION_LOCALE_BY_CLIENT.web];

export const SHARED_PERMISSION_CAPABILITY_LABELS: Record<PermissionCapability, string> = {
  "notifications": "Notiser",
  "background_refresh": "Bakgrundsuppdatering",
  "biometric_passkey": "Biometri / passkey",
  "calendar": "Kalender"
};
