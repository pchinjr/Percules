// public/app.js
import {
  getAudioState,
  initAudio,
  setMasterVolume,
  suspendAudio,
  toggleMute,
  setOutletPans,
  setPlinkTurbulenceMix,
} from "./audio.js";
import { scheduler } from "./audioScheduler.js";
import { schedulePlinkVoice } from "./plinkSynth.js";
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");

const sliders = {
  draw: document.getElementById("draw"),
  water: document.getElementById("water"),
  depth: document.getElementById("depth"),
  stem: document.getElementById("stem"),
  mouth: document.getElementById("mouth"),
  mouthLen: document.getElementById("mouthLen"),
  mouthDia: document.getElementById("mouthDia"),
};
const labels = {
  draw: document.getElementById("lblDraw"),
  water: document.getElementById("lblWater"),
  depth: document.getElementById("lblDepth"),
  stem: document.getElementById("lblStem"),
  mouth: document.getElementById("lblMouth"),
  mouthLen: document.getElementById("lblMouthLen"),
  mouthDia: document.getElementById("lblMouthDia"),
};
const audioControls = {
  start: document.getElementById("audioStart"),
  stop: document.getElementById("audioStop"),
  mute: document.getElementById("audioMute"),
  volume: document.getElementById("audioVolume"),
  volumeLabel: document.getElementById("lblVolume"),
  mix: document.getElementById("audioMix"),
  mixLabel: document.getElementById("lblMix"),
};

const scheduledDebug = [];
scheduler.setHandler((event, audioTime) => {
  schedulePlinkVoice(event, audioTime);
  scheduledDebug.push({ event, audioTime });
  if (scheduledDebug.length > 32) scheduledDebug.shift();
});

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function refreshAudioUi() {
  const state = getAudioState();
  const ctxState = state.ctx?.state ?? "suspended";
  const volumePercent = Math.round(state.masterVolume * 100);
  const mixPercent = Math.round((state.plinkMix ?? 0.75) * 100);

  audioControls.start.disabled = ctxState === "running";
  audioControls.stop.disabled = !state.ctx || ctxState !== "running";
  audioControls.volume.disabled = !state.ctx;
  audioControls.mix.disabled = !state.ctx;
  audioControls.mute.disabled = !state.ctx;
  audioControls.mute.textContent = state.muted ? "Unmute" : "Mute";

  if (!audioControls.volume.matches(":focus")) {
    audioControls.volume.value = String(volumePercent);
  }
  audioControls.volumeLabel.textContent = `${volumePercent}%`;

  if (!audioControls.mix.matches(":focus")) {
    audioControls.mix.value = String(mixPercent);
  }
  audioControls.mixLabel.textContent = `${mixPercent}%`;
}

audioControls.start.addEventListener("click", async () => {
  await initAudio();
  scheduler.notifyAudioResumed();
  refreshAudioUi();
});

audioControls.stop.addEventListener("click", async () => {
  await suspendAudio();
  refreshAudioUi();
});

audioControls.mute.addEventListener("click", () => {
  toggleMute();
  refreshAudioUi();
});

audioControls.volume.addEventListener("input", (ev) => {
  const value = Number(ev.target.value) / 100;
  setMasterVolume(value);
  refreshAudioUi();
});

audioControls.mix.addEventListener("input", (ev) => {
  const value = Number(ev.target.value) / 100;
  setPlinkTurbulenceMix(value);
  refreshAudioUi();
});
document.getElementById("reset").onclick = async () => {
  await fetch("/controls", {
    method: "POST",
    body: JSON.stringify({ reset: true }),
    headers: { "content-type": "application/json" },
  });
};

function syncLabels() {
  labels.draw.textContent = (+sliders.draw.value).toFixed(0);
  labels.water.textContent = (+sliders.water.value).toFixed(1);
  labels.depth.textContent = (+sliders.depth.value).toFixed(1);
  labels.stem.textContent = (+sliders.stem.value).toFixed(1);
  labels.mouth.textContent = (+sliders.mouth.value).toFixed(1);
  labels.mouthLen.textContent = (+sliders.mouthLen.value).toFixed(0);
  labels.mouthDia.textContent = (+sliders.mouthDia.value).toFixed(0);
}
async function pushParams() {
  const waterHeight = +sliders.water.value / 100;
  let downstemDepth = +sliders.depth.value / 100;
  const minDownstem = 0.01;
  const maxDownstem = Math.max(minDownstem, waterHeight - 0.005);
  if (downstemDepth > maxDownstem) {
    downstemDepth = maxDownstem;
    const cm = (downstemDepth * 100).toFixed(1);
    sliders.depth.value = cm;
    labels.depth.textContent = cm;
  }
  if (downstemDepth < minDownstem) {
    downstemDepth = minDownstem;
    const cm = (downstemDepth * 100).toFixed(1);
    sliders.depth.value = cm;
    labels.depth.textContent = cm;
  }

  const body = {
    params: {
      drawDepthPa: +sliders.draw.value,
      waterHeight,
      downstemTipDepth: downstemDepth,
      stemConductance: +sliders.stem.value * 1e-6,
      mouthConductance: +sliders.mouth.value * 1e-9,
      mouthTubeLength: +sliders.mouthLen.value / 100,
      mouthInnerDiameter: +sliders.mouthDia.value / 1000,
    },
  };
  await fetch("/controls", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
Object.values(sliders).forEach((sl) =>
  sl.addEventListener("input", () => {
    syncLabels();
    pushParams();
  })
);
syncLabels();
refreshAudioUi();

let lastSnap = null;

// SSE subscription
const es = new EventSource("/events");
es.onmessage = (ev) => {
  try {
    lastSnap = JSON.parse(ev.data);
    if (Array.isArray(lastSnap.outlets)) {
      // Keep audio image aligned with the rendered perc geometry.
      setOutletPans(lastSnap.outlets, lastSnap.tankWidth);
    }
    scheduler.ingestSnapshot(lastSnap);
  } catch {
    // ignore malformed SSE payloads
  }
};

// Render a full snapshot onto the canvas and update the HUD.
function drawSnap(snap) {
  const w = canvas.width, h = canvas.height;

  // background & tank
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0a1430");
  g.addColorStop(1, "#0a1f47");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const pad = 40;
  const tankX = pad;
  const tankY = pad;
  const tankW = w - pad * 2;
  const tankH = h - pad * 2;
  const tankWidthM = snap.tankWidth || 0.12;
  const waterHeightM = Math.max(0.015, snap.waterHeight ?? 0.06);
  const tipDepthRaw = snap.downstemTipDepth ?? waterHeightM * 0.85;
  const downstemDepthM = Math.max(
    0.01,
    Math.min(waterHeightM - 0.005, tipDepthRaw),
  );
  const percDepth = Math.min(
    waterHeightM,
    snap.percDepth ?? downstemDepthM,
  );
  const mouthLengthM = Math.max(0.08, snap.mouthTubeLength ?? 0.22);
  const mouthDiameterM = Math.max(0.018, snap.mouthInnerDiameter ?? 0.034);
  const ambient = snap.Pambient || 101_325;
  const pressureRange = 8000;
  const glassThickness = 8;
  const baseOuterWidth = tankW * 0.72;
  const baseOuterX = tankX + (tankW - baseOuterWidth) / 2;
  const baseOuterRadius = Math.max(18, baseOuterWidth * 0.16);
  const baseInnerRadius = Math.max(12, baseOuterRadius - glassThickness);
  const baseInnerWidth = baseOuterWidth - glassThickness * 2;
  const defaultMouthDiameter = 0.034;
  const mouthScale = mouthDiameterM / defaultMouthDiameter;
  const neckInnerWidth = Math.max(50, baseInnerWidth * 0.32 * mouthScale);
  const neckOuterWidth = neckInnerWidth + glassThickness * 2;
  const neckOuterX = tankX + (tankW - neckOuterWidth) / 2;
  const neckOuterRadius = Math.max(18, neckOuterWidth * 0.4);
  const topMargin = 36;
  const bottomMargin = 40;
  const availableHeight = tankH - topMargin - bottomMargin;
  const totalPhysical = waterHeightM + mouthLengthM;
  const scale = availableHeight / Math.max(0.05, totalPhysical);
  const baseInnerHeight = Math.max(50, waterHeightM * scale);
  const neckInnerHeight = Math.max(80, mouthLengthM * scale);
  const baseOuterHeight = baseInnerHeight + glassThickness * 2;
  const neckOuterHeight = neckInnerHeight + glassThickness * 2;
  let neckOuterTop = tankY + topMargin;
  let neckOuterBottom = neckOuterTop + neckOuterHeight;
  let baseOuterTop = neckOuterBottom - glassThickness * 1.2;
  let baseOuterBottom = baseOuterTop + baseOuterHeight;
  const overflow = (baseOuterBottom + bottomMargin) - (tankY + tankH);
  if (overflow > 0) {
    neckOuterTop -= overflow;
    neckOuterBottom -= overflow;
    baseOuterTop -= overflow;
    baseOuterBottom -= overflow;
  }
  const baseInnerX = baseOuterX + glassThickness;
  const baseInnerTop = baseOuterTop + glassThickness;
  const baseInnerBottom = baseOuterBottom - glassThickness;
  const neckInnerTop = neckOuterTop + glassThickness;

  const waterY = baseInnerBottom - baseInnerHeight;
  const xToX = (xm) =>
    baseInnerX + (xm / tankWidthM) * baseInnerWidth;
  const depthToY = (depth) => {
    if (waterHeightM <= 1e-6) return waterY;
    const clamped = Math.max(0, Math.min(waterHeightM, depth));
    const ratio = clamped / waterHeightM;
    return waterY + ratio * baseInnerHeight;
  };
  const percY = depthToY(percDepth);

  const neckInnerX = neckOuterX + glassThickness;

  const percCenterMeters = Array.isArray(snap.outlets) && snap.outlets.length
    ? snap.outlets.reduce((sum, v) => sum + v, 0) / snap.outlets.length
    : tankWidthM / 2;
  const tipX = xToX(percCenterMeters);
  const bowlX = baseOuterX + baseOuterWidth + 44;
  const bowlY = Math.min(
    baseOuterTop + 36,
    Math.max(neckOuterTop + 30, waterY - 28),
  );

  const headMarkerY = Math.max(
    neckInnerTop + 18,
    Math.min(waterY - 24, neckInnerTop + neckInnerHeight * 0.4),
  );
  const mouthMarkerY = neckOuterTop + 24;

  const stemDX = tipX - bowlX;
  const stemDY = percY - bowlY;
  const stemAngle = Math.atan2(stemDY, stemDX);
  const stemLength = Math.sqrt(stemDX * stemDX + stemDY * stemDY);
  const stemThickness = 18;
  const stemBackset = stemThickness * 0.7;

  const roundedRect = (x, y, width, height, radius) => {
    const r = Math.max(2, Math.min(radius, width / 2, height / 2));
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };
  const baseOuterPath = () => {
    ctx.beginPath();
    roundedRect(
      baseOuterX,
      baseOuterTop,
      baseOuterWidth,
      baseOuterHeight,
      baseOuterRadius,
    );
  };
  const baseInnerPath = () => {
    ctx.beginPath();
    roundedRect(
      baseInnerX,
      baseInnerTop,
      baseInnerWidth,
      baseInnerHeight,
      baseInnerRadius,
    );
  };
  const neckOuterPath = () => {
    ctx.beginPath();
    roundedRect(
      neckOuterX,
      neckOuterTop,
      neckOuterWidth,
      neckOuterHeight,
      neckOuterRadius,
    );
  };
  const neckInnerPath = () => {
    ctx.beginPath();
    roundedRect(
      neckInnerX,
      neckInnerTop,
      neckInnerWidth,
      neckInnerHeight,
      Math.max(12, neckOuterRadius - glassThickness),
    );
  };

  const pressureColor = (pressure) => {
    const value = pressure ?? ambient;
    const diff = Math.max(-pressureRange, Math.min(pressureRange, value - ambient));
    const norm = diff / pressureRange;
    const magnitude = Math.abs(norm);
    if (magnitude < 0.05) {
      return {
        fill: "rgba(255,255,255,0.12)",
        stroke: "rgba(210,230,255,0.6)",
      };
    }
    const strength = 0.25 + 0.45 * magnitude;
    if (norm > 0) {
      return {
        fill: `rgba(255,120,120,${strength})`,
        stroke: "rgba(255,170,170,0.9)",
      };
    }
    return {
      fill: `rgba(110,170,255,${strength})`,
      stroke: "rgba(160,210,255,0.9)",
    };
  };
  const drawPressureMarker = (x, y, pressure) => {
    const colors = pressureColor(pressure);
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  const drawPressureBadge = (x, y, label, pressure) => {
    const colors = pressureColor(pressure);
    const value = pressure ?? ambient;
    const text = `${(value / 1000).toFixed(1)} kPa`;
    ctx.save();
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const labelWidth = ctx.measureText(label).width;
    const valueWidth = ctx.measureText(text).width;
    const boxW = Math.max(labelWidth, valueWidth) + 16;
    const boxH = 34;
    const bx = x - boxW / 2;
    const by = y - boxH / 2;
    ctx.fillStyle = colors.fill;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, boxW, boxH);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(label, x, by + 6);
    ctx.fillText(text, x, by + 18);
    ctx.restore();
  };

  const headspaceColor = pressureColor(snap.Ph);
  const bowlPressure = snap.Pbowl ?? ambient;
  const tipPressure = snap.Ptip ?? ambient;
  const mouthPressure = snap.Pmouth ?? ambient;
  const bowlColor = pressureColor(bowlPressure);
  const tipColor = pressureColor(tipPressure);
  const headColor = headspaceColor;
  const mouthColor = pressureColor(mouthPressure);
  const downstemFlow = snap.Qin ?? 0;
  const headspaceFlow = snap.Qout ?? 0;
  const downstemStrength = clamp01(Math.abs(downstemFlow) / 6e-6);
  const headspaceStrength = clamp01(Math.abs(headspaceFlow) / 6e-6);

  // headspace & water fills
  ctx.save();
  neckInnerPath();
  ctx.clip();
  ctx.fillStyle = headspaceColor.fill;
  ctx.fillRect(
    neckInnerX,
    neckInnerTop,
    neckInnerWidth,
    baseOuterBottom - neckInnerTop,
  );
  ctx.restore();

  ctx.save();
  baseInnerPath();
  ctx.clip();
  if (waterY > baseInnerTop) {
    ctx.fillStyle = headspaceColor.fill;
    ctx.fillRect(baseInnerX, baseInnerTop, baseInnerWidth, waterY - baseInnerTop);
  }
  ctx.restore();

  ctx.save();
  baseInnerPath();
  ctx.clip();
  if (baseInnerBottom > waterY) {
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, baseInnerBottom);
    waterGrad.addColorStop(0, "rgba(80,150,255,0.35)");
    waterGrad.addColorStop(1, "rgba(30,80,170,0.68)");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(
      baseInnerX,
      waterY,
      baseInnerWidth,
      baseInnerBottom - waterY,
    );
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(210,230,255,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(baseInnerX + 2, waterY);
  ctx.lineTo(baseInnerX + baseInnerWidth - 2, waterY);
  ctx.stroke();

  // downstem + bowl silhouette (approximate)
  ctx.save();
  ctx.translate(bowlX, bowlY);
  ctx.rotate(stemAngle);
  ctx.fillStyle = "rgba(200,230,255,0.18)";
  ctx.fillRect(
    -stemBackset,
    -stemThickness / 2,
    stemLength + stemBackset,
    stemThickness,
  );
  ctx.strokeStyle = "rgba(200,230,255,0.7)";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    -stemBackset,
    -stemThickness / 2,
    stemLength + stemBackset,
    stemThickness,
  );
  ctx.restore();

  if (downstemStrength > 0.01 && stemLength > 12) {
    const arrowWidth = 6 + downstemStrength * 18;
    const arrowLen = Math.max(24, stemLength - 22);
    const arrowHead = 20;
    const startGap = 10;
    const arrowAlpha = 0.25 + downstemStrength * 0.55;
    ctx.save();
    ctx.translate(bowlX, bowlY);
    ctx.rotate(stemAngle);
    ctx.globalAlpha = arrowAlpha;
    const gradient = ctx.createLinearGradient(startGap, 0, startGap + arrowLen, 0);
    gradient.addColorStop(0, bowlColor.stroke);
    gradient.addColorStop(1, tipColor.stroke);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(startGap, -arrowWidth / 2);
    ctx.lineTo(startGap + arrowLen - arrowHead, -arrowWidth / 2);
    ctx.lineTo(startGap + arrowLen - arrowHead, -arrowWidth);
    ctx.lineTo(startGap + arrowLen, 0);
    ctx.lineTo(startGap + arrowLen - arrowHead, arrowWidth);
    ctx.lineTo(startGap + arrowLen - arrowHead, arrowWidth / 2);
    ctx.lineTo(startGap, arrowWidth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(bowlX, bowlY);
  ctx.rotate(stemAngle);
  ctx.fillStyle = "rgba(200,230,255,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(200,230,255,0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (headspaceStrength > 0.01) {
    const neckCenterX = neckInnerX + neckInnerWidth / 2;
    const arrowFootY = Math.min(
      baseInnerBottom - 10,
      Math.max(headMarkerY + 26, waterY + 10),
    );
    const arrowHeadY = Math.max(neckInnerTop + 18, mouthMarkerY - 40);
    if (arrowFootY - arrowHeadY > 26) {
      const arrowWidth = 10 + headspaceStrength * 24;
      const arrowAlpha = 0.2 + headspaceStrength * 0.55;
      ctx.save();
      ctx.globalAlpha = arrowAlpha;
      const grad = ctx.createLinearGradient(
        neckCenterX,
        arrowFootY,
        neckCenterX,
        arrowHeadY,
      );
      grad.addColorStop(0, headColor.stroke);
      grad.addColorStop(1, mouthColor.stroke);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(neckCenterX - arrowWidth / 2, arrowFootY);
      ctx.lineTo(neckCenterX + arrowWidth / 2, arrowFootY);
      ctx.lineTo(neckCenterX + arrowWidth / 2, arrowHeadY + 18);
      ctx.lineTo(neckCenterX, arrowHeadY);
      ctx.lineTo(neckCenterX - arrowWidth / 2, arrowHeadY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  if (headspaceStrength > 0.01) {
    const arrowLen = 40 + headspaceStrength * 40;
    const arrowThickness = 6 + headspaceStrength * 10;
    const baseY = mouthMarkerY - 40;
    const baseX = neckOuterX + neckOuterWidth + 18;
    ctx.save();
    ctx.globalAlpha = 0.25 + headspaceStrength * 0.5;
    const grad = ctx.createLinearGradient(baseX, baseY, baseX + arrowLen, baseY);
    grad.addColorStop(0, headColor.stroke);
    grad.addColorStop(1, mouthColor.stroke);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY - arrowThickness / 2);
    ctx.lineTo(baseX + arrowLen - 18, baseY - arrowThickness / 2);
    ctx.lineTo(baseX + arrowLen - 18, baseY - arrowThickness);
    ctx.lineTo(baseX + arrowLen, baseY);
    ctx.lineTo(baseX + arrowLen - 18, baseY + arrowThickness);
    ctx.lineTo(baseX + arrowLen - 18, baseY + arrowThickness / 2);
    ctx.lineTo(baseX, baseY + arrowThickness / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // glass outline
  ctx.strokeStyle = "rgba(190,220,255,0.9)";
  ctx.lineWidth = 3;
  baseOuterPath();
  ctx.stroke();
  neckOuterPath();
  ctx.stroke();

  // pressure markers & badges
  const neckCenterX = neckInnerX + neckInnerWidth / 2;

  drawPressureMarker(bowlX, bowlY, bowlPressure);
  drawPressureMarker(tipX, percY, tipPressure);
  drawPressureMarker(neckCenterX, headMarkerY, snap.Ph);
  drawPressureMarker(neckCenterX, mouthMarkerY, mouthPressure);

  drawPressureBadge(bowlX - 64, bowlY - 10, "bowl", bowlPressure);
  drawPressureBadge(tipX + 70, percY - 6, "tip", tipPressure);
  drawPressureBadge(neckCenterX + neckInnerWidth / 2 + 52, headMarkerY, "head", snap.Ph);
  drawPressureBadge(neckCenterX, mouthMarkerY - 46, "mouth", mouthPressure);

  // perc head bar/disk at percDepth
  ctx.strokeStyle = "rgba(160,200,255,0.7)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(tankX + 30, percY);
  ctx.lineTo(tankX + tankW - 30, percY);
  ctx.stroke();

  // draw four outlet holes
  if (Array.isArray(snap.outlets)) {
    for (const ox of snap.outlets) {
      ctx.fillStyle = "rgba(200,230,255,0.9)";
      ctx.beginPath();
      ctx.arc(xToX(ox), percY, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // bubbles
  ctx.save();
  baseInnerPath();
  ctx.clip();
  for (const b of snap.bubbles) {
    const y = depthToY(b.depth);
    const x = xToX(b.x);
    const rPx = Math.max(2, Math.min(12, 3 + (b.r * 1000) * 1.6));
    ctx.beginPath();
    ctx.arc(x, y, rPx, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(180,220,255,0.75)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.stroke();
  }
  ctx.restore();

  // HUD
  const formatKpa = (p) => (p / 1000).toFixed(2);
  hud.innerHTML = `
    t=${snap.t.toFixed(2)} s<br>
    head=${formatKpa(snap.Ph)} kPa | bowl=${formatKpa(snap.Pbowl)} kPa | tip=${
    formatKpa(snap.Ptip)
  } kPa | mouth=${formatKpa(snap.Pmouth)} kPa<br>
    ΔP bowl→tip=${(snap.Pbowl - snap.Ptip).toFixed(0)} Pa, ΔP head→mouth=${
    (snap.Ph - snap.Pmouth).toFixed(0)
  } Pa<br>
    Q_in=${(snap.Qin * 1e6).toFixed(1)} cm³/s, Q_out=${
    (snap.Qout * 1e6).toFixed(1)
  } cm³/s<br>
    percPocket=${
    (snap.tipReservoir * 1e6).toFixed(3)
  } cm³, bubbles=${snap.bubbles.length}
  `;
}

// Animation driver: paint the most recent snapshot every frame.
function loop() {
  requestAnimationFrame(loop);
  if (lastSnap) drawSnap(lastSnap);
}
loop();
