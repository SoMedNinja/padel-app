import SwiftUI
import UIKit

struct ConfettiTriggerView: UIViewRepresentable {
    @Binding var trigger: Int

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .clear
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        // We use the coordinator to track the last trigger value seen
        if trigger > context.coordinator.lastTriggeredValue {
            context.coordinator.lastTriggeredValue = trigger
            ConfettiManager.trigger(in: uiView)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator {
        var lastTriggeredValue: Int = 0
    }
}

class ConfettiManager {
    static func trigger(in view: UIView) {
        let emitter = CAEmitterLayer()
        emitter.emitterPosition = CGPoint(x: view.bounds.midX, y: view.bounds.height + 10)
        emitter.emitterShape = .line
        emitter.emitterSize = CGSize(width: view.bounds.width, height: 1)

        let colors: [UIColor] = [
            UIColor(red: 211/255, green: 47/255, blue: 47/255, alpha: 1.0), // #d32f2f
            .white,
            .black
        ]

        let cells: [CAEmitterCell] = colors.map { color in
            let cell = CAEmitterCell()
            cell.birthRate = 25
            cell.lifetime = 4.0
            cell.velocity = 400
            cell.velocityRange = 150
            cell.emissionLongitude = -.pi / 2
            cell.emissionRange = .pi / 3
            cell.spin = 3
            cell.spinRange = 4
            cell.scale = 0.15
            cell.scaleRange = 0.1
            cell.contents = createConfettiImage(color: color)?.cgImage
            return cell
        }

        emitter.emitterCells = cells
        view.layer.addSublayer(emitter)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            emitter.birthRate = 0
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
            emitter.removeFromSuperlayer()
        }
    }

    private static func createConfettiImage(color: UIColor) -> UIImage? {
        let size = CGSize(width: 8, height: 8)
        UIGraphicsBeginImageContextWithOptions(size, false, 0)
        guard let context = UIGraphicsGetCurrentContext() else { return nil }
        context.setFillColor(color.cgColor)
        context.fill(CGRect(origin: .zero, size: size))
        let image = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return image
    }
}
