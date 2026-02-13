import SwiftUI

struct AppAlert<Content: View>: View {
    enum Severity {
        case info
        case success
        case warning
        case error

        var color: Color {
            switch self {
            case .info: return AppColors.info
            case .success: return AppColors.success
            case .warning: return AppColors.warning
            case .error: return AppColors.error
            }
        }

        var icon: String {
            switch self {
            case .info: return "info.circle.fill"
            case .success: return "checkmark.circle.fill"
            case .warning: return "exclamationmark.triangle.fill"
            case .error: return "exclamationmark.octagon.fill"
            }
        }
    }

    let severity: Severity
    let icon: String?
    let isAnimated: Bool
    let onClose: (() -> Void)?
    let content: Content

    init(severity: Severity, icon: String? = nil, isAnimated: Bool = false, onClose: (() -> Void)? = nil, @ViewBuilder content: () -> Content) {
        self.severity = severity
        self.icon = icon
        self.isAnimated = isAnimated
        self.onClose = onClose
        self.content = content()
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            let image = Image(systemName: icon ?? severity.icon)
                .foregroundStyle(severity.color)
                .font(.inter(.headline))

            if isAnimated {
                image
                    .symbolEffect(.pulse, options: .repeating)
                    .padding(.top, 2)
            } else {
                image
                    .padding(.top, 2)
            }

            VStack(alignment: .leading, spacing: 4) {
                content
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let onClose = onClose {
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onClose()
                } label: {
                    Image(systemName: "xmark")
                        .font(.caption2.bold())
                        .foregroundStyle(AppColors.textSecondary)
                        .padding(4)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Stäng meddelande")
            }
        }
        .padding()
        .background(severity.color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(severity.color.opacity(0.3), lineWidth: 1)
        )
    }
}
