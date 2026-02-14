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
        context.localizedFallbackTitle = "Använd lösenkod"
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    func authenticate(reason: String) async throws {
        let context = LAContext()
        context.localizedCancelTitle = "Inte nu"
        context.localizedFallbackTitle = "Använd lösenkod"
        var policyError: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &policyError) else {
            throw BiometricError.unavailable
        }

        do {
            // Note for non-coders:
            // We first ask specifically for Face ID / Touch ID, so iOS doesn't jump
            // straight to the numeric PIN screen on devices that support biometrics.
            let success = try await context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason)
            guard success else {
                throw BiometricError.failed(reason: "Biometrisk verifiering misslyckades.")
            }
        } catch {
            // Note for non-coders:
            // If Face ID/Touch ID is temporarily locked (for example after multiple failed
            // scans), iOS requires one PIN unlock to re-enable biometrics.
            if let laError = error as? LAError, laError.code == .biometryLockout {
                let passcodeSuccess = try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)
                guard passcodeSuccess else {
                    throw BiometricError.failed(reason: "PIN-verifiering misslyckades.")
                }
                return
            }
            throw BiometricError.failed(reason: error.localizedDescription)
        }
    }
}
