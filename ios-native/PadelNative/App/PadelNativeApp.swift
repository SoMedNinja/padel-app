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
    @StateObject private var appViewModel = AppViewModel()
    @Environment(\.scenePhase) private var scenePhase
    @State private var showSplash = true

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

                if showSplash {
                    SplashScreenView()
                        .transition(.opacity)
                        .zIndex(10)
                }
            }
            .environmentObject(appViewModel)
            .task {
                // Minimum splash duration to ensure animation finishes
                try? await Task.sleep(nanoseconds: 2_800_000_000)
                withAnimation(.easeInOut(duration: 0.5)) {
                    showSplash = false
                }
            }
            .task {
                await appViewModel.restoreSession()
            }
            .task {
                await appViewModel.prepareNativeCapabilities()
            }
            .task(id: appViewModel.isAuthenticated || appViewModel.isGuestMode) {
                if appViewModel.isAuthenticated || appViewModel.isGuestMode {
                    await appViewModel.bootstrap()
                }
            }
            .onOpenURL { url in
                appViewModel.handleIncomingURL(url)
            }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active {
                    Task {
                        await appViewModel.checkForAppUpdate()
                    }
                }
            }
        }
    }
}
