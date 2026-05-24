import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") targetX: number = 0;
  @type("number") targetZ: number = 0;
  @type(["number"]) pathX = new ArraySchema<number>(); // Sequence of X coordinates for pathfinding
  @type(["number"]) pathZ = new ArraySchema<number>(); // Sequence of Z coordinates for pathfinding
  @type("number") rotY: number = 0;
  @type("string") color: string = "#3b82f6";
  @type("boolean") isFirstPerson: boolean = false;
  @type("string") holdingBoxId: string = ""; // ID of the box the player is carrying
  @type("number") ping: number = 0;
}

export class PlacedItem extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = ""; // 'shelf_groceries', 'shelf_produce', 'shelf_frozen', 'cash_register'
  @type("string") productId: string = ""; // ID of the product currently on this shelf
  @type("number") gridX: number = 0;
  @type("number") gridZ: number = 0;
  @type("number") rotation: number = 0; // 0, 1, 2, 3 (multiples of 90 degrees)
  @type("number") stock: number = 0;
  @type("number") maxStock: number = 0;
}

export class Product extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") category: string = ""; // 'groceries', 'produce', 'frozen'
  @type("number") price: number = 0; // wholesale price per unit
  @type("number") sellPrice: number = 0; // price customer pays
  @type("string") icon: string = "";
  @type("string") color: string = "#ffffff";
}

export class NPC extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") z: number = 8;
  @type("number") targetX: number = 0;
  @type("number") targetZ: number = 8;
  @type(["number"]) pathX = new ArraySchema<number>();
  @type(["number"]) pathZ = new ArraySchema<number>();
  @type("number") rotY: number = 0;
  @type("string") state: string = "idle"; // 'idle', 'walking_to_shelf', 'browsing_shelf', 'walking_to_register', 'paying', 'leaving'
  @type("string") color: string = "#f43f5e";
  @type("string") activeIcon: string = "🛒";
  @type("number") browseTimer: number = 0;
  @type("string") targetShelfId: string = "";
  @type("number") itemCount: number = 0;
  @type("string") message: string = "";
}

export class Employee extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") z: number = 0;
  @type("number") targetX: number = 0;
  @type("number") targetZ: number = 0;
  @type(["number"]) pathX = new ArraySchema<number>();
  @type(["number"]) pathZ = new ArraySchema<number>();
  @type("number") rotY: number = 0;
  @type("string") state: string = "idle"; // 'idle', 'walking', 'working'
  @type("string") task: string = "none"; // 'none', 'register', 'stocking'
  @type("string") color: string = "#10b981";
  @type("number") workTimer: number = 0;
  @type("number") salary: number = 50; // default salary per pay period
}
export class DeliveryBox extends Schema {
  @type("string") id: string = "";
  @type("string") productId: string = "";
  @type("number") amount: number = 0;
  @type("number") x: number = 0;
  @type("number") z: number = 0;
  @type("boolean") isHeld: boolean = false; // Whether someone is carrying this box
}

export class SupermarketState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: PlacedItem }) placedItems = new MapSchema<PlacedItem>();
  @type({ map: NPC }) npcs = new MapSchema<NPC>();
  @type({ map: Employee }) employees = new MapSchema<Employee>();
  @type({ map: "number" }) inventory = new MapSchema<number>(); // global inventory of items
  @type({ map: DeliveryBox }) deliveryBoxes = new MapSchema<DeliveryBox>();

  @type("number") budget: number = 5000; // starting money
  @type("string") storeName: string = "Super-Saver";
  @type("number") storeLevel: number = 1;
  @type("number") storeExp: number = 0;
  @type("number") marketingTimer: number = 0; // remaining ticks for marketing boost
}
