"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupermarketState = exports.DeliveryBox = exports.Employee = exports.NPC = exports.Product = exports.PlacedItem = exports.Player = void 0;
const schema_1 = require("@colyseus/schema");
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.name = "";
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.targetX = 0;
        this.targetZ = 0;
        this.pathX = new schema_1.ArraySchema(); // Sequence of X coordinates for pathfinding
        this.pathZ = new schema_1.ArraySchema(); // Sequence of Z coordinates for pathfinding
        this.rotY = 0;
        this.color = "#3b82f6";
        this.isFirstPerson = false;
        this.ping = 0;
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "z", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "targetX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "targetZ", void 0);
__decorate([
    (0, schema_1.type)(["number"]),
    __metadata("design:type", Object)
], Player.prototype, "pathX", void 0);
__decorate([
    (0, schema_1.type)(["number"]),
    __metadata("design:type", Object)
], Player.prototype, "pathZ", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "rotY", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "color", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isFirstPerson", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "ping", void 0);
class PlacedItem extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.type = ""; // 'shelf_groceries', 'shelf_produce', 'shelf_frozen', 'cash_register'
        this.productId = ""; // ID of the product currently on this shelf
        this.gridX = 0;
        this.gridZ = 0;
        this.rotation = 0; // 0, 1, 2, 3 (multiples of 90 degrees)
        this.stock = 0;
        this.maxStock = 0;
    }
}
exports.PlacedItem = PlacedItem;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlacedItem.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlacedItem.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlacedItem.prototype, "productId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlacedItem.prototype, "gridX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlacedItem.prototype, "gridZ", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlacedItem.prototype, "rotation", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlacedItem.prototype, "stock", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlacedItem.prototype, "maxStock", void 0);
class Product extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.name = "";
        this.category = ""; // 'groceries', 'produce', 'frozen'
        this.price = 0; // wholesale price per unit
        this.sellPrice = 0; // price customer pays
        this.icon = "";
        this.color = "#ffffff";
    }
}
exports.Product = Product;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Product.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Product.prototype, "category", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Product.prototype, "sellPrice", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Product.prototype, "icon", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Product.prototype, "color", void 0);
class NPC extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.name = "";
        this.x = 0;
        this.z = 8;
        this.targetX = 0;
        this.targetZ = 8;
        this.pathX = new schema_1.ArraySchema();
        this.pathZ = new schema_1.ArraySchema();
        this.state = "idle"; // 'idle', 'walking_to_shelf', 'browsing_shelf', 'walking_to_register', 'paying', 'leaving'
        this.color = "#f43f5e";
        this.activeIcon = "🛒";
        this.browseTimer = 0;
        this.targetShelfId = "";
        this.itemCount = 0;
        this.message = "";
    }
}
exports.NPC = NPC;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], NPC.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], NPC.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], NPC.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], NPC.prototype, "z", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], NPC.prototype, "targetX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], NPC.prototype, "targetZ", void 0);
__decorate([
    (0, schema_1.type)(["number"]),
    __metadata("design:type", Object)
], NPC.prototype, "pathX", void 0);
__decorate([
    (0, schema_1.type)(["number"]),
    __metadata("design:type", Object)
], NPC.prototype, "pathZ", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], NPC.prototype, "state", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], NPC.prototype, "color", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], NPC.prototype, "activeIcon", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], NPC.prototype, "browseTimer", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], NPC.prototype, "targetShelfId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], NPC.prototype, "itemCount", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], NPC.prototype, "message", void 0);
class Employee extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.name = "";
        this.x = 0;
        this.z = 0;
        this.targetX = 0;
        this.targetZ = 0;
        this.pathX = new schema_1.ArraySchema();
        this.pathZ = new schema_1.ArraySchema();
        this.state = "idle"; // 'idle', 'walking', 'working'
        this.task = "none"; // 'none', 'register', 'stocking'
        this.color = "#10b981";
        this.workTimer = 0;
        this.salary = 50; // default salary per pay period
    }
}
exports.Employee = Employee;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Employee.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Employee.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Employee.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Employee.prototype, "z", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Employee.prototype, "targetX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Employee.prototype, "targetZ", void 0);
__decorate([
    (0, schema_1.type)(["number"]),
    __metadata("design:type", Object)
], Employee.prototype, "pathX", void 0);
__decorate([
    (0, schema_1.type)(["number"]),
    __metadata("design:type", Object)
], Employee.prototype, "pathZ", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Employee.prototype, "state", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Employee.prototype, "task", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Employee.prototype, "color", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Employee.prototype, "workTimer", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Employee.prototype, "salary", void 0);
class DeliveryBox extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.productId = "";
        this.amount = 0;
        this.x = 0;
        this.z = 0;
    }
}
exports.DeliveryBox = DeliveryBox;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], DeliveryBox.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], DeliveryBox.prototype, "productId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], DeliveryBox.prototype, "amount", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], DeliveryBox.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], DeliveryBox.prototype, "z", void 0);
class SupermarketState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.players = new schema_1.MapSchema();
        this.placedItems = new schema_1.MapSchema();
        this.npcs = new schema_1.MapSchema();
        this.employees = new schema_1.MapSchema();
        this.inventory = new schema_1.MapSchema(); // global inventory of items
        this.deliveryBoxes = new schema_1.MapSchema();
        this.budget = 5000; // starting money
        this.storeName = "Super-Saver";
        this.storeLevel = 1;
        this.storeExp = 0;
        this.marketingTimer = 0; // remaining ticks for marketing boost
    }
}
exports.SupermarketState = SupermarketState;
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", Object)
], SupermarketState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)({ map: PlacedItem }),
    __metadata("design:type", Object)
], SupermarketState.prototype, "placedItems", void 0);
__decorate([
    (0, schema_1.type)({ map: NPC }),
    __metadata("design:type", Object)
], SupermarketState.prototype, "npcs", void 0);
__decorate([
    (0, schema_1.type)({ map: Employee }),
    __metadata("design:type", Object)
], SupermarketState.prototype, "employees", void 0);
__decorate([
    (0, schema_1.type)({ map: "number" }),
    __metadata("design:type", Object)
], SupermarketState.prototype, "inventory", void 0);
__decorate([
    (0, schema_1.type)({ map: DeliveryBox }),
    __metadata("design:type", Object)
], SupermarketState.prototype, "deliveryBoxes", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], SupermarketState.prototype, "budget", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], SupermarketState.prototype, "storeName", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], SupermarketState.prototype, "storeLevel", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], SupermarketState.prototype, "storeExp", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], SupermarketState.prototype, "marketingTimer", void 0);
