import { useState, useEffect } from "react";
import { 
  Trophy, 
  Users, 
  PlusCircle, 
  LayoutGrid, 
  Menu, 
  X, 
  Swords, 
  ChevronRight, Play, CheckCircle2, Lock,
  Calendar,
  Settings,
  ArrowRight
} from "lucide-react";
import { collection, getDocs, orderBy, query, doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { createTournament, updateTournamentStatus, TournamentStatus } from "../services/tournamentService";
import PlayerRegistrationForm from "./PlayerRegistrationForm";
import GroupManagement from "./GroupManagement";
import BracketView from "./BracketView";
import Standings from "./Standings";

// Interfaces
interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  createdAt?: any;
}

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState("tournaments");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [newTournamentName, setNewTournamentName] = useState("");

  // Cargar torneos
  useEffect(() => {
    if (currentView === "tournaments") {
      loadTournaments();
    }
  }, [currentView]);

  // Suscripción al torneo activo
  useEffect(() => {
    if (selectedTournamentId) {
        const unsub = onSnapshot(doc(db, "tournaments", selectedTournamentId), (doc) => {
            if (doc.exists()) {
                setCurrentTournament({ id: doc.id, ...doc.data() } as Tournament);
            }
        });
        return () => unsub();
    }
  }, [selectedTournamentId]);

  const loadTournaments = async () => {
    try {
      const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setTournaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament)));
    } catch (error) {
      console.error("Error loading tournaments", error);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim()) return;
    await createTournament(newTournamentName);
    setNewTournamentName("");
    setCurrentView("tournaments");
  };

  const handleAdvanceStatus = async (nextStatus: TournamentStatus) => {
      if (!selectedTournamentId) return;
      if (!window.confirm(`¿Avanzar fase a ${nextStatus}? Esta acción es irreversible.`)) return;
      await updateTournamentStatus(selectedTournamentId, nextStatus);
  };

  const getStatusBadge = (status: string) => {
      const styles: {[key:string]: string} = {
          DRAFT: "bg-slate-700 text-slate-300",
          REGISTRATION: "bg-blue-900 text-blue-300",
          GROUP_STAGE: "bg-cyan-900 text-cyan-300",
          KNOCKOUT: "bg-purple-900 text-purple-300",
          FINISHED: "bg-green-900 text-green-300"
      };
      return styles[status] || "bg-slate-800";
  };

  // Navegación
  const menuItems = [
    { id: "tournaments", label: "Torneos Activos", icon: Trophy, section: "main" },
    { id: "registration", label: "Inscripción", icon: Users, section: "main" },
    { id: "results", label: "Resultados", icon: LayoutGrid, section: "main" },
    { id: "create_tournament", label: "Nuevo Torneo", icon: PlusCircle, section: "admin" },
  ];

  // Renderizado de Vistas
  const renderContent = () => {
    switch (currentView) {
      case "tournaments":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-extrabold text-white tracking-tight italic">ARENAS <span className="text-cyan-400">DISPONIBLES</span></h2>
              <button 
                onClick={() => setCurrentView("create_tournament")}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-5 py-2 rounded-lg shadow-[0_0_20px_rgba(8,145,178,0.3)] transition-all transform hover:scale-105 font-bold uppercase text-sm tracking-wide flex items-center gap-2"
              >
                <PlusCircle size={20} /> Nuevo Torneo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((t) => (
                <div key={t.id} className="group bg-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-cyan-500/20 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy size={80} className="text-cyan-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 uppercase italic">{t.name}</h3>
                  <p className="text-slate-500 text-sm mb-6 flex items-center gap-2">
                    <Calendar size={14} /> ID: {t.id.substring(0, 8)}...
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setSelectedTournamentId(t.id); setCurrentView("manage_groups"); }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-400 py-2 rounded-lg text-sm font-bold uppercase transition-all flex justify-center items-center gap-2"
                    >
                      <Swords size={16} /> Gestionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "create_tournament":
        return (
          <div className="max-w-2xl mx-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
              <PlusCircle className="text-cyan-400" /> ORGANIZAR EVENTO
            </h2>
            <form onSubmit={handleCreateTournament} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Nombre del Evento</label>
                <input 
                  type="text" 
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                  placeholder="Ej: Gran Torneo Nacional Beyblade X"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setCurrentView("tournaments")}
                  className="px-6 py-3 rounded-lg text-slate-400 font-medium hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={!newTournamentName.trim()}
                  className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-lg shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crear Torneo
                </button>
              </div>
            </form>
          </div>
        );

      case "registration":
        return (
            <div className="flex justify-center">
                 <PlayerRegistrationForm />
            </div>
        );

      case "manage_groups":
        return selectedTournamentId ? (
          <div>
             <button 
                onClick={() => setCurrentView("tournaments")}
                className="mb-6 text-slate-400 hover:text-cyan-400 flex items-center gap-1 text-sm font-bold uppercase transition-colors"
             >
                 ← Volver a Torneos
             </button>
             <GroupManagement tournamentId={selectedTournamentId} />
          </div>
        ) : (
          <div>Seleccione un torneo primero</div>
        );

      default:
        return <div className="text-center text-slate-500 mt-20">Seleccione una opción del menú lateral</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-200">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 text-white transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 flex flex-col shadow-2xl
      `}>
        {/* Logo Area */}
        <div className="p-8 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-red-600 rounded-lg skew-x-[-10deg] flex items-center justify-center font-black text-black text-xl shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            X
          </div>
          <h1 className="text-xl font-black tracking-wider italic text-white">BEYBLADE <span className="text-cyan-400">X</span></h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-auto text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-8 overflow-y-auto">
          {/* Main Section */}
          <div className="space-y-2">
            <p className="px-2 text-xs font-bold text-cyan-700/80 uppercase tracking-widest mb-2">Competición</p>
            {menuItems.filter(i => i.section === "main").map((item) => (
              <button
                key={item.id}
                onClick={() => { setCurrentView(item.id); setIsSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group font-medium
                  ${currentView === item.id 
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white hover:pl-5"}
                `}
              >
                <item.icon size={20} className={currentView === item.id ? "text-cyan-400" : "text-slate-500 group-hover:text-cyan-400"} />
                <span className="font-medium">{item.label}</span>
                {currentView === item.id && <ChevronRight size={16} className="ml-auto opacity-50" />}
              </button>
            ))}
          </div>

          {/* Admin Section */}
          <div className="space-y-2">
            <p className="px-2 text-xs font-bold text-cyan-700/80 uppercase tracking-widest mb-2">Control</p>
            {menuItems.filter(i => i.section === "admin").map((item) => (
              <button
                key={item.id}
                onClick={() => { setCurrentView(item.id); setIsSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group font-medium
                  ${currentView === item.id 
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white hover:pl-5"}
                `}
              >
                <item.icon size={20} className={currentView === item.id ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400"} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 bg-black/20 border-t border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs text-cyan-400 font-bold">OP</div>
             <div>
               <p className="text-sm font-bold text-white">Operator</p>
               <p className="text-xs text-cyan-600">Pro License</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-cyan-600 rounded flex items-center justify-center text-black font-bold">X</div>
             <span className="font-bold text-white italic">BEYBLADE</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 hover:text-blue-600">
            <Menu size={28} />
          </button>
        </header>

        {/* Dynamic Content Scrollable */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;