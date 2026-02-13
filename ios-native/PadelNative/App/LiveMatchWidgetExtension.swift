import WidgetKit
import SwiftUI
import ActivityKit

#if APP_EXTENSION
@main
struct PadelWidgetBundle: WidgetBundle {
    var body: some Widget {
        LiveMatchWidgetExtension()
    }
}
#endif

struct LiveMatchWidgetExtension: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LiveMatchAttributes.self) { context in
            // Lock Screen UI
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Padel Match")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(context.state.status)
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.accentColor.opacity(0.1), in: Capsule())
                }

                HStack {
                    VStack(alignment: .leading) {
                        Text(context.attributes.teamAName)
                            .font(.headline)
                        Text("\(context.state.teamAScore)")
                            .font(.title.weight(.black))
                    }

                    Spacer()

                    Text("vs")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Spacer()

                    VStack(alignment: .trailing) {
                        Text(context.attributes.teamBName)
                            .font(.headline)
                        Text("\(context.state.teamBScore)")
                            .font(.title.weight(.black))
                    }
                }
            }
            .padding()
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    VStack {
                        Text(context.attributes.teamAName)
                            .font(.caption.bold())
                        Text("\(context.state.teamAScore)")
                            .font(.title)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack {
                        Text(context.attributes.teamBName)
                            .font(.caption.bold())
                        Text("\(context.state.teamBScore)")
                            .font(.title)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.status)
                        .font(.caption2.bold())
                }
            } compactLeading: {
                Text("\(context.state.teamAScore)")
                    .foregroundStyle(Color.accentColor)
            } compactTrailing: {
                Text("\(context.state.teamBScore)")
            } minimal: {
                Text("\(context.state.teamAScore + context.state.teamBScore)")
            }
        }
    }
}
