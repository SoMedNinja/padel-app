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
    @State private var isPullRefreshing = false
    @State private var pullOffsetBaseline: CGFloat?
    @State private var showLogoutConfirmation = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    ScrollOffsetTracker()
                    PadelRefreshHeader(isRefreshing: isPullRefreshing, pullProgress: pullProgress)

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
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Version")
                                    .font(.inter(.body))
                                    .foregroundStyle(AppColors.textPrimary)
                                Spacer()
                                Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0")
                                    .font(.inter(.body))
                                    .foregroundStyle(AppColors.textSecondary)
                            }

                            // Note for non-coders: this button lets anyone re-open the latest release notes manually.
                            Button {
                                viewModel.showLatestVersionHighlights()
                            } label: {
                                Label("Visa senaste nyheter", systemImage: "sparkles")
                                    .font(.inter(.footnote, weight: .bold))
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                }
                .padding()
            }
            .background(AppColors.background)
            .coordinateSpace(name: "padelScroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                if !isPullRefreshing,
                   pullOffsetBaseline == nil || offset < (pullOffsetBaseline ?? offset) {
                    pullOffsetBaseline = offset
                }

                let normalizedOffset = PullToRefreshBehavior.normalizedOffset(offset, baseline: pullOffsetBaseline)
                pullProgress = PullToRefreshBehavior.progress(for: normalizedOffset)
            }
            .refreshable {
                await PullToRefreshBehavior.performRefresh(isPullRefreshing: $isPullRefreshing) {
                    await viewModel.bootstrap()
                }
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

                // Note for non-coders:
                // These switches let users choose exactly which event categories should notify them.
                eventToggleRow(title: "Ny schemalagd match", eventType: .scheduledMatchNew)
                eventToggleRow(title: "Påminnelse om poll", eventType: .availabilityPollReminder)
                eventToggleRow(title: "Admin-meddelande", eventType: .adminAnnouncement)

                Toggle("Tysta timmar", isOn: Binding(
                    get: { viewModel.notificationPreferences.quietHours.enabled },
                    set: { enabled in
                        Task {
                            await viewModel.setNotificationQuietHours(
                                enabled: enabled,
                                startHour: viewModel.notificationPreferences.quietHours.startHour,
                                endHour: viewModel.notificationPreferences.quietHours.endHour
                            )
                        }
                    }
                ))
                .font(.inter(.subheadline))

                if viewModel.notificationPreferences.quietHours.enabled {
                    HStack(spacing: 12) {
                        Picker("Start", selection: Binding(
                            get: { viewModel.notificationPreferences.quietHours.startHour },
                            set: { hour in
                                Task {
                                    await viewModel.setNotificationQuietHours(
                                        enabled: true,
                                        startHour: hour,
                                        endHour: viewModel.notificationPreferences.quietHours.endHour
                                    )
                                }
                            }
                        )) {
                            ForEach(0..<24, id: \.self) { hour in
                                Text(String(format: "%02d:00", hour)).tag(hour)
                            }
                        }
                        .pickerStyle(.menu)

                        Picker("Slut", selection: Binding(
                            get: { viewModel.notificationPreferences.quietHours.endHour },
                            set: { hour in
                                Task {
                                    await viewModel.setNotificationQuietHours(
                                        enabled: true,
                                        startHour: viewModel.notificationPreferences.quietHours.startHour,
                                        endHour: hour
                                    )
                                }
                            }
                        )) {
                            ForEach(0..<24, id: \.self) { hour in
                                Text(String(format: "%02d:00", hour)).tag(hour)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                }

                if viewModel.notificationPermissionNeedsSettings {
                    VStack(alignment: .leading, spacing: 8) {
                        // Note for non-coders: this message tells exactly what to enable in iPhone Settings.
                        Text(SharedPermissionCapability.notifications.guidance(for: .blocked) + " Open Settings → PadelNative → Notifications and enable Allow Notifications plus lock-screen/banner alerts.")
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
        SectionCard(title: "Centralized permissions panel") {
            VStack(alignment: .leading, spacing: 14) {
                Text("Same state model on every client: Allowed, Blocked, Limited, or Action needed.")
                    .font(.inter(.caption))
                    .foregroundStyle(AppColors.textSecondary)

                // Note for non-coders: each row shows one permission, a simple status chip, and one clear next step.
                permissionRow(
                    title: SharedPermissionCapability.notifications.title,
                    subtitle: SharedPermissionCapability.notifications.subtitle,
                    state: notificationState,
                    buttonLabel: notificationActionTitle,
                    buttonSystemImage: notificationActionIcon,
                    action: notificationAction,
                    guidance: SharedPermissionCapability.notifications.guidance(for: notificationState.sharedState)
                )

                permissionRow(
                    title: SharedPermissionCapability.backgroundRefresh.title,
                    subtitle: SharedPermissionCapability.backgroundRefresh.subtitle,
                    state: backgroundRefreshState,
                    buttonLabel: backgroundRefreshActionTitle,
                    buttonSystemImage: backgroundRefreshActionIcon,
                    action: backgroundRefreshAction,
                    guidance: SharedPermissionCapability.backgroundRefresh.guidance(for: backgroundRefreshState.sharedState)
                )

                permissionRow(
                    title: SharedPermissionCapability.calendar.title,
                    subtitle: SharedPermissionCapability.calendar.subtitle,
                    state: calendarState,
                    buttonLabel: calendarActionTitle,
                    buttonSystemImage: calendarActionIcon,
                    action: calendarAction,
                    guidance: SharedPermissionCapability.calendar.guidance(for: calendarState.sharedState)
                )

                permissionRow(
                    title: SharedPermissionCapability.biometricPasskey.title,
                    subtitle: SharedPermissionCapability.biometricPasskey.subtitle,
                    state: biometricState,
                    buttonLabel: biometricActionTitle,
                    buttonSystemImage: biometricActionIcon,
                    action: biometricAction,
                    guidance: SharedPermissionCapability.biometricPasskey.guidance(for: biometricState.sharedState)
                )

                // Note for non-coders: this text explains cross-platform limits so people know why web and iOS options differ.
                Text(SharedPermissionCapability.platformDifferencesCopy)
                    .font(.inter(.caption))
                    .foregroundStyle(AppColors.textSecondary)
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



    private func eventToggleRow(title: String, eventType: NotificationEventType) -> some View {
        Toggle(title, isOn: Binding(
            get: { viewModel.notificationPreferences.eventToggles[eventType.rawValue, default: true] },
            set: { enabled in
                Task { await viewModel.setNotificationEventEnabled(eventType, enabled: enabled) }
            }
        ))
        .font(.inter(.subheadline))
        .disabled(!viewModel.areScheduleNotificationsEnabled)
    }


    private func permissionRow(title: String, subtitle: String, state: PermissionChipState, buttonLabel: String, buttonSystemImage: String, action: @escaping () -> Void, guidance: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.inter(.subheadline, weight: .bold))
                        .foregroundStyle(AppColors.textPrimary)
                    Text(subtitle)
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                    Text(guidance)
                        .font(.inter(size: 11))
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
        case .denied:
            return .blocked
        case .notDetermined:
            return .actionNeeded
        @unknown default:
            return .actionNeeded
        }
    }

    private var calendarState: PermissionChipState {
        switch viewModel.calendarPermissionStatus {
        case .fullAccess, .writeOnly, .authorized:
            return .allowed
        case .denied, .restricted:
            return .blocked
        case .notDetermined:
            return .actionNeeded
        @unknown default:
            return .actionNeeded
        }
    }

    private var biometricState: PermissionChipState {
        if viewModel.isBiometricLockEnabled {
            return .allowed
        }
        return viewModel.isBiometricAvailable ? .actionNeeded : .limited
    }


    private var backgroundRefreshState: PermissionChipState {
        switch viewModel.backgroundRefreshStatus {
        case .available:
            return .allowed
        case .denied:
            return .blocked
        case .restricted:
            return .limited
        @unknown default:
            return .actionNeeded
        }
    }

    private var notificationActionTitle: String {
        SharedPermissionCapability.notifications.actionLabel(for: notificationState.sharedState)
    }

    private var notificationActionIcon: String {
        switch notificationState {
        case .actionNeeded: return "bell.badge"
        case .blocked, .limited: return "gearshape"
        case .allowed: return "arrow.clockwise"
        }
    }

    private var backgroundRefreshActionTitle: String {
        SharedPermissionCapability.backgroundRefresh.actionLabel(for: backgroundRefreshState.sharedState)
    }

    private var backgroundRefreshActionIcon: String {
        switch backgroundRefreshState {
        case .allowed: return "arrow.clockwise"
        case .actionNeeded, .blocked, .limited: return "gearshape"
        }
    }

    private var calendarActionTitle: String {
        SharedPermissionCapability.calendar.actionLabel(for: calendarState.sharedState)
    }

    private var calendarActionIcon: String {
        switch calendarState {
        case .actionNeeded: return "calendar.badge.plus"
        case .blocked, .limited: return "gearshape"
        case .allowed: return "arrow.clockwise"
        }
    }

    private var biometricActionTitle: String {
        SharedPermissionCapability.biometricPasskey.actionLabel(for: biometricState.sharedState)
    }

    private var biometricActionIcon: String {
        switch biometricState {
        case .actionNeeded: return "faceid"
        case .blocked, .limited: return "gearshape"
        case .allowed: return "arrow.clockwise"
        }
    }

    private func notificationAction() {
        switch notificationState {
        case .actionNeeded:
            Task { await viewModel.setScheduleNotificationsEnabled(true) }
        case .blocked, .limited:
            viewModel.openSystemSettings()
        case .allowed:
            Task { await viewModel.refreshNotificationPermissionStatus() }
        }
    }

    private func calendarAction() {
        switch calendarState {
        case .actionNeeded:
            Task { await viewModel.requestCalendarPermission() }
        case .blocked, .limited:
            viewModel.openSystemSettings()
        case .allowed:
            Task { await viewModel.refreshDevicePermissionStatuses() }
        }
    }

    private func backgroundRefreshAction() {
        switch backgroundRefreshState {
        case .allowed:
            Task { await viewModel.refreshDevicePermissionStatuses() }
        case .actionNeeded, .blocked, .limited:
            viewModel.openSystemSettings()
        }
    }

    private func biometricAction() {
        switch biometricState {
        case .actionNeeded:
            Task { await viewModel.setBiometricLockEnabled(true) }
        case .blocked, .limited:
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
    case blocked
    case limited
    case actionNeeded

    var title: String {
        switch self {
        case .allowed: return SharedPermissionState.allowed.label
        case .blocked: return SharedPermissionState.blocked.label
        case .limited: return SharedPermissionState.limited.label
        case .actionNeeded: return SharedPermissionState.actionNeeded.label
        }
    }



    var sharedState: SharedPermissionState {
        switch self {
        case .allowed: return .allowed
        case .blocked: return .blocked
        case .limited: return .limited
        case .actionNeeded: return .actionNeeded
        }
    }
    var tint: Color {
        switch self {
        case .allowed: return AppColors.success
        case .blocked: return AppColors.error
        case .limited: return AppColors.warning
        case .actionNeeded: return AppColors.textSecondary
        }
    }
}
