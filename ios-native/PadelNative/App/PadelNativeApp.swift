import SwiftUI

@main
struct PadelNativeApp: App {
    @StateObject private var appViewModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if appViewModel.isCheckingSession {
                    VStack(spacing: 12) {
                        ProgressView()
                        Text("Checking your session…")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                } else if appViewModel.isAuthenticated || appViewModel.isGuestMode {
                    if appViewModel.isAwaitingApproval {
                        VStack(spacing: 14) {
                            Text("Waiting for approval")
                                .font(.title3.bold())
                            Text("Note for non-coders: this matches web behavior where non-admin users must be approved before full access.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                            Button("Refresh status") {
                                Task {
                                    await appViewModel.bootstrap()
                                }
                            }
                            .buttonStyle(.borderedProminent)

                            Button("Sign out", role: .destructive) {
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
            .environmentObject(appViewModel)
            .task {
                await appViewModel.restoreSession()
            }
            .task(id: appViewModel.isAuthenticated) {
                if appViewModel.isAuthenticated {
                    await appViewModel.bootstrap()
                }
            }
        }
    }
}
