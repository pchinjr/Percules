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
  depth: document.getElementById("depth"),
  stem: document.getElementById("stem"),
  mouth: document.getElementById("mouth"),
};
const labels = {
  draw: document.getElementById("lblDraw"),
  depth: document.getElementById("lblDepth"),
  stem: document.getElementById("lblStem"),
  mouth: document.getElementById("lblMouth"),
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
  labels.depth.textContent = (+sliders.depth.value).toFixed(1);
  labels.stem.textContent = (+sliders.stem.value).toFixed(1);
  labels.mouth.textContent = (+sliders.mouth.value).toFixed(1);
}
async function pushParams() {
  const body = {
    params: {
      drawDepthPa: +sliders.draw.value,
      submergedDepth: +sliders.depth.value / 100.0,
      stemConductance: +sliders.stem.value * 1e-6,
      mouthConductance: +sliders.mouth.value * 1e-9,
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
  const columnHeight = Math.max(
    0.01,
    snap.columnHeight ||
      (snap.submergedDepth || 0.06) + (snap.headspaceHeight || 0.03),
  );
  const submerged = Math.min(columnHeight, snap.submergedDepth || columnHeight);
  const headspace = Math.max(
    0,
    Math.min(columnHeight, snap.headspaceHeight ?? (columnHeight - submerged)),
  );
  const waterSurfaceY = tankY + (headspace / columnHeight) * tankH;
  const bottomY = tankY + tankH;
  const percDepth = Math.min(submerged, snap.percDepth || submerged * 0.85);
  const xToX = (xm) => tankX + (xm / tankWidthM) * tankW;
  const depthToY = (depth) => {
    const clamped = Math.max(0, Math.min(submerged, depth));
    const ratio = (headspace + clamped) / columnHeight;
    return tankY + ratio * tankH;
  };

  // headspace & water fills
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(tankX, tankY, tankW, Math.max(0, waterSurfaceY - tankY));

  if (bottomY > waterSurfaceY) {
    const waterGrad = ctx.createLinearGradient(0, waterSurfaceY, 0, bottomY);
    waterGrad.addColorStop(0, "rgba(80,150,255,0.35)");
    waterGrad.addColorStop(1, "rgba(30,80,170,0.65)");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(tankX, waterSurfaceY, tankW, bottomY - waterSurfaceY);
  }

  // glass outline
  ctx.strokeStyle = "rgba(190,220,255,0.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(tankX, tankY, tankW, tankH);

  // waterline
  ctx.strokeStyle = "rgba(210,230,255,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tankX, waterSurfaceY);
  ctx.lineTo(tankX + tankW, waterSurfaceY);
  ctx.stroke();

  // downstem + bowl silhouette (approximate)
  const stemX = xToX(0.02);
  const jointX = stemX - 16;
  const bowlX = jointX - 18;
  const bowlY = waterSurfaceY - 36;

  ctx.strokeStyle = "rgba(170,210,255,0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(bowlX, bowlY);
  ctx.lineTo(jointX, bowlY + 20);
  ctx.lineTo(stemX, depthToY(percDepth));
  ctx.stroke();

  ctx.fillStyle = "rgba(200,230,255,0.15)";
  ctx.beginPath();
  ctx.ellipse(bowlX, bowlY, 18, 14, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(200,230,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(bowlX, bowlY, 18, 14, -0.4, 0, Math.PI * 2);
  ctx.stroke();

  // perc head bar/disk at percDepth
  const percY = depthToY(percDepth);
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

  // HUD
  hud.innerHTML = `
    t=${snap.t.toFixed(2)} s<br>
    Ph=${(snap.Ph / 1000).toFixed(2)} kPa, Pperc=${
    (snap.Ptip / 1000).toFixed(2)
  } kPa<br>
    ΔP bowl→perc=${snap.dP_bowl_tip.toFixed(0)} Pa<br>
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
