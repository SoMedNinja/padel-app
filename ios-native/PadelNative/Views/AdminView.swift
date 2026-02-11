import SwiftUI

struct AdminView: View {
    private enum PendingAdminAction: Identifiable {
        case toggleApproval(AdminProfile)
        case toggleRegular(AdminProfile)
        case toggleAdmin(AdminProfile)
        case toggleDeactivation(AdminProfile)

        var id: String {
            switch self {
            case .toggleApproval(let profile):
                return "approval-\(profile.id.uuidString)"
            case .toggleRegular(let profile):
                return "regular-\(profile.id.uuidString)"
            case .toggleAdmin(let profile):
                return "admin-\(profile.id.uuidString)"
            case .toggleDeactivation(let profile):
                return "deactivation-\(profile.id.uuidString)"
            }
        }

        var title: String {
            switch self {
            case .toggleApproval(let profile):
                return profile.isApproved ? "Revoke approval?" : "Approve player?"
            case .toggleRegular(let profile):
                return profile.isRegular ? "Remove regular status?" : "Grant regular status?"
            case .toggleAdmin(let profile):
                return profile.isAdmin ? "Remove admin role?" : "Grant admin role?"
            case .toggleDeactivation(let profile):
                return profile.isDeleted ? "Reactivate account?" : "Deactivate account?"
            }
        }

        var message: String {
            switch self {
            case .toggleApproval(let profile):
                return profile.isApproved
                    ? "Note for non-coders: this will make \(profile.fullName) pending again until approved later."
                    : "Note for non-coders: this gives \(profile.fullName) access to approved-member features."
            case .toggleRegular(let profile):
                return profile.isRegular
                    ? "Note for non-coders: removing regular status hides regular-only schedule features."
                    : "Note for non-coders: this marks \(profile.fullName) as a regular member."
            case .toggleAdmin(let profile):
                return profile.isAdmin
                    ? "Note for non-coders: this removes admin tools for \(profile.fullName)."
                    : "Note for non-coders: this grants admin access to moderation tools."
            case .toggleDeactivation(let profile):
                return profile.isDeleted
                    ? "Note for non-coders: reactivating restores the account so it can be used again."
                    : "Note for non-coders: deactivating blocks the account and removes privileged access."
            }
        }

        var confirmButtonTitle: String {
            switch self {
            case .toggleApproval(let profile):
                return profile.isApproved ? "Revoke" : "Approve"
            case .toggleRegular(let profile):
                return profile.isRegular ? "Remove" : "Grant"
            case .toggleAdmin(let profile):
                return profile.isAdmin ? "Remove" : "Grant"
            case .toggleDeactivation(let profile):
                return profile.isDeleted ? "Reactivate" : "Deactivate"
            }
        }
    }

    @EnvironmentObject private var viewModel: AppViewModel
    @State private var pendingAction: PendingAdminAction?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.canUseAdmin {
                    List {
                        Section("Overview") {
                            metricRow(title: "Players", value: viewModel.adminSnapshot.playerCount)
                            metricRow(title: "Matches", value: viewModel.adminSnapshot.matchCount)
                            metricRow(title: "Scheduled Games", value: viewModel.adminSnapshot.scheduledCount)
                        }

                        Section("Player access controls") {
                            if viewModel.adminProfiles.isEmpty {
                                Text("No profiles found. Pull to refresh.")
                                    .foregroundStyle(.secondary)
                            }

                            ForEach(viewModel.adminProfiles) { profile in
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(profile.fullName)
                                                .font(.headline)
                                            Text("ELO \(profile.elo)")
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                        Spacer()
                                        if profile.id == viewModel.currentPlayer?.id {
                                            Text("You")
                                                .font(.caption)
                                                .padding(.horizontal, 8)
                                                .padding(.vertical, 4)
                                                .background(.blue.opacity(0.15), in: Capsule())
                                        }
                                    }

                                    statusChips(for: profile)

                                    HStack(spacing: 8) {
                                        Button(profile.isApproved ? "Revoke" : "Approve") {
                                            pendingAction = .toggleApproval(profile)
                                        }
                                        .buttonStyle(.borderedProminent)
                                        .tint(profile.isApproved ? .orange : .green)

                                        Button(profile.isRegular ? "Remove Regular" : "Make Regular") {
                                            pendingAction = .toggleRegular(profile)
                                        }
                                        .buttonStyle(.bordered)

                                        Button(profile.isAdmin ? "Remove Admin" : "Make Admin") {
                                            pendingAction = .toggleAdmin(profile)
                                        }
                                        .buttonStyle(.bordered)
                                        .tint(.blue)

                                        Button(profile.isDeleted ? "Reactivate" : "Deactivate") {
                                            pendingAction = .toggleDeactivation(profile)
                                        }
                                        .buttonStyle(.bordered)
                                        .tint(profile.isDeleted ? .green : .red)
                                    }
                                    .font(.caption)
                                }
                                .padding(.vertical, 4)
                            }
                        }

                        Section("What this does") {
                            Text("Note for non-coders: these controls perform real role and access updates on profile records, with safety confirmations before each change.")
                                .foregroundStyle(.secondary)
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
            .refreshable {
                if viewModel.canUseAdmin {
                    await viewModel.bootstrap()
                }
            }
            .safeAreaInset(edge: .top) {
                if let banner = viewModel.adminBanner, viewModel.canUseAdmin {
                    HStack(spacing: 8) {
                        Image(systemName: banner.isSuccess ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                        Text(banner.message)
                            .font(.footnote)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .background(banner.isSuccess ? Color.green : Color.red)
                    .onTapGesture {
                        viewModel.clearAdminBanner()
                    }
                }
            }
            .alert(item: $pendingAction) { action in
                Alert(
                    title: Text(action.title),
                    message: Text(action.message),
                    primaryButton: .destructive(Text(action.confirmButtonTitle)) {
                        Task {
                            await perform(action)
                        }
                    },
                    secondaryButton: .cancel()
                )
            }
        }
    }

    private func perform(_ action: PendingAdminAction) async {
        switch action {
        case .toggleApproval(let profile):
            await viewModel.toggleApproval(for: profile)
        case .toggleRegular(let profile):
            await viewModel.toggleRegularRole(for: profile)
        case .toggleAdmin(let profile):
            await viewModel.toggleAdminRole(for: profile)
        case .toggleDeactivation(let profile):
            await viewModel.toggleDeactivation(for: profile)
        }
    }

    @ViewBuilder
    private func statusChips(for profile: AdminProfile) -> some View {
        HStack(spacing: 6) {
            chip(profile.isAdmin ? "Admin" : "Member", color: profile.isAdmin ? .blue : .gray)
            chip(profile.isApproved ? "Approved" : "Pending", color: profile.isApproved ? .green : .orange)
            chip(profile.isRegular ? "Regular" : "Not Regular", color: profile.isRegular ? .teal : .gray)
            chip(profile.isDeleted ? "Deactivated" : "Active", color: profile.isDeleted ? .red : .green)
        }
        .font(.caption2)
    }

    private func chip(_ text: String, color: Color) -> some View {
        Text(text)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15), in: Capsule())
            .foregroundStyle(color)
    }

    private func metricRow(title: String, value: Int) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text("\(value)")
                .bold()
        }
    }
}
