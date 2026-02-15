import Foundation

// Note for non-coders:
// These are the same four state words we also use on web so both apps describe permissions consistently.
enum SharedPermissionState: String {
    case allowed = "allowed"
    case blocked = "blocked"
    case limited = "limited"
    case actionNeeded = "action needed"

    var label: String {
        switch self {
        case .allowed: return "Allowed"
        case .blocked: return "Blocked"
        case .limited: return "Limited"
        case .actionNeeded: return "Action needed"
        }
    }
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
    // This mirrors the shared capability matrix so each state has clear user guidance.
    func guidance(for state: SharedPermissionState) -> String {
        switch self {
        case .notifications:
            switch state {
            case .allowed: return "Allowed: reminders and admin updates can be delivered."
            case .blocked: return "Blocked: notifications are off for this app. Open system/browser settings and allow notifications."
            case .limited: return "Limited: only partial notification surfaces are available on this device/browser."
            case .actionNeeded: return "Action needed: grant notification permission to receive reminders."
            }
        case .backgroundRefresh:
            switch state {
            case .allowed: return "Allowed: background delivery/refresh is available."
            case .blocked: return "Blocked: background activity is disabled in system settings."
            case .limited: return "Limited: background behavior depends on browser or OS constraints."
            case .actionNeeded: return "Action needed: enable background activity support, then retry."
            }
        case .biometricPasskey:
            switch state {
            case .allowed: return "Allowed: biometric/passkey features are ready to use."
            case .blocked: return "Blocked: biometric/passkey usage is disabled in system settings."
            case .limited: return "Limited: this device/browser does not fully support biometric or passkey features."
            case .actionNeeded: return "Action needed: enable biometric/passkey and confirm setup."
            }
        case .calendar:
            switch state {
            case .allowed: return "Allowed: calendar access is available for saving matches."
            case .blocked: return "Blocked: calendar permission is denied. Open settings and allow calendar access."
            case .limited: return "Limited: web cannot directly toggle OS calendar permission."
            case .actionNeeded: return "Action needed: grant calendar access to save matches automatically."
            }
        }
    }

    static let platformDifferencesCopy = "Platform differences: web can request Notifications, but background behavior depends on service workers/browser policies and calendar permission cannot be toggled directly; iOS can request Notifications and Calendar, while Background App Refresh and biometric availability depend on iOS Settings/device support."
}
