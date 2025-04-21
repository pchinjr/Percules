export function drawBongVisual({ bubbles = [], smokeOpacity = 0, presetName = "", presetKey = "", bubbleScale = 1 }) {
    const canvas = document.getElementById('bongCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
  
    ctx.save();
    ctx.translate(width / 2, height - 150); // bottom-center
  
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2;
  
    // Base color
    ctx.fillStyle = "rgba(80, 200, 255, 0.2)";
  
    // Draw different bong shapes per preset
    switch (presetKey) {
      case "milky":
        // Tall straight tube with percs
        ctx.beginPath();
        ctx.rect(-25, -160, 50, 160);
        ctx.stroke();
        ctx.fill();
        for (let y = -140; y < -20; y += 30) {
          ctx.beginPath();
          ctx.moveTo(-25, y);
          ctx.lineTo(25, y);
          ctx.stroke();
        }
        break;
  
      case "deep":
        // Beaker base
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(-60, -40);
        ctx.lineTo(-30, -90);
        ctx.lineTo(-30, -160);
        ctx.lineTo(30, -160);
        ctx.lineTo(30, -90);
        ctx.lineTo(60, -40);
        ctx.lineTo(40, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        break;
  
      case "bubbly":
        // Bubble-style base with short neck
        ctx.beginPath();
        ctx.ellipse(0, -40, 50, 60, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        ctx.beginPath();
        ctx.rect(-15, -140, 30, 100);
        ctx.stroke();
        ctx.fill();
        break;
  
      case "harsh":
      default:
        // Simple straight tube
        ctx.beginPath();
        ctx.rect(-20, -160, 40, 160);
        ctx.stroke();
        ctx.fill();
        break;
    }
  
    // Waterline
    ctx.fillStyle = "rgba(0, 180, 255, 0.3)";
    ctx.fillRect(-25, -20, 50, 10);
  
    // Smoke
    if (smokeOpacity > 0) {
      const grd = ctx.createLinearGradient(0, -160, 0, -20);
      grd.addColorStop(0, `rgba(255,255,255,${smokeOpacity})`);
      grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(-25, -160, 50, 140);
    }
  
    // Bubbles
    if (bubbles.length > 0) {
      ctx.fillStyle = "rgba(200, 255, 255, 0.7)";
      for (const b of bubbles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * bubbleScale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  
    // Preset Label
    ctx.fillStyle = "#0ff";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(presetName, 0, -180);
  
    ctx.restore();
  }
  