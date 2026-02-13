import SwiftUI

/// Note for non-coders:
/// This reusable button style gives primary actions a consistent shape
/// and emphasis across screens while still using native iOS button behavior.
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.inter(.headline, weight: .bold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundStyle(.white)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(AppColors.brandPrimary)
                    .shadow(color: AppColors.brandPrimary.opacity(0.3), radius: 8, x: 0, y: 4)
                    .opacity(configuration.isPressed ? 0.9 : 1.0)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
    }
}
