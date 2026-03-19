"use client";
import { useLang } from "@/lib/LangContext";
import type { Lang } from "@/lib/i18n";

export const LangToggle = ({ collapsed }: { collapsed?: boolean }) => {
  const { lang, setLang } = useLang();

  return (
    <div className="flex gap-1 px-2">
      {(["es", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`flex-1 py-1 rounded-md font-gaming text-xs tracking-widest transition-all uppercase
            ${lang === l
              ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"
              : "text-gray-500 hover:text-gray-300"
            }`}
        >
          {collapsed ? l.toUpperCase()[0] : l.toUpperCase()}
        </button>
      ))}
    </div>
  );
};
