import SwiftUI

@main
struct PadelNativeApp: App {
    @StateObject private var appViewModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if appViewModel.isAuthenticated {
                    MainTabView()
                } else {
                    AuthView()
                }
            }
            .environmentObject(appViewModel)
            .task {
                if appViewModel.isAuthenticated {
                    await appViewModel.bootstrap()
                }
            }
        }
    }
}
