import { Crown } from "lucide-react";

const BracketView = () => {
  // Mockup visual para la estructura solicitada
  const rounds = [
    { name: "Cuartos", matches: [ {p1: "Jugador 1", p2: "Jugador 8"}, {p1: "Jugador 4", p2: "Jugador 5"}, {p1: "Jugador 3", p2: "Jugador 6"}, {p1: "Jugador 2", p2: "Jugador 7"} ] },
    { name: "Semifinal", matches: [ {p1: "TBD", p2: "TBD"}, {p1: "TBD", p2: "TBD"} ] },
    { name: "Final", matches: [ {p1: "TBD", p2: "TBD"} ] }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 overflow-x-auto p-4 justify-center items-center md:items-start">
        {rounds.map((round, rIdx) => (
            <div key={rIdx} className="flex flex-col justify-around gap-8 min-w-[200px]">
                <h3 className="text-center text-cyan-400 font-bold uppercase tracking-widest text-sm mb-4">{round.name}</h3>
                <div className="flex flex-col justify-around h-full gap-8">
                    {round.matches.map((m, mIdx) => (
                        <div key={mIdx} className="bg-slate-900 border border-slate-700 rounded-lg p-3 w-full relative group hover:border-cyan-500/50 transition-all">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                                <span className="text-white font-bold text-sm">{m.p1}</span>
                                <span className="text-slate-500 text-xs">0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white font-bold text-sm">{m.p2}</span>
                                <span className="text-slate-500 text-xs">0</span>
                            </div>
                            {/* Conector visual simple */}
                            {rIdx < rounds.length - 1 && (
                                <div className="hidden md:block absolute -right-8 top-1/2 w-8 h-0.5 bg-slate-700"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        ))}
        <div className="flex flex-col justify-center self-center pl-8">
             <div className="text-center">
                 <Crown className="text-yellow-400 mx-auto mb-2" size={32} />
                 <div className="text-yellow-400 font-black text-xl italic uppercase">CAMPEÓN</div>
                 <div className="text-white text-sm">???</div>
             </div>
        </div>
    </div>
  );
};

export default BracketView;