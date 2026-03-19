import { useState, FormEvent } from "react";
import { createPlayer } from "../services/playerService"; // Ajusta la ruta si es necesario

interface PlayerRegistrationFormProps {
  onSuccess?: () => void;
}

const PlayerRegistrationForm = ({ onSuccess }: PlayerRegistrationFormProps) => {
  const [playerName, setPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("El nombre del jugador no puede estar vacío.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await createPlayer(playerName);
      setSuccess(`¡Jugador "${playerName}" registrado con éxito!`);
      setPlayerName(""); // Limpiar el input en caso de éxito
      if (onSuccess) onSuccess(); // Notificar al padre para recargar listas
    } catch (err) {
      setError("Error al registrar el jugador. Por favor, inténtalo de nuevo.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-900 p-6 text-center">
        <h2 className="text-2xl font-bold text-white tracking-wide">
        Registrar Nuevo Jugador
      </h2>
        <p className="text-blue-400 text-sm mt-1">Ingresa un nuevo Blader a la base de datos</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-8">
        <div className="mb-6">
          <label
            htmlFor="playerName"
            className="block text-slate-700 text-sm font-bold mb-2 uppercase tracking-wider"
          >
            Nombre del Jugador
          </label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Ej: Ekusu Kurosu"
            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            disabled={isLoading}
          />
        </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Registrando..." : "Registrar Jugador"}
          </button>
      </form>
      
      {(error || success) && (
        <div className={`p-4 text-center text-sm font-medium ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {error || success}
        </div>
      )}
    </div>
  );
};

export default PlayerRegistrationForm;