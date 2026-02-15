import UIKit
import LinkPresentation

final class MatchShareActivityItemSource: NSObject, UIActivityItemSource {
    private let text: String
    private let title: String
    private let cardImageURL: URL?
    private let metadataURL: URL

    init(text: String, title: String, cardImageURL: URL?, metadataURL: URL) {
        self.text = text
        self.title = title
        self.cardImageURL = cardImageURL
        self.metadataURL = metadataURL
        super.init()
    }

    func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
        text
    }

    func activityViewController(_ activityViewController: UIActivityViewController,
                                itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
        // Note for non-coders:
        // Returning plain text here guarantees every share target gets something readable.
        text
    }

    func activityViewController(_ activityViewController: UIActivityViewController,
                                subjectForActivityType activityType: UIActivity.ActivityType?) -> String {
        title
    }

    func activityViewControllerLinkMetadata(_ activityViewController: UIActivityViewController) -> LPLinkMetadata? {
        let metadata = LPLinkMetadata()
        metadata.title = title
        metadata.originalURL = metadataURL
        metadata.url = metadataURL

        if let cardImageURL {
            metadata.imageProvider = NSItemProvider(contentsOf: cardImageURL)
            metadata.iconProvider = NSItemProvider(contentsOf: cardImageURL)
        }

        return metadata
    }
}
