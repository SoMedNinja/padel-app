import Foundation
import UIKit

struct ShareCardService {
    enum ShareCardError: Error {
        case generationFailed
    }

    enum Variant: Int, CaseIterable, Identifiable {
        case classic = 0
        case dark
        case ocean
        case magazine
        case vibrant

        var id: Int { rawValue }

        var title: String {
            switch self {
            case .classic: return "Klassisk"
            case .dark: return "Dark"
            case .ocean: return "Ocean"
            case .magazine: return "Magasin"
            case .vibrant: return "Vibrant"
            }
        }

        var cardStyle: (background: UIColor, accent: UIColor, body: UIColor, footer: UIColor, hasFrame: Bool, titleFont: UIFont, bodyFont: UIFont) {
            switch self {
            case .classic:
                return (
                    background: UIColor(red: 0.07, green: 0.11, blue: 0.20, alpha: 1),
                    accent: UIColor(red: 0.72, green: 0.11, blue: 0.12, alpha: 1),
                    body: UIColor.white.withAlphaComponent(0.9),
                    footer: UIColor.white.withAlphaComponent(0.7),
                    hasFrame: false,
                    titleFont: .systemFont(ofSize: 64, weight: .bold),
                    bodyFont: .systemFont(ofSize: 36, weight: .regular)
                )
            case .dark:
                return (
                    background: UIColor(red: 0.07, green: 0.09, blue: 0.16, alpha: 1),
                    accent: UIColor(red: 0.22, green: 0.94, blue: 0.49, alpha: 1),
                    body: UIColor.white.withAlphaComponent(0.92),
                    footer: UIColor.white.withAlphaComponent(0.72),
                    hasFrame: false,
                    titleFont: .systemFont(ofSize: 64, weight: .heavy),
                    bodyFont: .systemFont(ofSize: 36, weight: .medium)
                )
            case .ocean:
                return (
                    background: UIColor(red: 0.04, green: 0.28, blue: 0.55, alpha: 1),
                    accent: UIColor(red: 0.00, green: 0.82, blue: 1.00, alpha: 1),
                    body: UIColor.white.withAlphaComponent(0.95),
                    footer: UIColor.white.withAlphaComponent(0.75),
                    hasFrame: false,
                    titleFont: .systemFont(ofSize: 64, weight: .bold),
                    bodyFont: .systemFont(ofSize: 36, weight: .regular)
                )
            case .magazine:
                return (
                    background: .white,
                    accent: UIColor(red: 0.07, green: 0.11, blue: 0.20, alpha: 1),
                    body: UIColor(red: 0.07, green: 0.11, blue: 0.20, alpha: 0.88),
                    footer: UIColor(red: 0.07, green: 0.11, blue: 0.20, alpha: 0.55),
                    hasFrame: true,
                    titleFont: .systemFont(ofSize: 64, weight: .black),
                    bodyFont: .systemFont(ofSize: 35, weight: .medium)
                )
            case .vibrant:
                return (
                    background: UIColor(red: 0.92, green: 0.03, blue: 0.35, alpha: 1),
                    accent: UIColor(red: 1.0, green: 0.76, blue: 0.16, alpha: 1),
                    body: UIColor.white.withAlphaComponent(0.96),
                    footer: UIColor.white.withAlphaComponent(0.82),
                    hasFrame: false,
                    titleFont: .systemFont(ofSize: 64, weight: .heavy),
                    bodyFont: .systemFont(ofSize: 36, weight: .medium)
                )
            }
        }
    }

    // Note for non-coders:
    // This builds a simple branded image so iOS sharing can send a visual card, not only plain text.
    static func createShareImageFile(
        title: String,
        bodyLines: [String],
        fileNamePrefix: String,
        variant: Variant = .classic
    ) throws -> URL {
        let width: CGFloat = 1080
        let height: CGFloat = 1350
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height))
        let style = variant.cardStyle

        let image = renderer.image { context in
            let cg = context.cgContext
            cg.setFillColor(style.background.cgColor)
            cg.fill(CGRect(x: 0, y: 0, width: width, height: height))

            if style.hasFrame {
                // Note for non-coders: this frame style mimics a magazine cover layout and keeps text inside a safe area.
                cg.setStrokeColor(style.accent.withAlphaComponent(0.18).cgColor)
                cg.setLineWidth(26)
                cg.stroke(CGRect(x: 40, y: 40, width: width - 80, height: height - 80))
            }

            cg.setFillColor(style.accent.cgColor)
            cg.fill(CGRect(x: 0, y: 0, width: width, height: 24))

            let paragraph = NSMutableParagraphStyle()
            paragraph.lineBreakMode = .byWordWrapping

            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: style.titleFont,
                .foregroundColor: style.hasFrame ? style.accent : UIColor.white,
                .paragraphStyle: paragraph
            ]
            let bodyAttributes: [NSAttributedString.Key: Any] = [
                .font: style.bodyFont,
                .foregroundColor: style.body,
                .paragraphStyle: paragraph
            ]
            let footerAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 28, weight: .medium),
                .foregroundColor: style.footer
            ]

            NSString(string: title).draw(in: CGRect(x: 72, y: 88, width: width - 144, height: 200), withAttributes: titleAttributes)
            let body = bodyLines.joined(separator: "\n")
            NSString(string: body).draw(in: CGRect(x: 72, y: 290, width: width - 144, height: 860), withAttributes: bodyAttributes)
            NSString(string: "Generated in PadelNative").draw(in: CGRect(x: 72, y: height - 90, width: width - 144, height: 40), withAttributes: footerAttributes)
        }

        guard let data = image.pngData() else {
            throw ShareCardError.generationFailed
        }

        let sanitizedPrefix = fileNamePrefix.replacingOccurrences(of: " ", with: "-")
        let fileURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("\(sanitizedPrefix)-\(UUID().uuidString).png")
        try data.write(to: fileURL, options: .atomic)
        return fileURL
    }
}
