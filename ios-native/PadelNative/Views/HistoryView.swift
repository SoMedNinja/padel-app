import SwiftUI
import UIKit

struct HistoryView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var showAdvancedFilters = false

    private let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = AppConfig.swedishLocale
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    filterSection
                    matchesSection
                }
                .padding()
            }
            .background(AppColors.background)
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
        SectionCard(title: "Filter") {
            VStack(alignment: .leading, spacing: 12) {
                Picker("Tidsperiod", selection: $viewModel.historyFilters.datePreset) {
                    ForEach(HistoryDatePreset.allCases) { preset in
                        Text(preset.title).tag(preset)
                    }
                }
                .pickerStyle(.segmented)

                Toggle("Visa avancerade filter", isOn: $showAdvancedFilters)
                    .font(.inter(.subheadline))

                if showAdvancedFilters {
                    VStack(alignment: .leading, spacing: 10) {
                        if viewModel.historyFilters.datePreset == .custom {
                            DatePicker("Startdatum", selection: $viewModel.historyFilters.customStartDate, displayedComponents: [.date])
                                .font(.inter(.subheadline))
                            DatePicker("Slutdatum", selection: $viewModel.historyFilters.customEndDate, displayedComponents: [.date])
                                .font(.inter(.subheadline))
                        }

                        Picker("Poängtyp", selection: $viewModel.historyFilters.scoreType) {
                            Text("Alla").tag("all")
                            Text("Set").tag("sets")
                            Text("Poäng").tag("points")
                        }
                        .pickerStyle(.segmented)

                        Toggle("Bara turneringsmatcher", isOn: $viewModel.historyFilters.tournamentOnly)
                            .font(.inter(.subheadline))
                    }
                    .padding(.top, 4)
                }
            }
        }
    }

    private var matchesSection: some View {
        SectionCard(title: "Matcher") {
            if viewModel.isHistoryLoading {
                HStack {
                    Spacer()
                    ProgressView("Laddar historik…")
                        .font(.inter(.body))
                    Spacer()
                }
                .padding(.vertical, 20)
            } else if viewModel.historyFilteredMatches.isEmpty {
                Text("Inga matcher hittades för valt filter.")
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 0) {
                    ForEach(viewModel.historyFilteredMatches) { match in
                        NavigationLink {
                            MatchDetailView(match: match)
                        } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text("\(match.teamAName) vs \(match.teamBName)")
                                        .font(.inter(.headline, weight: .bold))
                                        .foregroundStyle(AppColors.textPrimary)
                                    Spacer()
                                    typeLabelChip(for: match)
                                }

                                Text(scoreLabel(match))
                                    .font(.inter(.subheadline, weight: .semibold))
                                    .foregroundStyle(AppColors.textPrimary)

                                Text(formatter.string(from: match.playedAt))
                                    .font(.inter(.caption))
                                    .foregroundStyle(AppColors.textSecondary)
                            }
                            .padding(.vertical, 12)
                        }
                        .overlay(alignment: .trailing) {
                            Menu {
                                if viewModel.canDeleteMatch(match) {
                                    Button(role: .destructive) {
                                        Task { await viewModel.deleteMatch(match) }
                                    } label: {
                                        Label("Radera", systemImage: "trash")
                                    }
                                }

                                Button {
                                    shareMatch(match)
                                } label: {
                                    Label("Dela", systemImage: "square.and.arrow.up")
                                }
                            } label: {
                                Image(systemName: "ellipsis.circle")
                                    .font(.title3)
                                    .foregroundStyle(AppColors.brandPrimary)
                                    .padding(8)
                            }
                        }
                        .onAppear {
                            Task { await viewModel.loadMoreHistoryMatchesIfNeeded(currentMatch: match) }
                        }

                        if match.id != viewModel.historyFilteredMatches.last?.id {
                            Divider()
                                .background(AppColors.borderSubtle)
                        }
                    }

                    if viewModel.isHistoryLoadingMore {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                        .padding(.top, 10)
                    }
                }
            }
        }
    }

    private func scoreLabel(_ match: Match) -> String {
        let scoreType = match.scoreType ?? "sets"
        let score = "\(match.teamAScore) – \(match.teamBScore)"
        if scoreType == "points" {
            let target = match.scoreTarget.map { " (till \($0))" } ?? ""
            return "\(score) poäng\(target)"
        }
        return "\(score) set"
    }

    private func shareMatch(_ match: Match) {
        let score = scoreLabel(match)
        let lines = [
            "Matchresultat",
            "",
            "\(match.teamAName) vs \(match.teamBName)",
            score,
            "",
            "Spelad: \(formatter.string(from: match.playedAt))"
        ]

        let fileURL = try? ShareCardService.createShareImageFile(
            title: "Padel Match",
            bodyLines: lines,
            fileNamePrefix: "match-history"
        )

        let text = """
        🎾 Matchresultat:
        \(match.teamAName) vs \(match.teamBName)
        \(score)
        """

        var items: [Any] = [text]
        if let fileURL = fileURL {
            items.insert(fileURL, at: 0)
        }

        let av = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(av, animated: true)
        }
    }

    private func typeLabelChip(for match: Match) -> some View {
        let type = match.sourceTournamentType ?? "standalone"
        let label: String

        if type == "standalone" {
            let is1v1 = match.teamAPlayerIds.compactMap { $0 }.count == 1 && match.teamBPlayerIds.compactMap { $0 }.count == 1
            label = is1v1 ? "1v1" : "2v2"
        } else if type == "standalone_1v1" {
            label = "1v1"
        } else {
            label = type.capitalized
        }

        return Text(label)
            .font(.inter(size: 8, weight: .bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(AppColors.brandPrimary.opacity(0.1), in: Capsule())
            .foregroundStyle(AppColors.brandPrimary)
    }
}
