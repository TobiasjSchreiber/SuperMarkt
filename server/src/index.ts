import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { SupermarketRoom } from "./rooms/SupermarketRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the client/dist directory
const clientDistPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));

// Status API for health checks
app.get("/status", (req, res) => {
  res.json({
    status: "running",
    name: "2D/3D Supermarket Multiplayer Game Server",
    port: port
  });
});

const server = http.createServer(app);

// SETUP COLYSEUS WITH EXPLICIT PATH
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: server,
    pingInterval: 5000,
    pingMaxRetries: 3,
  })
});

// Matchmaking logic
gameServer.define("supermarket", SupermarketRoom);

// Fallback to index.html for SPA (must be after other routes)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

server.listen(port, () => {
  console.log(`[Supermarket Server] Listening on http://localhost:${port}`);
});
