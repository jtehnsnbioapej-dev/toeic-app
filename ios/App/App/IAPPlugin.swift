import Foundation
import Capacitor
import StoreKit
import AVFoundation

@objc(IAPPlugin)
public class IAPPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IAPPlugin"
    public let jsName = "IAP"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isPremium",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchasePremium",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getTicketCount",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseTickets",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeTicket",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playSfx",          returnType: CAPPluginReturnPromise),
    ]

    private var sfxPlayer: AVAudioPlayer?

    private let premiumProductId = "com.toeicapp.app.premium"
    private let premiumKey = "iap_premium"
    private let ticketKey  = "iap_tickets"
    private let ticketPacks: [String: Int] = [
        "com.toeicapp.app.chargen": 1,
    ]

    @objc func isPremium(_ call: CAPPluginCall) {
        call.resolve(["value": UserDefaults.standard.bool(forKey: premiumKey)])
    }

    @objc func purchasePremium(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: [premiumProductId])
                guard let product = products.first else {
                    call.resolve(["success": false, "error": "product_not_found:\(premiumProductId)"])
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    if case .verified(let tx) = verification {
                        UserDefaults.standard.set(true, forKey: premiumKey)
                        let tickets = UserDefaults.standard.integer(forKey: ticketKey)
                        UserDefaults.standard.set(tickets + 1, forKey: ticketKey)
                        await tx.finish()
                        call.resolve(["success": true])
                    } else {
                        call.resolve(["success": false, "error": "unverified"])
                    }
                case .userCancelled:
                    call.resolve(["success": false, "cancelled": true])
                case .pending:
                    call.resolve(["success": false, "error": "pending"])
                default:
                    call.resolve(["success": false, "error": "unknown_result"])
                }
            } catch {
                call.resolve(["success": false, "error": error.localizedDescription])
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            var restored = false
            for await result in Transaction.currentEntitlements {
                if case .verified(let tx) = result, tx.productID == premiumProductId {
                    UserDefaults.standard.set(true, forKey: premiumKey)
                    restored = true
                }
            }
            call.resolve(["success": restored])
        }
    }

    @objc func getTicketCount(_ call: CAPPluginCall) {
        call.resolve(["count": UserDefaults.standard.integer(forKey: ticketKey)])
    }

    @objc func purchaseTickets(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"),
              let addCount = ticketPacks[productId] else {
            call.resolve(["success": false, "error": "invalid_product"])
            return
        }
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.resolve(["success": false, "error": "product_not_found:\(productId)"])
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    if case .verified(let tx) = verification {
                        let current  = UserDefaults.standard.integer(forKey: ticketKey)
                        let newCount = current + addCount
                        UserDefaults.standard.set(newCount, forKey: ticketKey)
                        await tx.finish()
                        call.resolve(["success": true, "tickets": newCount])
                    } else {
                        call.resolve(["success": false, "error": "unverified"])
                    }
                case .userCancelled:
                    call.resolve(["success": false, "cancelled": true])
                case .pending:
                    call.resolve(["success": false, "error": "pending"])
                default:
                    call.resolve(["success": false, "error": "unknown_result"])
                }
            } catch {
                call.resolve(["success": false, "error": error.localizedDescription])
            }
        }
    }

    @objc func consumeTicket(_ call: CAPPluginCall) {
        let current = UserDefaults.standard.integer(forKey: ticketKey)
        guard current > 0 else {
            call.resolve(["success": false, "remaining": 0])
            return
        }
        UserDefaults.standard.set(current - 1, forKey: ticketKey)
        call.resolve(["success": true, "remaining": current - 1])
    }

    @objc func playSfx(_ call: CAPPluginCall) {
        guard let name = call.getString("name") else {
            call.resolve()
            return
        }
        // public/audio/se 配下 → 見つからなければバンドル直下を探索（folder reference でない場合の保険）
        let url = Bundle.main.url(forResource: name, withExtension: "mp3", subdirectory: "public/audio/se")
            ?? Bundle.main.url(forResource: name, withExtension: "mp3", subdirectory: "public")
            ?? Bundle.main.url(forResource: name, withExtension: "mp3")
        guard let url = url else {
            call.resolve()
            return
        }
        DispatchQueue.main.async {
            do {
                try AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
                try AVAudioSession.sharedInstance().setActive(true)
                let player = try AVAudioPlayer(contentsOf: url)
                player.prepareToPlay()
                player.play()
                self.sfxPlayer = player
            } catch {}
        }
        call.resolve()
    }
}
