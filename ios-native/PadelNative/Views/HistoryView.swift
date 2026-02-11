import SwiftUI

struct HistoryView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var showAdvancedFilters = false

    private let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        NavigationStack {
            List {
                filterSection
                matchesSection
            }
            .navigationTitle("Historik")
            .padelLiquidGlassChrome()
            .refreshable {
                await viewModel.reloadHistoryMatches()
            }
            .task {
                if viewModel.historyMatches.isEmpty {
                    await viewModel.reloadHistoryMatches()
                }
            }
            .onChange(of: viewModel.historyFilters.datePreset) { _, _ in
                Task { await viewModel.reloadHistoryMatches() }
            }
            .onChange(of: viewModel.historyFilters.customStartDate) { _, _ in
                if viewModel.historyFilters.datePreset == .custom {
                    Task { await viewModel.reloadHistoryMatches() }
                }
            }
            .onChange(of: viewModel.historyFilters.customEndDate) { _, _ in
                if viewModel.historyFilters.datePreset == .custom {
                    Task { await viewModel.reloadHistoryMatches() }
                }
            }
            .onChange(of: viewModel.historyFilters.scoreType) { _, _ in
                Task { await viewModel.reloadHistoryMatches() }
            }
            .onChange(of: viewModel.historyFilters.tournamentOnly) { _, _ in
                Task { await viewModel.reloadHistoryMatches() }
            }

        }
    }

    private var filterSection: some View {
        Section("Filter") {
            Picker("Tidsperiod", selection: $viewModel.historyFilters.datePreset) {
                ForEach(HistoryDatePreset.allCases) { preset in
                    Text(preset.title).tag(preset)
                }
            }
            .pickerStyle(.segmented)

            Toggle("Visa avancerade filter", isOn: $showAdvancedFilters)

            if showAdvancedFilters {
                VStack(alignment: .leading, spacing: 10) {
                    if viewModel.historyFilters.datePreset == .custom {
                        DatePicker("Startdatum", selection: $viewModel.historyFilters.customStartDate, displayedComponents: [.date])
                        DatePicker("Slutdatum", selection: $viewModel.historyFilters.customEndDate, displayedComponents: [.date])
                    }

                    Picker("Poängtyp", selection: $viewModel.historyFilters.scoreType) {
                        Text("Alla").tag("all")
                        Text("Set").tag("sets")
                        Text("Poäng").tag("points")
                    }
                    .pickerStyle(.segmented)

                    Toggle("Bara turneringsmatcher", isOn: $viewModel.historyFilters.tournamentOnly)
                }
            }

            Text("Note for non-coders: de här filtren fungerar som ett sökverktyg så du kan smalna av historiken till rätt period och matchtyp.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private var matchesSection: some View {
        Section("Matcher") {
            if viewModel.isHistoryLoading {
                ProgressView("Laddar historik…")
            } else if viewModel.historyFilteredMatches.isEmpty {
                Text("Inga matcher hittades för valt filter.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.historyFilteredMatches) { match in
                    NavigationLink {
                        MatchDetailView(match: match)
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(match.teamAName) vs \(match.teamBName)")
                                .font(.headline)
                            Text(scoreLabel(match))
                            Text(formatter.string(from: match.playedAt))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        if viewModel.canDeleteMatch(match) {
                            Button(role: .destructive) {
                                Task { await viewModel.deleteMatch(match) }
                            } label: {
                                Label("Radera", systemImage: "trash")
                            }
                        }
                    }
                    .onAppear {
                        Task { await viewModel.loadMoreHistoryMatchesIfNeeded(currentMatch: match) }
                    }
                }

                if viewModel.isHistoryLoadingMore {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                }
            }
        }
    }

    private func scoreLabel(_ match: Match) -> String {
        let scoreType = match.scoreType ?? "sets"
        if scoreType == "points" {
            let target = match.scoreTarget.map { " (till \($0))" } ?? ""
            return "Poäng: \(match.teamAScore)-\(match.teamBScore)\(target)"
        }
        return "Set: \(match.teamAScore)-\(match.teamBScore)"
    }
}
