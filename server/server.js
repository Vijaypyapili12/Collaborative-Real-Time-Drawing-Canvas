import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createRoomManager } from "./rooms.js";
import { createDrawingState } from "./drawing-state.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "../client")));

const roomManager = createRoomManager(io);
const defaultRoom = roomManager.createRoom("main");
const drawingState = createDrawingState();

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // 1. Grab the username sent from the client's auth object, fallback safely if missing
  const customUsername = socket.handshake.auth.username || `User_${socket.id.slice(0, 4)}`;

  // 2. Pass the custom username into your room manager user creation
  const user = defaultRoom.addUser(socket.id, customUsername);

  // Explicitly ensure the user object's name matches what was entered
  if (user) {
    user.name = customUsername;
  }

  // Send initial state
  socket.emit("init", {
    actions: drawingState.getActions(),
    userId: socket.id,
    color: user.color,
    users: defaultRoom.getUsersMap(),
  });

  // Notify others
  socket.broadcast.emit("user-joined", { 
    userId: socket.id, 
    color: user.color,
    name: customUsername 
  });

  io.emit("update-users", defaultRoom.getUsersMap());
  // Drawing event
  socket.on("draw", (action) => {
    const serverAction = drawingState.addAction(action);
    io.emit("draw", serverAction);
  });

  // Cursor movement
  socket.on("cursor", (pos) => {
    socket.broadcast.emit("cursor", { userId: socket.id, ...pos });
  });

  // Undo / Redo / Clear
  socket.on("undo", () => {
    const result = drawingState.undo();
    if (result) io.emit("undo", result);
  });

  socket.on("redo", () => {
    const result = drawingState.redo();
    if (result) io.emit("redo", result);
  });

  socket.on("clear", () => {
    drawingState.clear();
    io.emit("clear");
  });

  // Disconnect
  socket.on("disconnect", () => {
    defaultRoom.removeUser(socket.id);
    io.emit("update-users", defaultRoom.getUsersMap());
    socket.broadcast.emit("user-left", { userId: socket.id });
    console.log("❌ User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🌐 Server running at http://localhost:${PORT}`));