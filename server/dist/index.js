"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const colyseus_1 = require("colyseus");
const ws_transport_1 = require("@colyseus/ws-transport");
const SupermarketRoom_1 = require("./rooms/SupermarketRoom");
const port = Number(process.env.PORT || 2567);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static files from the client/dist directory
const clientDistPath = path_1.default.join(__dirname, "../../client/dist");
app.use(express_1.default.static(clientDistPath));
// Status API for health checks
app.get("/status", (req, res) => {
    res.json({
        status: "running",
        name: "2D/3D Supermarket Multiplayer Game Server",
        port: port
    });
});
const server = http_1.default.createServer(app);
// SETUP COLYSEUS WITH EXPLICIT PATH
const gameServer = new colyseus_1.Server({
    transport: new ws_transport_1.WebSocketTransport({
        server: server,
        pingInterval: 5000,
        pingMaxRetries: 3,
    })
});
// Matchmaking logic
gameServer.define("supermarket", SupermarketRoom_1.SupermarketRoom);
// Fallback to index.html for SPA (must be after other routes)
app.get("*", (req, res) => {
    res.sendFile(path_1.default.join(clientDistPath, "index.html"));
});
server.listen(port, () => {
    console.log(`[Supermarket Server] Listening on http://localhost:${port}`);
});
