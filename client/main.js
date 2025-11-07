import { setupWebSocket } from "./websocket.js";
import { drawAction, redrawAll } from "./canvas.js";

const socket = io();

// Elements
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d", { alpha: true });
const widthRange = document.getElementById("widthRange");
const brushBtn = document.getElementById("brushBtn");
const eraserBtn = document.getElementById("eraserBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
const cursorsDiv = document.getElementById("cursors");
const usersDiv = document.getElementById("users");
const colorPalette = document.getElementById("colorPalette");
const themeToggle = document.getElementById("themeToggle");

// Shape buttons
const lineBtn = document.getElementById("lineBtn");
const rectBtn = document.getElementById("rectBtn");
const circleBtn = document.getElementById("circleBtn");
const textBtn = document.getElementById("textBtn");

// Eraser box preview
const eraserPreview = document.createElement("div");
eraserPreview.id = "eraserPreview";
document.body.appendChild(eraserPreview);

// App state
let state = { userId: null, myColor: "#000", eraserMode: false, users: {}, actions: [] };
let drawing = false;
let currentStroke = null;
let activeTool = "brush";
let startX, startY;

// 🌓 THEME TOGGLE LOGIC
function applyTheme() {
  const isLight = document.body.classList.contains("light");
  themeToggle.textContent = isLight ? "☀️" : "🌙";
}
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
}
applyTheme();

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
  applyTheme();
});

// 🧱 Background color depends on theme
function getBackgroundColor() {
  return document.body.classList.contains("light") ? "#1f2937" : "#ffffff";
}

// 🎨 Color palette logic
let selectedColor = "#000000";
if (colorPalette) {
  const colorButtons = colorPalette.querySelectorAll(".color");
  colorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedColor = btn.dataset.color;
      state.myColor = selectedColor;
      colorButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// Temporary canvas for shape previews
const tempCanvas = document.createElement("canvas");
const tempCtx = tempCanvas.getContext("2d");
document.body.appendChild(tempCanvas);
tempCanvas.style.position = "absolute";
tempCanvas.style.left = "0";
tempCanvas.style.top = "0";
tempCanvas.style.pointerEvents = "none";
tempCanvas.style.zIndex = 5;

// Resize
function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = window.innerHeight;
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  redrawAll(ctx, state.actions);
}
window.addEventListener("resize", resize);

// Cursor
function updateCursor() {
  if (state.eraserMode) canvas.style.cursor = "none";
  else if (activeTool === "text") canvas.style.cursor = "text";
  else if (["line", "rect", "circle"].includes(activeTool)) canvas.style.cursor = "crosshair";
  else
    canvas.style.cursor =
      "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"black\" d=\"M2 21l1-4 11-11 4 4-11 11-4 1z\"/></svg>') 0 24, auto";
}

// Pointer down
canvas.addEventListener("pointerdown", (e) => {
  drawing = true;
  const rect = canvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;

  if (activeTool === "brush" || state.eraserMode) {
    currentStroke = {
      userId: state.userId,
      color: state.eraserMode ? getBackgroundColor() : selectedColor,
      width: parseInt(widthRange.value),
      eraser: state.eraserMode,
      points: [{ x: startX, y: startY }],
    };
  }
});

// Pointer move
canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const currX = e.clientX - rect.left;
  const currY = e.clientY - rect.top;
  socket.emit("cursor", { x: currX, y: currY });

  // Eraser box visible
  if (state.eraserMode) {
    const size = parseInt(widthRange.value) * 2;
    eraserPreview.style.display = "block";
    eraserPreview.style.width = `${size}px`;
    eraserPreview.style.height = `${size}px`;
    eraserPreview.style.left = `${e.pageX - size / 2}px`;
    eraserPreview.style.top = `${e.pageY - size / 2}px`;
    eraserPreview.style.background = document.body.classList.contains("light")
      ? "rgba(0,0,0,0.4)"
      : "rgba(255,255,255,0.6)";
  } else {
    eraserPreview.style.display = "none";
  }

  if (!drawing) return;

  if (activeTool === "brush" || state.eraserMode) {
    currentStroke.points.push({ x: currX, y: currY });
    drawAction(ctx, { ...currentStroke, points: currentStroke.points.slice(-2) });
  } else if (["rect", "circle", "line"].includes(activeTool)) {
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.strokeStyle = selectedColor;
    tempCtx.lineWidth = parseInt(widthRange.value);
    if (activeTool === "rect") tempCtx.strokeRect(startX, startY, currX - startX, currY - startY);
    else if (activeTool === "circle") {
      const radius = Math.sqrt((currX - startX) ** 2 + (currY - startY) ** 2);
      tempCtx.beginPath();
      tempCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
      tempCtx.stroke();
    } else if (activeTool === "line") {
      tempCtx.beginPath();
      tempCtx.moveTo(startX, startY);
      tempCtx.lineTo(currX, currY);
      tempCtx.stroke();
    }
  }
});

// Pointer up
canvas.addEventListener("pointerup", (e) => {
  drawing = false;
  const rect = canvas.getBoundingClientRect();
  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;

  if (activeTool === "brush" || state.eraserMode) {
    socket.emit("draw", currentStroke);
  } else if (["rect", "circle", "line"].includes(activeTool)) {
    ctx.drawImage(tempCanvas, 0, 0);
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    const shapeAction = {
      userId: state.userId,
      type: activeTool,
      color: selectedColor,
      width: parseInt(widthRange.value),
      startX,
      startY,
      endX,
      endY,
    };
    socket.emit("draw", shapeAction);
  }
});

// Text tool
canvas.addEventListener("click", (e) => {
  if (activeTool === "text") {
    const x = e.clientX - canvas.getBoundingClientRect().left;
    const y = e.clientY - canvas.getBoundingClientRect().top;
    const text = prompt("Enter text:");
    if (text) {
      ctx.fillStyle = selectedColor;
      ctx.font = `${parseInt(widthRange.value) * 4}px Arial`;
      ctx.fillText(text, x, y);
      socket.emit("draw", { type: "text", text, x, y, color: selectedColor });
    }
  }
});

canvas.addEventListener("pointerleave", () => {
  eraserPreview.style.display = "none";
});

// Tool Buttons
brushBtn.onclick = () => { activeTool = "brush"; state.eraserMode = false; resetButtons(brushBtn); updateCursor(); };
eraserBtn.onclick = () => { activeTool = "eraser"; state.eraserMode = true; resetButtons(eraserBtn); updateCursor(); };
lineBtn.onclick = () => { activeTool = "line"; resetButtons(lineBtn); updateCursor(); };
rectBtn.onclick = () => { activeTool = "rect"; resetButtons(rectBtn); updateCursor(); };
circleBtn.onclick = () => { activeTool = "circle"; resetButtons(circleBtn); updateCursor(); };
textBtn.onclick = () => { activeTool = "text"; resetButtons(textBtn); updateCursor(); };

undoBtn.onclick = () => socket.emit("undo");
redoBtn.onclick = () => socket.emit("redo");
clearBtn.onclick = () => { if (confirm("Clear canvas for all users?")) socket.emit("clear"); };

function resetButtons(activeBtn) {
  document.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  activeBtn.classList.add("active");
}

// Remote cursors
const cursorEls = {};
function updateRemoteCursor(uid, x, y) {
  if (!cursorEls[uid]) {
    const el = document.createElement("div");
    el.className = "cursor";
    el.textContent = "●";
    el.style.background = state.users[uid] || "#888";
    cursorsDiv.appendChild(el);
    cursorEls[uid] = el;
  }
  cursorEls[uid].style.left = `${x}px`;
  cursorEls[uid].style.top = `${y}px`;
}

function removeRemoteCursor(uid) {
  if (cursorEls[uid]) {
    cursorEls[uid].remove();
    delete cursorEls[uid];
  }
}

// Render user list
function renderUsers() {
  usersDiv.innerHTML = "";
  for (const id in state.users) {
    const div = document.createElement("div");
    div.textContent = id === state.userId ? "You" : id.slice(0, 6);
    div.style.color = state.users[id];
    usersDiv.appendChild(div);
  }
}

// WebSocket setup
setupWebSocket(socket, state, ctx, renderUsers, updateRemoteCursor, removeRemoteCursor);

// Initialize
resize();
updateCursor();

// Unique color per user
socket.on("init", (data) => {
  state.userId = data.userId;
  state.users = data.users;
  state.actions = data.actions || [];
  state.myColor = data.color;
  selectedColor = data.color;
  renderUsers();
  redrawAll(ctx, state.actions);
});

// 👋 Welcome Modal Logic (Session-based, fade effect)
const modal = document.getElementById("welcomeModal");
const startBtn = document.getElementById("startBtn");
const welcomeHeading = document.getElementById("welcomeHeading");

if (modal && startBtn) {
  const userName = localStorage.getItem("userName");

  // Show modal once per tab/session
  if (!sessionStorage.getItem("sessionShown")) {
    modal.style.display = "flex";
    sessionStorage.setItem("sessionShown", "true");

    if (userName) {
      welcomeHeading.textContent = `🎨 Welcome, ${userName}!`;
    } else {
      const name = prompt("Hey there! What's your name?");
      if (name) {
        localStorage.setItem("userName", name);
        welcomeHeading.textContent = `🎨 Welcome, ${name}!`;
      }
    }
  }

  // Fade out smoothly when clicking "Start Drawing"
  startBtn.addEventListener("click", () => {
    modal.style.opacity = "1";
    modal.style.transition = "opacity 0.4s ease";
    modal.style.opacity = "0";
    setTimeout(() => {
      modal.style.display = "none";
    }, 400);
  });
}
