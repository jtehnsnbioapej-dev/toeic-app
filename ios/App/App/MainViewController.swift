import UIKit
import Capacitor

// アプリ内ローカルプラグイン（IAPPlugin）を明示登録するためのブリッジVC。
// Capacitor は capacitor.config.json の packageClassList に載るnpmプラグインしか
// 自動登録しないため、アプリ直下のプラグインは capacitorDidLoad() で登録する必要がある。
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(IAPPlugin())
    }
}
