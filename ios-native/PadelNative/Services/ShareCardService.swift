import Foundation
import UIKit

struct ShareCardService {
    enum ShareCardError: Error {
        case generationFailed
    }

    // Note for non-coders:
    // This builds a simple branded image so iOS sharing can send a visual card, not only plain text.
    static func createShareImageFile(title: String, bodyLines: [String], fileNamePrefix: String) throws -> URL {
        let width: CGFloat = 1080
        let height: CGFloat = 1350
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height))

        let image = renderer.image { context in
            let cg = context.cgContext
            let background = UIColor(red: 0.07, green: 0.11, blue: 0.20, alpha: 1)
            cg.setFillColor(background.cgColor)
            cg.fill(CGRect(x: 0, y: 0, width: width, height: height))

            let accent = UIColor(red: 0.72, green: 0.11, blue: 0.12, alpha: 1)
            cg.setFillColor(accent.cgColor)
            cg.fill(CGRect(x: 0, y: 0, width: width, height: 24))

            let paragraph = NSMutableParagraphStyle()
            paragraph.lineBreakMode = .byWordWrapping

            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 64, weight: .bold),
                .foregroundColor: UIColor.white,
                .paragraphStyle: paragraph
            ]
            let bodyAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 36, weight: .regular),
                .foregroundColor: UIColor.white.withAlphaComponent(0.9),
                .paragraphStyle: paragraph
            ]
            let footerAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 28, weight: .medium),
                .foregroundColor: UIColor.white.withAlphaComponent(0.7)
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
