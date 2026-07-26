export function drawAction(ctx, action) {
  if (action.points) {
    ctx.beginPath();
    ctx.strokeStyle = action.color;
    ctx.lineWidth = action.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (action.eraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.moveTo(action.points[0].x, action.points[0].y);
    for (let i = 1; i < action.points.length; i++) {
      ctx.lineTo(action.points[i].x, action.points[i].y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  } else if (action.type) {
    ctx.strokeStyle = action.color;
    ctx.lineWidth = action.width;

    if (action.type === "rect") {
      let x = Math.min(action.startX, action.endX);
      let y = Math.min(action.startY, action.endY);
      let w = Math.abs(action.endX - action.startX);
      let h = Math.abs(action.endY - action.startY);

      ctx.strokeRect(x, y, w, h);
    } else if (action.type === "circle") {
      let x = Math.min(action.startX, action.endX);
      let y = Math.min(action.startY, action.endY);
      let w = Math.abs(action.endX - action.startX);
      let h = Math.abs(action.endY - action.startY);
      
      let centerX = x + w / 2;
      let centerY = y + h / 2;
      let radius = Math.max(w, h) / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (action.type === "line") {
      ctx.beginPath();
      ctx.moveTo(action.startX, action.startY);
      ctx.lineTo(action.endX, action.endY);
      ctx.stroke();
    } else if (action.type === "text") {
      ctx.fillStyle = action.color;
      ctx.font = `${action.width * 4}px Arial`;
      ctx.fillText(action.text, action.x, action.y);
    }
  }
}


export function redrawAll(ctx, actions) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  ctx.save();
  ctx.fillStyle = document.body.classList.contains("light") ? "#1f2937" : "#ffffff";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  actions.forEach((action) => {
    drawAction(ctx, action);
  });
}
