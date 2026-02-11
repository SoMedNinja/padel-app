import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    private let avatarChoices = [
        "person.crop.circle.fill",
        "person.fill",
        "person.2.fill",
        "figure.tennis",
        "sportscourt.fill"
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    SectionCard(title: "Account") {
                        Text("Note for non-coders: this native profile keeps the same capabilities as the web profile page (identity, stats, and profile customization).")
                            .foregroundStyle(.secondary)
                        if let email = viewModel.signedInEmail {
                            Label(email, systemImage: "envelope")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }

                    if let current = viewModel.currentPlayer {
                        SectionCard(title: "Current Player") {
                            HStack {
                                Image(systemName: viewModel.selectedAvatarSymbol)
                                    .font(.system(size: 40))
                                    .foregroundStyle(.accent)
                                    .frame(width: 54, height: 54)
                                    .background(Circle().fill(Color.accentColor.opacity(0.15)))

                                VStack(alignment: .leading) {
                                    Text(current.fullName)
                                        .font(.title3).bold()
                                    Text("ELO: \(current.elo)")
                                }
                                Spacer()
                            }

                            Text(current.isAdmin ? "Admin" : "Member")
                                .foregroundStyle(.secondary)
                        }

                        SectionCard(title: "Stats") {
                            Label("Matches played: \(viewModel.profileMatchesPlayed)", systemImage: "number")
                            Label("Win rate: \(viewModel.profileWinRate)%", systemImage: "chart.line.uptrend.xyaxis")
                        }

                        SectionCard(title: "Profile Picture") {
                            Text("Pick an icon style for your profile card.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)

                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 56))], spacing: 12) {
                                ForEach(avatarChoices, id: \.self) { symbol in
                                    Button {
                                        viewModel.selectedAvatarSymbol = symbol
                                    } label: {
                                        Image(systemName: symbol)
                                            .font(.title2)
                                            .frame(width: 50, height: 50)
                                            .background(
                                                Circle()
                                                    .fill(viewModel.selectedAvatarSymbol == symbol ? Color.accentColor.opacity(0.25) : Color(.systemGray6))
                                            )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        SectionCard(title: "Permissions") {
                            Label(current.isRegular ? "Schedule enabled" : "Schedule disabled", systemImage: current.isRegular ? "checkmark.circle" : "xmark.circle")
                            Label(current.isAdmin ? "Admin tools enabled" : "Admin tools disabled", systemImage: current.isAdmin ? "checkmark.shield" : "shield.slash")
                        }
                    }

                    Button(role: .destructive) {
                        viewModel.signOut()
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            }
            .navigationTitle("Profile")
            .padelLiquidGlassChrome()
        }
    }
}
