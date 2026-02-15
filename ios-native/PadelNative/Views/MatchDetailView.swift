import SwiftUI

struct MatchDetailView: View {
    let match: Match
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var showDeleteConfirm = false

    private let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = AppConfig.swedishLocale
        formatter.dateStyle = .full
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                SectionCard(title: "Lag") {
                    VStack(alignment: .leading, spacing: 8) {
                        detailRow(label: "Lag A", value: match.teamAName)
                        Divider().background(AppColors.borderSubtle)
                        detailRow(label: "Lag B", value: match.teamBName)
                    }
                }

                SectionCard(title: "Resultat") {
                    VStack(alignment: .leading, spacing: 8) {
                        detailRow(label: "Poäng", value: "\(match.teamAScore) – \(match.teamBScore)")
                        Divider().background(AppColors.borderSubtle)
                        detailRow(label: "Typ", value: match.scoreType == "points" ? "Poäng" : "Set")
                        if let target = match.scoreTarget {
                            Divider().background(AppColors.borderSubtle)
                            detailRow(label: "Mål", value: "\(target)")
                        }
                        Divider().background(AppColors.borderSubtle)
                        detailRow(label: "Spelad", value: formatter.string(from: match.playedAt))
                    }
                }

                SectionCard(title: "Matchmetadata") {
                    VStack(alignment: .leading, spacing: 8) {
                        detailRow(label: "Källa", value: match.sourceTournamentId == nil ? "Fristående match" : "Turneringsmatch")
                        if let sourceType = match.sourceTournamentType, !sourceType.isEmpty {
                            Divider().background(AppColors.borderSubtle)
                            detailRow(label: "Källtyp", value: sourceType)
                        }
                        if let sourceId = match.sourceTournamentId {
                            Divider().background(AppColors.borderSubtle)
                            detailRow(label: "Turnering", value: viewModel.tournamentName(for: sourceId))
                        }
                    }
                }

                SectionCard(title: "ELO-förändring (estimat)") {
                    let breakdown = viewModel.eloBreakdown(for: match)
                    if breakdown.isEmpty {
                        Text("Ingen ELO-detalj finns för den här äldre matchen ännu.")
                            .font(.inter(.body))
                            .foregroundStyle(AppColors.textSecondary)
                    } else {
                        VStack(spacing: 16) {
                            ForEach(breakdown) { row in
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(row.playerName)
                                            .font(.inter(.subheadline, weight: .bold))
                                            .foregroundStyle(AppColors.textPrimary)
                                        Spacer()
                                        Text("\(row.delta >= 0 ? "+" : "")\(row.delta)")
                                            .font(.inter(.subheadline, weight: .black))
                                            .foregroundStyle(row.delta >= 0 ? AppColors.success : AppColors.error)
                                    }

                                    Text("ELO före: \(row.estimatedBefore) → efter: \(row.estimatedAfter)")
                                        .font(.inter(.caption2))
                                        .foregroundStyle(AppColors.textSecondary)

                                    if let explanation = row.explanation {
                                        DisclosureGroup {
                                            VStack(alignment: .leading, spacing: 10) {
                                                let lines = explanation.split(separator: "\n").map(String.init)
                                                ForEach(lines, id: \.self) { line in
                                                    HStack(spacing: 8) {
                                                        Image(systemName: "info.circle.fill")
                                                            .font(.caption2)
                                                            .foregroundStyle(AppColors.brandPrimary)
                                                        Text(line)
                                                            .font(.inter(size: 11, weight: .medium))
                                                            .foregroundStyle(AppColors.textPrimary)
                                                    }
                                                }
                                            }
                                            .padding(.vertical, 8)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                        } label: {
                                            Label("Varför ändrades min ELO?", systemImage: "questionmark.circle.fill")
                                                .font(.inter(.caption, weight: .bold))
                                                .foregroundStyle(AppColors.brandPrimary)
                                        }
                                        .padding(10)
                                        .background(AppColors.brandPrimary.opacity(0.05))
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                    }
                                }

                                if row.id != breakdown.last?.id {
                                    Divider().background(AppColors.borderSubtle)
                                }
                            }
                        }
                    }
                }

                if viewModel.canDeleteMatch(match) {
                    Button(role: .destructive) {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        showDeleteConfirm = true
                    } label: {
                        Label("Radera match permanent", systemImage: "trash")
                            .font(.inter(.subheadline, weight: .bold))
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .padding(.top, 20)
                }
            }
            .padding()
        }
        .background(AppColors.background)
        .confirmationDialog("Radera match?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Radera permanent", role: .destructive) {
                Task { await viewModel.deleteMatch(match) }
            }
            Button("Avbryt", role: .cancel) { }
        } message: {
            Text("Det här tar bort matchen mellan \(match.teamAName) och \(match.teamBName) permanent från databasen. Detta kan inte ångras.")
        }
        .navigationTitle("Matchdetaljer")
        .padelLiquidGlassChrome()
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.inter(.subheadline))
                .foregroundStyle(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(.inter(.subheadline, weight: .bold))
                .foregroundStyle(AppColors.textPrimary)
        }
        .padding(.vertical, 4)
    }
}
