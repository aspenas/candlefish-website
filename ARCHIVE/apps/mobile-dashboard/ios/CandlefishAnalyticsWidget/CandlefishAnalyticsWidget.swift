import WidgetKit
import SwiftUI
import Intents

struct Provider: IntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: ConfigurationIntent(), metric: MetricData.placeholder)
    }

    func getSnapshot(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), configuration: configuration, metric: MetricData.placeholder)
        completion(entry)
    }

    func getTimeline(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let currentDate = Date()

        // Fetch metric data from UserDefaults shared with main app
        let metric = fetchMetricData(for: configuration)

        let entry = SimpleEntry(
            date: currentDate,
            configuration: configuration,
            metric: metric
        )

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func fetchMetricData(for configuration: ConfigurationIntent) -> MetricData {
        guard let sharedDefaults = UserDefaults(suiteName: "group.ai.candlefish.analytics"),
              let widgetData = sharedDefaults.data(forKey: "widgetMetrics") else {
            return MetricData.placeholder
        }

        do {
            let decoder = JSONDecoder()
            let metrics = try decoder.decode([String: MetricData].self, from: widgetData)
            let selectedMetricId = configuration.metric?.identifier ?? "default"
            return metrics[selectedMetricId] ?? MetricData.placeholder
        } catch {
            print("Error decoding widget data: \(error)")
            return MetricData.placeholder
        }
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationIntent
    let metric: MetricData
}

struct CandlefishAnalyticsWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        GeometryReader { geometry in
            VStack(alignment: .leading, spacing: 4) {
                // Header
                HStack {
                    Text("Analytics")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Spacer()
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.caption2)
                        .foregroundColor(.blue)
                }

                Spacer()

                // Metric Name
                Text(entry.metric.name)
                    .font(.caption)
                    .foregroundColor(.primary)
                    .lineLimit(1)

                // Metric Value
                HStack(alignment: .bottom, spacing: 4) {
                    Text(entry.metric.formattedValue)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)

                    if let trend = entry.metric.trend {
                        HStack(spacing: 2) {
                            Image(systemName: trend.isPositive ? "arrow.up" : "arrow.down")
                                .font(.caption2)
                            Text(trend.formattedChange)
                                .font(.caption2)
                        }
                        .foregroundColor(trend.isPositive ? .green : .red)
                    }
                }

                // Mini Chart
                if !entry.metric.chartData.isEmpty {
                    MiniChart(data: entry.metric.chartData)
                        .frame(height: 20)
                        .padding(.top, 2)
                }

                Spacer()

                // Last Updated
                HStack {
                    Text("Updated \(entry.metric.lastUpdated, formatter: timeFormatter)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }
            .padding(12)
        }
        .widgetURL(URL(string: "candlefish-analytics://dashboard/\(entry.metric.dashboardId)"))
    }

    private var timeFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }
}

struct MiniChart: View {
    let data: [Double]

    var body: some View {
        GeometryReader { geometry in
            Path { path in
                guard data.count > 1 else { return }

                let minValue = data.min() ?? 0
                let maxValue = data.max() ?? 1
                let range = maxValue - minValue

                let stepX = geometry.size.width / CGFloat(data.count - 1)

                for (index, value) in data.enumerated() {
                    let x = CGFloat(index) * stepX
                    let normalizedValue = range > 0 ? (value - minValue) / range : 0.5
                    let y = geometry.size.height * (1 - normalizedValue)

                    if index == 0 {
                        path.move(to: CGPoint(x: x, y: y))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: y))
                    }
                }
            }
            .stroke(Color.blue, lineWidth: 1.5)
        }
    }
}

struct MetricData: Codable {
    let id: String
    let name: String
    let value: Double
    let formattedValue: String
    let unit: String?
    let trend: TrendData?
    let chartData: [Double]
    let lastUpdated: Date
    let dashboardId: String

    static let placeholder = MetricData(
        id: "placeholder",
        name: "Total Revenue",
        value: 125430.50,
        formattedValue: "$125.4K",
        unit: "USD",
        trend: TrendData(change: 8.2, isPositive: true, formattedChange: "8.2%"),
        chartData: [100, 110, 105, 120, 115, 125],
        lastUpdated: Date(),
        dashboardId: "default"
    )
}

struct TrendData: Codable {
    let change: Double
    let isPositive: Bool
    let formattedChange: String
}

@main
struct CandlefishAnalyticsWidget: Widget {
    let kind: String = "CandlefishAnalyticsWidget"

    var body: some WidgetConfiguration {
        IntentConfiguration(kind: kind, intent: ConfigurationIntent.self, provider: Provider()) { entry in
            CandlefishAnalyticsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Analytics Metric")
        .description("Display key metrics from your analytics dashboard.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
