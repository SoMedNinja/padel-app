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
                                .font(.inter(.subheadline, weight: .bold))
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                    }

                    SectionCard(title: "App Information") {
                        HStack {
                            Text("Version")
                                .font(.inter(.body))
                                .foregroundStyle(AppColors.textPrimary)
                            Spacer()
                            Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0")
                                .font(.inter(.body))
                                .foregroundStyle(AppColors.textSecondary)
                        }
                    }
                }
                .padding()
            }
            .background(AppColors.background)
            .navigationTitle("Inställningar")
            .padelLiquidGlassChrome()
        }
    }

    private var accountSection: some View {
        SectionCard(title: "Konto") {
            VStack(alignment: .leading, spacing: 16) {
                if let email = viewModel.signedInEmail {
                    Label(email, systemImage: "envelope")
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                }

                Toggle("Påminn om kommande matcher", isOn: Binding(
                    get: { viewModel.areScheduleNotificationsEnabled },
                    set: { enabled in
                        Task { await viewModel.setScheduleNotificationsEnabled(enabled) }
                    }
                ))
                .font(.inter(.subheadline))

                Toggle("Lås upp med Face ID / Touch ID", isOn: Binding(
                    get: { viewModel.isBiometricLockEnabled },
                    set: { enabled in
                        Task { await viewModel.setBiometricLockEnabled(enabled) }
                    }
                ))
                .font(.inter(.subheadline))
            }
        }
    }

    private func permissionsSection(_ current: Player) -> some View {
        SectionCard(title: "Behörigheter") {
            VStack(alignment: .leading, spacing: 12) {
                Label(current.isRegular ? "Åtkomst till schema: JA" : "Åtkomst till schema: NEJ", systemImage: current.isRegular ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .foregroundStyle(current.isRegular ? AppColors.success : AppColors.textSecondary)

                Label(current.isAdmin ? "Adminverktyg: JA" : "Adminverktyg: NEJ", systemImage: current.isAdmin ? "checkmark.shield.fill" : "shield.slash.fill")
                    .foregroundStyle(current.isAdmin ? .purple : AppColors.textSecondary)

                if viewModel.isAwaitingApproval {
                    Text("Ditt konto väntar på admin-godkännande.")
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.warning)
                }
            }
            .font(.inter(.subheadline, weight: .semibold))
        }
    }

    private var guestModeSection: some View {
        SectionCard(title: "Gästläge") {
            VStack(alignment: .leading, spacing: 16) {
                Text("Du är i gästläge. Logga in för att spara matcher och hantera din profil.")
                    .font(.inter(.footnote))
                    .foregroundStyle(AppColors.textSecondary)

                Button {
                    viewModel.exitGuestMode()
                } label: {
                    Label("Gå till inloggning", systemImage: "person.badge.key")
                        .font(.inter(.subheadline, weight: .bold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }
}
