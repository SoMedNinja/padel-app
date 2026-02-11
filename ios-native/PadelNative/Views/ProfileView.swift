import PhotosUI
import SwiftUI
import UIKit

struct ProfileView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var selectedAvatarItem: PhotosPickerItem?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    accountSection

                    if let current = viewModel.currentPlayer {
                        currentPlayerSection(current)
                        profileSetupSection
                        badgesSection(current)
                        performanceSection
                        navigationActionsSection
                        permissionsSection(current)
                    }

                    Button(role: .destructive) {
                        viewModel.signOut()
                    } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            }
            .navigationTitle("Profile")
            .task {
                viewModel.syncProfileSetupDraftFromCurrentPlayer()
            }
            .padelLiquidGlassChrome()
        }
    }

    private var accountSection: some View {
        SectionCard(title: "Account") {
            Text("Note for non-coders: this screen mirrors web profile setup so users can update identity, avatar, badges, and quick filters from one place.")
                .foregroundStyle(.secondary)
            if let email = viewModel.signedInEmail {
                Label(email, systemImage: "envelope")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Text(viewModel.profileSetupPrompt)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private func currentPlayerSection(_ current: Player) -> some View {
        SectionCard(title: "Current player") {
            HStack {
                profileAvatarView(urlString: current.avatarURL)
                    .frame(width: 56, height: 56)

                VStack(alignment: .leading, spacing: 4) {
                    Text(current.profileName)
                        .font(.title3).bold()
                    Text("ELO: \(current.elo)")
                        .foregroundStyle(.secondary)
                    Text("Featured badge: \(viewModel.highlightedBadgeTitle)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
        }
    }

    private var profileSetupSection: some View {
        SectionCard(title: "Profile setup") {
            TextField("Display name", text: $viewModel.profileDisplayNameDraft)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            TextField("Avatar URL (optional)", text: $viewModel.profileAvatarURLInput)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            PhotosPicker(selection: $selectedAvatarItem, matching: .images) {
                Label("Choose photo from device", systemImage: "photo")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .onChange(of: selectedAvatarItem) { _, newItem in
                guard let newItem else { return }
                Task {
                    if let data = try? await newItem.loadTransferable(type: Data.self),
                       let resizedData = resizeAvatarImageData(data) {
                        let base64 = resizedData.base64EncodedString()
                        // Note for non-coders: data URLs let us store a picked image as text in avatar_url when no file storage bucket is configured.
                        viewModel.profileAvatarURLInput = "data:image/jpeg;base64,\(base64)"
                    }
                }
            }

            Text("Note for non-coders: avatar strategy follows web fallback order — use saved profile avatar, else typed URL/photo, else initials icon.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            if let message = viewModel.profileSetupMessage {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Button {
                Task { await viewModel.saveProfileSetup() }
            } label: {
                if viewModel.isSavingProfileSetup {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Label("Save profile setup", systemImage: "square.and.arrow.down")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isSavingProfileSetup)
        }
    }

    private func badgesSection(_ current: Player) -> some View {
        SectionCard(title: "Merits & badges") {
            Text("Choose which unlocked badge should be highlighted beside your name.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 10)], spacing: 10) {
                ForEach(viewModel.availableBadgeOptions) { badge in
                    Button {
                        viewModel.selectedFeaturedBadgeId = viewModel.selectedFeaturedBadgeId == badge.id ? nil : badge.id
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Label(badge.title, systemImage: badge.icon)
                                .font(.subheadline.weight(.semibold))
                            Text(badge.hint)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill((viewModel.selectedFeaturedBadgeId ?? current.featuredBadgeId) == badge.id ? Color.accentColor.opacity(0.2) : Color(.systemGray6))
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var performanceSection: some View {
        SectionCard(title: "Performance") {
            ForEach(viewModel.profilePerformanceWidgets) { widget in
                HStack {
                    Label(widget.title, systemImage: widget.symbol)
                    Spacer()
                    Text(widget.value)
                        .font(.headline)
                }
                Text(widget.detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Divider()
            }
        }
    }

    private var navigationActionsSection: some View {
        SectionCard(title: "Quick actions") {
            Text("Note for non-coders: these shortcuts open profile-relevant filters in Dashboard/History like the web profile tabs.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            HStack {
                Button("Last 7d") {
                    viewModel.openDashboardFiltered(.last7)
                }
                .buttonStyle(.bordered)

                Button("Tournament") {
                    viewModel.openDashboardFiltered(.tournaments)
                }
                .buttonStyle(.bordered)

                Button("History") {
                    viewModel.openHistoryTab()
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private func permissionsSection(_ current: Player) -> some View {
        SectionCard(title: "Permissions") {
            Label(current.isRegular ? "Schedule access enabled" : "Schedule access disabled", systemImage: current.isRegular ? "checkmark.circle" : "xmark.circle")
            Label(current.isAdmin ? "Admin tools enabled" : "Admin tools disabled", systemImage: current.isAdmin ? "checkmark.shield" : "shield.slash")

            if viewModel.isAwaitingApproval {
                Text("Your account is waiting for admin approval. You can still review profile information while waiting.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func profileAvatarView(urlString: String?) -> some View {
        if let urlString, let url = URL(string: urlString), url.scheme?.hasPrefix("http") == true {
            AsyncImage(url: url) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                avatarFallback
            }
            .clipShape(Circle())
        } else {
            avatarFallback
        }
    }

    private var avatarFallback: some View {
        Image(systemName: "person.crop.circle.fill")
            .font(.system(size: 42))
            .foregroundStyle(.accent)
            .frame(width: 56, height: 56)
            .background(Circle().fill(Color.accentColor.opacity(0.15)))
    }

    private func resizeAvatarImageData(_ data: Data) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let targetSize = CGSize(width: 360, height: 360)
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let rendered = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        return rendered.jpegData(compressionQuality: 0.72)
    }
}
