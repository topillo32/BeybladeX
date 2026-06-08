import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import { Orbitron } from "next/font/google";
import { AuthProvider } from "@/lib/AuthContext";
import { LangProvider } from "@/lib/LangContext";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { MaintenanceGate } from "@/components/layout/MaintenanceGate";
import "./globals.css";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "BeyMatch",
  description: "Gestor de Torneos Pro",
  icons: {
    icon: "/icons/logo.png",
    shortcut: "/icons/logo.png",
    apple: "/icons/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${orbitron.variable} bg-slate-950 bg-grid text-white`}>
        <LangProvider>
          <AuthProvider>
            <MaintenanceGate>
              {children}
            </MaintenanceGate>
            <footer className="w-full border-t border-white/10 bg-slate-950/95 text-center py-4 text-xs text-white/60">
              <p>
                Soporte: <a href="mailto:soportebeymatch@gmail.com" className="text-cyan-300 hover:underline">soportebeymatch@gmail.com</a>
              </p>
            </footer>
            <OfflineBanner />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
