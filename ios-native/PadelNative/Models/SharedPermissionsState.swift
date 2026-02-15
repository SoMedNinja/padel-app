import Foundation

// Note for non-coders:
// These are the same four state words we also use on web so both apps describe permissions consistently.
enum SharedPermissionState: String {
    case allowed = "allowed"
    case blocked = "blocked"
    case limited = "limited"
    case actionNeeded = "action_needed"

    var label: String {
        switch self {
        case .allowed: return "Allowed"
        case .blocked: return "Blocked"
        case .limited: return "Limited"
        case .actionNeeded: return "Action needed"
        }
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

    var title: String {
        switch self {
        case .notifications: return "Notifications"
        case .backgroundRefresh: return "Background refresh"
        case .biometricPasskey: return "Biometric / passkey"
        case .calendar: return "Calendar"
        }
    }

    var subtitle: String {
        switch self {
        case .notifications:
            return "Match reminders and updates"
        case .backgroundRefresh:
            return "Lets iOS wake the app for periodic data refresh"
        case .calendar:
            return "Save matches to your calendar"
        case .biometricPasskey:
            return "Use Face ID / Touch ID for app lock"
        }
    }

    // Note for non-coders:
    // This dictionary is our source of truth for each capability + state pair, including guidance and button text.
    private static let semanticMatrix: [SharedPermissionCapability: [SharedPermissionState: SharedPermissionSemanticCopy]] = [
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
            ),
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
            ),
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
            ),
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
            ),
        ],
    ]

    func guidance(for state: SharedPermissionState) -> String {
        SharedPermissionCapability.semanticMatrix[self]?[state]?.explanation ?? ""
    }

    func actionLabel(for state: SharedPermissionState) -> String {
        SharedPermissionCapability.semanticMatrix[self]?[state]?.actionLabel ?? "Retry check"
    }

    static let platformDifferencesCopy = "Platform differences: web can request Notifications, but background behavior depends on service workers/browser policies and calendar permission cannot be toggled directly; iOS can request Notifications and Calendar, while Background App Refresh and biometric availability depend on iOS Settings/device support."
}
