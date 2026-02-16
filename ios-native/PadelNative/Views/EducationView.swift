import SwiftUI

struct GlossaryItem: Identifiable {
    let id = UUID()
    let term: String
    let definition: String
}

struct RuleItem: Identifiable {
    let id = UUID()
    let title: String
    let content: String
}

struct EducationView: View {
    @State private var searchTerm = ""

    let glossary: [GlossaryItem] = [
        GlossaryItem(term: "Bandeja", definition: "Ett taktiskt överhuvudsslag som används för att behålla nätet. Slås ofta med slice."),
        GlossaryItem(term: "Vibora", definition: "Ett mer offensivt överhuvudsslag med mycket sidoskruv (ormen)."),
        GlossaryItem(term: "Chiquita", definition: "Ett löst slag mot motståndarens fötter för att tvinga fram en dålig volley."),
        GlossaryItem(term: "Lob", definition: "Ett högt slag över motståndaren för att tvinga dem bort från nätet."),
        GlossaryItem(term: "Bajada", definition: "Ett slag där man attackerar en boll som studsat högt upp i bakglaset."),
        GlossaryItem(term: "Globo", definition: "Spanska ordet för lobb."),
        GlossaryItem(term: "Contrapared", definition: "Att slå bollen i sin egen bakvägg för att få den över nät."),
        GlossaryItem(term: "Dormilona", definition: "En stoppboll som slås efter att bollen studsat i motståndarens glas.")
    ]

    let rules: [RuleItem] = [
        RuleItem(title: "Poängräkning", content: "Samma som i tennis: 15, 30, 40, Game. Vid 40-40 spelas ofta Golden Point i padel."),
        RuleItem(title: "Serven", content: "Måste slås underhands, under midjehöjd, och studsa i motståndarens serveruta diagonalt."),
        RuleItem(title: "Väggar & Glas", content: "Bollen får studsa i glaset efter att den först studsat i marken. Om den träffar glaset direkt är bollen ute.")
    ]

    var filteredGlossary: [GlossaryItem] {
        if searchTerm.isEmpty {
            return glossary
        } else {
            return glossary.filter {
                $0.term.lowercased().contains(searchTerm.lowercased()) ||
                $0.definition.lowercased().contains(searchTerm.lowercased())
            }
        }
    }

    var body: some View {
        List {
            Section(header: Text("Sök i ordlistan")) {
                TextField("Sök term eller definition...", text: $searchTerm)
                    .textFieldStyle(.roundedBorder)
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))

                ForEach(filteredGlossary) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.term)
                            .font(.inter(.subheadline, weight: .bold))
                            .foregroundStyle(AppColors.brandPrimary)
                        Text(item.definition)
                            .font(.inter(.caption))
                            .foregroundStyle(AppColors.textSecondary)
                    }
                    .padding(.vertical, 4)
                }

                if filteredGlossary.isEmpty {
                    Text("Inga matchningar hittades.")
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)
                        .frame(maxWidth: .infinity, textAlign: .center)
                        .padding()
                }
            }

            Section(header: Text("Grundregler")) {
                ForEach(rules) { rule in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(rule.title)
                            .font(.inter(.subheadline, weight: .bold))
                        Text(rule.content)
                            .font(.inter(.caption))
                            .foregroundStyle(AppColors.textSecondary)
                    }
                    .padding(.vertical, 8)
                }
            }
        }
        .navigationTitle("Utbildning & Regler")
        .listStyle(.insetGrouped)
    }
}
