"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupermarketRoom = void 0;
const colyseus_1 = require("colyseus");
const SupermarketState_1 = require("../schema/SupermarketState");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class SupermarketRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 20;
        this.salaryTimer = 0;
        this.saveFilePath = path_1.default.join(__dirname, "../../savegame.json");
        this.availableProducts = [
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
    }
    onCreate(_options) {
        this.setState(new SupermarketState_1.SupermarketState());
        this.loadState();
        if (this.state.inventory.size === 0) {
            this.availableProducts.forEach(p => { this.state.inventory.set(p.id, 0); });
        }
        this.npcInterval = setInterval(() => {
            this.tickNPCs();
            this.tickEmployees();
            this.tickPlayers();
            if (this.state.marketingTimer > 0)
                this.state.marketingTimer--;
            this.salaryTimer++;
            if (this.salaryTimer >= 1200) {
                this.salaryTimer = 0;
                this.payoutSalaries();
            }
        }, 50);
        this.saveInterval = setInterval(() => { this.saveState(); }, 30000);
        this.onMessage("move", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = data.x;
                player.y = data.y;
                player.z = data.z;
                player.rotY = data.rotY;
                player.isFirstPerson = data.isFirstPerson;
                player.targetX = data.x;
                player.targetZ = data.z;
                player.pathX.clear();
                player.pathZ.clear();
            }
        });
        this.onMessage("moveTo", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.targetX = data.x;
                player.targetZ = data.z;
                this.calculatePathGeneric(player);
            }
        });
        this.onMessage("placeItem", (client, data) => {
            const maxBound = 9;
            if (Math.abs(data.gridX) > maxBound || Math.abs(data.gridZ) > maxBound) {
                client.send("error", { message: "Nicht in die Wand bauen!" });
                return;
            }
            let cost = 0;
            switch (data.type) {
                case "shelf_groceries":
                    cost = 300;
                    break;
                case "shelf_produce":
                    cost = 500;
                    break;
                case "shelf_frozen":
                    cost = 800;
                    break;
                case "cash_register":
                    cost = 1200;
                    break;
                case "pc_terminal":
                    cost = 600;
                    break;
                default: return;
            }
            if (this.state.budget < cost) {
                client.send("error", { message: "Kein Budget!" });
                return;
            }
            let isOccupied = false;
            this.state.placedItems.forEach((item) => { if (item.gridX === data.gridX && item.gridZ === data.gridZ)
                isOccupied = true; });
            if (isOccupied) {
                client.send("error", { message: "Platz besetzt!" });
                return;
            }
            const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            const item = new SupermarketState_1.PlacedItem();
            item.id = itemId;
            item.type = data.type;
            item.gridX = data.gridX;
            item.gridZ = data.gridZ;
            item.rotation = data.rotation;
            let maxStock = 0;
            if (data.type === "shelf_groceries")
                maxStock = 12;
            else if (data.type === "shelf_produce")
                maxStock = 10;
            else if (data.type === "shelf_frozen")
                maxStock = 8;
            item.maxStock = maxStock;
            item.stock = 0;
            this.state.placedItems.set(itemId, item);
            this.state.budget -= cost;
            this.state.storeExp += Math.round(cost * 0.1);
            this.broadcast("moneyChange", { amount: -cost, type: "expense" });
            const expNeeded = this.state.storeLevel * 500;
            if (this.state.storeExp >= expNeeded) {
                this.state.storeExp -= expNeeded;
                this.state.storeLevel += 1;
                this.broadcast("levelup", { level: this.state.storeLevel });
            }
            this.broadcast("placed", { player: this.state.players.get(client.sessionId)?.name || "Jemand", type: data.type });
            this.updateAllPaths();
        });
        this.onMessage("buyProduct", (client, data) => {
            const product = this.availableProducts.find(p => p.id === data.productId);
            if (!product)
                return;
            const totalCost = product.price * data.amount;
            if (this.state.budget < totalCost) {
                client.send("error", { message: "Kein Budget!" });
                return;
            }
            this.state.budget -= totalCost;
            this.broadcast("moneyChange", { amount: -totalCost, type: "expense" });
            // Spawn a delivery box at the entrance
            const boxId = `box_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            const box = new SupermarketState_1.DeliveryBox();
            box.id = boxId;
            box.productId = data.productId;
            box.amount = data.amount;
            // Scatter boxes slightly around entrance (0, 0, 9.5)
            box.x = (Math.random() - 0.5) * 4;
            box.z = 9.0 + Math.random();
            this.state.deliveryBoxes.set(boxId, box);
            this.broadcast("systemMessage", `Lieferung eingetroffen: ${data.amount}x ${product.name}! 📦`);
        });
        this.onMessage("unpackBox", (client, data) => {
            const box = this.state.deliveryBoxes.get(data.boxId);
            if (!box)
                return;
            const product = this.availableProducts.find(p => p.id === box.productId);
            if (!product)
                return;
            const currentStock = this.state.inventory.get(box.productId) || 0;
            this.state.inventory.set(box.productId, currentStock + box.amount);
            this.state.deliveryBoxes.delete(data.boxId);
            this.broadcast("systemMessage", `${this.state.players.get(client.sessionId)?.name || "Jemand"} hat eine Kiste ${product.name} ausgepackt.`);
        });
        this.onMessage("assignProductToShelf", (client, data) => {
            const shelf = this.state.placedItems.get(data.shelfId);
            if (!shelf || !shelf.type.startsWith("shelf_"))
                return;
            // Handle clearing product
            if (data.productId === "") {
                if (shelf.productId && shelf.stock > 0) {
                    const currentInv = this.state.inventory.get(shelf.productId) || 0;
                    this.state.inventory.set(shelf.productId, currentInv + shelf.stock);
                }
                shelf.productId = "";
                shelf.stock = 0;
                this.broadcast("systemMessage", `${this.state.players.get(client.sessionId)?.name || "Jemand"} hat ein Regal geleert.`);
                return;
            }
            const product = this.availableProducts.find(p => p.id === data.productId);
            if (!product || product.category !== shelf.type)
                return;
            // If changing to a DIFFERENT product, return old stock first
            if (shelf.productId && shelf.productId !== data.productId && shelf.stock > 0) {
                const currentInv = this.state.inventory.get(shelf.productId) || 0;
                this.state.inventory.set(shelf.productId, currentInv + shelf.stock);
                shelf.stock = 0;
            }
            shelf.productId = data.productId;
            this.broadcast("systemMessage", `${this.state.players.get(client.sessionId)?.name || "Jemand"} hat ${product.name} zugewiesen.`);
        });
        this.onMessage("hireEmployee", (client) => {
            if (this.state.budget < 1500)
                return;
            const id = `emp_${Date.now()}`;
            const emp = new SupermarketState_1.Employee();
            emp.id = id;
            emp.name = ["Lukas", "Sarah", "Kevin", "Mia", "Tom", "Julia"][Math.floor(Math.random() * 6)];
            emp.x = 0;
            emp.z = 9.5;
            emp.targetX = 0;
            emp.targetZ = 5;
            emp.state = "idle";
            this.state.employees.set(id, emp);
            this.state.budget -= 1500;
            this.broadcast("moneyChange", { amount: -1500, type: "expense" });
            this.broadcast("systemMessage", `Angestellter ${emp.name} eingestellt!`);
        });
        this.onMessage("assignTask", (_client, data) => {
            const emp = this.state.employees.get(data.empId);
            if (emp) {
                emp.task = data.task;
                emp.state = "idle";
            }
        });
        this.onMessage("startMarketing", () => {
            if (this.state.budget >= 800) {
                this.state.budget -= 800;
                this.state.marketingTimer += 2400;
                this.broadcast("moneyChange", { amount: -800, type: "expense" });
            }
        });
        this.onMessage("refillItem", (client, data) => {
            const item = this.state.placedItems.get(data.id);
            if (!item || !item.type.startsWith("shelf_") || !item.productId || item.stock >= item.maxStock)
                return;
            const invStock = this.state.inventory.get(item.productId) || 0;
            if (invStock <= 0)
                return;
            const toAdd = Math.min(item.maxStock - item.stock, invStock);
            item.stock += toAdd;
            this.state.inventory.set(item.productId, invStock - toAdd);
            this.state.storeExp += Math.round(toAdd * 10);
        });
        this.onMessage("processPayment", (_client, data) => {
            const npc = this.state.npcs.get(data.npcId);
            if (npc && npc.state === "waiting_to_pay")
                this.processNPCShopPayment(npc);
        });
        this.onMessage("moveItem", (client, data) => {
            if (Math.abs(data.gridX) > 9 || Math.abs(data.gridZ) > 9)
                return;
            const item = this.state.placedItems.get(data.id);
            if (!item)
                return;
            let occupied = false;
            this.state.placedItems.forEach(o => { if (o.id !== data.id && o.gridX === data.gridX && o.gridZ === data.gridZ)
                occupied = true; });
            if (occupied)
                return;
            item.gridX = data.gridX;
            item.gridZ = data.gridZ;
            item.rotation = data.rotation;
            this.updateAllPaths();
        });
        this.onMessage("removeItem", (_client, data) => {
            const item = this.state.placedItems.get(data.id);
            if (!item)
                return;
            let refund = 150;
            if (item.type === "cash_register")
                refund = 600;
            this.state.placedItems.delete(data.id);
            this.state.budget += refund;
            this.broadcast("moneyChange", { amount: refund, type: "income" });
            this.updateAllPaths();
        });
        this.onMessage("chat", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player)
                this.broadcast("chatMessage", { sender: player.name, color: player.color, message, timestamp: Date.now() });
        });
    }
    onJoin(client, options) {
        const player = new SupermarketState_1.Player();
        player.id = client.sessionId;
        player.name = options.name || `Gast_${client.sessionId.substring(0, 4)}`;
        player.color = options.color || "#3b82f6";
        player.x = 0;
        player.z = 8;
        player.targetX = 0;
        player.targetZ = 8;
        this.state.players.set(client.sessionId, player);
        client.send("availableProducts", this.availableProducts);
    }
    onLeave(client) { this.state.players.delete(client.sessionId); }
    onDispose() {
        this.saveState();
        if (this.npcInterval)
            clearInterval(this.npcInterval);
        if (this.saveInterval)
            clearInterval(this.saveInterval);
    }
    updateAllPaths() {
        this.state.players.forEach(p => { if (!p.isFirstPerson)
            this.calculatePathGeneric(p); });
        this.state.npcs.forEach(n => this.calculatePathGeneric(n));
        this.state.employees.forEach(e => this.calculatePathGeneric(e));
    }
    tickEmployees() {
        const step = 0.0875;
        this.state.employees.forEach((emp) => {
            switch (emp.state) {
                case "idle": {
                    if (emp.task === "register") {
                        const registers = [];
                        this.state.placedItems.forEach(item => { if (item.type === "cash_register")
                            registers.push(item); });
                        if (registers.length > 0) {
                            emp.targetX = registers[0].gridX - 0.5;
                            emp.targetZ = registers[0].gridZ;
                            emp.state = "walking";
                            this.calculatePathGeneric(emp);
                        }
                    }
                    else if (emp.task === "stocking") {
                        let targetShelf;
                        this.state.placedItems.forEach(item => { if (item.type.startsWith("shelf_") && item.productId && item.stock < item.maxStock && (this.state.inventory.get(item.productId) || 0) > 0)
                            targetShelf = item; });
                        if (targetShelf) {
                            emp.targetX = targetShelf.gridX;
                            emp.targetZ = targetShelf.gridZ + 0.8;
                            emp.state = "walking";
                            this.calculatePathGeneric(emp);
                        }
                    }
                    break;
                }
                case "walking": {
                    if (this.followPath(emp, step)) {
                        emp.state = "working";
                        emp.workTimer = 40;
                    }
                    break;
                }
                case "working": {
                    emp.workTimer--;
                    if (emp.workTimer <= 0) {
                        if (emp.task === "register") {
                            let found = false;
                            this.state.npcs.forEach(npc => {
                                if (npc.state === "waiting_to_pay" && !found) {
                                    if (Math.sqrt(Math.pow(npc.x - (emp.x + 1.3), 2) + Math.pow(npc.z - emp.z, 2)) < 2.0) {
                                        this.processNPCShopPayment(npc);
                                        found = true;
                                    }
                                }
                            });
                            emp.workTimer = found ? 40 : 20;
                        }
                        else if (emp.task === "stocking") {
                            const shelf = Array.from(this.state.placedItems.values()).find(i => Math.round(i.gridX) === Math.round(emp.targetX) && Math.round(i.gridZ) === Math.round(emp.targetZ - 0.8));
                            if (shelf && shelf.productId && shelf.stock < shelf.maxStock) {
                                const inv = this.state.inventory.get(shelf.productId) || 0;
                                if (inv > 0) {
                                    const add = Math.min(shelf.maxStock - shelf.stock, inv);
                                    shelf.stock += add;
                                    this.state.inventory.set(shelf.productId, inv - add);
                                }
                            }
                            emp.state = "idle";
                        }
                        else
                            emp.state = "idle";
                    }
                    break;
                }
            }
        });
    }
    processNPCShopPayment(npc) {
        let price = 10;
        if (npc.activeIcon === "🍞")
            price = 5;
        else if (npc.activeIcon === "🥣")
            price = 10;
        else if (npc.activeIcon === "🍎")
            price = 3;
        const profit = npc.itemCount * price;
        this.state.budget += profit;
        this.state.storeExp += Math.round(profit * 0.2);
        npc.targetX = 0;
        npc.targetZ = 9.5;
        npc.state = "leaving";
        npc.activeIcon = "👋";
        this.calculatePathGeneric(npc);
        this.broadcast("moneyChange", { amount: profit, type: "income" });
        this.broadcast("chatMessage", { type: "income", message: `${npc.name} hat $${profit} bezahlt.`, timestamp: Date.now() });
    }
    tickNPCs() {
        const npcNames = ["Oma Erna", "Herr Schmidt", "Frau Müller", "Gamer Tim", "Lisa", "Klaus-Dieter", "Marie", "Bastian", "Dr. Krause", "Melanie", "Opa Heinz", "Sabine", "Felix", "Anna", "Uwe"];
        const npcColors = ["#f43f5e", "#db2777", "#ec4899", "#d946ef", "#8b5cf6", "#06b6d4", "#0ea5e9", "#f59e0b", "#f97316"];
        const maxNPCs = Math.min(8, 2 + this.state.storeLevel);
        const spawnProb = this.state.marketingTimer > 0 ? 0.12 : 0.06;
        if (this.state.npcs.size < maxNPCs && Math.random() < spawnProb) {
            const id = `npc_${Date.now()}`;
            const npc = new SupermarketState_1.NPC();
            npc.id = id;
            npc.name = npcNames[Math.floor(Math.random() * npcNames.length)];
            npc.color = npcColors[Math.floor(Math.random() * npcColors.length)];
            npc.x = 0;
            npc.z = 9.5;
            npc.targetX = 0;
            npc.targetZ = 9.5;
            npc.state = "idle";
            npc.activeIcon = "🛒";
            this.state.npcs.set(id, npc);
        }
        const step = 0.0875;
        this.state.npcs.forEach((npc, id) => {
            switch (npc.state) {
                case "idle": {
                    const shelves = [];
                    this.state.placedItems.forEach(i => { if (i.type.startsWith("shelf_"))
                        shelves.push(i); });
                    if (shelves.length > 0) {
                        const t = shelves[Math.floor(Math.random() * shelves.length)];
                        npc.targetX = t.gridX;
                        npc.targetZ = t.gridZ + 0.8;
                        npc.targetShelfId = t.id;
                        npc.state = "walking_to_shelf";
                        npc.activeIcon = "🔍";
                        this.calculatePathGeneric(npc);
                    }
                    else {
                        npc.targetX = Math.random() * 14 - 7;
                        npc.targetZ = Math.random() * 14 - 7;
                        npc.state = "walking_to_shelf";
                        npc.activeIcon = "🤔";
                        this.calculatePathGeneric(npc);
                    }
                    break;
                }
                case "walking_to_shelf": {
                    if (this.followPath(npc, step)) {
                        const s = this.state.placedItems.get(npc.targetShelfId);
                        if (s && s.stock > 0 && s.productId) {
                            s.stock--;
                            npc.itemCount++;
                            npc.state = "browsing_shelf";
                            npc.browseTimer = 30;
                            const p = this.availableProducts.find(x => x.id === s.productId);
                            if (p)
                                npc.activeIcon = p.icon;
                        }
                        else {
                            npc.state = "frustrated";
                            npc.browseTimer = 40;
                            npc.activeIcon = "😡";
                        }
                    }
                    break;
                }
                case "frustrated":
                case "browsing_shelf": {
                    npc.browseTimer--;
                    if (npc.browseTimer <= 0) {
                        const regs = [];
                        this.state.placedItems.forEach(i => { if (i.type === "cash_register")
                            regs.push(i); });
                        if (npc.itemCount > 0 && regs.length > 0) {
                            const r = regs[Math.floor(Math.random() * regs.length)];
                            npc.targetX = r.gridX + 0.8;
                            npc.targetZ = r.gridZ;
                            npc.state = "walking_to_register";
                            npc.activeIcon = "💳";
                        }
                        else {
                            npc.targetX = 0;
                            npc.targetZ = 9.5;
                            npc.state = "leaving";
                            npc.activeIcon = "👋";
                        }
                        this.calculatePathGeneric(npc);
                    }
                    break;
                }
                case "walking_to_register": {
                    if (this.followPath(npc, step)) {
                        npc.state = "waiting_to_pay";
                        npc.activeIcon = "💰";
                    }
                    break;
                }
                case "leaving": {
                    if (this.followPath(npc, step))
                        this.state.npcs.delete(id);
                    break;
                }
            }
            this.state.npcs.forEach((o, oid) => {
                if (id === oid)
                    return;
                const dx = npc.x - o.x;
                const dz = npc.z - o.z;
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d < 0.6 && d > 0.01) {
                    npc.x += (dx / d) * 0.02;
                    npc.z += (dz / d) * 0.02;
                }
            });
        });
    }
    followPath(entity, step) {
        if (entity.pathX.length > 0) {
            const nx = entity.pathX[0];
            const nz = entity.pathZ[0];
            const dx = nx - entity.x;
            const dz = nz - entity.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d > 0.1) {
                entity.x += (dx / d) * step;
                entity.z += (dz / d) * step;
                return false;
            }
            entity.x = nx;
            entity.z = nz;
            entity.pathX.shift();
            entity.pathZ.shift();
            return entity.pathX.length === 0 && Math.sqrt(Math.pow(entity.targetX - entity.x, 2) + Math.pow(entity.targetZ - entity.z, 2)) < 0.2;
        }
        const dx = entity.targetX - entity.x;
        const dz = entity.targetZ - entity.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0.1) {
            entity.x += (dx / d) * step;
            entity.z += (dz / d) * step;
            return false;
        }
        entity.x = entity.targetX;
        entity.z = entity.targetZ;
        return true;
    }
    calculatePathGeneric(entity) {
        const sx = Math.round(entity.x);
        const sz = Math.round(entity.z);
        const ex = Math.round(entity.targetX);
        const ez = Math.round(entity.targetZ);
        if (sx === ex && sz === ez) {
            entity.pathX.clear();
            entity.pathZ.clear();
            return;
        }
        const path = this.findAStarPath(sx, sz, ex, ez);
        entity.pathX.clear();
        entity.pathZ.clear();
        if (path)
            for (let i = 1; i < path.length; i++) {
                entity.pathX.push(path[i].x);
                entity.pathZ.push(path[i].z);
            }
    }
    tickPlayers() {
        const step = 0.12;
        this.state.players.forEach((p) => {
            if (p.isFirstPerson)
                return;
            this.followPath(p, step);
            if (p.pathX.length > 0) {
                const dx = p.pathX[0] - p.x;
                const dz = p.pathZ[0] - p.z;
                if (Math.sqrt(dx * dx + dz * dz) > 0.05)
                    p.rotY = Math.atan2(dx, dz);
            }
            else {
                const dx = p.targetX - p.x;
                const dz = p.targetZ - p.z;
                if (Math.sqrt(dx * dx + dz * dz) > 0.1)
                    p.rotY = Math.atan2(dx, dz);
            }
            this.state.placedItems.forEach((i) => {
                const dx = p.x - i.gridX;
                const dz = p.z - i.gridZ;
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d < 0.9) {
                    const o = 0.9 - d;
                    p.x += (dx / d) * o;
                    p.z += (dz / d) * o;
                }
            });
            p.x = Math.max(-9.8, Math.min(9.8, p.x));
            p.z = Math.max(-9.8, Math.min(9.8, p.z));
        });
    }
    findAStarPath(sx, sz, ex, ez) {
        const open = [];
        const closed = new Set();
        open.push({ x: sx, z: sz, g: 0, h: Math.abs(sx - ex) + Math.abs(sz - ez), p: null });
        while (open.length > 0) {
            open.sort((a, b) => (a.g + a.h) - (b.g + b.h));
            const curr = open.shift();
            const k = `${curr.x},${curr.z}`;
            if (curr.x === ex && curr.z === ez) {
                const res = [];
                let t = curr;
                while (t) {
                    res.push({ x: t.x, z: t.z });
                    t = t.p;
                }
                return res.reverse();
            }
            if (closed.has(k))
                continue;
            closed.add(k);
            for (const n of [{ x: curr.x + 1, z: curr.z }, { x: curr.x - 1, z: curr.z }, { x: curr.x, z: curr.z + 1 }, { x: curr.x, z: curr.z - 1 }]) {
                if (Math.abs(n.x) > 9 || Math.abs(n.z) > 9 || closed.has(`${n.x},${n.z}`))
                    continue;
                let block = false;
                this.state.placedItems.forEach(i => { if (Math.round(i.gridX) === n.x && Math.round(i.gridZ) === n.z)
                    block = true; });
                if (block && !(n.x === ex && n.z === ez))
                    continue;
                const g = curr.g + 1;
                const h = Math.abs(n.x - ex) + Math.abs(n.z - ez);
                const exist = open.find(o => o.x === n.x && o.z === n.z);
                if (exist) {
                    if (g < exist.g) {
                        exist.g = g;
                        exist.p = curr;
                    }
                }
                else
                    open.push({ x: n.x, z: n.z, g, h, p: curr });
            }
        }
        return null;
    }
    saveState() {
        try {
            const d = { budget: this.state.budget, storeName: this.state.storeName, storeLevel: this.state.storeLevel, storeExp: this.state.storeExp, inventory: {}, placedItems: [], employees: [], deliveryBoxes: [] };
            this.state.inventory.forEach((v, k) => { d.inventory[k] = v; });
            this.state.placedItems.forEach((i) => { d.placedItems.push({ id: i.id, type: i.type, productId: i.productId, gridX: i.gridX, gridZ: i.gridZ, rotation: i.rotation, stock: i.stock, maxStock: i.maxStock }); });
            this.state.employees.forEach((e) => { d.employees.push({ id: e.id, name: e.name, color: e.color, salary: e.salary, task: e.task }); });
            this.state.deliveryBoxes.forEach((b) => { d.deliveryBoxes.push({ id: b.id, productId: b.productId, amount: b.amount, x: b.x, z: b.z }); });
            fs_1.default.writeFileSync(this.saveFilePath, JSON.stringify(d, null, 2));
        }
        catch (e) {
            console.error("Save error", e);
        }
    }
    loadState() {
        try {
            if (fs_1.default.existsSync(this.saveFilePath)) {
                const d = JSON.parse(fs_1.default.readFileSync(this.saveFilePath, "utf-8"));
                this.state.budget = d.budget;
                this.state.storeName = d.storeName;
                this.state.storeLevel = d.storeLevel;
                this.state.storeExp = d.storeExp;
                if (d.inventory)
                    Object.keys(d.inventory).forEach(k => this.state.inventory.set(k, d.inventory[k]));
                if (d.placedItems)
                    d.placedItems.forEach((id) => {
                        const i = new SupermarketState_1.PlacedItem();
                        i.id = id.id;
                        i.type = id.type;
                        i.productId = id.productId;
                        i.gridX = id.gridX;
                        i.gridZ = id.gridZ;
                        i.rotation = id.rotation;
                        i.stock = id.stock;
                        i.maxStock = id.maxStock;
                        this.state.placedItems.set(i.id, i);
                    });
                if (d.employees)
                    d.employees.forEach((ed) => {
                        const e = new SupermarketState_1.Employee();
                        e.id = ed.id;
                        e.name = ed.name;
                        e.color = ed.color;
                        e.salary = ed.salary;
                        e.task = ed.task;
                        e.x = 0;
                        e.z = 9.5;
                        e.targetX = 0;
                        e.targetZ = 5;
                        e.state = "idle";
                        this.state.employees.set(e.id, e);
                    });
                if (d.deliveryBoxes)
                    d.deliveryBoxes.forEach((bd) => {
                        const b = new SupermarketState_1.DeliveryBox();
                        b.id = bd.id;
                        b.productId = bd.productId;
                        b.amount = bd.amount;
                        b.x = bd.x;
                        b.z = bd.z;
                        this.state.deliveryBoxes.set(b.id, b);
                    });
            }
        }
        catch (e) {
            console.error("Load error", e);
        }
    }
    payoutSalaries() {
        let t = 0;
        this.state.employees.forEach(e => t += e.salary);
        if (t > 0 && this.state.budget >= t) {
            this.state.budget -= t;
            this.broadcast("moneyChange", { amount: -t, type: "expense" });
            this.broadcast("chatMessage", { type: "system", message: `Gehälter: $${t}.`, timestamp: Date.now() });
        }
    }
}
exports.SupermarketRoom = SupermarketRoom;
