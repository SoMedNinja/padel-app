import Foundation
import os

@MainActor
class SupabaseRealtimeClient: NSObject {
    // Note for non-coders:
    // We use a dedicated logger so network diagnostics are easier to filter in Apple Console.
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "PadelNative", category: "SupabaseRealtimeClient")
    private var webSocket: URLSessionWebSocketTask?
    private var isConnected = false
    private let url: URL
    private let apiKey: String
    private var timer: Timer?
    private var ref = 0

    var onDataChange: (() -> Void)?

    init?(supabaseURL: String, apiKey: String) {
        let wsURLString = supabaseURL
            .replacingOccurrences(of: "https://", with: "wss://")
            .appending("/realtime/v1/websocket?apikey=\(apiKey)&vsn=1.0.0")
        guard let url = URL(string: wsURLString) else { return nil }
        self.url = url
        self.apiKey = apiKey
        super.init()
    }

    func connect() {
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: .main)
        webSocket = session.webSocketTask(with: url)
        webSocket?.resume()
        listen()
        startHeartbeat()
    }

    func disconnect() {
        timer?.invalidate()
        webSocket?.cancel(with: .goingAway, reason: nil)
        isConnected = false
    }

    private func listen() {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                self.listen()
            case .failure(let error):
                self.logger.error("WebSocket receive failed. error=\(String(describing: error), privacy: .public)")
                self.isConnected = false
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }

        let event = json["event"] as? String

        if event == "phx_reply" {
            isConnected = true
        } else if event == "postgres_changes" || event == "INSERT" || event == "UPDATE" || event == "DELETE" {
            onDataChange?()
        }
    }

    private func startHeartbeat() {
        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.sendHeartbeat()
        }
    }

    private func sendHeartbeat() {
        send(topic: "phoenix", event: "heartbeat", payload: [:])
    }

    private func joinChannel(topic: String) {
        let payload: [String: Any] = [
            "config": [
                "postgres_changes": [
                    ["event": "*", "schema": "public"]
                ]
            ]
        ]
        send(topic: topic, event: "phx_join", payload: payload)
    }

    private func send(topic: String, event: String, payload: [String: Any]) {
        ref += 1
        let message: [String: Any] = [
            "topic": topic,
            "event": event,
            "payload": payload,
            "ref": "\(ref)"
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let text = String(data: data, encoding: .utf8) else { return }

        webSocket?.send(.string(text)) { error in
            if let error = error {
                self.logger.error("WebSocket send failed. error=\(String(describing: error), privacy: .public)")
            } else {
                self.logger.debug("WebSocket message sent. topic=\(topic, privacy: .public) event=\(event, privacy: .public) ref=\(self.ref, privacy: .public)")
            }
        }
    }
}

extension SupabaseRealtimeClient: URLSessionWebSocketDelegate {
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        isConnected = true
        logger.info("WebSocket connected. protocol=\(`protocol` ?? "none", privacy: .public)")
        joinChannel(topic: "realtime:public")
    }

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        isConnected = false
        logger.info("WebSocket disconnected. closeCode=\(closeCode.rawValue, privacy: .public)")
    }
}
