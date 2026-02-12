import Foundation

struct AppVersionPolicy: Equatable {
    let minimumSupportedVersion: String
    let latestAvailableVersion: String?
    let appStoreURL: URL?
    let releaseNotes: String?
}

enum AppVersionState: Equatable {
    case upToDate
    case updateRecommended(policy: AppVersionPolicy)
    case updateRequired(policy: AppVersionPolicy)
}

struct AppVersionService {
    private struct VersionPolicyRow: Decodable {
        let minimumVersion: String?
        let latestVersion: String?
        let appStoreURL: String?
        let releaseNotes: String?

        enum CodingKeys: String, CodingKey {
            case minimumVersion = "minimum_version"
            case latestVersion = "latest_version"
            case appStoreURL = "app_store_url"
            case releaseNotes = "release_notes"
        }
    }

    // Note for non-coders:
    // This checks a server-side "version policy" row. If the app is too old,
    // we can nudge or require an upgrade similarly to how PWA auto-updates after deploys.
    func fetchPolicyFromServer() async throws -> AppVersionPolicy? {
        guard AppConfig.isConfigured else {
            return nil
        }

        let query = "select=minimum_version,latest_version,app_store_url,release_notes&platform=eq.ios&order=updated_at.desc&limit=1"
        guard let url = URL(string: "\(AppConfig.supabaseURL)/rest/v1/app_version_policies?\(query)") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            return nil
        }

        let rows = try JSONDecoder().decode([VersionPolicyRow].self, from: data)
        guard let row = rows.first,
              let minimum = normalized(row.minimumVersion) else {
            return nil
        }

        return AppVersionPolicy(
            minimumSupportedVersion: minimum,
            latestAvailableVersion: normalized(row.latestVersion),
            appStoreURL: sanitizedURL(row.appStoreURL),
            releaseNotes: normalized(row.releaseNotes)
        )
    }

    // Note for non-coders:
    // This fallback means the app can still show upgrade guidance even if the server table
    // is missing, using values bundled in the app's Info.plist.
    func bundledPolicyFallback() -> AppVersionPolicy? {
        let info = Bundle.main.infoDictionary ?? [:]
        guard let minimum = normalized(info["MINIMUM_SUPPORTED_VERSION"] as? String) else {
            return nil
        }

        let latest = normalized(info["LATEST_AVAILABLE_VERSION"] as? String)
        let storeURL = sanitizedURL(info["APP_STORE_URL"] as? String)

        return AppVersionPolicy(
            minimumSupportedVersion: minimum,
            latestAvailableVersion: latest,
            appStoreURL: storeURL,
            releaseNotes: nil
        )
    }

    func evaluate(currentVersion: String, policy: AppVersionPolicy) -> AppVersionState {
        let normalizedCurrent = normalized(currentVersion) ?? "0"

        if compare(normalizedCurrent, policy.minimumSupportedVersion) < 0 {
            return .updateRequired(policy: policy)
        }

        if let latest = policy.latestAvailableVersion,
           compare(normalizedCurrent, latest) < 0 {
            return .updateRecommended(policy: policy)
        }

        return .upToDate
    }

    private func normalized(_ raw: String?) -> String? {
        guard let raw else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func sanitizedURL(_ raw: String?) -> URL? {
        guard let raw = normalized(raw), let url = URL(string: raw) else {
            return nil
        }
        guard ["https", "http"].contains(url.scheme?.lowercased() ?? "") else {
            return nil
        }
        return url
    }

    private func compare(_ lhs: String, _ rhs: String) -> Int {
        let left = lhs.split(separator: ".").compactMap { Int($0) }
        let right = rhs.split(separator: ".").compactMap { Int($0) }
        let maxCount = max(left.count, right.count)

        for idx in 0..<maxCount {
            let l = idx < left.count ? left[idx] : 0
            let r = idx < right.count ? right[idx] : 0
            if l < r { return -1 }
            if l > r { return 1 }
        }

        return 0
    }
}
