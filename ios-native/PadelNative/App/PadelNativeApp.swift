import SwiftUI

@main
struct PadelNativeApp: App {
    @StateObject private var appViewModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environmentObject(appViewModel)
                .task {
                    await appViewModel.bootstrap()
                }
        }
    }
}
