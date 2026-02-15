import SwiftUI
import PhotosUI
import UIKit
import UserNotifications
import EventKit

struct SettingsView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var selectedAvatarItem: PhotosPickerItem?
    @State private var isEditingName = false
    @State private var showCropper = false
    @State private var imageToCrop: UIImage?
    @State private var pullProgress: CGFloat = 0
    @State private var showLogoutConfirmation = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    ScrollOffsetTracker()
                    PadelRefreshHeader(isRefreshing: viewModel.isDashboardLoading && !viewModel.players.isEmpty, pullProgress: pullProgress)

                    if let current = viewModel.currentPlayer {
                        profileSection(current)
                        accountSection
                        devicePermissionsSection
                        accessSection(current)
                    } else if viewModel.isGuestMode {
                        guestModeSection
                    }

                    SectionCard(title: "Hantering") {
                        Button(role: .destructive) {
                            showLogoutConfirmation = true
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
            .task {
                await viewModel.refreshDevicePermissionStatuses()
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
            .confirmationDialog("Vill du logga ut?", isPresented: $showLogoutConfirmation, titleVisibility: .visible) {
                Button("Logga ut", role: .destructive) {
                    viewModel.signOut()
                }
                Button("Avbryt", role: .cancel) { }
            } message: {
                Text("Du kommer att behöva logga in igen för att se din statistik och boka matcher.")
            }
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
                        VStack(alignment: .trailing, spacing: 4) {
                            TextField("Namn", text: $viewModel.profileDisplayNameDraft)
                                .textFieldStyle(.roundedBorder)
                                .disabled(viewModel.isSavingProfileSetup)
                                .onSubmit {
                                    if viewModel.profileDisplayNameDraft.count <= 50 {
                                        Task {
                                            await viewModel.saveProfileSetup()
                                            isEditingName = false
                                        }
                                    }
                                }
                                .onChange(of: viewModel.profileDisplayNameDraft) { oldValue, newValue in
                                    if newValue.count == 50 && oldValue.count < 50 {
                                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                    }
                                }

                            Text("\(viewModel.profileDisplayNameDraft.count)/50")
                                .font(.inter(size: 10))
                                .foregroundStyle(viewModel.profileDisplayNameDraft.count > 50 ? AppColors.error : AppColors.textSecondary)
                                .accessibilityLabel("Teckenräknare")
                                .accessibilityValue("\(viewModel.profileDisplayNameDraft.count) av 50 tecken")
                        }

                        Button {
                            Task {
                                await viewModel.saveProfileSetup()
                                isEditingName = false
                            }
                        } label: {
                            if viewModel.isSavingProfileSetup {
                                HStack(spacing: 8) {
                                    ProgressView()
                                        .tint(.white)
                                    Text("Sparar...")
                                }
                            } else {
                                Text("Spara")
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(viewModel.isSavingProfileSetup || viewModel.profileDisplayNameDraft.count > 50 || viewModel.profileDisplayNameDraft.count < 2)
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

                if viewModel.notificationPermissionNeedsSettings {
                    VStack(alignment: .leading, spacing: 8) {
                        // Note for non-coders: this message tells exactly what to enable in iPhone Settings.
                        Text("Notiser är just nu blockerade. Öppna Inställningar → PadelNative → Notiser och slå på 'Tillåt notiser' samt aviseringar på låsskärm/banners om du vill få matchpåminnelser.")
                            .font(.inter(.footnote))
                            .foregroundStyle(AppColors.warning)

                        Button {
                            viewModel.openSystemSettings()
                        } label: {
                            Label("Öppna iOS-inställningar", systemImage: "gearshape")
                                .font(.inter(.footnote, weight: .bold))
                        }
                        .buttonStyle(.bordered)
                    }
                }

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

    private var devicePermissionsSection: some View {
        SectionCard(title: "Permissions") {
            VStack(alignment: .leading, spacing: 14) {
                // Note for non-coders: each row shows one permission, a simple status chip, and one clear next step.
                permissionRow(
                    title: "Notifications",
                    subtitle: "Match reminders and updates",
                    state: notificationState,
                    buttonLabel: notificationActionTitle,
                    buttonSystemImage: notificationActionIcon,
                    action: notificationAction
                )

                permissionRow(
                    title: "Calendar",
                    subtitle: "Save matches to your calendar",
                    state: calendarState,
                    buttonLabel: calendarActionTitle,
                    buttonSystemImage: calendarActionIcon,
                    action: calendarAction
                )

                permissionRow(
                    title: "Biometric lock",
                    subtitle: "Use Face ID / Touch ID for app lock",
                    state: biometricState,
                    buttonLabel: biometricActionTitle,
                    buttonSystemImage: biometricActionIcon,
                    action: biometricAction
                )
            }
        }
    }

    private func accessSection(_ current: Player) -> some View {
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



    private func permissionRow(title: String, subtitle: String, state: PermissionChipState, buttonLabel: String, buttonSystemImage: String, action: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.inter(.subheadline, weight: .bold))
                        .foregroundStyle(AppColors.textPrimary)
                    Text(subtitle)
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                }

                Spacer()
                StatusChip(title: state.title, tint: state.tint)
            }

            Button(action: action) {
                Label(buttonLabel, systemImage: buttonSystemImage)
                    .font(.inter(.footnote, weight: .bold))
            }
            .buttonStyle(.bordered)
        }
    }

    private var notificationState: PermissionChipState {
        switch viewModel.notificationPermissionStatus {
        case .authorized, .provisional, .ephemeral:
            return .allowed
        case .denied, .restricted:
            return .denied
        case .notDetermined:
            return .notRequested
        @unknown default:
            return .notRequested
        }
    }

    private var calendarState: PermissionChipState {
        switch viewModel.calendarPermissionStatus {
        case .fullAccess, .writeOnly, .authorized:
            return .allowed
        case .denied, .restricted:
            return .denied
        case .notDetermined:
            return .notRequested
        @unknown default:
            return .notRequested
        }
    }

    private var biometricState: PermissionChipState {
        if viewModel.isBiometricLockEnabled {
            return .allowed
        }
        return viewModel.isBiometricAvailable ? .notRequested : .denied
    }

    private var notificationActionTitle: String {
        switch notificationState {
        case .notRequested: return "Request"
        case .denied: return "Open Settings"
        case .allowed: return "Retry check"
        }
    }

    private var notificationActionIcon: String {
        switch notificationState {
        case .notRequested: return "bell.badge"
        case .denied: return "gearshape"
        case .allowed: return "arrow.clockwise"
        }
    }

    private var calendarActionTitle: String {
        switch calendarState {
        case .notRequested: return "Request"
        case .denied: return "Open Settings"
        case .allowed: return "Retry check"
        }
    }

    private var calendarActionIcon: String {
        switch calendarState {
        case .notRequested: return "calendar.badge.plus"
        case .denied: return "gearshape"
        case .allowed: return "arrow.clockwise"
        }
    }

    private var biometricActionTitle: String {
        switch biometricState {
        case .notRequested: return "Request"
        case .denied: return "Open Settings"
        case .allowed: return "Retry check"
        }
    }

    private var biometricActionIcon: String {
        switch biometricState {
        case .notRequested: return "faceid"
        case .denied: return "gearshape"
        case .allowed: return "arrow.clockwise"
        }
    }

    private func notificationAction() {
        switch notificationState {
        case .notRequested:
            Task { await viewModel.setScheduleNotificationsEnabled(true) }
        case .denied:
            viewModel.openSystemSettings()
        case .allowed:
            Task { await viewModel.refreshNotificationPermissionStatus() }
        }
    }

    private func calendarAction() {
        switch calendarState {
        case .notRequested:
            Task { await viewModel.requestCalendarPermission() }
        case .denied:
            viewModel.openSystemSettings()
        case .allowed:
            Task { await viewModel.refreshDevicePermissionStatuses() }
        }
    }

    private func biometricAction() {
        switch biometricState {
        case .notRequested:
            Task { await viewModel.setBiometricLockEnabled(true) }
        case .denied:
            viewModel.openSystemSettings()
        case .allowed:
            Task { await viewModel.refreshDevicePermissionStatuses() }
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

private enum PermissionChipState {
    case allowed
    case denied
    case notRequested

    var title: String {
        switch self {
        case .allowed: return "Allowed"
        case .denied: return "Denied"
        case .notRequested: return "Not requested"
        }
    }

    var tint: Color {
        switch self {
        case .allowed: return AppColors.success
        case .denied: return AppColors.error
        case .notRequested: return AppColors.textSecondary
        }
    }
}
