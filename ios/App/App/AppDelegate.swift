import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var audioSessionTimer: Timer?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        audioSessionTimer?.invalidate()
        audioSessionTimer = nil
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // WKWebView がカテゴリを上書きした場合に .playback(.mixWithOthers) を復元（100ms ごとに監視）
        // .playback はサイレントスイッチを無視、.mixWithOthers で外部音楽と共存
        audioSessionTimer?.invalidate()
        audioSessionTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            let session = AVAudioSession.sharedInstance()
            if session.category == .playback && session.categoryOptions.contains(.mixWithOthers) { return }
            try? session.setCategory(.playback, options: [.mixWithOthers])
            try? session.setActive(true)
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
