export const dynamic = "force-dynamic";
import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030712] bg-grid">
      <header className="sticky top-0 z-50 bg-[#030712]/90 backdrop-blur-md border-b border-white/5">
        <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg">🌀</span>
            <span className="font-gaming font-bold tracking-widest text-sm text-white">
              BEYBLADE<span className="text-cyan-400">X</span>
            </span>
          </Link>
          <Link href="/auth" className="btn-primary text-xs font-gaming tracking-wider py-2 px-4">
            Sign In
          </Link>
        </nav>
      </header>
      <div>{children}</div>
    </div>
  );
}
