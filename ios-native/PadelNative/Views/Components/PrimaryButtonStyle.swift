import SwiftUI

/// Note for non-coders:
/// This reusable button style gives primary actions a consistent shape
/// and emphasis across screens while still using native iOS button behavior.
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .foregroundStyle(.white)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(AppColors.brandPrimary)
                    .opacity(configuration.isPressed ? 0.82 : 1)
            )
    }
}

