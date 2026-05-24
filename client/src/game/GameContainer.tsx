import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { 
  Users, 
  Warehouse, 
  Eye, 
  Send, 
  Keyboard,
  Settings,
  X,
  Plus,
  Briefcase,
  Megaphone,
  LayoutGrid,
  Monitor,
  ShoppingBasket
} from "lucide-react";
import confetti from "canvas-confetti";
import { networkManager } from "./NetworkManager";
import { GameScene } from "./GameScene";
import { InputManager } from "./InputManager";

const catalog = [
  { type: "shelf_groceries", name: "Lebensmittelregal", cost: 300, desc: "Standardregal für Müsli, Konserven & Trockenwaren.", icon: "🥫", category: "regale" },
  { type: "shelf_produce", name: "Frischetheke", cost: 500, desc: "Gekühltes Display für frisches Obst und gesundes Gemüse.", icon: "🍎", category: "regale" },
  { type: "shelf_frozen", name: "Tiefkühltruhe", cost: 800, desc: "Spezialtruhe für Pizza, Eis und andere Tiefkühlkost.", icon: "🍦", category: "regale" },
  { type: "cash_register", name: "Kasse", cost: 1200, desc: "Zentrale Bezahlstelle. Mitarbeiter können hier kassieren.", icon: "💳", category: "technik" },
  { type: "pc_terminal", name: "Management-PC", cost: 600, desc: "OS-Terminal zur Personalverwaltung und für Marketing.", icon: "💻", category: "technik" },
];

const products = [
  { id: "bread", name: "Brot", category: "shelf_groceries", price: 2, sellPrice: 5, icon: "🍞", color: "#fcd34d" },
  { id: "cereal", name: "Müsli", category: "shelf_groceries", price: 4, sellPrice: 10, icon: "🥣", color: "#fbbf24" },
  { id: "pasta", name: "Pasta", category: "shelf_groceries", price: 3, sellPrice: 8, icon: "🍝", color: "#fde68a" },
  { id: "apple", name: "Äpfel", category: "shelf_produce", price: 1, sellPrice: 3, icon: "🍎", color: "#ef4444" },
  { id: "banana", name: "Bananen", category: "shelf_produce", price: 2, sellPrice: 5, icon: "🍌", color: "#facc15" },
  { id: "tomato", name: "Tomaten", category: "shelf_produce", price: 2, sellPrice: 4, icon: "🍅", color: "#f87171" },
  { id: "pizza", name: "Tiefkühlpizza", category: "shelf_frozen", price: 5, sellPrice: 12, icon: "🍕", color: "#fb923c" },
  { id: "icecream", name: "Eiscreme", category: "shelf_frozen", price: 6, sellPrice: 15, icon: "🍦", color: "#60a5fa" },
  { id: "frozen_veggies", name: "TK-Gemüse", category: "shelf_frozen", price: 4, sellPrice: 9, icon: "🥦", color: "#4ade80" },
];

export const GameContainer: React.FC<{ onLeave: () => void }> = ({ onLeave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [players, setPlayers] = useState<Map<string, any>>(new Map());
  const [placedItems, setPlacedItems] = useState<Map<string, any>>(new Map());
  const [npcs, setNpcs] = useState<Map<string, any>>(new Map());
  const [employees, setEmployees] = useState<Map<string, any>>(new Map());
  const [deliveryBoxes, setDeliveryBoxes] = useState<Map<string, any>>(new Map());
  const [inventory, setInventory] = useState<Map<string, number>>(new Map());
  const [budget, setBudget] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [storeLevel, setStoreLevel] = useState(1);
  const [storeExp, setStoreExp] = useState(0);
  const [marketingTimer, setMarketingTimer] = useState(0);
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const [isBuildMenuOpen, setIsBuildMenuOpen] = useState(false);
  const [isMovingItem, setIsMovingItem] = useState(false); // Track if we are currently moving an item
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<string | null>(null);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [moneyFeed, setMoneyFeed] = useState<{ id: number, amount: number, type: string }[]>([]);
  const [targetedShelf, setTargetedShelf] = useState<{ id: string, stock: number, maxStock: number, cost: number, label: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [pcTab, setPcTab] = useState<string>("staff");
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const getCatalogLabel = (type: string) => catalog.find((i) => i.type === type)?.name || type;

  const handleCloseUI = () => {
    setSelectedPlacedId(null);
    setIsBuildMenuOpen(false);
    // If in first person, try to re-lock pointer automatically since this is a click gesture
    if (isFirstPerson && canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      const key = e.key.toLowerCase();
      if (key === "b") setIsBuildMenuOpen((prev) => !prev);
      if (key === "1") setSelectedCatalogItem(catalog[0].type);
      if (key === "2") setSelectedCatalogItem(catalog[1].type);
      if (key === "3") setSelectedCatalogItem(catalog[2].type);
      if (key === "4") setSelectedCatalogItem(catalog[3].type);
      if (key === "5") setSelectedCatalogItem(catalog[4].type);
      if (e.key === "Escape") { 
        setIsBuildMenuOpen(false); 
        setSelectedPlacedId(null);
        setIsMovingItem(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const room = networkManager.room;
    if (!room) return;

    const updateLocalState = () => {
      if (!room.state) return;

      const p = new Map();
      room.state.players.forEach((v: any, k: string) => p.set(k, { id: v.id, name: v.name, x: v.x, y: v.y, z: v.z, rotY: v.rotY, color: v.color, isFirstPerson: v.isFirstPerson }));
      setPlayers(p);
      const i = new Map();
      room.state.placedItems.forEach((v: any, k: string) => i.set(k, { id: v.id, type: v.type, gridX: v.gridX, gridZ: v.gridZ, rotation: v.rotation, stock: v.stock, maxStock: v.maxStock, productId: v.productId }));
      setPlacedItems(i);

      // If the currently moving item was updated or removed, sync state
      if (selectedPlacedId && !i.has(selectedPlacedId)) {
        setIsMovingItem(false);
        setSelectedPlacedId(null);
      }

      const n = new Map();
      room.state.npcs.forEach((v: any, k: string) => n.set(k, { id: v.id, name: v.name, x: v.x, z: v.z, targetX: v.targetX, targetZ: v.targetZ, rotY: v.rotY, state: v.state, color: v.color, activeIcon: v.activeIcon, message: v.message }));
      setNpcs(n);
      const e = new Map();
      room.state.employees.forEach((v: any, k: string) => e.set(k, { id: v.id, name: v.name, x: v.x, z: v.z, rotY: v.rotY, state: v.state, task: v.task, color: v.color, salary: v.salary }));
      setEmployees(e);
      const boxes = new Map();
      room.state.deliveryBoxes.forEach((v: any, k: string) => boxes.set(k, { id: v.id, productId: v.productId, amount: v.amount, x: v.x, z: v.z }));
      setDeliveryBoxes(boxes);
      const inv = new Map();
      room.state.inventory.forEach((v: number, k: string) => inv.set(k, v));
      setInventory(inv);

      setBudget(room.state.budget || 0); 
      setStoreName(room.state.storeName || "Super-Saver"); 
      setStoreLevel(room.state.storeLevel || 1); 
      setStoreExp(room.state.storeExp || 0); 
      setMarketingTimer(room.state.marketingTimer || 0);
    };
    updateLocalState();
    const removals: (() => void)[] = [];

    // State change listeners
    removals.push(room.state.players.onAdd((p: any) => { updateLocalState(); p.listen("isFirstPerson", updateLocalState); }));
    removals.push(room.state.players.onRemove(updateLocalState));
    removals.push(room.state.placedItems.onAdd((item: any) => { updateLocalState(); item.listen("stock", updateLocalState); item.listen("productId", updateLocalState); }));
    removals.push(room.state.placedItems.onRemove(updateLocalState));
    removals.push(room.state.npcs.onAdd((npc: any) => { updateLocalState(); npc.listen("state", updateLocalState); npc.listen("message", updateLocalState); }));
    removals.push(room.state.npcs.onRemove(updateLocalState));
    removals.push(room.state.employees.onAdd((emp: any) => { 
      updateLocalState(); 
      emp.listen("state", updateLocalState); emp.listen("task", updateLocalState); emp.listen("x", updateLocalState); emp.listen("z", updateLocalState);
    }));
    removals.push(room.state.employees.onRemove(updateLocalState));
    removals.push(room.state.deliveryBoxes.onAdd(updateLocalState));
    removals.push(room.state.deliveryBoxes.onRemove(updateLocalState));
    removals.push(room.state.inventory.onAdd(updateLocalState));
    removals.push(room.state.inventory.onChange(updateLocalState));
    removals.push(room.state.listen("budget", (v: number) => setBudget(v || 0)));
    removals.push(room.state.listen("marketingTimer", (v: number) => setMarketingTimer(v || 0)));

    // Message listeners (Colyseus returns cleanup functions directly)
    removals.push(room.onMessage("availableProducts", (products: any) => {
      // Products are currently hardcoded in client, but we could sync them here if needed
      console.log("Products from server:", products);
    }));
    removals.push(room.onMessage("chatMessage", (msg: any) => setChatMessages((p) => [...p, msg])));
    removals.push(room.onMessage("systemMessage", (m: string) => setChatMessages((p) => [...p, { type: "system", message: m, timestamp: Date.now() }])));
    removals.push(room.onMessage("incomeTick", (d: any) => setChatMessages((p) => [...p, { type: "income", message: `+ $${d.income} Einnahmen!`, timestamp: Date.now() }])));
    removals.push(room.onMessage("levelup", (d: any) => {
      setChatMessages((p) => [...p, { message: `🎉 LEVEL ${d.level}!`, timestamp: Date.now(), type: "levelup" }]);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }));
    removals.push(room.onMessage("moneyChange", (data: any) => {
      const id = Date.now() + Math.random();
      setMoneyFeed((prev) => [...prev, { id, ...data }]);
      setTimeout(() => {
        setMoneyFeed((prev) => prev.filter(m => m.id !== id));
      }, 2000);
    }));
    removals.push(room.onMessage("error", (d: any) => setChatMessages((p) => [...p, { type: "system", message: `❌ FEHLER: ${d.message}`, timestamp: Date.now() }])));

    return () => { removals.forEach(r => { if (typeof r === 'function') r(); }); };
  }, []);

  useEffect(() => { chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) { networkManager.sendChat(chatInput); setChatInput(""); }
  };

  const handleSellPlacedItem = () => { 
    if (selectedPlacedId) { 
      const item = placedItems.get(selectedPlacedId);
      const label = item ? getCatalogLabel(item.type) : "dieses Objekt";
      
      if (window.confirm(`Möchtest du ${label} wirklich für 50% des Kaufpreises verkaufen?`)) {
        networkManager.sendRemoveItem(selectedPlacedId); 
        setSelectedPlacedId(null); 
      }
    } 
  };

  const activePlacedItem = selectedPlacedId ? placedItems.get(selectedPlacedId) : null;
  const expPercentage = Math.min(100, (storeExp / (storeLevel * 500)) * 100);
  const filteredCatalog = catalog.filter(item => activeCategory === "all" || item.category === activeCategory);

  return (
    <div className="game-container">
      <div className="canvas-wrapper" onContextMenu={(e) => e.preventDefault()}>
        <Canvas 
          ref={canvasRef} 
          shadows 
          camera={{ fov: 60 }} 
          onPointerDown={(e) => { 
            if (e.button === 2) setSelectedCatalogItem(null); 
          }}
        >
          <color attach="background" args={["#080c14"]} />
          <fog attach="fog" args={["#080c14", 30, 80]} />
          <GameScene
            isFirstPerson={isFirstPerson}
            localPlayerId={networkManager.sessionId}
            playersState={players}
            placedItemsState={placedItems}
            npcsState={npcs}
            deliveryBoxesState={deliveryBoxes}
            employeesState={employees}
            selectedCatalogItem={selectedCatalogItem}
            onSelectCatalogItem={setSelectedCatalogItem}
            onSelectPlacedId={setSelectedPlacedId}
            onTargetedShelfChange={(id, stock, maxStock, cost, label) => setTargetedShelf(id ? { id, stock: stock || 0, maxStock: maxStock || 0, cost: cost || 0, label: label || "" } : null)}
            isMovingItem={isMovingItem}
            activePlacedItem={activePlacedItem}
            onMoveComplete={() => { setIsMovingItem(false); setSelectedPlacedId(null); }}
          />
        </Canvas>
      </div>

      <InputManager isFirstPerson={isFirstPerson && !isBuildMenuOpen && !activePlacedItem} canvasRef={canvasRef} />

      {/* Central Crosshair for First Person */}
      {isFirstPerson && !isBuildMenuOpen && !activePlacedItem && (
        <div 
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "20px",
            height: "20px",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {/* Outer circle */}
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", position: "absolute" }} />
          {/* Inner dot */}
          <div style={{ width: "4px", height: "4px", background: "var(--color-primary)", borderRadius: "50%", boxShadow: "0 0 5px var(--color-primary)" }} />
        </div>
      )}

      <div className="ui-overlay">
        <div className="top-bar">
          <div className="glass-panel hud-panel" style={{ pointerEvents: "auto", display: "flex", gap: "24px", padding: "10px 24px", position: "relative" }}>
            <div className="hud-item"><span className="hud-label">Supermarkt</span><span className="hud-value" style={{ background: "linear-gradient(to right, var(--color-primary), var(--color-secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 800 }}>{storeName}</span></div>
            <div className="hud-item" style={{ position: "relative" }}>
              <span className="hud-label">Budget</span>
              <span className="hud-value money">${budget.toLocaleString()}</span>
              {/* Floating Money Feed */}
              {moneyFeed.map(m => (
                <div 
                  key={m.id} 
                  style={{ 
                    position: "absolute", 
                    top: "10px", 
                    right: "-20px", 
                    color: m.type === "income" ? "#10b981" : "#ef4444", 
                    fontWeight: 800, 
                    fontSize: "1.2rem",
                    animation: "money-float 1.5s forwards",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    zIndex: 100
                  }}
                >
                  {m.amount > 0 ? "+" : ""}{m.amount}$
                </div>
              ))}
            </div>
            <div className="hud-item"><span className="hud-label">Level {storeLevel}</span><div style={{ width: "80px", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", marginTop: "4px" }}><div style={{ width: `${expPercentage}%`, height: "100%", background: "var(--color-primary)", borderRadius: "3px" }} /></div></div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div className="glass-panel" style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}><Users size={16} color="var(--color-primary)" /><span>{players.size} Spieler</span></div>
            <button className="btn-primary" onClick={() => { setIsFirstPerson(!isFirstPerson); setIsBuildMenuOpen(false); setSelectedCatalogItem(null); setSelectedPlacedId(null); }}>{isFirstPerson ? <><Warehouse size={16} /> Management</> : <><Eye size={16} /> First-Person</>}</button>
            <button className="btn-secondary" onClick={onLeave}>Verlassen</button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="glass-panel" style={{ padding: "12px 16px", fontSize: "0.75rem", width: "320px" }}><div style={{ fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}><Keyboard size={14} /> Steuerung</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", opacity: 0.8 }}><span><kbd>WASD</kbd> Bewegen</span><span><kbd>L-Shift</kbd> Rennen</span><span><kbd>E</kbd> Interagieren</span><span><kbd>B</kbd> Baumenu</span><span><kbd>1-5</kbd> Auswahl</span><span><kbd>R</kbd> Drehen</span></div></div>
            <div className="glass-panel chat-container">
              <div className="chat-messages" style={{ height: "140px", overflowY: "auto", padding: "8px" }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} className="chat-message" style={{ marginBottom: "4px", fontSize: "0.85rem" }}>{msg.type === "system" ? <span style={{ color: "var(--color-secondary)" }}>📢 {msg.message}</span> : msg.type === "income" ? <span style={{ color: "#10b981" }}>💵 {msg.message}</span> : <><span style={{ color: msg.color || "var(--color-primary)", fontWeight: 700 }}>{msg.sender}:</span> {msg.message}</>}</div>
                ))}
                <div ref={chatMessagesEndRef} />
              </div>
              <form onSubmit={handleSendChat} className="chat-input-wrapper"><input type="text" className="chat-input" placeholder="Nachricht..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} /><button type="submit" className="chat-send-btn"><Send size={14} /></button></form>
            </div>
          </div>

          {/* EXPANDED CATALOG WITH CATEGORIES */}
          {(isBuildMenuOpen || !isFirstPerson) && (
            <div className="glass-panel catalog-panel" style={{ 
              pointerEvents: "auto", width: "450px", height: "600px", display: "flex", flexDirection: "column",
              border: isBuildMenuOpen ? "2px solid var(--color-primary)" : "1px solid rgba(255,255,255,0.1)" 
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShoppingBasket size={22} /> Einrichtungskatalog
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>[R] zum Drehen</span>
                  <button onClick={handleCloseUI} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", padding: "10px 20px", gap: "8px", background: "rgba(0,0,0,0.2)" }}>
                {[
                  { id: "all", label: "Alles", icon: <LayoutGrid size={14} /> },
                  { id: "regale", label: "Regale", icon: <ShoppingBasket size={14} /> },
                  { id: "technik", label: "Technik", icon: <Monitor size={14} /> }
                ].map(cat => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: activeCategory === cat.id ? "var(--color-primary)" : "rgba(255,255,255,0.05)", color: activeCategory === cat.id ? "#000" : "#fff", fontWeight: 700, transition: "all 0.2s" }}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              <div className="catalog-grid" style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredCatalog.map((item) => (
                  <div key={item.type} className={`catalog-card ${selectedCatalogItem === item.type ? "active" : ""}`} onClick={() => { 
                    const isSelected = selectedCatalogItem === item.type;
                    setSelectedCatalogItem(isSelected ? null : item.type); 
                    setSelectedPlacedId(null); 
                    if (isFirstPerson) {
                      setIsBuildMenuOpen(false);
                      if (canvasRef.current) canvasRef.current.requestPointerLock();
                    }
                  }} style={{ background: selectedCatalogItem === item.type ? "rgba(20, 184, 166, 0.15)" : "rgba(255,255,255,0.03)", padding: "18px", borderRadius: "14px", cursor: "pointer", border: selectedCatalogItem === item.type ? "2px solid var(--color-primary)" : "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "20px", alignItems: "center", transition: "all 0.2s" }}>
                    <div style={{ fontSize: "2.4rem", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", borderRadius: "12px" }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontWeight: 800, fontSize: "1rem" }}>{item.name}</span>
                        <span style={{ color: "var(--color-primary)", fontWeight: 800, fontSize: "1.1rem" }}>${item.cost}</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.8, lineHeight: "1.4" }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {isFirstPerson && targetedShelf && !isBuildMenuOpen && !selectedPlacedId && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, 40px)", pointerEvents: "none" }}><div className="glass-panel" style={{ padding: "12px 20px", textAlign: "center", border: "1.5px solid var(--color-primary)", boxShadow: "0 0 15px rgba(20, 184, 166, 0.3)" }}><div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{targetedShelf.label}</div><div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{targetedShelf.stock < targetedShelf.maxStock ? `[E] Auffüllen ($${targetedShelf.cost})` : "Vollständig besetzt ✨"}</div></div></div>
        )}

        {activePlacedItem && (
          <div className="glass-panel" style={{ 
            position: "absolute", top: activePlacedItem.type === "pc_terminal" ? "50%" : "240px", left: activePlacedItem.type === "pc_terminal" ? "50%" : "24px", transform: activePlacedItem.type === "pc_terminal" ? "translate(-50%, -50%)" : "none", 
            width: activePlacedItem.type === "pc_terminal" ? "1000px" : "320px", height: activePlacedItem.type === "pc_terminal" ? "650px" : "auto", 
            padding: 0, display: "flex", flexDirection: "column", zIndex: 2000, pointerEvents: "auto", overflow: "hidden", 
            border: activePlacedItem.type === "pc_terminal" ? "1px solid #14b8a6" : "1px solid rgba(255,255,255,0.1)", background: activePlacedItem.type === "pc_terminal" ? "#060810" : "rgba(15, 23, 42, 0.9)"
          }}>
            {activePlacedItem.type === "pc_terminal" ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: "'Space Mono', monospace" }}>
                <div style={{ background: "#0f172a", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #14b8a6" }}><div style={{ display: "flex", alignItems: "center", gap: "15px" }}><Settings size={20} color="#14b8a6" /><span style={{ fontWeight: 800, color: "#14b8a6", fontSize: "1.1rem", letterSpacing: "2px" }}>SUPERMARKET_OS // ROOT</span></div><button onClick={handleCloseUI} className="btn-secondary" style={{ padding: "5px 15px", border: "1px solid #14b8a6", color: "#14b8a6" }}>LOGOUT [X]</button></div>
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr", background: "#060810" }}>
                  <div style={{ borderRight: "1px solid #1e293b", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <div style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "8px" }}>{" >>> CURRENT_BUDGET"}</div>
                      <div style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 800 }}>${budget.toLocaleString()}</div>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
                      <button onClick={() => setPcTab("staff")} style={{ padding: "12px", background: pcTab === "staff" ? "#14b8a6" : "transparent", color: pcTab === "staff" ? "#000" : "#14b8a6", border: "1px solid #14b8a6", fontWeight: 800, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "10px" }}><Briefcase size={16} /> PERSONAL</button>
                      <button onClick={() => setPcTab("storage")} style={{ padding: "12px", background: pcTab === "storage" ? "#14b8a6" : "transparent", color: pcTab === "storage" ? "#000" : "#14b8a6", border: "1px solid #14b8a6", fontWeight: 800, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "10px" }}><Warehouse size={16} /> LAGER / EINKAUF</button>
                      <button onClick={() => setPcTab("marketing")} style={{ padding: "12px", background: pcTab === "marketing" ? "#14b8a6" : "transparent", color: pcTab === "marketing" ? "#000" : "#14b8a6", border: "1px solid #14b8a6", fontWeight: 800, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "10px" }}><Megaphone size={16} /> MARKETING</button>
                    </div>

                    <button onClick={() => networkManager.sendHireEmployee()} className="btn-primary" style={{ marginTop: "auto", background: "#14b8a6", color: "#000", fontWeight: 800, width: "100%", height: "50px", border: "none" }}><Plus size={16} /> + RECRUIT_NEW</button>
                  </div>
                  <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
                    {pcTab === "staff" && (
                      <section><h3 style={{ color: "#14b8a6", fontSize: "0.9rem", borderBottom: "1px solid #1e293b", paddingBottom: "10px", marginBottom: "15px" }}><Briefcase size={18} /> [ PERSONNEL_DEPLOYMENT ]</h3><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                          {employees.size === 0 ? <div style={{ gridColumn: "1/-1", padding: "60px", textAlign: "center", color: "#64748b", border: "1px dashed #1e293b", borderRadius: "12px" }}>NO_RECRUITS_ACTIVE</div> : Array.from(employees.values()).map(e => (
                            <div key={e.id} style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "15px", borderRadius: "10px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}><div><div style={{ color: "#fff", fontWeight: 700 }}>{e.name.toUpperCase()}</div><div style={{ color: "#14b8a6", fontSize: "0.7rem" }}>SALARY: $50/MIN</div></div><div style={{ color: e.state === "working" ? "#10b981" : "#f59e0b", fontSize: "0.7rem", fontWeight: 800 }}>{e.state.toUpperCase()}</div></div>
                              <div style={{ display: "flex", gap: "8px" }}><button onClick={() => networkManager.sendAssignTask(e.id, "register")} style={{ flex: 1, padding: "8px", fontSize: "0.7rem", cursor: "pointer", background: e.task === "register" ? "#14b8a6" : "#1e293b", color: e.task === "register" ? "#000" : "#fff", border: "none", borderRadius: "4px" }}>CASHIER</button><button onClick={() => networkManager.sendAssignTask(e.id, "stocking")} style={{ flex: 1, padding: "8px", fontSize: "0.7rem", cursor: "pointer", background: e.task === "stocking" ? "#14b8a6" : "#1e293b", color: e.task === "stocking" ? "#000" : "#fff", border: "none", borderRadius: "4px" }}>STOCKER</button><button onClick={() => networkManager.sendAssignTask(e.id, "none")} style={{ flex: 1, padding: "8px", fontSize: "0.7rem", cursor: "pointer", background: e.task === "none" ? "#14b8a6" : "#1e293b", color: e.task === "none" ? "#000" : "#fff", border: "none", borderRadius: "4px" }}>PAUSE</button></div></div>
                          ))}
                        </div></section>
                    )}

                    {pcTab === "storage" && (
                      <section>
                        <h3 style={{ color: "#14b8a6", fontSize: "0.9rem", borderBottom: "1px solid #1e293b", paddingBottom: "10px", marginBottom: "15px" }}><Warehouse size={18} /> [ INVENTORY_WHOLSEALE ]</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
                          {products.map(p => (
                            <div key={p.id} style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "15px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "1.5rem" }}>{p.icon}</span>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem" }}>{p.name.toUpperCase()}</div>
                                  <div style={{ color: "#14b8a6", fontSize: "0.7rem" }}>BESTAND: {inventory.get(p.id) || 0}</div>
                                </div>
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Einkauf: ${p.price} | Verkauf: ${p.sellPrice}</div>
                              <div style={{ display: "flex", gap: "5px" }}>
                                <button onClick={() => networkManager.sendBuyProduct(p.id, 10)} style={{ flex: 1, padding: "8px 4px", background: "#1e293b", color: "#14b8a6", border: "1px solid #14b8a6", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>+10 (${p.price * 10})</button>
                                <button onClick={() => networkManager.sendBuyProduct(p.id, 50)} style={{ flex: 1, padding: "8px 4px", background: "#1e293b", color: "#14b8a6", border: "1px solid #14b8a6", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>+50 (${p.price * 50})</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                    
                    {pcTab === "marketing" && (
                      <section><h3 style={{ color: "#14b8a6", fontSize: "0.9rem", borderBottom: "1px solid #1e293b", paddingBottom: "10px", marginBottom: "15px" }}><Megaphone size={18} /> [ GROWTH_ENGINES ]</h3><div style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "20px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ color: "#fff", fontWeight: 700, marginBottom: "5px" }}>TRAFFIC_MODUL_HYPER</div><div style={{ color: "#64748b", fontSize: "0.75rem" }}>TARGET: +100% VISITOR_FLOW // COST: $800</div></div>{marketingTimer > 0 ? <div style={{ padding: "10px 20px", border: "2px solid #14b8a6", color: "#14b8a6", fontWeight: 800 }}>ACTIVE: {Math.ceil(marketingTimer/20)}S</div> : <button onClick={() => networkManager.sendStartMarketing()} className="btn-primary" style={{ background: "#14b8a6", color: "#000", padding: "10px 20px", border: "none", fontWeight: 800 }}>RUN_CAMPAIGN</button>}</div></section>
                    )}
                  </div></div></div>
            ) : (
              <div style={{ padding: "24px" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}><h4 style={{ margin: 0 }}>{getCatalogLabel(activePlacedItem.type)}</h4><button onClick={handleCloseUI}><X size={18}/></button></div>
                {activePlacedItem.type.startsWith("shelf_") && (
                   <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "20px" }}>
                     {!activePlacedItem.productId ? (
                       <div style={{ background: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: "10px" }}>
                         <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "10px", color: "var(--color-primary)" }}>PRODUKT ZUWEISEN:</div>
                         <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                           {products.filter(p => p.category === activePlacedItem.type).map(p => (
                             <button key={p.id} onClick={() => networkManager.sendAssignProductToShelf(activePlacedItem.id, p.id)} style={{ padding: "10px 5px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                               <span style={{ fontSize: "1.2rem" }}>{p.icon}</span>
                               <span style={{ fontSize: "0.6rem" }}>{p.name}</span>
                             </button>
                           ))}
                         </div>
                       </div>
                     ) : (
                       <>
                         <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(20, 184, 166, 0.1)", padding: "10px", borderRadius: "8px", border: "1px solid var(--color-primary)" }}>
                           <span style={{ fontSize: "1.5rem" }}>{products.find(p => p.id === activePlacedItem.productId)?.icon}</span>
                           <div>
                             <div style={{ fontSize: "0.8rem", fontWeight: 800 }}>{products.find(p => p.id === activePlacedItem.productId)?.name}</div>
                             <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>Im Lager verfügbar: {inventory.get(activePlacedItem.productId) || 0}</div>
                           </div>
                           <button 
                             onClick={() => networkManager.sendAssignProductToShelf(activePlacedItem.id, "")} 
                             style={{ marginLeft: "auto", background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--color-danger)", borderRadius: "4px", color: "var(--color-danger)", cursor: "pointer", padding: "4px" }}
                             title="Produkt entfernen (Bestand wird ins Lager zurückgelegt)"
                           >
                             <X size={14} />
                           </button>
                         </div>

                         <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}><span>BESTAND:</span><strong>{activePlacedItem.stock} / {activePlacedItem.maxStock}</strong></div>
                         <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px" }}><div style={{ width: `${(activePlacedItem.stock/activePlacedItem.maxStock)*100}%`, height: "100%", background: "var(--color-primary)", borderRadius: "4px" }} /></div>
                         
                         {activePlacedItem.stock < activePlacedItem.maxStock && (
                           <button 
                             className="btn-primary" 
                             disabled={(inventory.get(activePlacedItem.productId) || 0) <= 0}
                             onClick={() => networkManager.sendRefillItem(selectedPlacedId!)} 
                             style={{ width: "100%", justifyContent: "center", opacity: (inventory.get(activePlacedItem.productId) || 0) <= 0 ? 0.5 : 1 }}
                           >
                             {(inventory.get(activePlacedItem.productId) || 0) <= 0 ? "Kein Vorrat im Lager!" : "Aus Lager einräumen"}
                           </button>
                         )}
                       </>
                     )}
                   </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    className="btn-primary" 
                    onClick={() => { setIsMovingItem(true); if (isFirstPerson) setIsFirstPerson(false); }}
                    style={{ flex: 1, justifyContent: "center", background: "#f59e0b" }}
                  >
                    Verschieben
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={handleSellPlacedItem} 
                    style={{ flex: 1, justifyContent: "center", color: "var(--color-danger)" }}
                  >
                    Rückverkauf
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isMovingItem && activePlacedItem && (
          <div style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 3000 }}>
            <div className="glass-panel" style={{ padding: "15px 30px", border: "2px solid #f59e0b", textAlign: "center" }}>
              <div style={{ fontWeight: 800, marginBottom: "5px" }}>Verschiebe: {getCatalogLabel(activePlacedItem.type)}</div>
              <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Klicke auf den Boden zum Platzieren | [R] zum Drehen | [ESC] Abbruch</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
