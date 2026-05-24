import React, { useState, useEffect } from "react";
import { networkManager } from "./game/NetworkManager";
import { GameContainer } from "./game/GameContainer";
import { Store } from "lucide-react";

export default function App() {
  const [inGame, setInGame] = useState(false);
  const [loading, setLoading] = useState(true); // Start as loading to check storage
  
  // Player lobby customizations (with localStorage persistence)
  const [username, setUsername] = useState(() => localStorage.getItem("supermarket_user") || "");
  const [selectedColor, setSelectedColor] = useState(() => localStorage.getItem("supermarket_color") || "#14b8a6");
  const [roomInstance, setRoomInstance] = useState<any>(null);

  // Auto-Join Effect: If we have a saved user, try to join immediately
  useEffect(() => {
    const savedUser = localStorage.getItem("supermarket_user");
    if (savedUser && !inGame) {
      console.log("Auto-joining as:", savedUser);
      performJoin(savedUser, selectedColor);
    } else {
      setLoading(false); // No saved user, show lobby
    }
  }, []);

  const avatarColors = [
    "#14b8a6", // Teal
    "#8b5cf6", // Purple
    "#ec4899", // Neon Pink
    "#f59e0b", // Golden Amber
    "#10b981", // Emerald Green
    "#3b82f6", // Blue
  ];

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = username.trim() || `Kunde_${Math.floor(1000 + Math.random() * 9000)}`;
    performJoin(finalName, selectedColor);
  };

  const performJoin = async (name: string, color: string) => {
    setLoading(true);
    
    // Save to localStorage for next time
    localStorage.setItem("supermarket_user", name);
    localStorage.setItem("supermarket_color", color);

    try {
      const room = await networkManager.joinOrCreateRoom("supermarket", {
        name: name,
        color: color
      });

      setRoomInstance(room);
      setInGame(true);
    } catch (err) {
      console.error(err);
      // If error (e.g. server down), reset loading to show lobby again
      setLoading(false);
      setInGame(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGame = () => {
    networkManager.leaveRoom();
    setRoomInstance(null);
    setInGame(false);
  };

  if (inGame && roomInstance) {
    return (
      <GameContainer onLeave={handleLeaveGame} />
    );
  }

  return (
    <div className="lobby-wrapper">
      <div className="lobby-bg-grid" />
      
      <div className="glass-panel lobby-card">
        <div className="lobby-header">
          <div className="lobby-icon">🛒</div>
          <h1 className="lobby-title glow-text">Coop Supermarkt</h1>
          <p className="lobby-subtitle">Baut gemeinsam den größten Supermarkt im Browser auf!</p>
        </div>

        {loading ? (
          <div className="lobby-loading">
            <div className="spinner" />
            <p style={{ marginTop: "12px", fontSize: "0.95rem" }}>Verbinde zum Multiplayer-Server...</p>
          </div>
        ) : (
          <form onSubmit={handleJoinGame} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div className="lobby-form-group">
              <label className="lobby-label" htmlFor="username">Dein Username</label>
              <input 
                id="username"
                className="lobby-input" 
                type="text" 
                placeholder="z.B. SuperMarktMeister" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={18}
                autoFocus
              />
            </div>

            <div className="lobby-form-group">
              <label className="lobby-label">Avatar-Farbe wählen</label>
              <div className="color-picker">
                {avatarColors.map((color) => (
                  <div 
                    key={color}
                    className={`color-option ${selectedColor === color ? "active" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
            >
              <Store size={18} />
              JETZT LOSLEGEN! 🚀
            </button>
          </form>
        )}

        <div style={{ 
          fontSize: "0.75rem", 
          color: "var(--text-muted)", 
          textAlign: "center", 
          lineHeight: "1.4",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "16px"
        }}>
          💡 Unterstützt PC &amp; Smartphones. Auf dem Handy erscheint ein Touch-Joystick zum Bewegen.
        </div>
      </div>
    </div>
  );
}
