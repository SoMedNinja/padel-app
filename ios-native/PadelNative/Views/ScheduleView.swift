import SwiftUI

struct ScheduleView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    private let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Note for non-coders: this tab is only shown for regular members, matching the web app's route permissions.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Upcoming") {
                    ForEach(viewModel.schedule) { item in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.description)
                                .font(.headline)
                            Text(item.location)
                            Text(formatter.string(from: item.startsAt))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Schedule")
            .padelLiquidGlassChrome()
            .refreshable {
                await viewModel.bootstrap()
            }
        }
    }
}
