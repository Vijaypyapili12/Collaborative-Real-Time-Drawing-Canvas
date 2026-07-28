const userName = prompt("Enter your name:", "MyName");
const socket = io({
  auth: {
    name: userName || "Anonymous"
  }
}); 

import { drawAction, redrawAll } from "./canvas.js";

export function setupWebSocket(socket, state, ctx, renderUsers, updateRemoteCursor, removeRemoteCursor) {
  socket.on("init", (data) => {
    state.userId = data.userId;
    state.users = data.users;
    state.actions = data.actions || [];
    state.myColor = data.color;
    renderUsers();
    redrawAll(ctx, state.actions);
  });

  socket.on("draw", (action) => {
    state.actions.push(action);
    drawAction(ctx, action);
  });

  socket.on("cursor", ({ userId, x, y }) => updateRemoteCursor(userId, x, y));
  socket.on("user-joined", ({ userId, color, name }) => {
    state.users[userId] = { name, color };
    renderUsers();
  });

  socket.on("update-users", (usersMap) => {
    state.users = usersMap;
    renderUsers();
  });

  socket.on("user-left", ({ userId }) => {
    delete state.users[userId];
    renderUsers();
    removeRemoteCursor(userId);
  });

  socket.on("undo", ({ actions }) => {
    state.actions = actions.slice();
    redrawAll(ctx, state.actions);
  });

  socket.on("redo", ({ actions }) => {
    state.actions = actions.slice();
    redrawAll(ctx, state.actions);
  });

  socket.on("clear", () => {
    state.actions = [];
    redrawAll(ctx, state.actions);
  });
}