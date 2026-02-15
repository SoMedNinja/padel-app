// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Note for non-coders: this file is generated from docs/permissions-capability-matrix.json
// so iOS guidance matches the shared permission matrix source.

import Foundation

// Note for non-coders:
// These are the same four state words we also use on web so both apps describe permissions consistently.
enum SharedPermissionState: String {
    case allowed = "allowed"
    case blocked = "blocked"
    case limited = "limited"
    case actionNeeded = "action_needed"

    var label: String {
        SharedPermissionGeneratedCopy.stateLabelsByLocale[SharedPermissionCapability.defaultLocale]?[self] ?? ""
    }
}

struct SharedPermissionSemanticCopy {
    let explanation: String
    let actionLabel: String
}

enum SharedPermissionCapability: String {
    case notifications
    case backgroundRefresh = "background_refresh"
    case biometricPasskey = "biometric_passkey"
    case calendar

    static let defaultLocale: SharedPermissionCopyLocale = .en

    var title: String {
        SharedPermissionGeneratedCopy.capabilityTitlesByLocale[Self.defaultLocale]?[self] ?? ""
    }

    var subtitle: String {
        SharedPermissionGeneratedCopy.capabilitySubtitlesByLocale[Self.defaultLocale]?[self] ?? ""
    }

    // Note for non-coders:
    // This dictionary is our source of truth for each capability + state pair, including guidance and button text.
    private static var semanticMatrix: [SharedPermissionCapability: [SharedPermissionState: SharedPermissionSemanticCopy]] {
        SharedPermissionGeneratedCopy.semanticMatrixByLocale[defaultLocale] ?? [:]
    }

    func guidance(for state: SharedPermissionState) -> String {
        SharedPermissionCapability.semanticMatrix[self]?[state]?.explanation ?? ""
    }

    func actionLabel(for state: SharedPermissionState) -> String {
        SharedPermissionCapability.semanticMatrix[self]?[state]?.actionLabel ?? "Retry check"
    }

    static var platformDifferencesCopy: String {
        SharedPermissionGeneratedCopy.platformDifferencesByLocale[defaultLocale] ?? ""
    }
}

enum SharedPermissionCopyLocale: String {
    case sv
    case en
}

enum SharedPermissionGeneratedCopy {
    static let supportedLocales: [SharedPermissionCopyLocale] = [.sv, .en]

    static let stateLabelsByLocale: [SharedPermissionCopyLocale: [SharedPermissionState: String]] = [
        .sv: [
            .allowed: "Tillåten",
            .blocked: "Blockerad",
            .limited: "Begränsad",
            .actionNeeded: "Åtgärd krävs"
        ],
        .en: [
            .allowed: "Allowed",
            .blocked: "Blocked",
            .limited: "Limited",
            .actionNeeded: "Action needed"
        ]
    ]

    static let capabilityTitlesByLocale: [SharedPermissionCopyLocale: [SharedPermissionCapability: String]] = [
        .sv: [
            .notifications: "Notiser",
            .backgroundRefresh: "Bakgrundsuppdatering",
            .biometricPasskey: "Biometri / passkey",
            .calendar: "Kalender"
        ],
        .en: [
            .notifications: "Notifications",
            .backgroundRefresh: "Background refresh",
            .biometricPasskey: "Biometric / passkey",
            .calendar: "Calendar"
        ]
    ]

    static let capabilitySubtitlesByLocale: [SharedPermissionCopyLocale: [SharedPermissionCapability: String]] = [
        .sv: [
            .notifications: "Matchpåminnelser och uppdateringar",
            .backgroundRefresh: "Låter appen uppdatera i bakgrunden",
            .biometricPasskey: "Använd Face ID / Touch ID för applås",
            .calendar: "Spara matcher i din kalender"
        ],
        .en: [
            .notifications: "Match reminders and updates",
            .backgroundRefresh: "Lets iOS wake the app for periodic data refresh",
            .biometricPasskey: "Use Face ID / Touch ID for app lock",
            .calendar: "Save matches to your calendar"
        ]
    ]

    static let semanticMatrixByLocale: [SharedPermissionCopyLocale: [SharedPermissionCapability: [SharedPermissionState: SharedPermissionSemanticCopy]]] = [
        .sv: [
            .notifications: [
                .allowed: SharedPermissionSemanticCopy(
                    explanation: "Tillåten: påminnelser och adminuppdateringar kan levereras.",
                    actionLabel: "Kontrollera igen"
                ),
                .blocked: SharedPermissionSemanticCopy(
                    explanation: "Blockerad: notiser är avstängda för appen. Öppna systemets/webbläsarens inställningar och tillåt notiser.",
                    actionLabel: "Öppna inställningar"
                ),
                .limited: SharedPermissionSemanticCopy(
                    explanation: "Begränsad: endast vissa notisytor är tillgängliga på den här enheten/webbläsaren.",
                    actionLabel: "Öppna inställningar"
                ),
                .actionNeeded: SharedPermissionSemanticCopy(
                    explanation: "Åtgärd krävs: ge notisbehörighet för att få påminnelser.",
                    actionLabel: "Begär"
                )
            ],
            .backgroundRefresh: [
                .allowed: SharedPermissionSemanticCopy(
                    explanation: "Tillåten: bakgrundsleverans/-uppdatering är tillgänglig.",
                    actionLabel: "Kontrollera igen"
                ),
                .blocked: SharedPermissionSemanticCopy(
                    explanation: "Blockerad: bakgrundsaktivitet är avstängd i systeminställningar.",
                    actionLabel: "Öppna inställningar"
                ),
                .limited: SharedPermissionSemanticCopy(
                    explanation: "Begränsad: bakgrundsbeteende beror på begränsningar i webbläsare eller operativsystem.",
                    actionLabel: "Öppna inställningar"
                ),
                .actionNeeded: SharedPermissionSemanticCopy(
                    explanation: "Åtgärd krävs: aktivera stöd för bakgrundsaktivitet och försök igen.",
                    actionLabel: "Öppna inställningar"
                )
            ],
            .biometricPasskey: [
                .allowed: SharedPermissionSemanticCopy(
                    explanation: "Tillåten: biometrisk/passkey-funktionalitet är redo att användas.",
                    actionLabel: "Kontrollera igen"
                ),
                .blocked: SharedPermissionSemanticCopy(
                    explanation: "Blockerad: användning av biometri/passkey är avstängd i systeminställningar.",
                    actionLabel: "Öppna inställningar"
                ),
                .limited: SharedPermissionSemanticCopy(
                    explanation: "Begränsad: den här enheten/webbläsaren har inte fullt stöd för biometri eller passkey.",
                    actionLabel: "Öppna inställningar"
                ),
                .actionNeeded: SharedPermissionSemanticCopy(
                    explanation: "Åtgärd krävs: aktivera biometri/passkey och bekräfta konfigurationen.",
                    actionLabel: "Begär"
                )
            ],
            .calendar: [
                .allowed: SharedPermissionSemanticCopy(
                    explanation: "Tillåten: kalenderåtkomst finns för att spara matcher.",
                    actionLabel: "Kontrollera igen"
                ),
                .blocked: SharedPermissionSemanticCopy(
                    explanation: "Blockerad: kalenderbehörighet nekas. Öppna inställningar och tillåt kalenderåtkomst.",
                    actionLabel: "Öppna inställningar"
                ),
                .limited: SharedPermissionSemanticCopy(
                    explanation: "Begränsad: webben kan inte slå av/på operativsystemets kalenderbehörighet direkt.",
                    actionLabel: "Öppna kalenderinställningar"
                ),
                .actionNeeded: SharedPermissionSemanticCopy(
                    explanation: "Åtgärd krävs: ge kalenderåtkomst för att spara matcher automatiskt.",
                    actionLabel: "Begär"
                )
            ]
        ],
        .en: [
            .notifications: [
                .allowed: SharedPermissionSemanticCopy(
                    explanation: "Allowed: reminders and admin updates can be delivered.",
                    actionLabel: "Retry check"
                ),
                .blocked: SharedPermissionSemanticCopy(
                    explanation: "Blocked: notifications are off for this app. Open system/browser settings and allow notifications.",
                    actionLabel: "Open Settings"
                ),
                .limited: SharedPermissionSemanticCopy(
                    explanation: "Limited: only partial notification surfaces are available on this device/browser.",
                    actionLabel: "Open Settings"
                ),
                .actionNeeded: SharedPermissionSemanticCopy(
                    explanation: "Action needed: grant notification permission to receive reminders.",
                    actionLabel: "Request"
                )
            ],
            .backgroundRefresh: [
                .allowed: SharedPermissionSemanticCopy(
                    explanation: "Allowed: background delivery/refresh is available.",
                    actionLabel: "Retry check"
                ),
                .blocked: SharedPermissionSemanticCopy(
                    explanation: "Blocked: background activity is disabled in system settings.",
                    actionLabel: "Open Settings"
                ),
                .limited: SharedPermissionSemanticCopy(
                    explanation: "Limited: background behavior depends on browser or OS constraints.",
                    actionLabel: "Open Settings"
                ),
                .actionNeeded: SharedPermissionSemanticCopy(
                    explanation: "Action needed: enable background activity support, then retry.",
                    actionLabel: "Open Settings"
                )
            ],
            .biometricPasskey: [
                .allowed: SharedPermissionSemanticCopy(
                    explanation: "Allowed: biometric/passkey features are ready to use.",
                    actionLabel: "Retry check"
                ),
                .blocked: SharedPermissionSemanticCopy(
                    explanation: "Blocked: biometric/passkey usage is disabled in system settings.",
                    actionLabel: "Open Settings"
                ),
                .limited: SharedPermissionSemanticCopy(
                    explanation: "Limited: this device/browser does not fully support biometric or passkey features.",
                    actionLabel: "Open Settings"
                ),
                .actionNeeded: SharedPermissionSemanticCopy(
                    explanation: "Action needed: enable biometric/passkey and confirm setup.",
                    actionLabel: "Request"
                )
            ],
            .calendar: [
                .allowed: SharedPermissionSemanticCopy(
                    explanation: "Allowed: calendar access is available for saving matches.",
                    actionLabel: "Retry check"
                ),
                .blocked: SharedPermissionSemanticCopy(
                    explanation: "Blocked: calendar permission is denied. Open settings and allow calendar access.",
                    actionLabel: "Open Settings"
                ),
                .limited: SharedPermissionSemanticCopy(
                    explanation: "Limited: web cannot directly toggle OS calendar permission.",
                    actionLabel: "Open calendar settings"
                ),
                .actionNeeded: SharedPermissionSemanticCopy(
                    explanation: "Action needed: grant calendar access to save matches automatically.",
                    actionLabel: "Request"
                )
            ]
        ]
    ]

    static let platformDifferencesByLocale: [SharedPermissionCopyLocale: String] = [
        .sv: "Plattformsskillnader: webben kan begära notisbehörighet, men bakgrundsbeteende beror på service workers/webbläsarpolicyer och kalenderbehörighet kan inte ändras direkt; iOS kan begära notis- och kalenderbehörighet, medan Bakgrundsuppdatering och biometrisk tillgänglighet beror på iOS-inställningar/enhetsstöd.",
        .en: "Platform differences: web can request Notifications, but background behavior depends on service workers/browser policies and calendar permission cannot be toggled directly; iOS can request Notifications and Calendar, while Background App Refresh and biometric availability depend on iOS Settings/device support."
    ]
}
