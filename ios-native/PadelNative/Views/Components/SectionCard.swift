import SwiftUI

struct SectionCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.inter(.headline, weight: .bold))
                .foregroundStyle(AppColors.textPrimary)
            content
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .padelSurfaceCard()
    }
}
