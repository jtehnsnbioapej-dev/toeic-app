"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",          icon: "🏠", label: "ホーム"   },
  { href: "/quiz",      icon: "🎯", label: "クイズ"   },
  { href: "/pet-chat",  icon: "💬", label: "話す"     },
  { href: "/vocab",     icon: "📝", label: "単語"     },
  { href: "/progress",  icon: "📊", label: "進捗"     },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 448,
      height: "var(--nav-h)",
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(16px)",
      borderTop: "1px solid rgba(56,178,240,0.12)",
      display: "flex", alignItems: "stretch",
      boxShadow: "0 -4px 24px rgba(56,178,240,0.1)",
      zIndex: 100,
    }}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 3, textDecoration: "none",
            paddingBottom: 6,
          }}>
            <span style={{ fontSize: active ? 26 : 22, transition: "font-size 0.15s" }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: 10, fontWeight: active ? 800 : 600,
              color: active ? "var(--primary)" : "var(--text-sub)",
              transition: "color 0.15s",
            }}>
              {item.label}
            </span>
            {active && (
              <div style={{
                position: "absolute", bottom: 0,
                width: 32, height: 3,
                background: "var(--primary)",
                borderRadius: "3px 3px 0 0",
              }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
