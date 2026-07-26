import { setupWebSocket } from "./websocket.js";
import { drawAction, redrawAll } from "./canvas.js";

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
const themeToggle = document.getElementById("themeToggle");
const exitBtn = document.getElementById("exitBtn");

// Color Wheel Elements
const wheelCanvas = document.getElementById("colorWheelCanvas");
const wheelCtx = wheelCanvas ? wheelCanvas.getContext("2d", { willReadFrequently: true }) : null;
const cursorCanvas = document.getElementById("colorWheelCursorCanvas");
const cursorCtx = cursorCanvas ? cursorCanvas.getContext("2d") : null;

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
let socket = null;
let selectedColor = "#000000";

// 🚪 EXIT BUTTON LOGIC
if (exitBtn) {
  exitBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to leave the room?")) {
      if (socket) socket.disconnect();
      location.reload();
    }
  });
}

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

// 🎨 Circular Color Wheel & Cursor Indicator Logic
function drawColorWheel() {
  if (!wheelCtx || !wheelCanvas) return;
  const radius = wheelCanvas.width / 2;
  const center = radius;

  wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

  for (let angle = 0; angle < 360; angle += 1) {
    const startAngle = (angle - 2) * Math.PI / 180;
    const endAngle = (angle + 2) * Math.PI / 180;

    wheelCtx.beginPath();
    wheelCtx.moveTo(center, center);
    wheelCtx.arc(center, center, radius, startAngle, endAngle);
    wheelCtx.closePath();

    const gradient = wheelCtx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

    wheelCtx.fillStyle = gradient;
    wheelCtx.fill();
  }
}

function drawIndicator(x, y) {
  if (!cursorCtx || !cursorCanvas) return;
  cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
  
  cursorCtx.beginPath();
  cursorCtx.arc(x, y, 5, 0, 2 * Math.PI);
  cursorCtx.lineWidth = 2;
  cursorCtx.strokeStyle = "#ffffff";
  cursorCtx.stroke();
  cursorCtx.beginPath();
  cursorCtx.arc(x, y, 6, 0, 2 * Math.PI);
  cursorCtx.lineWidth = 1;
  cursorCtx.strokeStyle = "#000000";
  cursorCtx.stroke();
}

if (wheelCanvas && cursorCanvas) {
  drawColorWheel();
  drawIndicator(wheelCanvas.width / 2, wheelCanvas.height / 2);

  function pickColorFromWheel(e) {
    const rect = wheelCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const radius = wheelCanvas.width / 2;
    const dx = x - radius;
    const dy = y - radius;
    
    if (dx * dx + dy * dy <= radius * radius) {
      const pixel = wheelCtx.getImageData(x, y, 1, 1).data;
      if (pixel[3] > 0) {
        selectedColor = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
        state.myColor = selectedColor;
        drawIndicator(x, y);
      }
    }
  }

  let isPicking = false;
  wheelCanvas.addEventListener("pointerdown", (e) => {
    isPicking = true;
    pickColorFromWheel(e);
  });

  wheelCanvas.addEventListener("pointermove", (e) => {
    if (isPicking) {
      pickColorFromWheel(e);
    }
  });

  window.addEventListener("pointerup", () => {
    isPicking = false;
  });
}

// Temporary canvas for shape previews - placed directly over board container
const tempCanvas = document.createElement("canvas");
const tempCtx = tempCanvas.getContext("2d");
document.getElementById("main").appendChild(tempCanvas);
tempCanvas.style.position = "absolute";
tempCanvas.style.left = "0";
tempCanvas.style.top = "0";
tempCanvas.style.width = "100%";
tempCanvas.style.height = "100%";
tempCanvas.style.pointerEvents = "none";
tempCanvas.style.zIndex = 5;

// Resize
function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  
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

// Unified Pointer Down
canvas.addEventListener("pointerdown", (e) => {
  drawing = true;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  startX = (e.clientX - rect.left) * scaleX;
  startY = (e.clientY - rect.top) * scaleY;

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

// Pointer Move with precise mapping
canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const currX = (e.clientX - rect.left) * scaleX;
  const currY = (e.clientY - rect.top) * scaleY;

  if (socket) socket.emit("cursor", { x: currX, y: currY });

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
    if (tempCanvas.width !== canvas.width || tempCanvas.height !== canvas.height) {
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
    }

    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.strokeStyle = selectedColor;
    tempCtx.lineWidth = parseInt(widthRange.value);
    tempCtx.setLineDash([4, 4]);

    if (activeTool === "rect") {
      let x = Math.min(startX, currX);
      let y = Math.min(startY, currY);
      let w = Math.abs(currX - startX);
      let h = Math.abs(currY - startY);
      tempCtx.strokeRect(x, y, w, h);
    } else if (activeTool === "circle") {
      let x = Math.min(startX, currX);
      let y = Math.min(startY, currY);
      let w = Math.abs(currX - startX);
      let h = Math.abs(currY - startY);
      
      let centerX = x + w / 2;
      let centerY = y + h / 2;
      let radius = Math.max(w, h) / 2;

      tempCtx.beginPath();
      tempCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      tempCtx.stroke();
    } else if (activeTool === "line") {
      tempCtx.beginPath();
      tempCtx.moveTo(startX, startY);
      tempCtx.lineTo(currX, currY);
      tempCtx.stroke();
    }
    tempCtx.setLineDash([]);
  }
});

// Pointer Up
canvas.addEventListener("pointerup", (e) => {
  if (!drawing) return;
  drawing = false;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const endX = (e.clientX - rect.left) * scaleX;
  const endY = (e.clientY - rect.top) * scaleY;

  if (activeTool === "brush" || state.eraserMode) {
    if (socket) socket.emit("draw", currentStroke);
  } else if (["rect", "circle", "line"].includes(activeTool)) {
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

    drawAction(ctx, shapeAction);
    if (socket) socket.emit("draw", shapeAction);
  }
});

// Modern Inline Text Tool
canvas.addEventListener("click", (e) => {
  if (activeTool === "text") {
    const existingInput = document.getElementById("inlineTextInput");
    if (existingInput) existingInput.remove();

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const input = document.createElement("input");
    input.type = "text";
    input.id = "inlineTextInput";
    input.placeholder = "Type & hit Enter...";
    input.style.position = "absolute";
    input.style.left = `${e.clientX}px`;
    input.style.top = `${e.clientY}px`;
    input.style.zIndex = "1000";
    input.style.padding = "6px 10px";
    input.style.fontSize = `${Math.max(12, parseInt(widthRange.value) * 3)}px`;
    input.style.border = "2px solid #3b82f6";
    input.style.borderRadius = "6px";
    input.style.outline = "none";
    input.style.background = document.body.classList.contains("light") ? "#ffffff" : "#1f2937";
    input.style.color = selectedColor;
    input.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";

    document.body.appendChild(input);
    input.focus();

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const text = input.value.trim();
        if (text) {
          ctx.fillStyle = selectedColor;
          ctx.font = `${parseInt(widthRange.value) * 4}px Arial`;
          ctx.fillText(text, x, y);
          
          const textAction = { type: "text", text, x, y, color: selectedColor, width: parseInt(widthRange.value) };
          state.actions.push(textAction);
          if (socket) socket.emit("draw", textAction);
        }
        input.remove();
      } else if (event.key === "Escape") {
        input.remove();
      }
    });

    input.addEventListener("blur", () => {
      setTimeout(() => input.remove(), 200);
    });
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

undoBtn.onclick = () => { if (socket) socket.emit("undo"); };
redoBtn.onclick = () => { if (socket) socket.emit("redo"); };
clearBtn.onclick = () => { if (confirm("Clear canvas for all users?") && socket) socket.emit("clear"); };

function resetButtons(activeBtn) {
  document.querySelectorAll(".toolBtns button, .shapeBtns button").forEach((b) => b.classList.remove("active"));
  activeBtn.classList.add("active");
}

// Remote cursors
const cursorEls = {};
function updateRemoteCursor(uid, x, y) {
  if (!cursorEls[uid]) {
    const el = document.createElement("div");
    el.className = "cursor";
    el.textContent = "●";
    el.style.background = state.users[uid]?.color || state.users[uid] || "#888";
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
    const userData = state.users[id];
    
    let displayName = "User";
    let displayColor = "#888";

    if (typeof userData === 'object' && userData !== null) {
      displayName = userData.name || `User_${id.slice(0, 4)}`;
      displayColor = userData.color || "#888";
    } else {
      displayName = `User_${id.slice(0, 4)}`;
      displayColor = userData || "#888";
    }

    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "8px";
    div.style.padding = "4px 0";

    const colorDot = document.createElement("span");
    colorDot.style.width = "10px";
    colorDot.style.height = "10px";
    colorDot.style.borderRadius = "50%";
    colorDot.style.backgroundColor = displayColor;
    colorDot.style.display = "inline-block";

    const textSpan = document.createElement("span");
    textSpan.textContent = id === state.userId ? `${displayName} (You)` : displayName;
    textSpan.style.color = document.body.classList.contains("light") ? "#1f2937" : "#e0e0e0";

    div.appendChild(colorDot);
    div.appendChild(textSpan);
    usersDiv.appendChild(div);
  }
}

// 👋 Welcome Modal Logic & App Initialization
const modal = document.getElementById("welcomeModal");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("usernameInput");

if (modal && startBtn) {
  const savedName = localStorage.getItem("userName");
  if (savedName && nameInput) {
    nameInput.value = savedName;
  }

  modal.style.display = "flex";

  startBtn.addEventListener("click", () => {
    const enteredName = nameInput ? nameInput.value.trim() : "";
    const finalUserName = enteredName || "Anonymous";
    
    localStorage.setItem("userName", finalUserName);

    modal.style.opacity = "1";
    modal.style.transition = "opacity 0.4s ease";
    modal.style.opacity = "0";
    setTimeout(() => {
      modal.style.display = "none";
    }, 400);

    socket = io({
      auth: {
        username: finalUserName
      }
    });

    setupWebSocket(socket, state, ctx, renderUsers, updateRemoteCursor, removeRemoteCursor);

    socket.on("init", (data) => {
      state.userId = data.userId;
      state.users = data.users;
      state.actions = data.actions || [];
      state.myColor = data.color;
      selectedColor = data.color;
      renderUsers();
      redrawAll(ctx, state.actions);
    });
  });
}

resize();
updateCursor();