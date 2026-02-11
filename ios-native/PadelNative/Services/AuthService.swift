import Foundation

struct AuthIdentity {
    let profileId: UUID
    let email: String
    let fullName: String
    let isAdmin: Bool
    let isRegular: Bool
    let isApproved: Bool
    let isGuest: Bool

    static let guest = AuthIdentity(
        profileId: UUID(),
        email: "guest@local",
        fullName: "Guest",
        isAdmin: false,
        isRegular: true,
        isApproved: true,
        isGuest: true
    )
}

struct AuthSession: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: TimeInterval

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresAt = "expires_at"
    }
}

private struct SupabaseAuthResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: TimeInterval
    let user: SupabaseAuthUser

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresAt = "expires_at"
        case user
    }
}

private struct SupabaseAuthUser: Decodable {
    let id: UUID
    let email: String?
}

private struct ProfileAuthRow: Decodable {
    let id: UUID
    let fullName: String?
    let isAdmin: Bool?
    let isRegular: Bool?
    let isApproved: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case isAdmin = "is_admin"
        case isRegular = "is_regular"
        case isApproved = "is_approved"
    }
}

enum AuthServiceError: LocalizedError {
    case missingConfiguration
    case invalidCredentials
    case noStoredSession
    case requestFailed(statusCode: Int, message: String)
    case missingProfile

    var errorDescription: String? {
        switch self {
        case .missingConfiguration:
            return "Supabase configuration is missing."
        case .invalidCredentials:
            return "Invalid email or password."
        case .noStoredSession:
            return "No saved session found."
        case .requestFailed(_, let message):
            return message
        case .missingProfile:
            return "No player profile was found for this account."
        }
    }
}

struct AuthService {
    private let keychain = KeychainService()
    private let keychainServiceName = "PadelNative.Auth"
    private let keychainAccountName = "supabaseSession"

    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    // Note for non-coders:
    // This signs in with Supabase Auth (same backend as web), then loads profile flags
    // like admin/regular/approved so the native app can apply the same access rules.
    func signIn(email: String, password: String) async throws -> AuthIdentity {
        let response = try await requestAuthToken(
            endpoint: "/auth/v1/token?grant_type=password",
            body: ["email": email, "password": password]
        )

        try persist(session: AuthSession(accessToken: response.accessToken, refreshToken: response.refreshToken, expiresAt: response.expiresAt))
        return try await resolveIdentity(user: response.user, accessToken: response.accessToken)
    }

    func signUp(email: String, password: String, name: String) async throws -> AuthIdentity {
        let response = try await requestAuthToken(
            endpoint: "/auth/v1/signup",
            body: [
                "email": email,
                "password": password,
                "data": ["full_name": name, "name": name]
            ]
        )

        try persist(session: AuthSession(accessToken: response.accessToken, refreshToken: response.refreshToken, expiresAt: response.expiresAt))
        return try await resolveIdentity(user: response.user, accessToken: response.accessToken)
    }

    func resetPassword(email: String) async throws {
        guard AppConfig.isConfigured else { throw AuthServiceError.missingConfiguration }
        guard let url = URL(string: "\(AppConfig.supabaseURL)/auth/v1/recover") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email])

        let (_, response) = try await URLSession.shared.data(for: request)
        try validate(response: response)
    }

    func restoreSession() async throws -> AuthIdentity {
        guard let session = try loadPersistedSession() else {
            throw AuthServiceError.noStoredSession
        }

        let response = try await requestAuthToken(
            endpoint: "/auth/v1/token?grant_type=refresh_token",
            body: ["refresh_token": session.refreshToken]
        )

        let refreshed = AuthSession(accessToken: response.accessToken, refreshToken: response.refreshToken, expiresAt: response.expiresAt)
        try persist(session: refreshed)
        return try await resolveIdentity(user: response.user, accessToken: response.accessToken)
    }

    func signOut(accessToken: String?) async {
        defer { clearPersistedSession() }
        let persistedAccessToken = (try? loadPersistedSession())?.accessToken
        let tokenToUse = accessToken ?? persistedAccessToken
        guard AppConfig.isConfigured, let tokenToUse else { return }
        guard let url = URL(string: "\(AppConfig.supabaseURL)/auth/v1/logout") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(tokenToUse)", forHTTPHeaderField: "Authorization")

        _ = try? await URLSession.shared.data(for: request)
    }

    private func resolveIdentity(user: SupabaseAuthUser, accessToken: String) async throws -> AuthIdentity {
        let profile = try await fetchProfile(profileId: user.id, accessToken: accessToken)
        return AuthIdentity(
            profileId: profile.id,
            email: user.email ?? "",
            fullName: profile.fullName?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? profile.fullName! : "Player",
            isAdmin: profile.isAdmin ?? false,
            isRegular: profile.isRegular ?? true,
            isApproved: profile.isApproved ?? false,
            isGuest: false
        )
    }

    private func fetchProfile(profileId: UUID, accessToken: String) async throws -> ProfileAuthRow {
        guard AppConfig.isConfigured else { throw AuthServiceError.missingConfiguration }

        let query = "select=id,full_name,is_admin,is_regular,is_approved&id=eq.\(profileId.uuidString)"
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(AppConfig.supabaseURL)/rest/v1/profiles?\(encodedQuery)") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
        let rows = try decoder.decode([ProfileAuthRow].self, from: data)

        guard let row = rows.first else {
            throw AuthServiceError.missingProfile
        }

        return row
    }

    private func requestAuthToken(endpoint: String, body: Any) async throws -> SupabaseAuthResponse {
        guard AppConfig.isConfigured else { throw AuthServiceError.missingConfiguration }
        guard let url = URL(string: "\(AppConfig.supabaseURL)\(endpoint)") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
        return try decoder.decode(SupabaseAuthResponse.self, from: data)
    }

    private func validate(response: URLResponse, data: Data? = nil) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthServiceError.requestFailed(statusCode: -1, message: "Invalid server response.")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let message: String
            if let data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let error = json["msg"] as? String ?? json["error_description"] as? String {
                message = error
            } else if httpResponse.statusCode == 400 || httpResponse.statusCode == 401 {
                throw AuthServiceError.invalidCredentials
            } else {
                message = "Authentication request failed with status code \(httpResponse.statusCode)."
            }

            throw AuthServiceError.requestFailed(statusCode: httpResponse.statusCode, message: message)
        }
    }

    private func persist(session: AuthSession) throws {
        let data = try encoder.encode(session)
        try keychain.save(data, service: keychainServiceName, account: keychainAccountName)
    }

    private func loadPersistedSession() throws -> AuthSession? {
        guard let data = try keychain.read(service: keychainServiceName, account: keychainAccountName) else {
            return nil
        }
        return try decoder.decode(AuthSession.self, from: data)
    }

    private func clearPersistedSession() {
        keychain.delete(service: keychainServiceName, account: keychainAccountName)
    }
}
