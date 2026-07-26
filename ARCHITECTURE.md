# Architecture & Technical Design Specification

This document outlines the core architecture, real-time data flow, event protocols, state management strategies, and performance optimizations implemented in the **Collaborative Real-Time Drawing Canvas**.

---

## 1. Data Flow Diagram

The application follows an event-driven architecture, separating local user interaction from network synchronization and canvas rendering.

```text
[User Action (Pointer Down/Move)]
          │
          ▼
┌────────────────────────────────────────┐
│ Main Script (main.js)                  │
│ • Captures client coordinates          │
│ • Scales via getBoundingClientRect()   │
└────────────────────────────────────────┘
          │
          ├──────────────────────────┐ (Shape / Eraser Preview)
          ▼                          ▼
┌────────────────────┐     ┌──────────────────────────────────┐
│ Main Canvas (2D)   │     │ Temp Preview Canvas              │
│ • Local rendering  │     │ • Live dashed previews           │
│ • Brush strokes    │     │ • Cleared on every pointer move  │
└────────────────────┘     └──────────────────────────────────┘
          │                          │
          └──────────────────────────┼──────────────────┐
                                     ▼                  │
                           ┌────────────────────────┐   │
                           │ Socket.io Client Emit  │   │
                           └────────────────────────┘   │
                                     │                  │
                                     ▼
                         (WebSocket Communication)
                                     │
                                     ▼
                           ┌────────────────────────┐
                           │ Node.js / Express      │
                           │ Socket.io Server       │
                           └────────────────────────┘
                                     │
                           Broadcast to All Clients
                                     │
                                     ▼
                    ┌─────────────────────────────────────┐
                    │ Canvas Rendering Engine             │
                    │ • redrawAll()                       │
                    │ • drawAction()                      │
                    │ • Synchronizes every participant    │
                    └─────────────────────────────────────┘
```

---

## 2. WebSocket Protocol

Communication between the client and server is handled using Socket.io.

### Client → Server Events

#### `cursor`
Broadcasts live pointer coordinates.

**Payload**

```json
{ "x": 100, "y": 250 }
```

#### `draw`
Sends a completed drawing action.

**Payload**
- Stroke or shape coordinates
- Color
- Brush width
- Tool metadata

#### `undo`
Triggers a global undo operation.

**Payload**

None

#### `redo`
Triggers a global redo operation.

**Payload**

None

#### `clear`
Clears the shared canvas.

**Payload**

None

### Server → Client Events

#### `init`

```json
{
  "userId": "string",
  "users": {},
  "actions": [],
  "color": "#000000"
}
```

#### `cursor`

```json
{
  "userId": "string",
  "x": 100,
  "y": 250
}
```

#### `draw`

Broadcasts newly created drawing actions.

#### `undo` / `redo` / `clear`

Broadcast updated history state so every client redraws the same canvas.

---

## 3. Undo / Redo Strategy

The application uses a **centralized server-authoritative history model**.

### Server State

- `actions[]` stores all drawing operations.
- `redoStack[]` stores undone operations.

### Undo Flow

1. Remove the latest action from `actions[]`.
2. Push it into `redoStack[]`.
3. Broadcast updated history.
4. Clients execute `redrawAll()`.

### Redo Flow

1. Pop the latest action from `redoStack[]`.
2. Append it to `actions[]`.
3. Broadcast updated history.
4. Clients redraw the canvas.

---

## 4. Performance Optimizations

### Dual Canvas Rendering

A temporary overlay canvas is used for shape previews while the main canvas stores finalized drawings.

### Incremental Freehand Rendering

Only the latest line segment is rendered during brush movement instead of redrawing the complete history.

### Native Canvas API

Using Vanilla JavaScript and the HTML5 Canvas API eliminates framework overhead and provides smoother rendering.

---

## 5. Conflict Resolution

To maintain consistency across multiple users, the application follows an append-only event model.

### FIFO Processing

Drawing events are processed in the exact order received by the server.

### Immutable Action Log

Each drawing action contains a unique `userId` and is appended to the shared history.

### Deterministic Rendering

Every client redraws the canvas by iterating through the action list from beginning to end, guaranteeing identical rendering across all connected sessions.

---

## Summary

- Event-driven client/server architecture
- Real-time synchronization using Socket.io
- Server-authoritative undo/redo history
- Optimized dual-canvas rendering
- Deterministic conflict resolution
- Consistent collaborative experience across all users
