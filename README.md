# Real-Time Collaborative Drawing Canvas
A multi-user web drawing application where multiple people can draw simultaneously on a shared HTML5 Canvas with real-time synchronization.  
Implemented with vanilla JavaScript (Canvas API) on the frontend and Node.js + Socket.io (WebSockets) on the backend.

Core features:
- Brush (freehand), Eraser (true eraser using compositing), Color picker, Stroke width adjustment
- Real-time synchronization of strokes and cursor positions via WebSockets
- Global undo/redo (server-side history)
- User management with color-coded cursors and user list
- No frontend frameworks or canvas libraries used

## Quick start (works with `npm install && npm start`)

1. Clone the repo or extract the project folder.
    
2. Install dependencies: npm install

3. Start server: npm start
Server defaults to http://localhost:3000.

4. Open the URL in multiple browsers/tabs to test real-time collaboration.

## How to test (multiple users)

- Open http://localhost:3000 in 2+ browser tabs or devices.

- Draw with the brush, change color and width, toggle eraser, and observe updates in the other clients.

- Move mouse/touch — other clients will see cursor positions in near-real-time.

- Click Undo to undo the last action globally; Redo restores it globally.

- Click Clear to clear canvas for everyone.

## Known limitations / Notes

- Server keeps in-memory action history. This is simple and fine for the assignment demo, but not persistent across restarts.

- Undo/Redo is global and works by server-side action stack. Concurrent complex edits require more advanced CRDT/OT.

- There is no authentication — users are identified by their socket id.

- Bandwidth: strokes send arrays of points. For long strokes or many users, consider batching/throttling or compressing points.

## Time spent

- Approximately: 8–12 hours building, testing, and documenting.