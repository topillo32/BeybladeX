import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import { Orbitron } from "next/font/google";
import { AuthProvider } from "@/lib/AuthContext";
import { LangProvider } from "@/lib/LangContext";
import "./globals.css";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "Beyblade X PAC",
  description: "Gestor de Torneos Beyblade X PAC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${orbitron.variable} bg-[#030712] bg-grid text-white`}>
        <LangProvider>
          <AuthProvider>{children}</AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
