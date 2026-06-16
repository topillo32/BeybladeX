"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getIntercommunalTournament } from "@/services/intercommunalTournamentService";
import type { IntercommunalTournament } from "@/types/intercommunal";

export default function IntercommunalTournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const pathname = usePathname();
  const [tournament, setTournament] = useState<IntercommunalTournament | null>(null);

  useEffect(() => {
    const fetchTournament = async () => {
      const data = await getIntercommunalTournament(params.id);
      setTournament(data);
    };
    fetchTournament();
  }, [params.id]);

  if (!tournament) {
    return <div className="p-6 text-white text-center">Cargando torneo...</div>;
  }

  const navItems = [
    { name: "Dashboard", path: `/intercommunal/${params.id}` },
    { name: "Comunas (Equipos)", path: `/intercommunal/${params.id}/teams` },
    { name: "Fase de Grupos", path: `/intercommunal/${params.id}/groups` },
    { name: "Clasificación", path: `/intercommunal/${params.id}/standings` },
    { name: "Eliminatorias", path: `/intercommunal/${params.id}/bracket` },
    { name: "Juez", path: `/intercommunal/${params.id}/judge` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header navigation */}
      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
            <p className="text-sm text-gray-400">Estado: {tournament.status}</p>
          </div>
          <nav className="flex space-x-1 mt-4 md:mt-0 overflow-x-auto pb-2 md:pb-0">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </div>
    </div>
  );
}
