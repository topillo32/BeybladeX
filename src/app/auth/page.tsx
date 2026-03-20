"use client";
export const dynamic = "force-dynamic";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginUser, registerUser, getUserData, checkDisplayNameTaken } from "@/services/authService";
import { useLang } from "@/lib/LangContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validatePassword = (pw: string): string | null => {
  if (pw.length < 8)          return "Mínimo 8 caracteres";
  if (!/[A-Z]/.test(pw))      return "Debe tener al menos una mayúscula";
  if (!/[0-9]/.test(pw))      return "Debe tener al menos un número";
  return null;
};

export default function AuthPage() {
  const { t, lang, setLang } = useLang();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [name, setName]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!EMAIL_RE.test(email))
      errs.email = "Correo electrónico inválido";

    if (mode === "register") {
      if (!name.trim())
        errs.name = "El nombre no puede estar vacío";

      const pwErr = validatePassword(password);
      if (pwErr) errs.password = pwErr;

      if (password !== confirm)
        errs.confirm = "Las contraseñas no coinciden";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "login") {
        const cred = await loginUser(email, password);
        const userData = await getUserData(cred.user.uid);
        router.push(userData?.role === "player" ? "/player/tournaments" : "/dashboard");
      } else {
        // Check name uniqueness (case-sensitive)
        const nameTaken = await checkDisplayNameTaken(name.trim());
        if (nameTaken) {
          setFieldErrors((prev) => ({ ...prev, name: "Este nombre ya está en uso" }));
          return;
        }
        await registerUser(email, password, name.trim());
        router.push("/player/tournaments");
      }
    } catch (err: any) {
      // Map Firebase error codes to readable messages
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use")
        setFieldErrors((prev) => ({ ...prev, email: "Este correo ya está registrado" }));
      else if (code === "auth/invalid-email")
        setFieldErrors((prev) => ({ ...prev, email: "Correo electrónico inválido" }));
      else if (code === "auth/wrong-password" || code === "auth/invalid-credential")
        setError("Correo o contraseña incorrectos");
      else
        setError(err.message ?? t("authFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fe = fieldErrors;

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
              <button key={m} onClick={() => { setMode(m); setError(null); setFieldErrors({}); }}
                className={`flex-1 py-2 rounded-lg font-gaming text-xs tracking-widest transition-all
                  ${mode === m ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-gray-500 hover:text-gray-300"}`}>
                {m === "login" ? t("login") : t("register")}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: "" })); }}
                  placeholder={t("displayName")}
                  className={`input-base ${fe.name ? "border-red-500/50" : ""}`}
                  required
                />
                {fe.name && <p className="text-red-400 text-xs mt-1 pl-1">{fe.name}</p>}
              </div>
            )}

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); }}
                placeholder={t("email")}
                className={`input-base ${fe.email ? "border-red-500/50" : ""}`}
                required
              />
              {fe.email && <p className="text-red-400 text-xs mt-1 pl-1">{fe.email}</p>}
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "" })); }}
                placeholder={t("password")}
                className={`input-base ${fe.password ? "border-red-500/50" : ""}`}
                required
              />
              {fe.password && <p className="text-red-400 text-xs mt-1 pl-1">{fe.password}</p>}
              {mode === "register" && !fe.password && (
                <p className="text-gray-600 text-xs mt-1 pl-1">Mín. 8 caracteres, una mayúscula y un número</p>
              )}
            </div>

            {mode === "register" && (
              <div>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setFieldErrors((p) => ({ ...p, confirm: "" })); }}
                  placeholder="Confirmar contraseña"
                  className={`input-base ${fe.confirm ? "border-red-500/50" : ""}`}
                  required
                />
                {fe.confirm && <p className="text-red-400 text-xs mt-1 pl-1">{fe.confirm}</p>}
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

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
