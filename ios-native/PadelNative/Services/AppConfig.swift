import Foundation

enum AppConfig {
    // Note for non-coders:
    // These are values injected by Xcode build settings from AppSecrets.xcconfig.
    // They let the app know which backend to call.
    static let supabaseURL: String = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String ?? ""
    static let supabaseAnonKey: String = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String ?? ""

    static var isConfigured: Bool {
        !supabaseURL.isEmpty && !supabaseAnonKey.isEmpty
    }
}
