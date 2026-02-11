import SwiftUI

private enum PendingAdminAction: Identifiable {
    case toggleApproval(AdminProfile)
    case toggleAdmin(AdminProfile)
    case toggleRegular(AdminProfile)
    case deactivate(AdminProfile)

    var id: UUID {
        switch self {
        case .toggleApproval(let profile), .toggleAdmin(let profile), .toggleRegular(let profile), .deactivate(let profile):
            return profile.id
        }
    }

    var title: String {
        switch self {
        case .toggleApproval(let profile):
            return profile.isApproved ? "Remove approval?" : "Approve user?"
        case .toggleAdmin(let profile):
            return profile.isAdmin ? "Remove admin role?" : "Grant admin role?"
        case .toggleRegular(let profile):
            return profile.isRegular ? "Remove regular access?" : "Grant regular access?"
        case .deactivate:
            return "Deactivate user?"
        }
    }

    var message: String {
        switch self {
        case .toggleApproval(let profile):
            return "This updates whether \(profile.name) can use member features."
        case .toggleAdmin(let profile):
            return "This updates whether \(profile.name) can access admin tools."
        case .toggleRegular(let profile):
            return "This updates whether \(profile.name) can access schedule workflows."
        case .deactivate(let profile):
            return "This will deactivate \(profile.name), remove elevated access, and hide the profile from active users."
        }
    }
}

struct AdminView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var pendingAction: PendingAdminAction?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.canUseAdmin {
                    List {
                        Section("Overview") {
                            HStack {
                                Text("Players")
                                Spacer()
                                Text("\(viewModel.adminSnapshot.playerCount)")
                                    .bold()
                            }
                            HStack {
                                Text("Matches")
                                Spacer()
                                Text("\(viewModel.adminSnapshot.matchCount)")
                                    .bold()
                            }
                            HStack {
                                Text("Scheduled Games")
                                Spacer()
                                Text("\(viewModel.adminSnapshot.scheduledCount)")
                                    .bold()
                            }
                        }

                        if let adminBanner = viewModel.adminBanner {
                            Section {
                                bannerView(adminBanner)
                            }
                        }

                        Section("User management") {
                            // Note for non-coders:
                            // Each button below is an admin action that writes changes to Supabase,
                            // then refreshes the list so the screen reflects the latest server state.
                            ForEach(viewModel.adminProfiles) { profile in
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack {
                                        Text(profile.name)
                                            .font(.headline)
                                        Spacer()
                                        if profile.isApproved {
                                            Label("Approved", systemImage: "checkmark.seal.fill")
                                                .font(.caption)
                                                .foregroundStyle(.green)
                                        } else {
                                            Label("Pending", systemImage: "hourglass")
                                                .font(.caption)
                                                .foregroundStyle(.orange)
                                        }
                                    }

                                    HStack(spacing: 8) {
                                        Button(profile.isApproved ? "Revoke" : "Approve") {
                                            pendingAction = .toggleApproval(profile)
                                        }
                                        .buttonStyle(.bordered)

                                        Button(profile.isAdmin ? "Demote" : "Make admin") {
                                            pendingAction = .toggleAdmin(profile)
                                        }
                                        .buttonStyle(.bordered)

                                        Button(profile.isRegular ? "Remove regular" : "Make regular") {
                                            pendingAction = .toggleRegular(profile)
                                        }
                                        .buttonStyle(.bordered)
                                    }
                                    .font(.caption)

                                    Button(role: .destructive) {
                                        pendingAction = .deactivate(profile)
                                    } label: {
                                        Label("Deactivate user", systemImage: "person.crop.circle.badge.xmark")
                                    }
                                    .font(.caption)
                                }
                                .padding(.vertical, 6)
                            }
                        }

                        Section("What this does") {
                            Text("Note for non-coders: this tab mirrors the web admin panel. Only admins can see it, and each action asks for confirmation before the change is sent to the server.")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .overlay {
                        if viewModel.isAdminActionRunning {
                            ProgressView("Saving admin change...")
                                .padding()
                                .background(.ultraThinMaterial)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                    }
                } else {
                    ContentUnavailableView(
                        "Admin Access Required",
                        systemImage: "lock.shield",
                        description: Text("Note for non-coders: this area is hidden for non-admin users, matching the web app's permission rules.")
                    )
                }
            }
            .navigationTitle("Admin")
            .padelLiquidGlassChrome()
            .task {
                guard viewModel.canUseAdmin else { return }
                await viewModel.refreshAdminProfiles(silently: true)
            }
            .refreshable {
                guard viewModel.canUseAdmin else { return }
                await viewModel.bootstrap()
            }
            .alert(item: $pendingAction) { action in
                Alert(
                    title: Text(action.title),
                    message: Text(action.message),
                    primaryButton: .destructive(Text("Confirm")) {
                        Task {
                            await run(action)
                        }
                    },
                    secondaryButton: .cancel()
                )
            }
        }
    }

    @ViewBuilder
    private func bannerView(_ banner: AdminActionBanner) -> some View {
        HStack(spacing: 8) {
            Image(systemName: banner.style == .success ? "checkmark.circle.fill" : "xmark.octagon.fill")
            Text(banner.message)
                .font(.subheadline)
                .multilineTextAlignment(.leading)
        }
        .foregroundStyle(.white)
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(banner.style == .success ? Color.green : Color.red)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func run(_ action: PendingAdminAction) async {
        switch action {
        case .toggleApproval(let profile):
            await viewModel.setApproval(for: profile, approved: !profile.isApproved)
        case .toggleAdmin(let profile):
            await viewModel.setAdminRole(for: profile, isAdmin: !profile.isAdmin)
        case .toggleRegular(let profile):
            await viewModel.setRegularRole(for: profile, isRegular: !profile.isRegular)
        case .deactivate(let profile):
            await viewModel.deactivateProfile(profile)
        }
    }
}
