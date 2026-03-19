"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginUser, registerUser, getUserData } from "@/services/authService";
import { useLang } from "@/lib/LangContext";

export default function AuthPage() {
  const { t, lang, setLang } = useLang();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        const cred = await loginUser(email, password);
        const userData = await getUserData(cred.user.uid);
        router.push(userData?.role === "player" ? "/player/tournaments" : "/dashboard");
      } else {
        await registerUser(email, password, name);
        router.push("/player/tournaments");
      }
    } catch (err: any) {
      setError(err.message ?? t("authFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="relative w-16 h-16 mx-auto animate-float">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-spin-slow" />
            <div className="absolute inset-2 rounded-full border border-purple-400/50 animate-spin-reverse" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🌀</div>
          </div>
          <h1 className="font-gaming text-2xl font-black tracking-widest animate-pulse-glow">
            BEYBLADE<span className="text-cyan-400">X</span>
          </h1>
          <p className="text-gray-400 text-sm">{t("tournamentManager")}</p>
        </div>

        {/* Card */}
        <div className="card card-cyan p-6 space-y-4">
          {/* Lang toggle */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
            {(["es", "en"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex-1 py-1.5 rounded-lg font-gaming text-xs tracking-widest transition-all uppercase
                  ${lang === l ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-gray-500 hover:text-gray-300"}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2 rounded-lg font-gaming text-xs tracking-widest transition-all
                  ${mode === m ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-gray-500 hover:text-gray-300"}`}>
                {m === "login" ? t("login") : t("register")}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t("displayName")} className="input-base" required />
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email")} className="input-base" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password")} className="input-base" required />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full font-gaming text-sm tracking-wider">
              {loading ? "..." : mode === "login" ? t("signIn") : t("createAccount")}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs">
          <a href="/t" className="text-cyan-500 hover:underline">{t("viewPublic")}</a>
        </p>
      </div>
    </div>
  );
}
