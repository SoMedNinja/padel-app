import SwiftUI
import UIKit
import UserNotifications

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    // Note for non-coders:
    // We register these callbacks so iOS can hand us push-token and notification tap events.
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Note for non-coders: token logging helps verify APNs wiring during development.
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("APNs token: \(token)")
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("APNs registration failed: \(error.localizedDescription)")
    }
}

@main
struct PadelNativeApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    init() {
        // Note for non-coders: this hides the native iOS pull-to-refresh spinner
        // so we can use our custom BallRefreshIndicator instead without double icons.
        UIRefreshControl.appearance().tintColor = .clear

        // Note for non-coders:
        // These identifiers tell iOS which app tasks are allowed to run in the background.
        AppViewModel.registerBackgroundTaskHandlers()
    }
    @StateObject private var appViewModel = AppViewModel()
    @Environment(\.scenePhase) private var scenePhase
    @State private var showSplash = true

    private var isUITestMode: Bool {
        ProcessInfo.processInfo.arguments.contains("UI_TEST_MODE")
    }

    private var uiTestScenario: String? {
        ProcessInfo.processInfo.environment["UI_TEST_SCENARIO"]
    }

    // Note for non-coders:
    // We keep one entry function for incoming links so UI tests and real app taps behave the same.
    private func processIncomingDeepLink(_ url: URL) {
        appViewModel.handleIncomingURL(url)
    }

    var body: some Scene {
        WindowGroup {
            ZStack {
                Group {
                    if appViewModel.isCheckingSession {
                        Color(AppColors.background)
                    } else if appViewModel.isAuthenticated || appViewModel.isGuestMode {
                        if appViewModel.isAuthenticated && appViewModel.isAwaitingApproval {
                            VStack(spacing: 14) {
                                Text("Väntar på godkännande")
                                    .font(.title3.bold())
                                Text("Note for non-coders: this matches web behavior where non-admin users must be approved before full access.")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal)
                                Button("Uppdatera status") {
                                    Task {
                                        await appViewModel.bootstrap()
                                    }
                                }
                                .buttonStyle(.borderedProminent)

                                Button("Logga ut", role: .destructive) {
                                    appViewModel.signOut()
                                }
                                .buttonStyle(.bordered)
                            }
                            .padding()
                        } else {
                            MainTabView()
                        }
                    } else {
                        VStack(spacing: 16) {
                            if appViewModel.hasRecoveryFailed {
                                Text("We could not restore your session")
                                    .font(.headline)
                                if let recoveryError = appViewModel.sessionRecoveryError {
                                    Text(recoveryError)
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                        .multilineTextAlignment(.center)
                                        .padding(.horizontal)
                                }

                                Button("Try again") {
                                    Task {
                                        await appViewModel.retrySessionRecovery()
                                    }
                                }
                                .buttonStyle(.borderedProminent)
                            }

                            AuthView()
                        }
                    }
                }

                if let deepLinkFallbackBanner = appViewModel.deepLinkFallbackBanner {
                    VStack {
                        // Note for non-coders:
                        // This small banner gives a clear explanation when a link could not be handled.
                        Text(deepLinkFallbackBanner)
                            .font(.footnote.weight(.semibold))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .foregroundStyle(.white)
                            .background(Color.orange.opacity(0.95), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .padding(.top, showSplash ? 16 : 54)
                            .padding(.horizontal, 12)
                        Spacer()
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(15)
                }

                if showSplash {
                    SplashScreenView()
                        .transition(.opacity)
                        .zIndex(10)
                }
            }
            .environmentObject(appViewModel)
            .task {
                if !isUITestMode {
                    // Minimum splash duration to ensure animation finishes
                    try? await Task.sleep(nanoseconds: 2_800_000_000)
                }
                withAnimation(.easeInOut(duration: 0.5)) {
                    showSplash = false
                }
            }
            .task {
                if isUITestMode {
                    appViewModel.isCheckingSession = false
                    appViewModel.continueAsGuest()
                    if uiTestScenario == "session-recovery-failed" {
                        appViewModel.isGuestMode = false
                        appViewModel.hasRecoveryFailed = true
                        appViewModel.sessionRecoveryError = "Injected UI test recovery failure"
                    }
                    if let rawDeepLink = ProcessInfo.processInfo.environment["UI_TEST_DEEP_LINK"], let url = URL(string: rawDeepLink) {
                        processIncomingDeepLink(url)
                    }
                    return
                }
                await appViewModel.restoreSession()
            }
            .task {
                guard !isUITestMode else { return }
                await appViewModel.prepareNativeCapabilities()
            }
            .task(id: appViewModel.isAuthenticated || appViewModel.isGuestMode) {
                guard !isUITestMode else { return }
                if appViewModel.isAuthenticated || appViewModel.isGuestMode {
                    await appViewModel.bootstrap()
                }
            }
            .onOpenURL { url in
                processIncomingDeepLink(url)
            }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active {
                    Task {
                        await appViewModel.checkForAppUpdate()
                    }
                }

                if phase == .background {
                    // Note for non-coders:
                    // Every time the app goes to background we ask iOS for the next periodic refresh window.
                    appViewModel.scheduleBackgroundRefreshTasksIfPossible()
                }
            }
        }
    }
}
