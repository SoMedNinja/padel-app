import Foundation

enum AppConfig {
    // Note for non-coders:
    // We try a few places for these backend values so sign-in keeps working even
    // if one project setup path forgot to map Info.plist build settings.
    // 1) Info.plist (normal Xcode path)
    // 2) Environment variables (useful for CI/testing)
    // 3) RuntimeSupabaseConfig.plist bundled in the app (safe fallback)
    // 4) Built-in defaults in code (last-resort fallback if resource files are not bundled)
    static let supabaseURL: String = value(for: "SUPABASE_URL")
    static let supabaseAnonKey: String = value(for: "SUPABASE_ANON_KEY")

    static var isConfigured: Bool {
        configurationWarning == nil
    }

    // Note for non-coders:
    // We intentionally keep built-in fallback values empty so the app cannot silently connect
    // to the wrong Supabase project. If configuration is missing, login fails fast with a clear
    // setup message instead of pretending the password was wrong.
    private static let builtInFallback: [String: String] = [
        "SUPABASE_URL": "",
        "SUPABASE_ANON_KEY": ""
    ]

    static var configurationWarning: String? {
        if supabaseURL.isEmpty || supabaseAnonKey.isEmpty {
            return "Supabase URL/key saknas i appens konfiguration."
        }

        if supabaseAnonKey.hasPrefix("sb_publishable_") {
            // Note for non-coders:
            // "publishable" and "anon" are two different key families in Supabase.
            // This app expects the anon public key for auth/rest compatibility.
            return "Fel nyckeltyp: använd Supabase anon public key (inte sb_publishable_*)."
        }

        return nil
    }

    private static func value(for key: String) -> String {
        let candidates: [String?] = [
            Bundle.main.object(forInfoDictionaryKey: key) as? String,
            ProcessInfo.processInfo.environment[key],
            bundledFallback()[key],
            builtInFallback[key]
        ]

        for candidate in candidates {
            guard let normalized = normalize(candidate), !normalized.isEmpty else { continue }
            return normalized
        }

        return ""
    }

    private static func bundledFallback() -> [String: String] {
        guard
            let url = Bundle.main.url(forResource: "RuntimeSupabaseConfig", withExtension: "plist"),
            let data = try? Data(contentsOf: url),
            let raw = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any]
        else {
            return [:]
        }

        var result: [String: String] = [:]
        raw.forEach { key, value in
            if let text = value as? String {
                result[key] = text
            }
        }
        return result
    }

    private static func normalize(_ raw: String?) -> String? {
        let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !trimmed.isEmpty else { return nil }

        // Note for non-coders:
        // If a value still looks like "$(SUPABASE_URL)", Xcode never replaced it,
        // so we ignore it and continue searching fallback sources.
        if trimmed.hasPrefix("$(") && trimmed.hasSuffix(")") {
            return nil
        }

        return trimmed
    }
}
