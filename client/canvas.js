export function drawAction(ctx, action) {
  if (!action) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Brush / Eraser
  if (action.points && action.points.length) {
    ctx.lineWidth = action.width;
    ctx.strokeStyle = action.eraser ? "#ffffff" : action.color;
    ctx.beginPath();
    const pts = action.points;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  // Line
  else if (action.type === "line") {
    ctx.lineWidth = action.width;
    ctx.strokeStyle = action.color;
    ctx.beginPath();
    ctx.moveTo(action.startX, action.startY);
    ctx.lineTo(action.endX, action.endY);
    ctx.stroke();
  }

  // Rectangle
  else if (action.type === "rect") {
    ctx.lineWidth = action.width;
    ctx.strokeStyle = action.color;
    ctx.strokeRect(action.startX, action.startY, action.endX - action.startX, action.endY - action.startY);
  }

  // Circle
  else if (action.type === "circle") {
    ctx.lineWidth = action.width;
    ctx.strokeStyle = action.color;
    const r = Math.sqrt((action.endX - action.startX) ** 2 + (action.endY - action.startY) ** 2);
    ctx.beginPath();
    ctx.arc(action.startX, action.startY, r, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Text
  else if (action.type === "text") {
    ctx.fillStyle = action.color || "#000";
    ctx.font = `${action.width * 4}px Arial`;
    ctx.fillText(action.text, action.x, action.y);
  }

  ctx.restore();
}

export function redrawAll(ctx, actions) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  for (const action of actions) drawAction(ctx, action);
}
