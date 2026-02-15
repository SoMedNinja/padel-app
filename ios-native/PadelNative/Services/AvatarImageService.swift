import CryptoKit
import Foundation
import ImageIO
import UIKit

// Note for non-coders:
// This service is a shared "image helper" that keeps avatars in fast memory and
// optional on-disk storage so we avoid downloading/decoding the same image repeatedly.
final class AvatarImageService {
    static let shared = AvatarImageService()

    private let memoryCache = NSCache<NSString, UIImage>()
    private let session: URLSession
    private let queue = DispatchQueue(label: "AvatarImageService.queue")
    private let fileManager: FileManager
    private let diskCacheDirectory: URL?

    // Tracks all generated cache keys for a URL so we can invalidate every size variant.
    private var keysByURL: [String: Set<String>] = [:]

    private init(
        session: URLSession = .shared,
        fileManager: FileManager = .default,
        enableDiskCache: Bool = true
    ) {
        self.session = session
        self.fileManager = fileManager

        memoryCache.countLimit = 300
        memoryCache.totalCostLimit = 80 * 1024 * 1024

        if enableDiskCache,
           let cacheRoot = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first {
            let directory = cacheRoot.appendingPathComponent("AvatarImageCache", isDirectory: true)
            try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: nil)
            self.diskCacheDirectory = directory
        } else {
            self.diskCacheDirectory = nil
        }
    }

    // Note for non-coders:
    // "targetPixelSize" is the rendered size in pixels, not points.
    // We downsample to this size so huge images do not waste memory when shown as small avatars.
    func image(for urlString: String, targetPixelSize: CGFloat) async -> UIImage? {
        let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        let cacheKey = makeCacheKey(urlString: trimmed, pixelSize: targetPixelSize)

        if let cached = memoryCache.object(forKey: cacheKey as NSString) {
            return cached
        }

        if let diskImage = loadFromDisk(cacheKey: cacheKey) {
            memoryCache.setObject(diskImage, forKey: cacheKey as NSString, cost: estimatedCost(for: diskImage))
            register(cacheKey: cacheKey, for: trimmed)
            return diskImage
        }

        let image: UIImage?
        if trimmed.hasPrefix("data:image") {
            image = decodeDataURL(trimmed, targetPixelSize: targetPixelSize)
        } else if let url = URL(string: trimmed), url.scheme?.hasPrefix("http") == true {
            image = await loadRemoteImage(url: url, targetPixelSize: targetPixelSize)
        } else {
            image = nil
        }

        guard let image else { return nil }
        memoryCache.setObject(image, forKey: cacheKey as NSString, cost: estimatedCost(for: image))
        saveToDisk(image: image, cacheKey: cacheKey)
        register(cacheKey: cacheKey, for: trimmed)
        return image
    }

    func invalidate(urlString: String?) {
        guard let urlString else { return }
        let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        queue.sync {
            let keys = keysByURL.removeValue(forKey: trimmed) ?? []
            for key in keys {
                memoryCache.removeObject(forKey: key as NSString)
                removeFromDisk(cacheKey: key)
            }
        }
    }

    func clearAll() {
        memoryCache.removeAllObjects()
        queue.sync {
            keysByURL.removeAll()
        }
        guard let directory = diskCacheDirectory else { return }
        try? fileManager.removeItem(at: directory)
        try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: nil)
    }

    private func loadRemoteImage(url: URL, targetPixelSize: CGFloat) async -> UIImage? {
        do {
            let (data, response) = try await session.data(from: url)
            if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
                return nil
            }
            return downsampledImage(from: data, targetPixelSize: targetPixelSize)
        } catch {
            return nil
        }
    }

    private func decodeDataURL(_ string: String, targetPixelSize: CGFloat) -> UIImage? {
        let components = string.components(separatedBy: ",")
        guard components.count > 1, let base64String = components.last,
              let data = Data(base64Encoded: base64String) else {
            return nil
        }
        return downsampledImage(from: data, targetPixelSize: targetPixelSize)
    }

    private func downsampledImage(from data: Data, targetPixelSize: CGFloat) -> UIImage? {
        let maxDimension = max(8, Int(targetPixelSize.rounded(.up)))
        let options: [CFString: Any] = [kCGImageSourceShouldCache: false]
        guard let source = CGImageSourceCreateWithData(data as CFData, options as CFDictionary) else {
            return nil
        }

        let thumbnailOptions: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceThumbnailMaxPixelSize: maxDimension
        ]

        guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbnailOptions as CFDictionary) else {
            return nil
        }

        return UIImage(cgImage: cgImage)
    }

    private func makeCacheKey(urlString: String, pixelSize: CGFloat) -> String {
        let normalizedSize = max(1, Int(pixelSize.rounded(.up)))
        return "\(urlString)::\(normalizedSize)"
    }

    private func diskURL(for cacheKey: String) -> URL? {
        guard let diskCacheDirectory else { return nil }
        return diskCacheDirectory.appendingPathComponent("\(cacheKey.sha256Hex).jpg")
    }

    private func saveToDisk(image: UIImage, cacheKey: String) {
        guard let fileURL = diskURL(for: cacheKey),
              let data = image.jpegData(compressionQuality: 0.88) else {
            return
        }
        try? data.write(to: fileURL, options: .atomic)
    }

    private func loadFromDisk(cacheKey: String) -> UIImage? {
        guard let fileURL = diskURL(for: cacheKey),
              let data = try? Data(contentsOf: fileURL),
              let image = UIImage(data: data) else {
            return nil
        }
        return image
    }

    private func removeFromDisk(cacheKey: String) {
        guard let fileURL = diskURL(for: cacheKey) else { return }
        try? fileManager.removeItem(at: fileURL)
    }

    private func register(cacheKey: String, for urlString: String) {
        queue.sync {
            var keySet = keysByURL[urlString, default: []]
            keySet.insert(cacheKey)
            keysByURL[urlString] = keySet
        }
    }

    private func estimatedCost(for image: UIImage) -> Int {
        guard let cgImage = image.cgImage else { return 1 }
        return cgImage.bytesPerRow * cgImage.height
    }
}

private extension String {
    var sha256Hex: String {
        let digest = SHA256.hash(data: Data(utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}
