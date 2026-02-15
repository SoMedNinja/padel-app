import UIKit

@MainActor
final class FeedbackService {
    static let shared = FeedbackService()

    enum ActionType {
        case success
        case warning
        case destructive

        // Note for non-coders:
        // We map each action type to one consistent vibration style so the app
        // "feels" predictable (same event -> same physical response).
        fileprivate var notificationType: UINotificationFeedbackGenerator.FeedbackType {
            switch self {
            case .success: return .success
            case .warning: return .warning
            case .destructive: return .error
            }
        }

        fileprivate var impactStyle: UIImpactFeedbackGenerator.FeedbackStyle {
            switch self {
            case .success: return .soft
            case .warning: return .medium
            case .destructive: return .rigid
            }
        }
    }

    private let notificationGenerator = UINotificationFeedbackGenerator()
    private var impactGenerators: [ActionType: UIImpactFeedbackGenerator] = [:]

    private init() {
        ActionType.allCases.forEach { action in
            impactGenerators[action] = UIImpactFeedbackGenerator(style: action.impactStyle)
        }
    }

    func prepare() {
        notificationGenerator.prepare()
        impactGenerators.values.forEach { $0.prepare() }
    }

    func notify(_ action: ActionType) {
        notificationGenerator.notificationOccurred(action.notificationType)
        prepare()
    }

    func impact(_ action: ActionType) {
        impactGenerators[action]?.impactOccurred()
        prepare()
    }
}

private extension FeedbackService.ActionType: CaseIterable {}
