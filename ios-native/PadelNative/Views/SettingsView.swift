import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let current = viewModel.currentPlayer {
                        accountSection
                        permissionsSection(current)
                    } else if viewModel.isGuestMode {
                        guestModeSection
                    }

                    SectionCard(title: "Hantering") {
                        Button(role: .destructive) {
                            viewModel.signOut()
                        } label: {
                            Label("Logga ut", systemImage: "rectangle.portrait.and.arrow.right")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                    }

                    SectionCard(title: "App Information") {
                        HStack {
                            Text("Version")
                            Spacer()
                            Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Inställningar")
            .padelLiquidGlassChrome()
        }
    }

    private var accountSection: some View {
        SectionCard(title: "Konto") {
            if let email = viewModel.signedInEmail {
                Label(email, systemImage: "envelope")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Toggle("Påminn mig om kommande matcher", isOn: Binding(
                get: { viewModel.areScheduleNotificationsEnabled },
                set: { enabled in
                    Task { await viewModel.setScheduleNotificationsEnabled(enabled) }
                }
            ))

            Toggle("Lås upp med Face ID / Touch ID", isOn: Binding(
                get: { viewModel.isBiometricLockEnabled },
                set: { enabled in
                    Task { await viewModel.setBiometricLockEnabled(enabled) }
                }
            ))
        }
    }

    private func permissionsSection(_ current: Player) -> some View {
        SectionCard(title: "Behörigheter") {
            Label(current.isRegular ? "Åtkomst till schema: JA" : "Åtkomst till schema: NEJ", systemImage: current.isRegular ? "checkmark.circle" : "xmark.circle")
            Label(current.isAdmin ? "Adminverktyg: JA" : "Adminverktyg: NEJ", systemImage: current.isAdmin ? "checkmark.shield" : "shield.slash")

            if viewModel.isAwaitingApproval {
                Text("Ditt konto väntar på admin-godkännande.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var guestModeSection: some View {
        SectionCard(title: "Gästläge") {
            Text("Du är i gästläge. Logga in för att spara matcher och hantera din profil.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            Button {
                viewModel.exitGuestMode()
            } label: {
                Label("Gå till inloggning", systemImage: "person.badge.key")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
        }
    }
}
