import SwiftUI

struct PendingWriteSyncBanner: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        if shouldShow {
            content
                .padding(10)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private var shouldShow: Bool {
        let snapshot = viewModel.pendingWriteQueueSnapshot
        return snapshot.status != .synced || snapshot.pendingCount > 0 || snapshot.failedCount > 0
    }

    private var hasConflict: Bool {
        (viewModel.pendingWriteQueueSnapshot.lastError ?? "").localizedCaseInsensitiveContains("konflikt")
    }

    @ViewBuilder
    private var content: some View {
        let snapshot = viewModel.pendingWriteQueueSnapshot
        switch snapshot.status {
        case .failed:
            HStack(spacing: 10) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
                VStack(alignment: .leading, spacing: 3) {
                    let fallbackErrorMessage = "Kontrollera internet och försök igen."
                    Text(hasConflict ? "Konflikt kräver åtgärd" : "Synkningen behöver hjälp")
                        .font(.footnote.weight(.semibold))
                    // Note for non-coders:
                    // Failed means your data is still saved locally, but auto-sync paused after repeated failures or a conflict.
                    Text("\(snapshot.failedCount) ändring(ar) väntar på manuell hantering. \(snapshot.lastError ?? fallbackErrorMessage)")
                        .font(.caption)
                }
                Spacer(minLength: 0)
                Button("Försök igen") {
                    Task { await viewModel.flushPendingWriteQueue() }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            }
        case .pending:
            HStack(spacing: 10) {
                Image(systemName: "icloud.slash.fill")
                    .foregroundStyle(.orange)
                VStack(alignment: .leading, spacing: 3) {
                    Text("Offline-kö aktiv")
                        .font(.footnote.weight(.semibold))
                    // Note for non-coders:
                    // Pending means your data is already stored on this phone and will upload automatically.
                    Text("\(snapshot.pendingCount) ändring(ar) väntar på uppladdning. Du kan fortsätta använda appen.")
                        .font(.caption)
                }
                Spacer(minLength: 0)
            }
        case .synced:
            EmptyView()
        }
    }
}
