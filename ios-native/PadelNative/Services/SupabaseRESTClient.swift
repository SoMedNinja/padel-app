import Foundation

enum APIError: LocalizedError {
    case missingConfiguration
    case badURL
    case requestFailed(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .missingConfiguration:
            return "Supabase configuration is missing."
        case .badURL:
            return "Invalid request URL."
        case .requestFailed(let statusCode):
            return "Request failed with status code \(statusCode)."
        }
    }
}

struct SupabaseRESTClient {
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    func fetchLeaderboard() async throws -> [Player] {
        try await request(path: "/rest/v1/profiles", query: "select=id,full_name,elo,is_admin&order=elo.desc")
    }

    func fetchRecentMatches(limit: Int = 20) async throws -> [Match] {
        try await request(
            path: "/rest/v1/matches",
            query: "select=id,played_at,team_a_name,team_b_name,team_a_score,team_b_score&order=played_at.desc&limit=\(limit)"
        )
    }

    func fetchSchedule() async throws -> [ScheduleEntry] {
        try await request(
            path: "/rest/v1/availability_scheduled_games",
            query: "select=id,starts_at,location,description&order=starts_at.asc"
        )
    }

    private func request<T: Decodable>(path: String, query: String) async throws -> [T] {
        guard AppConfig.isConfigured else { throw APIError.missingConfiguration }
        guard let url = URL(string: "\(AppConfig.supabaseURL)\(path)?\(query)") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.requestFailed(statusCode: -1)
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.requestFailed(statusCode: httpResponse.statusCode)
        }

        return try decoder.decode([T].self, from: data)
    }
}
