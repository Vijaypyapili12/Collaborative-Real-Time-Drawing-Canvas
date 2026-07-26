# Collaborative Real-Time Drawing Canvas

A multi-user, real-time collaborative drawing application built with vanilla JavaScript, HTML5 Canvas, Node.js, and WebSockets (Socket.io). This project enables multiple participants to draw simultaneously, create geometric shapes, use live erasers, add text, and execute global undo/redo operations in a shared digital room.

---


## Features

- Real-Time Multi-User Synchronization
  - Live broadcast of freehand strokes, shape previews, and remote cursors using WebSockets.
- Rich Drawing Toolset
  - Brush
  - Eraser with custom dynamic cursor preview
  - Line
  - Rectangle
  - Circle
  - Text tool with modern inline input
- Circular Color Wheel & Custom Palette
  - Interactive color picker with live coordinate indicator and real-time color synchronization.
- Global Undo/Redo & Clear
  - Room-wide state management with synchronized history traversal and board clearing.
- Theme Support
  - Dark and Light mode with persistent user preferences.
- Vanilla JavaScript Implementation
  - Built using HTML5 Canvas and Vanilla JavaScript without frontend frameworks.

---

## Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript (ES6 Modules)

### Backend
- Node.js
- Express.js
- Socket.io

---

## Setup & Installation

### Prerequisites
- Node.js

### Installation

```bash
git clone <your-repository-url>
cd collaborative-canvas
npm install
npm start
```

Open your browser:

```text
http://localhost:3001
```

If port **3001** is unavailable, the server will automatically use another available port and display it in the terminal.

---

## Testing with Multiple Users

1. Open `http://localhost:3001`.
2. Enter your display name and join the canvas.
3. Open another browser window or an Incognito window.
4. Open `http://localhost:3001` again.
5. Join using a different username.
6. Arrange both windows side by side.
7. Verify:
   - Real-time drawing synchronization
   - Shape previews
   - Remote cursor movement
   - Global Undo
   - Global Redo
   - Clear Canvas synchronization

---

## Known Limitations

- Under high network latency, rapid freehand strokes may briefly show interpolation gaps before smoothing.
- Resizing the browser while actively dragging a shape may require refreshing the local preview buffer.

---

## Development Time

|             Task                    | Time     |
|-------------------------------------|----------|
| Architecture & Layout Design        | ~4 hours |
| Canvas Operations & Shape Previews  | ~6 hours |
| WebSocket Real-Time Event Streaming | ~5 hours |
| Global Undo/Redo/Clear              | ~4 hours |
| Polishing & Documentation           | ~2 hours |
| **Total Time Invested**          | **~21 hours** |
