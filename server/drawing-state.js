export function createDrawingState() {
  let actions = [];
  let redoStack = [];

  function addAction(action) {
    const newAction = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      time: Date.now(),
      ...action,
    };
    actions.push(newAction);
    redoStack = [];
    return newAction;
  }

  function undo() {
    if (actions.length === 0) return null;
    const removed = actions.pop();
    redoStack.push(removed);
    return { removedId: removed.id, actions };
  }

  function redo() {
    if (redoStack.length === 0) return null;
    const redoAction = redoStack.pop();
    actions.push(redoAction);
    return { action: redoAction, actions };
  }

  function clear() {
    actions = [];
    redoStack = [];
  }

  function getActions() {
    return actions;
  }

  return { addAction, undo, redo, clear, getActions };
}



