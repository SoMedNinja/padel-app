import SwiftUI
import PhotosUI
import UIKit

struct SettingsView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var selectedAvatarItem: PhotosPickerItem?
    @State private var isEditingName = false
    @State private var showCropper = false
    @State private var imageToCrop: UIImage?
    @State private var pullProgress: CGFloat = 0

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    ScrollOffsetTracker()
                    PadelRefreshHeader(isRefreshing: viewModel.isDashboardLoading && !viewModel.players.isEmpty, pullProgress: pullProgress)

                    if let current = viewModel.currentPlayer {
                        profileSection(current)
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
            .coordinateSpace(name: "padelScroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                let threshold: CGFloat = 80
                pullProgress = max(0, min(1.0, offset / threshold))
            }
            .refreshable {
                await viewModel.bootstrap()
            }
            .navigationTitle("Inställningar")
            .navigationBarTitleDisplayMode(.inline)
            .onChange(of: selectedAvatarItem) { _, newItem in
                guard let newItem else { return }
                Task {
                    if let data = try? await newItem.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        imageToCrop = image
                        showCropper = true
                    }
                }
            }
            .fullScreenCover(isPresented: $showCropper) {
                if let image = imageToCrop {
                    CircularAvatarCropperView(image: image, isPresented: $showCropper) { croppedImage in
                        if let resizedData = croppedImage.jpegData(compressionQuality: 0.7) {
                            let base64 = resizedData.base64EncodedString()
                            viewModel.profileAvatarURLInput = "data:image/jpeg;base64,\(base64)"
                            Task { await viewModel.saveProfileSetup() }
                        }
                    }
                }
            }
            .padelLiquidGlassChrome()
        }
    }

    private func profileSection(_ current: Player) -> some View {
        SectionCard(title: "Profil") {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 16) {
                    PlayerAvatarView(urlString: current.avatarURL, size: 64)

                    Menu {
                        PhotosPicker(selection: $selectedAvatarItem, matching: .images) {
                            Label("Välj ny bild", systemImage: "photo")
                        }
                        Button(role: .destructive) {
                            viewModel.profileAvatarURLInput = ""
                            Task { await viewModel.saveProfileSetup() }
                        } label: {
                            Label("Ta bort bild", systemImage: "trash")
                        }
                    } label: {
                        Label("Redigera profilbild", systemImage: "camera")
                            .font(.inter(.caption, weight: .bold))
                    }
                    .buttonStyle(.bordered)
                }

                // Note for non-coders: we save the name directly to your profile so it updates app-wide.
                if isEditingName {
                    HStack(spacing: 10) {
                        TextField("Namn", text: $viewModel.profileDisplayNameDraft)
                            .textFieldStyle(.roundedBorder)
                            .onSubmit {
                                Task { await viewModel.saveProfileSetup() }
                                isEditingName = false
                            }

                        Button("Spara") {
                            Task { await viewModel.saveProfileSetup() }
                            isEditingName = false
                        }
                        .buttonStyle(.borderedProminent)
                    }
                } else {
                    HStack {
                        Text(current.profileName)
                            .font(.inter(.headline, weight: .bold))
                        Spacer()
                        Button("Redigera namn") {
                            viewModel.profileDisplayNameDraft = current.profileName
                            isEditingName = true
                        }
                        .buttonStyle(.bordered)
                        .font(.inter(.caption, weight: .bold))
                    }
                }
            }
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
