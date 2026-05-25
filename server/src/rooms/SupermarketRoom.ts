import { Room, Client } from "colyseus";
import { SupermarketState, Player, PlacedItem, NPC, Employee, DeliveryBox } from "../schema/SupermarketState";
import fs from "fs";
import path from "path";

export class SupermarketRoom extends Room<SupermarketState> {
  maxClients = 20;
  private npcInterval: any;
  private saveInterval: any;
  private salaryTimer: number = 0;
  private saveFilePath = path.join(__dirname, "../../savegame.json");

  private availableProducts = [
    { id: "bread", name: "Brot", category: "shelf_groceries", price: 2, sellPrice: 5, icon: "🍞", color: "#fcd34d" },
    { id: "cereal", name: "Müsli", category: "shelf_groceries", price: 4, sellPrice: 10, icon: "🥣", color: "#fbbf24" },
    { id: "pasta", name: "Pasta", category: "shelf_groceries", price: 3, sellPrice: 8, icon: "🍝", color: "#fde68a" },
    { id: "apple", name: "Äpfel", category: "shelf_produce", price: 1, sellPrice: 3, icon: "🍎", color: "#ef4444" },
    { id: "banana", name: "Bananen", category: "shelf_produce", price: 2, sellPrice: 5, icon: "🍌", color: "#facc15" },
    { id: "tomato", name: "Tomaten", category: "shelf_produce", price: 2, sellPrice: 4, icon: "🍅", color: "#f87171" },
    { id: "pizza", name: "Tiefkühlpizza", category: "shelf_frozen", price: 5, sellPrice: 12, icon: "🍕", color: "#fb923c" },
    { id: "icecream", name: "Eiscreme", category: "shelf_frozen", price: 6, sellPrice: 15, icon: "🍦", color: "#60a5fa" },
    { id: "frozen_veggies", name: "TK-Gemüse", category: "shelf_frozen", price: 4, sellPrice: 9, icon: "🥦", color: "#4ade80" },
    { id: "ak47", name: "AK-47", category: "weapon", price: 800, sellPrice: 0, icon: "🔫", color: "#475569" },
  ];

  onCreate(_options: any) {
    this.setState(new SupermarketState());
    this.loadState();

    this.npcInterval = setInterval(() => {
      this.tickNPCs(); this.tickEmployees(); this.tickPlayers();
      if (this.state.marketingTimer > 0) this.state.marketingTimer--;
      this.salaryTimer++;
      if (this.salaryTimer >= 1200) { this.salaryTimer = 0; this.payoutSalaries(); }
    }, 50);

    this.saveInterval = setInterval(() => { this.saveState(); }, 30000);

    this.onMessage("move", (client, data: { x: number; y: number; z: number; rotY: number; isFirstPerson: boolean }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x; player.y = data.y; player.z = data.z;
        player.rotY = data.rotY; player.isFirstPerson = data.isFirstPerson;
        player.targetX = data.x; player.targetZ = data.z;
        player.pathX.clear(); player.pathZ.clear();

        if (player.holdingBoxId) {
          const box = this.state.deliveryBoxes.get(player.holdingBoxId);
          if (box) { box.x = player.x; box.z = player.z; }
        }
      }
    });

    this.onMessage("moveTo", (client, data: { x: number, z: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.targetX = data.x; player.targetZ = data.z;
        this.calculatePathGeneric(player);
      }
    });

    this.onMessage("pickUpBox", (client, data: { boxId: string }) => {
      const player = this.state.players.get(client.sessionId);
      const box = this.state.deliveryBoxes.get(data.boxId);
      if (!player || !box || box.isHeld || player.holdingBoxId) return;
      if (player.holdingAK47) return; // Can't pick up box while holding weapon
      if (Math.sqrt(Math.pow(player.x - box.x, 2) + Math.pow(player.z - box.z, 2)) > 3.0) return;
      // If it's an AK-47 box, equip the weapon instead of carrying the box
      if (box.productId === "ak47") {
        player.holdingAK47 = true;
        this.state.deliveryBoxes.delete(box.id);
        this.broadcast("systemMessage", `${player.name} hat eine AK-47 aufgehoben! 🔫`);
        return;
      }
      player.holdingBoxId = box.id; box.isHeld = true;
    });

    this.onMessage("dropBox", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      // Drop AK-47 as a box
      if (player.holdingAK47) {
        const boxId = `box_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const box = new DeliveryBox();
        box.id = boxId; box.productId = "ak47"; box.amount = 1;
        box.x = player.x + Math.sin(player.rotY) * 0.8;
        box.z = player.z + Math.cos(player.rotY) * 0.8;
        this.state.deliveryBoxes.set(boxId, box);
        player.holdingAK47 = false;
        this.broadcast("systemMessage", `${player.name} hat die AK-47 abgelegt.`);
        return;
      }
      if (!player.holdingBoxId) return;
      const box = this.state.deliveryBoxes.get(player.holdingBoxId);
      if (box) {
        box.isHeld = false;
        box.x = player.x + Math.sin(player.rotY) * 0.8;
        box.z = player.z + Math.cos(player.rotY) * 0.8;
      }
      player.holdingBoxId = "";
    });

    this.onMessage("placeItem", (client, data: { type: string; gridX: number; gridZ: number; rotation: number }) => {
      const maxBound = 9; 
      if (Math.abs(data.gridX) > maxBound || Math.abs(data.gridZ) > maxBound) {
        client.send("error", { message: "Nicht in die Wand bauen!" }); return;
      }
      let cost = 0;
      switch (data.type) {
        case "shelf_groceries": cost = 300; break;
        case "shelf_produce": cost = 500; break;
        case "shelf_frozen": cost = 800; break;
        case "storage_shelf": cost = 400; break;
        case "cash_register": cost = 1200; break;
        case "pc_terminal": cost = 600; break;
        default: return;
      }
      if (this.state.budget < cost) { client.send("error", { message: "Kein Budget!" }); return; }
      let isOccupied = false;
      this.state.placedItems.forEach((item) => { if (item.gridX === data.gridX && item.gridZ === data.gridZ) isOccupied = true; });
      if (isOccupied) { client.send("error", { message: "Platz besetzt!" }); return; }

      const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const item = new PlacedItem();
      item.id = itemId; item.type = data.type; item.gridX = data.gridX; item.gridZ = data.gridZ; item.rotation = data.rotation;
      
      // Initialize slots for storage shelves
      if (data.type === "storage_shelf") {
        for (let i = 0; i < 8; i++) item.storedBoxIds.push("");
      }

      let maxStock = 0;
      if (data.type === "shelf_groceries") maxStock = 12;
      else if (data.type === "shelf_produce") maxStock = 10;
      else if (data.type === "shelf_frozen") maxStock = 8;
      item.maxStock = maxStock; item.stock = 0;
      this.state.placedItems.set(itemId, item);
      this.state.budget -= cost; this.state.storeExp += Math.round(cost * 0.1);
      this.broadcast("moneyChange", { amount: -cost, type: "expense" });

      const expNeeded = this.state.storeLevel * 500;
      if (this.state.storeExp >= expNeeded) { this.state.storeExp -= expNeeded; this.state.storeLevel += 1; this.broadcast("levelup", { level: this.state.storeLevel }); }
      this.broadcast("placed", { player: this.state.players.get(client.sessionId)?.name || "Jemand", type: data.type });
      this.updateAllPaths();
    });

    this.onMessage("buyProduct", (client, data: { productId: string, amount: number }) => {
      const product = this.availableProducts.find(p => p.id === data.productId);
      if (!product) return;
      const totalCost = product.price * data.amount;
      if (this.state.budget < totalCost) { client.send("error", { message: "Kein Budget!" }); return; }
      
      this.state.budget -= totalCost;
      this.broadcast("moneyChange", { amount: -totalCost, type: "expense" });
      
      const boxId = `box_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const box = new DeliveryBox();
      box.id = boxId; box.productId = data.productId; box.amount = data.amount;
      box.x = (Math.random() - 0.5) * 4; box.z = 9.0 + Math.random();
      
      this.state.deliveryBoxes.set(boxId, box);
      this.broadcast("systemMessage", `Lieferung: ${data.amount}x ${product.name}! 📦`);
    });

    this.onMessage("unpackBox", (client, data: { boxId: string }) => {
      const box = this.state.deliveryBoxes.get(data.boxId);
      if (!box) return;
      
      const product = this.availableProducts.find(p => p.id === box.productId);
      if (!product) return;

      this.state.deliveryBoxes.delete(data.boxId);
      this.broadcast("systemMessage", `${this.state.players.get(client.sessionId)?.name || "Jemand"} hat eine Kiste entsorgt.`);
    });

    this.onMessage("assignProductToShelf", (client, data: { shelfId: string, productId: string }) => {
      const shelf = this.state.placedItems.get(data.shelfId);
      if (!shelf || !shelf.type.startsWith("shelf_")) return;
      
      if (data.productId === "") {
        shelf.productId = ""; shelf.stock = 0;
        this.broadcast("systemMessage", `${this.state.players.get(client.sessionId)?.name || "Jemand"} hat ein Regal geleert.`);
        return;
      }

      const product = this.availableProducts.find(p => p.id === data.productId);
      if (!product || product.category !== shelf.type) return;

      if (shelf.productId && shelf.productId !== data.productId && shelf.stock > 0) {
        shelf.stock = 0;
      }

      shelf.productId = data.productId;
      this.broadcast("systemMessage", `${this.state.players.get(client.sessionId)?.name || "Jemand"} hat ${product.name} zugewiesen.`);
    });

    this.onMessage("hireEmployee", (client) => {
      const id = `emp_${Date.now()}`;
      const emp = new Employee(); emp.id = id; emp.name = ["Lukas", "Sarah", "Kevin", "Mia", "Tom", "Julia"][Math.floor(Math.random() * 6)];
      emp.x = 0; emp.z = 9.5; emp.targetX = 0; emp.targetZ = 5; emp.state = "idle";
      this.state.employees.set(id, emp);
      this.broadcast("systemMessage", `Angestellter ${emp.name} eingestellt!`);
    });

    this.onMessage("assignTask", (_client, data: { empId: string, task: string }) => {
      const emp = this.state.employees.get(data.empId);
      if (emp) { emp.task = data.task; emp.state = "idle"; }
    });

    this.onMessage("startMarketing", () => {
      if (this.state.budget >= 800) { 
        this.state.budget -= 800; 
        this.state.marketingTimer += 2400; 
        this.broadcast("moneyChange", { amount: -800, type: "expense" });
      }
    });

    this.onMessage("shoot", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.holdingAK47) return;
      // 2D raycast from player position along facing direction
      const dirX = Math.sin(player.rotY);
      const dirZ = Math.cos(player.rotY);
      let closestNpc: NPC | null = null;
      let closestDist = 15; // max range
      this.state.npcs.forEach((npc) => {
        if (npc.state === "leaving") return; // already fleeing
        const toX = npc.x - player.x;
        const toZ = npc.z - player.z;
        const along = toX * dirX + toZ * dirZ; // dot product (distance along ray)
        if (along < 0.3 || along > closestDist) return; // behind or too far
        const perpX = toX - dirX * along;
        const perpZ = toZ - dirZ * along;
        const perp = Math.sqrt(perpX * perpX + perpZ * perpZ); // perpendicular distance
        if (perp < 0.8 && along < closestDist) {
          closestDist = along;
          closestNpc = npc;
        }
      });
      if (closestNpc) {
        const npc = closestNpc as NPC;
        // Drop items as a delivery box at the NPC's location
        if (npc.itemCount > 0) {
          const product = this.availableProducts.find(p => p.icon === npc.activeIcon);
          const boxId = `box_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          const droppedBox = new DeliveryBox();
          droppedBox.id = boxId;
          droppedBox.productId = product ? product.id : "bread";
          droppedBox.amount = npc.itemCount;
          droppedBox.x = npc.x;
          droppedBox.z = npc.z;
          this.state.deliveryBoxes.set(boxId, droppedBox);
          this.broadcast("chatMessage", { type: "system", message: `💥 ${npc.name || "Ein Kunde"} hat ${npc.itemCount} Artikel fallen gelassen!`, timestamp: Date.now() });
          npc.itemCount = 0;
        }
        // NPC flees
        npc.state = "leaving";
        npc.targetX = (Math.random() - 0.5) * 6; npc.targetZ = 9.5;
        npc.activeIcon = "😱";
        npc.message = "AAAAAAH! HILFE! 😱";
        this.calculatePathGeneric(npc);
      }
      // Broadcast gunshot event to all clients for sound/effects
      this.broadcast("gunshot", { x: player.x, z: player.z, rotY: player.rotY });
    });

    this.onMessage("refillItem", (client, data: { id: string, slotIndex?: number }) => {
      const player = this.state.players.get(client.sessionId);
      const item = this.state.placedItems.get(data.id);
      if (!player || !item) return;

      // --- LOGIC FOR STORAGE SHELVES ---
      if (item.type === "storage_shelf") {
        const isSlotOccupied = (idx: number) => {
          const bid = item.storedBoxIds[idx];
          return !!(bid && this.state.deliveryBoxes.has(bid));
        };

        let slot = -1;
        if (data.slotIndex !== undefined) {
          slot = data.slotIndex;
        } else {
          for (let i = 0; i < 8; i++) {
            if (!isSlotOccupied(i)) {
              slot = i;
              break;
            }
          }
        }

        if (slot === -1 || slot >= 8) {
           if (player.holdingBoxId) client.send("error", { message: "Kein freier Platz im Regal!" });
           return;
        }

        // A. If holding a box, PUT IT IN THE SPECIFIC SLOT
        if (player.holdingBoxId) {
          if (isSlotOccupied(slot)) {
            // Find next empty slot if specific one is full (fallback)
            let fallbackSlot = -1;
            for (let i = 0; i < 8; i++) {
              if (!isSlotOccupied(i)) {
                fallbackSlot = i;
                break;
              }
            }
            if (fallbackSlot === -1) { client.send("error", { message: "Regal voll!" }); return; }
            this.putBoxInSlot(player, item, fallbackSlot);
          } else {
            this.putBoxInSlot(player, item, slot);
          }
        } 
        // B. If NOT holding a box, TAKE FROM THE SPECIFIC SLOT
        else {
          let actualSlot = -1;
          if (data.slotIndex !== undefined && isSlotOccupied(data.slotIndex)) {
            actualSlot = data.slotIndex;
          } else {
            for (let i = 7; i >= 0; i--) {
              if (isSlotOccupied(i)) {
                actualSlot = i;
                break;
              }
            }
          }
            
          if (actualSlot !== -1) {
            const boxId = item.storedBoxIds[actualSlot];
            if (boxId) {
              const box = this.state.deliveryBoxes.get(boxId);
              if (box) {
                player.holdingBoxId = boxId;
                box.isHeld = true;
                item.storedBoxIds[actualSlot] = "";
                this.broadcast("systemMessage", `${player.name} hat eine Kiste geholt.`);
              } else {
                // Clear the ghost ID so the slot is cleanly marked empty
                item.storedBoxIds[actualSlot] = "";
              }
            }
          }
        }
        return;
      }

      // --- LOGIC FOR SALES SHELVES ---
      if (!item.type.startsWith("shelf_") || item.stock >= item.maxStock) return;

      if (player.holdingBoxId) {
        const box = this.state.deliveryBoxes.get(player.holdingBoxId);
        if (!box) return;
        const product = this.availableProducts.find(p => p.id === box.productId);
        if (!product) return;

        if ((!item.productId || item.stock === 0) && product.category === item.type) {
           if (item.productId !== box.productId) {
             item.productId = box.productId;
             this.broadcast("systemMessage", `${player.name} hat ein Regal mit ${product.name} belegt.`);
           }
        }

        if (box.productId === item.productId) {
          const toAdd = Math.min(item.maxStock - item.stock, box.amount);
          item.stock += toAdd; box.amount -= toAdd;
          if (box.amount <= 0) { this.state.deliveryBoxes.delete(box.id); player.holdingBoxId = ""; }
          this.state.storeExp += Math.round(toAdd * 10);
          this.broadcast("moneyChange", { amount: 0, type: "income" });
          return;
        } else {
          client.send("error", { message: "Falsches Produkt in der Kiste!" });
        }
      } else {
        client.send("error", { message: "Du musst eine Kiste in der Hand halten!" });
      }
    });

    this.onMessage("processPayment", (_client, data: { npcId: string }) => {
      const npc = this.state.npcs.get(data.npcId);
      if (npc && npc.state === "waiting_to_pay") this.processNPCShopPayment(npc);
    });

    this.onMessage("moveItem", (client, data: { id: string; gridX: number; gridZ: number; rotation: number }) => {
      if (Math.abs(data.gridX) > 9 || Math.abs(data.gridZ) > 9) return;
      const item = this.state.placedItems.get(data.id);
      if (!item) return;
      let occupied = false;
      this.state.placedItems.forEach(o => { if (o.id !== data.id && o.gridX === data.gridX && o.gridZ === data.gridZ) occupied = true; });
      if (occupied) return;
      item.gridX = data.gridX; item.gridZ = data.gridZ; item.rotation = data.rotation;
      this.updateAllPaths();
    });

    this.onMessage("removeItem", (_client, data: { id: string }) => {
      const item = this.state.placedItems.get(data.id);
      if (!item) return;
      
      let refund = 150;
      if (item.type === "cash_register") refund = 600;
      else if (item.type === "storage_shelf") refund = 200;
      else if (item.type === "shelf_produce") refund = 250;
      else if (item.type === "shelf_frozen") refund = 400;

      // If it's a storage shelf, remove the boxes too
      if (item.type === "storage_shelf") {
        item.storedBoxIds.forEach(boxId => {
          if (boxId && boxId !== "") this.state.deliveryBoxes.delete(boxId);
        });
      }

      this.state.placedItems.delete(data.id); 
      this.state.budget += refund;
      this.broadcast("moneyChange", { amount: refund, type: "income" });
      this.updateAllPaths();
    });

    this.onMessage("chat", (client, message: string) => {
      const player = this.state.players.get(client.sessionId);
      if (player) this.broadcast("chatMessage", { sender: player.name, color: player.color, message, timestamp: Date.now() });
    });
  }

  onJoin(client: Client, options: { name: string; color: string }) {
    const player = new Player(); player.id = client.sessionId;
    player.name = options.name || `Gast_${client.sessionId.substring(0, 4)}`;
    player.color = options.color || "#3b82f6";
    player.x = 0; player.z = 8; player.targetX = 0; player.targetZ = 8;
    this.state.players.set(client.sessionId, player);
    client.send("availableProducts", this.availableProducts);
  }

  onLeave(client: Client) { this.state.players.delete(client.sessionId); }

  onDispose() {
    this.saveState();
    if (this.npcInterval) clearInterval(this.npcInterval);
    if (this.saveInterval) clearInterval(this.saveInterval);
  }

  private updateAllPaths() {
    this.state.players.forEach(p => { if (!p.isFirstPerson) this.calculatePathGeneric(p); });
    this.state.npcs.forEach(n => this.calculatePathGeneric(n));
    this.state.employees.forEach(e => this.calculatePathGeneric(e));
  }

  private tickEmployees() {
    const step = 0.0875;
    this.state.employees.forEach((emp) => {
      switch (emp.state) {
        case "idle": {
          if (emp.task === "register") {
            const registers: PlacedItem[] = [];
            this.state.placedItems.forEach(item => { if (item.type === "cash_register") registers.push(item); });
            if (registers.length > 0) {
              emp.targetX = registers[0].gridX - 0.65; emp.targetZ = registers[0].gridZ;
              emp.state = "walking"; this.calculatePathGeneric(emp);
            }
          } else if (emp.task === "stocking") {
            const empAny = emp as any;
            if (!emp.holdingBoxId) {
              // Look for shelves that need stocking
              const candidateShelves = Array.from(this.state.placedItems.values()).filter(item => 
                item.type.startsWith("shelf_") && item.productId && item.stock < item.maxStock
              );

              if (candidateShelves.length > 0) {
                // Find a matching box (not held, has stock)
                let foundBox: DeliveryBox | undefined;
                let targetShelf: PlacedItem | undefined;
                for (const shelf of candidateShelves) {
                  foundBox = Array.from(this.state.deliveryBoxes.values()).find(b => 
                    !b.isHeld && b.amount > 0 && b.productId === shelf.productId
                  );
                  if (foundBox) {
                    targetShelf = shelf;
                    break;
                  }
                }

                if (foundBox && targetShelf) {
                  // Check if stored in a shelf
                  let storageShelf: PlacedItem | undefined;
                  let slotIndex = -1;
                  this.state.placedItems.forEach(item => {
                    if (item.type === "storage_shelf" && item.storedBoxIds) {
                      const idx = item.storedBoxIds.indexOf(foundBox!.id);
                      if (idx !== -1) {
                        storageShelf = item;
                        slotIndex = idx;
                      }
                    }
                  });

                  empAny.targetBoxId = foundBox.id;
                  empAny.targetShelfId = targetShelf.id;
                  if (storageShelf) {
                    emp.targetX = storageShelf.gridX;
                    emp.targetZ = storageShelf.gridZ + 0.8;
                    empAny.targetStorageShelfId = storageShelf.id;
                    empAny.targetSlotIndex = slotIndex;
                  } else {
                    emp.targetX = foundBox.x;
                    emp.targetZ = foundBox.z;
                    empAny.targetStorageShelfId = undefined;
                    empAny.targetSlotIndex = undefined;
                  }
                  empAny.subState = "pickup_box";
                  emp.state = "walking";
                  this.calculatePathGeneric(emp);
                }
              }
            } else {
              // Holding a box, find where to put the items
              const box = this.state.deliveryBoxes.get(emp.holdingBoxId);
              if (!box || box.amount <= 0) {
                emp.holdingBoxId = "";
                return;
              }

              const shelf = Array.from(this.state.placedItems.values()).find(item => 
                item.type.startsWith("shelf_") && item.productId === box.productId && item.stock < item.maxStock
              );

              if (shelf) {
                emp.targetX = shelf.gridX;
                emp.targetZ = shelf.gridZ + 0.8;
                empAny.targetShelfId = shelf.id;
                empAny.subState = "refill_shelf";
                emp.state = "walking";
                this.calculatePathGeneric(emp);
              } else {
                // Shelf is full or doesn't exist, try to put box back in storage
                let targetStorageShelf: PlacedItem | undefined;
                let emptySlot = -1;
                for (const item of this.state.placedItems.values()) {
                  if (item.type === "storage_shelf") {
                    for (let idx = 0; idx < 8; idx++) {
                      const bid = item.storedBoxIds[idx];
                      const boxExists = bid && this.state.deliveryBoxes.has(bid);
                      if (!boxExists) {
                        targetStorageShelf = item;
                        emptySlot = idx;
                        break;
                      }
                    }
                  }
                  if (targetStorageShelf) break;
                }

                if (targetStorageShelf) {
                  emp.targetX = targetStorageShelf.gridX;
                  emp.targetZ = targetStorageShelf.gridZ + 0.8;
                  empAny.targetStorageShelfId = targetStorageShelf.id;
                  empAny.targetSlotIndex = emptySlot;
                  empAny.subState = "store_box";
                } else {
                  // No storage slots, drop on floor near store center
                  emp.targetX = 0;
                  emp.targetZ = 5;
                  empAny.subState = "drop_box";
                }
                emp.state = "walking";
                this.calculatePathGeneric(emp);
              }
            }
          }
          break;
        }
        case "walking": { if (this.followPath(emp, step)) { emp.state = "working"; emp.workTimer = 20; } break; }
        case "working": {
          emp.workTimer--;
          if (emp.workTimer <= 0) {
            const empAny = emp as any;
            if (emp.task === "register") {
              emp.rotY = Math.PI / 2;
              let found = false;
              this.state.npcs.forEach(npc => {
                if (npc.state === "waiting_to_pay" && !found) {
                  if (Math.sqrt(Math.pow(npc.x - (emp.x + 1.3), 2) + Math.pow(npc.z - emp.z, 2)) < 2.0) { this.processNPCShopPayment(npc); found = true; }
                }
              });
              emp.workTimer = found ? 40 : 20;
            } else if (emp.task === "stocking") {
              const subState = empAny.subState;
              if (subState === "pickup_box") {
                const box = this.state.deliveryBoxes.get(empAny.targetBoxId);
                if (box && !box.isHeld) {
                  box.isHeld = true;
                  emp.holdingBoxId = box.id;
                  if (empAny.targetStorageShelfId && empAny.targetSlotIndex !== undefined) {
                    const shelf = this.state.placedItems.get(empAny.targetStorageShelfId);
                    if (shelf) shelf.storedBoxIds[empAny.targetSlotIndex] = "";
                  }
                }
              } else if (subState === "refill_shelf") {
                const box = this.state.deliveryBoxes.get(emp.holdingBoxId);
                const shelf = this.state.placedItems.get(empAny.targetShelfId);
                if (box && shelf && box.productId === shelf.productId) {
                  const add = Math.min(shelf.maxStock - shelf.stock, box.amount);
                  if (add > 0) {
                    shelf.stock += add;
                    box.amount -= add;
                  }
                  if (box.amount <= 0) {
                    this.state.deliveryBoxes.delete(box.id);
                    emp.holdingBoxId = "";
                  }
                }
              } else if (subState === "store_box") {
                const box = this.state.deliveryBoxes.get(emp.holdingBoxId);
                const shelf = this.state.placedItems.get(empAny.targetStorageShelfId);
                if (box && shelf && empAny.targetSlotIndex !== undefined) {
                  box.isHeld = false;
                  const slot = empAny.targetSlotIndex;
                  const level = Math.floor(slot / 2);
                  const side = slot % 2;
                  box.x = shelf.gridX + (side * 0.4 - 0.2);
                  box.z = shelf.gridZ;
                  shelf.storedBoxIds[slot] = box.id;
                  emp.holdingBoxId = "";
                }
              } else if (subState === "drop_box") {
                const box = this.state.deliveryBoxes.get(emp.holdingBoxId);
                if (box) {
                  box.isHeld = false;
                  box.x = emp.x;
                  box.z = emp.z;
                  emp.holdingBoxId = "";
                }
              }
              emp.state = "idle";
            } else {
              emp.state = "idle";
            }
          }
          break;
        }
      }
    });
  }

  private putBoxInSlot(player: Player, item: PlacedItem, slot: number) {
    const boxId = player.holdingBoxId;
    const box = this.state.deliveryBoxes.get(boxId);
    if (box) {
      box.isHeld = false;
      const level = Math.floor(slot / 2);
      const side = slot % 2;
      box.x = item.gridX + (side * 0.4 - 0.2);
      box.z = item.gridZ;
      
      item.storedBoxIds[slot] = box.id;
      player.holdingBoxId = "";
      this.broadcast("systemMessage", `${player.name} hat eine Kiste eingeräumt.`);
    }
  }

  private processNPCShopPayment(npc: NPC) {
    let price = 10;
    if (npc.activeIcon === "🍞") price = 5; else if (npc.activeIcon === "🥣") price = 10; else if (npc.activeIcon === "🍎") price = 3;
    const profit = npc.itemCount * price;
    this.state.budget += profit; this.state.storeExp += Math.round(profit * 0.2);
    npc.targetX = (Math.random() - 0.5) * 6; npc.targetZ = 9.5; npc.state = "leaving"; npc.activeIcon = "👋";
    this.calculatePathGeneric(npc);
    this.broadcast("moneyChange", { amount: profit, type: "income" });
    this.broadcast("chatMessage", { type: "income", message: `${npc.name} hat $${profit} bezahlt.`, timestamp: Date.now() });
  }

  private tickNPCs() {
    const maxNPCs = Math.min(8, 2 + this.state.storeLevel);
    const spawnProb = this.state.marketingTimer > 0 ? 0.12 : 0.06;
    if (this.state.npcs.size < maxNPCs && Math.random() < spawnProb) {
      const id = `npc_${Date.now()}`; const npc = new NPC(); npc.id = id;
      const spawnX = (Math.random() - 0.5) * 6;
      npc.x = spawnX; npc.z = 9.5; npc.targetX = spawnX; npc.targetZ = 9.5; npc.state = "idle";
      this.state.npcs.set(id, npc);
    }
    const step = 0.0875;
    this.state.npcs.forEach((npc, id) => {
      switch (npc.state) {
        case "idle": {
          const shelves: PlacedItem[] = [];
          this.state.placedItems.forEach(i => { if (i.type.startsWith("shelf_")) shelves.push(i); });
          if (shelves.length > 0) {
            const t = shelves[Math.floor(Math.random() * shelves.length)];
            npc.targetX = t.gridX; npc.targetZ = t.gridZ + 0.8; npc.targetShelfId = t.id;
            npc.state = "walking_to_shelf"; npc.activeIcon = "🔍"; this.calculatePathGeneric(npc);
          } else {
            npc.targetX = Math.random() * 14 - 7; npc.targetZ = Math.random() * 14 - 7;
            npc.state = "walking_to_shelf"; npc.activeIcon = "🤔"; this.calculatePathGeneric(npc);
          }
          break;
        }
        case "walking_to_shelf": {
          if (this.followPath(npc, step)) {
            const s = this.state.placedItems.get(npc.targetShelfId);
            if (s && s.stock > 0 && s.productId) {
              s.stock--; npc.itemCount++; npc.state = "browsing_shelf"; npc.browseTimer = 30;
              const p = this.availableProducts.find(x => x.id === s.productId); if (p) npc.activeIcon = p.icon;
            } else { npc.state = "frustrated"; npc.browseTimer = 40; npc.activeIcon = "😡"; }
          }
          break;
        }
        case "frustrated":
        case "browsing_shelf": {
          npc.browseTimer--;
          if (npc.browseTimer <= 0) {
            const regs: PlacedItem[] = [];
            this.state.placedItems.forEach(i => { if (i.type === "cash_register") regs.push(i); });
            if (npc.itemCount > 0 && regs.length > 0) {
              const r = regs[Math.floor(Math.random() * regs.length)];
              npc.targetX = r.gridX + 0.65; npc.targetZ = r.gridZ; npc.state = "walking_to_register"; npc.activeIcon = "💳";
            } else { 
              npc.targetX = (Math.random() - 0.5) * 6; npc.targetZ = 9.5; npc.state = "leaving"; npc.activeIcon = "🤬"; 
              if (npc.itemCount > 0) {
                 npc.message = "Wo ist hier bitteschön die Kasse?! Ich geh dann mal... 🙄";
                 this.broadcast("chatMessage", { type: "error", message: `${npc.name} ist gegangen, weil keine Kasse existiert!`, timestamp: Date.now() });
              } else {
                 npc.activeIcon = "👋";
              }
            }
            this.calculatePathGeneric(npc);
          }
          break;
        }
        case "walking_to_register": { if (this.followPath(npc, step)) { npc.state = "waiting_to_pay"; npc.activeIcon = "💰"; npc.rotY = -Math.PI / 2; npc.patience = 600 + Math.random() * 400; } break; }
        
        case "waiting_to_pay": {
          npc.patience--;
          if (npc.patience <= 0) {
            // NPC is too angry and leaves without paying!
            npc.state = "leaving";
            npc.targetX = (Math.random() - 0.5) * 6; npc.targetZ = 9.5;
            npc.activeIcon = "🤬";
            npc.message = "Das dauert mir hier zu lange! Ich gehe! 🤬";
            this.calculatePathGeneric(npc);
            this.broadcast("chatMessage", { type: "error", message: `${npc.name} ist wütend gegangen (zu lange Wartezeit an der Kasse)!`, timestamp: Date.now() });
          }
          break;
        }

        case "leaving": { if (this.followPath(npc, step)) this.state.npcs.delete(id); break; }
      }
      this.state.npcs.forEach((o, oid) => {
        if (id === oid) return;
        const dx = npc.x - o.x; const dz = npc.z - o.z; const d = Math.sqrt(dx*dx + dz*dz);
        if (d < 0.65) { 
          if (d > 0.01) {
            const push = (0.65 - d) * 0.15; 
            npc.x += (dx/d) * push + (Math.random() - 0.5) * 0.04; 
            npc.z += (dz/d) * push + (Math.random() - 0.5) * 0.04; 
          } else {
            // Exactly overlapping, push apart randomly
            npc.x += (Math.random() - 0.5) * 0.2;
            npc.z += (Math.random() - 0.5) * 0.2;
          }
        }
      });
      
      const npcRadius = 0.35; const itemSize = 0.5; const minDist = npcRadius + itemSize;
      this.state.placedItems.forEach((i) => {
        const dx = npc.x - i.gridX; const dz = npc.z - i.gridZ; const d = Math.sqrt(dx*dx + dz*dz);
        if (d < minDist && d > 0.01) { const push = (minDist - d) * 0.5; npc.x += (dx/d) * push; npc.z += (dz/d) * push; }
      });

      npc.x = Math.max(-9.5, Math.min(9.5, npc.x)); npc.z = Math.max(-9.5, Math.min(9.5, npc.z));
    });
  }

  private followPath(entity: any, step: number): boolean {
    if (entity.pathX.length > 0) {
      const nx = entity.pathX[0]; const nz = entity.pathZ[0];
      const dx = nx - entity.x; const dz = nz - entity.z; const d = Math.sqrt(dx*dx + dz*dz);
      if (d > 0.15) { 
        entity.x += (dx/d) * step; entity.z += (dz/d) * step; 
        if (d > 0.2) entity.rotY = Math.atan2(dx, dz);
        return false; 
      }
      entity.x = nx; entity.z = nz; entity.pathX.shift(); entity.pathZ.shift();
      // Use 0.5 as arrival threshold to prevent clumping on the exact same coordinate
      return entity.pathX.length === 0 && Math.sqrt(Math.pow(entity.targetX - entity.x, 2) + Math.pow(entity.targetZ - entity.z, 2)) < 0.5;
    }
    const dx = entity.targetX - entity.x; const dz = entity.targetZ - entity.z; const d = Math.sqrt(dx*dx + dz*dz);
    if (d > 0.15) { 
      entity.x += (dx/d) * step; entity.z += (dz/d) * step; 
      if (d > 0.2) entity.rotY = Math.atan2(dx, dz);
      return false; 
    }
    entity.x = entity.targetX; entity.z = entity.targetZ; return true;
  }

  private calculatePathGeneric(entity: any) {
    const sx = Math.round(entity.x); const sz = Math.round(entity.z);
    const ex = Math.round(entity.targetX); const ez = Math.round(entity.targetZ);
    if (sx === ex && sz === ez) { entity.pathX.clear(); entity.pathZ.clear(); return; }
    const path = this.findAStarPath(sx, sz, ex, ez);
    entity.pathX.clear(); entity.pathZ.clear();
    if (path) for (let i = 1; i < path.length; i++) { entity.pathX.push(path[i].x); entity.pathZ.push(path[i].z); }
  }

  private tickPlayers() {
    const step = 0.12;
    this.state.players.forEach((p) => {
      if (p.isFirstPerson) return;
      this.followPath(p, step);
      const playerRadius = 0.4; const itemSize = 0.5; const minDist = playerRadius + itemSize;
      this.state.placedItems.forEach((i) => {
        const dx = p.x - i.gridX; const dz = p.z - i.gridZ; const d = Math.sqrt(dx*dx + dz*dz);
        if (d < minDist && d > 0.01) { const push = (minDist - d) * 0.4; p.x += (dx/d) * push; p.z += (dz/d) * push; }
      });
      p.x = Math.max(-9.8, Math.min(9.8, p.x)); p.z = Math.max(-9.8, Math.min(9.8, p.z));
    });
  }

  private isCellBlocked(x: number, z: number, ex: number, ez: number): boolean {
    if (Math.abs(x) > 9 || Math.abs(z) > 9) return true;
    if (x === ex && z === ez) return false;
    let blocked = false;
    this.state.placedItems.forEach(i => {
      if (Math.round(i.gridX) === x && Math.round(i.gridZ) === z) blocked = true;
    });
    return blocked;
  }

  private findAStarPath(sx: number, sz: number, ex: number, ez: number) {
    const open: any[] = []; const closed = new Set<string>();
    const startH = Math.sqrt(Math.pow(sx - ex, 2) + Math.pow(sz - ez, 2));
    open.push({ x: sx, z: sz, g: 0, h: startH, p: null });
    while (open.length > 0) {
      open.sort((a, b) => (a.g + a.h) - (b.g + b.h));
      const curr = open.shift(); const k = `${curr.x},${curr.z}`;
      if (curr.x === ex && curr.z === ez) {
        const res = []; let t = curr; while (t) { res.push({ x: t.x, z: t.z }); t = t.p; }
        return res.reverse();
      }
      if (closed.has(k)) continue; closed.add(k);
      
      const neighbors = [
        // Cardinal neighbors
        { x: curr.x + 1, z: curr.z, dx: 1, dz: 0, cost: 1.0 },
        { x: curr.x - 1, z: curr.z, dx: -1, dz: 0, cost: 1.0 },
        { x: curr.x, z: curr.z + 1, dx: 0, dz: 1, cost: 1.0 },
        { x: curr.x, z: curr.z - 1, dx: 0, dz: -1, cost: 1.0 },
        // Diagonal neighbors
        { x: curr.x + 1, z: curr.z + 1, dx: 1, dz: 1, cost: Math.SQRT2 },
        { x: curr.x + 1, z: curr.z - 1, dx: 1, dz: -1, cost: Math.SQRT2 },
        { x: curr.x - 1, z: curr.z + 1, dx: -1, dz: 1, cost: Math.SQRT2 },
        { x: curr.x - 1, z: curr.z - 1, dx: -1, dz: -1, cost: Math.SQRT2 }
      ];

      for (const n of neighbors) {
        if (closed.has(`${n.x},${n.z}`)) continue;
        if (this.isCellBlocked(n.x, n.z, ex, ez)) continue;
        
        // Prevent corner-cutting: if moving diagonally, cardinally adjacent neighbors must be unblocked
        if (n.dx !== 0 && n.dz !== 0) {
          if (this.isCellBlocked(curr.x + n.dx, curr.z, ex, ez) || 
              this.isCellBlocked(curr.x, curr.z + n.dz, ex, ez)) {
            continue;
          }
        }
        
        const g = curr.g + n.cost;
        const h = Math.sqrt(Math.pow(n.x - ex, 2) + Math.pow(n.z - ez, 2));
        const exist = open.find(o => o.x === n.x && o.z === n.z);
        if (exist) {
          if (g < exist.g) {
            exist.g = g;
            exist.p = curr;
          }
        } else {
          open.push({ x: n.x, z: n.z, g, h, p: curr });
        }
      }
    }
    return null;
  }

  private saveState() {
    try {
      const d = { budget: this.state.budget, storeName: this.state.storeName, storeLevel: this.state.storeLevel, storeExp: this.state.storeExp, placedItems: [], employees: [], deliveryBoxes: [] };
      this.state.placedItems.forEach((i) => { 
        const storedBoxIdsArray: string[] = [];
        i.storedBoxIds.forEach(id => storedBoxIdsArray.push(id));
        (d.placedItems as any).push({ 
          id: i.id, type: i.type, productId: i.productId, 
          gridX: i.gridX, gridZ: i.gridZ, rotation: i.rotation, 
          stock: i.stock, maxStock: i.maxStock,
          storedBoxIds: storedBoxIdsArray
        }); 
      });
      this.state.employees.forEach((e) => { (d.employees as any).push({ id: e.id, name: e.name, color: e.color, salary: e.salary, task: e.task, holdingBoxId: e.holdingBoxId }); });
      this.state.deliveryBoxes.forEach((b) => { (d.deliveryBoxes as any).push({ id: b.id, productId: b.productId, amount: b.amount, x: b.x, z: b.z, isHeld: b.isHeld }); });
      fs.writeFileSync(this.saveFilePath, JSON.stringify(d, null, 2));
    } catch (e) { console.error("Save error", e); }
  }

  private loadState() {
    try {
      if (fs.existsSync(this.saveFilePath)) {
        const d = JSON.parse(fs.readFileSync(this.saveFilePath, "utf-8"));
        this.state.budget = d.budget ?? 5000; this.state.storeName = d.storeName ?? "Super-Saver"; this.state.storeLevel = d.storeLevel ?? 1; this.state.storeExp = d.storeExp ?? 0;
        if (d.placedItems) d.placedItems.forEach((id: any) => {
          const i = new PlacedItem(); i.id = id.id; i.type = id.type; i.productId = id.productId; i.gridX = id.gridX; i.gridZ = id.gridZ; i.rotation = id.rotation; i.stock = id.stock; i.maxStock = id.maxStock;
          
          if (id.storedBoxIds) {
            id.storedBoxIds.forEach((bid: string) => i.storedBoxIds.push(bid));
            if (i.type === "storage_shelf") {
              while (i.storedBoxIds.length < 8) {
                i.storedBoxIds.push("");
              }
            }
          } else if (i.type === "storage_shelf") {
            for (let j = 0; j < 8; j++) i.storedBoxIds.push("");
          }
          
          this.state.placedItems.set(i.id, i);
        });
        if (d.employees) d.employees.forEach((ed: any) => {
          const e = new Employee(); e.id = ed.id; e.name = ed.name; e.color = ed.color; e.salary = 15; e.task = ed.task; e.holdingBoxId = ed.holdingBoxId || "";
          e.x = 0; e.z = 9.5; e.targetX = 0; e.targetZ = 5; e.state = "idle";
          this.state.employees.set(e.id, e);
        });
        if (d.deliveryBoxes) d.deliveryBoxes.forEach((bd: any) => {
          const b = new DeliveryBox(); b.id = bd.id; b.productId = bd.productId; b.amount = bd.amount; b.x = bd.x; b.z = bd.z; b.isHeld = bd.isHeld || false;
          this.state.deliveryBoxes.set(b.id, b);
        });
      }
    } catch (e) { console.error("Load error", e); }
  }

  private payoutSalaries() {
    let t = 0; this.state.employees.forEach(e => t += e.salary);
    if (t > 0 && this.state.budget >= t) { 
      this.state.budget -= t; 
      this.broadcast("moneyChange", { amount: -t, type: "expense" });
      this.broadcast("chatMessage", { type: "system", message: `Gehälter: $${t}.`, timestamp: Date.now() }); 
    }
  }
}
