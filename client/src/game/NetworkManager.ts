import { Client, Room } from "colyseus.js";

class NetworkManager {
  private client!: Client;
  public room: Room | null = null;
  public sessionId: string = "";

  constructor() {
    this.initialize();
  }

  private initialize() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = window.location.port;
    
    // In dev mode with single tunnel, the host is the ngrok URL (or localhost).
    // The proxy in vite.config.ts handles forwarding to the backend.
    let endpoint = "";
    
    if (host === "localhost" || host === "127.0.0.1") {
      endpoint = `${protocol}//${host}:2567`;
    } else {
      // Use the same host/port we are on (Vite will proxy matchmaking/websockets)
      endpoint = `${protocol}//${host}${port ? ":" + port : ""}`;
    }
    
    console.log("Connecting to Colyseus at:", endpoint);
    this.client = new Client(endpoint);
  }

  async joinOrCreateRoom(roomName: string, options: { name: string; color: string }): Promise<Room> {
    try {
      // Ensure client is initialized (in case constructor fetch was slow)
      if (!this.client) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!this.client) throw new Error("Network client not initialized");
      }

      this.room = await this.client.joinOrCreate(roomName, options);
      this.sessionId = this.room.sessionId;

      // Handle server disconnects (e.g. during server restart in dev mode)
      this.room.onLeave((code) => {
        console.log("Left room with code:", code);
        // Abnormal closure (1006) usually means server crashed or restarted
        if (code === 1006 || code === 4000) {
          console.warn("Server connection lost. Reloading for sync...");
          setTimeout(() => {
            window.location.reload();
          }, 1000); // Small delay to let the server finish restarting
        }
      });

      return this.room;
    } catch (e) {
      console.error("Colyseus connection error:", e);
      throw e;
    }
  }

  leaveRoom() {
    if (this.room) {
      this.room.leave();
      this.room = null;
      this.sessionId = "";
    }
  }

  sendMove(x: number, y: number, z: number, rotY: number, isFirstPerson: boolean) {
    if (this.room) {
      this.room.send("move", { x, y, z, rotY, isFirstPerson });
    }
  }

  sendMoveTo(x: number, z: number) {
    if (this.room) {
      this.room.send("moveTo", { x, z });
    }
  }

  sendPlaceItem(type: string, gridX: number, gridZ: number, rotation: number) {
    if (this.room) {
      this.room.send("placeItem", { type, gridX, gridZ, rotation });
    }
  }

  sendRemoveItem(id: string) {
    if (this.room) {
      this.room.send("removeItem", { id });
    }
  }

  sendMoveItem(id: string, gridX: number, gridZ: number, rotation: number) {
    if (this.room) {
      this.room.send("moveItem", { id, gridX, gridZ, rotation });
    }
  }

  sendRefillItem(id: string) {
    if (this.room) {
      this.room.send("refillItem", { id });
    }
  }

  sendUnpackBox(boxId: string) {
    if (this.room) {
      this.room.send("unpackBox", { boxId });
    }
  }

  sendPickUpBox(boxId: string) {
    if (this.room) {
      this.room.send("pickUpBox", { boxId });
    }
  }

  sendDropBox() {
    if (this.room) {
      this.room.send("dropBox");
    }
  }

  sendBuyProduct(productId: string, amount: number) {
    if (this.room) {
      this.room.send("buyProduct", { productId, amount });
    }
  }

  sendAssignProductToShelf(shelfId: string, productId: string) {
    if (this.room) {
      this.room.send("assignProductToShelf", { shelfId, productId });
    }
  }

  sendProcessPayment(npcId: string) {
    if (this.room) {
      this.room.send("processPayment", { npcId });
    }
  }

  sendHireEmployee() {
    if (this.room) {
      this.room.send("hireEmployee");
    }
  }

  sendAssignTask(empId: string, task: string) {
    if (this.room) {
      this.room.send("assignTask", { empId, task });
    }
  }

  sendStartMarketing() {
    if (this.room) {
      this.room.send("startMarketing");
    }
  }

  sendChat(message: string) {
    if (this.room) {
      this.room.send("chat", message);
    }
  }

  sendShoot() {
    if (this.room) {
      this.room.send("shoot");
    }
  }
}

// Export a singleton instance
export const networkManager = new NetworkManager();
