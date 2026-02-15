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

struct AppVersionHighlights: Decodable, Equatable {
    let version: String
    let title: String
    let changes: [String]
}

enum VersionUpdateUrgency: String, Equatable {
    case optional
    case recommended
    case required
}

struct AppVersionHighlightsPresentation: Identifiable, Equatable {
    let id: String
    let version: String
    let title: String
    let changes: [String]

    init(version: String, title: String, changes: [String]) {
        self.id = version
        self.version = version
        self.title = title
        self.changes = changes
    }
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

    private struct VersionHighlightsDocument: Decodable {
        let currentVersion: String?
        let releases: [AppVersionHighlights]

        enum CodingKeys: String, CodingKey {
            case currentVersion = "currentVersion"
            case releases
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
        request.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")

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

    // Note for non-coders:
    // This reads a simple local JSON file with release highlights so content editors can
    // update "what's new" text without changing Swift logic.
    func bundledVersionHighlights() -> (currentVersion: String?, releases: [AppVersionHighlights]) {
        guard let url = Bundle.main.url(forResource: "VersionHighlights", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let document = try? JSONDecoder().decode(VersionHighlightsDocument.self, from: data) else {
            return (nil, [])
        }

        let releases: [AppVersionHighlights] = document.releases
            .compactMap { (item: AppVersionHighlights) -> AppVersionHighlights? in
                guard let version = normalized(item.version),
                      let title = normalized(item.title) else {
                    return nil
                }

                let trimmedChanges = item.changes
                    .compactMap { normalized($0) }

                guard !trimmedChanges.isEmpty else {
                    return nil
                }

                return AppVersionHighlights(version: version, title: title, changes: trimmedChanges)
            }
            .sorted { (lhs: AppVersionHighlights, rhs: AppVersionHighlights) in
                compare(lhs.version, rhs.version) > 0
            }

        return (normalized(document.currentVersion), releases)
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

    func compareVersions(_ lhs: String, _ rhs: String) -> Int {
        compare(lhs, rhs)
    }


    func updateUrgency(for state: AppVersionState) -> VersionUpdateUrgency? {
        switch state {
        case .upToDate:
            return nil
        case .updateRecommended:
            return .recommended
        case .updateRequired:
            return .required
        }
    }

    // Note for non-coders:
    // This keeps iOS in sync with web by using the same currentVersion + fallback rules
    // when deciding which release highlight entry should be shown.
    func resolveCurrentVersionHighlight(currentVersion: String, releases: [AppVersionHighlights], payloadCurrentVersion: String?) -> AppVersionHighlights? {
        guard !releases.isEmpty else { return nil }

        let normalizedCurrentVersion = normalized(currentVersion)
        let targetVersion = normalized(payloadCurrentVersion) ?? normalizedCurrentVersion ?? releases[0].version

        return releases.first(where: { $0.version == targetVersion }) ?? releases[0]
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
