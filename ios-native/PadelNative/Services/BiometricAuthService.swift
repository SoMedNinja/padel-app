import Foundation
import LocalAuthentication

struct BiometricAuthService {
    enum BiometricError: LocalizedError {
        case unavailable
        case failed(reason: String)

        var errorDescription: String? {
            switch self {
            case .unavailable:
                return "Face ID/Touch ID är inte tillgängligt på den här enheten."
            case .failed(let reason):
                return reason
            }
        }
    }

    // Note for non-coders:
    // This checks if the phone can do Face ID/Touch ID before we ask the user.
    func canUseBiometrics() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    func authenticate(reason: String) async throws {
        let context = LAContext()
        context.localizedCancelTitle = "Inte nu"
        var policyError: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &policyError) else {
            throw BiometricError.unavailable
        }

        do {
            let success = try await context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason)
            guard success else {
                throw BiometricError.failed(reason: "Biometrisk verifiering misslyckades.")
            }
        } catch {
            throw BiometricError.failed(reason: error.localizedDescription)
        }
    }
}
