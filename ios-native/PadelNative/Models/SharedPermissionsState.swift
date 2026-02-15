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
}
