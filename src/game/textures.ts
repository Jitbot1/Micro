import * as THREE from 'three';
import { PaintJobId, StickerId } from './types';
import { getPaintJob } from './customization';

export interface ProceduralTextures {
  microRear: THREE.CanvasTexture;
  microSide: THREE.CanvasTexture;
  microRouteBoard: THREE.CanvasTexture;
  windshieldSticker: THREE.CanvasTexture;
  flotaRear: THREE.CanvasTexture;
  flotaSide: THREE.CanvasTexture;
  flotaRouteBoard: THREE.CanvasTexture;
  stickerDecal: THREE.CanvasTexture;
  trufiSign: THREE.CanvasTexture;
  taxiDoor: THREE.CanvasTexture;
  finishBanner: THREE.CanvasTexture;
  asphalt: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  dirtRoad: THREE.CanvasTexture;
  dirtBump: THREE.CanvasTexture;
  jeepMud: THREE.CanvasTexture;
  jeepMudBump: THREE.CanvasTexture;
  lavaRoad: THREE.CanvasTexture;
  alienGrid: THREE.CanvasTexture;
  marsRoad: THREE.CanvasTexture;
  stoneRuin: THREE.CanvasTexture;
  cliffRock: THREE.CanvasTexture;
  jungleGround: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  tarpA: THREE.CanvasTexture;
  tarpB: THREE.CanvasTexture;
  tarpC: THREE.CanvasTexture;
  shopSigns: THREE.CanvasTexture[];
  contactShadow: THREE.CanvasTexture;
  applyDecoration: (paintId: PaintJobId, stickerId: StickerId) => void;
  dispose: () => void;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
  isColor = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = maxAnisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function addDustWear(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const dustGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
  dustGrad.addColorStop(0, 'rgba(180, 130, 80, 0)');
  dustGrad.addColorStop(1, 'rgba(154, 102, 58, 0.58)');
  ctx.fillStyle = dustGrad;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);

  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(120, 80, 45, 0.28)' : 'rgba(245, 220, 180, 0.16)';
    ctx.fillRect(
      Math.random() * w,
      h * 0.72 + Math.random() * (h * 0.28),
      2 + Math.random() * 6,
      2 + Math.random() * 4,
    );
  }
}

function drawStickerArt(
  ctx: CanvasRenderingContext2D,
  stickerId: StickerId,
  cx: number,
  cy: number,
  w: number,
  h: number,
): void {
  if (stickerId === 'none') return;

  ctx.save();
  ctx.translate(cx, cy);
  const sx = w / 360;
  const sy = h / 150;
  ctx.scale(sx, sy);

  if (stickerId === 'horn_ok') {
    // Folkloric "HORN OK PLEASE" ornate bus/truck art
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.roundRect(-170, -68, 340, 136, 22);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    // Scalloped inner border dots
    for (let i = -148; i <= 148; i += 24) {
      ctx.fillStyle = i % 48 === 0 ? '#ec4899' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(i, -56, 4.5, 0, Math.PI * 2);
      ctx.arc(i, 56, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center lotus sunburst behind "OK"
    ctx.fillStyle = '#f97316';
    for (let a = 0; a < 10; a++) {
      ctx.save();
      ctx.rotate((a / 10) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -24, 9, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();

    // Twin folkloric warning eyes flanking left & right
    for (const ex of [-118, 118]) {
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(ex, 0, 24, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(ex, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(ex, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Typography: HORN | OK | PLEASE
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 5;
    ctx.font = '900 28px "Segoe UI", system-ui, sans-serif';
    ctx.strokeText('★ HORN ★', 0, -37);
    ctx.fillText('★ HORN ★', 0, -37);

    ctx.fillStyle = '#dc2626';
    ctx.font = '900 28px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('OK', 0, 1);

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.font = '900 26px "Segoe UI", system-ui, sans-serif';
    ctx.strokeText('PLEASE', 0, 39);
    ctx.fillText('PLEASE', 0, 39);
  } else if (stickerId === 'condor') {
    // Golden Andean Condor Wings & Mountain Crest
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-168, -66, 336, 132, 18);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Spread wings
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-142, -36);
    ctx.lineTo(-116, -6);
    ctx.lineTo(-132, 12);
    ctx.lineTo(-55, 18);
    ctx.lineTo(0, 24);
    ctx.lineTo(55, 18);
    ctx.lineTo(132, 12);
    ctx.lineTo(116, -6);
    ctx.lineTo(142, -36);
    ctx.closePath();
    ctx.fill();

    // Condor head crest
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, -18, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 26px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RUTA DEL CÓNDOR', 0, 44);
  } else if (stickerId === 'chola') {
    // Vibrant Aguayo Geometric Textile & Floral Garland
    ctx.fillStyle = '#831843';
    ctx.beginPath();
    ctx.roundRect(-168, -66, 336, 132, 18);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();

    const stripes = ['#ec4899', '#facc15', '#06b6d4', '#10b981', '#f97316'];
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = stripes[i % stripes.length];
      const dx = -132 + i * 33;
      ctx.beginPath();
      ctx.moveTo(dx, -48);
      ctx.lineTo(dx + 14, -28);
      ctx.lineTo(dx, -8);
      ctx.lineTo(dx - 14, -28);
      ctx.closePath();
      ctx.fill();
    }

    // Marigold flowers
    for (const fx of [-126, 126]) {
      ctx.fillStyle = '#facc15';
      for (let p = 0; p < 6; p++) {
        const ang = (p / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(ang) * 11, 20 + Math.sin(ang) * 11, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(fx, 20, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#fffbeb';
    ctx.font = '900 28px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ MI TIERRA ★', 0, 26);
  } else if (stickerId === 'chili') {
    // Blazing Turbo Flames & Chili Badge
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(-168, -66, 336, 132, 18);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    // Twin flame plumes
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(side * 40, 24);
      ctx.quadraticCurveTo(side * 125, 34, side * 150, -34);
      ctx.quadraticCurveTo(side * 105, -6, side * 95, -40);
      ctx.quadraticCurveTo(side * 72, 2, side * 40, -14);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(side * 44, 14);
      ctx.quadraticCurveTo(side * 102, 18, side * 124, -18);
      ctx.quadraticCurveTo(side * 86, -4, side * 44, -6);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 5;
    ctx.font = '900 32px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('PURO FUEGO', 0, 2);
    ctx.fillText('PURO FUEGO', 0, 2);
  } else if (stickerId === 'camba_star') {
    // Bolivian Tricolor & Camba Star Shield
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.roundRect(-168, -66, 336, 132, 18);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-156, -46, 312, 14);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-156, -32, 312, 14);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(-156, -18, 312, 14);

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 30px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ ORGULLO CAMBA ★', 0, 28);
  }

  ctx.restore();
}

function paintMicroRearCanvas(
  canvas: HTMLCanvasElement,
  paintId: PaintJobId,
  stickerId: StickerId,
): void {
  const paint = getPaintJob(paintId);
  const rctx = canvas.getContext('2d')!;
  rctx.clearRect(0, 0, 512, 512);

  const rGrad = rctx.createLinearGradient(0, 0, 0, 512);
  rGrad.addColorStop(0, paint.primaryCss);
  rGrad.addColorStop(0.65, paint.primaryCss);
  rGrad.addColorStop(1, '#111827');
  rctx.fillStyle = rGrad;
  rctx.fillRect(0, 0, 512, 512);

  rctx.fillStyle = paint.bandCss;
  rctx.fillRect(0, 28, 512, 30);
  rctx.fillStyle = paint.stripeCss;
  rctx.fillRect(0, 60, 512, 16);

  rctx.strokeStyle = paint.secondaryCss;
  rctx.lineWidth = 10;
  rctx.strokeRect(18, 18, 476, 476);

  rctx.fillStyle = paint.stripeCss;
  rctx.beginPath();
  rctx.roundRect(86, 94, 340, 88, 18);
  rctx.fill();
  rctx.lineWidth = 5;
  rctx.strokeStyle = paint.bandCss;
  rctx.stroke();

  rctx.fillStyle = paint.textCss;
  rctx.font = '900 52px "Segoe UI", system-ui, sans-serif';
  rctx.textAlign = 'center';
  rctx.textBaseline = 'middle';
  rctx.fillText('LÍNEA 18', 256, 140);

  rctx.fillStyle = paint.secondaryCss;
  rctx.fillRect(54, 198, 404, 56);
  rctx.strokeStyle = paint.primaryCss;
  rctx.lineWidth = 5;
  rctx.strokeRect(54, 198, 404, 56);
  rctx.fillStyle = '#0f172a';
  rctx.font = '900 28px "Segoe UI", system-ui, sans-serif';
  rctx.fillText('LOS POZOS · LA RAMADA', 256, 227);

  if (stickerId !== 'none') {
    drawStickerArt(rctx, stickerId, 256, 344, 384, 144);
  } else {
    rctx.fillStyle = paint.bandCss;
    rctx.fillRect(72, 314, 368, 62);
    rctx.fillStyle = '#7f1d1d';
    rctx.font = '900 32px "Segoe UI", system-ui, sans-serif';
    rctx.fillText('★ SANTA CRUZ MICRO ★', 256, 346);
  }

  rctx.fillStyle = '#111827';
  rctx.fillRect(92, 434, 328, 38);
  rctx.fillStyle = '#f8fafc';
  rctx.font = 'bold 19px "Segoe UI", system-ui, sans-serif';
  rctx.fillText('MANTENGA SU DISTANCIA', 256, 454);

  addDustWear(rctx, 512, 512);
}

function paintMicroSideCanvas(
  canvas: HTMLCanvasElement,
  paintId: PaintJobId,
  stickerId: StickerId,
): void {
  const paint = getPaintJob(paintId);
  const sctx = canvas.getContext('2d')!;
  sctx.clearRect(0, 0, 1024, 256);

  sctx.fillStyle = paint.primaryCss;
  sctx.fillRect(0, 0, 1024, 256);
  sctx.fillStyle = paint.secondaryCss;
  sctx.fillRect(0, 26, 1024, 34);
  sctx.fillStyle = paint.bandCss;
  sctx.fillRect(0, 74, 1024, 52);
  sctx.fillStyle = paint.stripeCss;
  sctx.fillRect(0, 126, 1024, 22);

  sctx.fillStyle = '#0f172a';
  sctx.font = '900 42px "Segoe UI", system-ui, sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('LÍNEA 18  ·  SANTA CRUZ  ·  1º ANILLO', 512, 101);

  for (const cx of [125, 900]) {
    sctx.fillStyle = paint.bandCss;
    sctx.beginPath();
    sctx.arc(cx, 195, 34, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = '#b91c1c';
    sctx.font = '900 34px "Segoe UI", system-ui, sans-serif';
    sctx.fillText('18', cx, 197);
  }

  if (stickerId !== 'none') {
    drawStickerArt(sctx, stickerId, 512, 196, 250, 92);
  }
  addDustWear(sctx, 1024, 256);
}

function paintFlotaRearCanvas(
  canvas: HTMLCanvasElement,
  paintId: PaintJobId,
  stickerId: StickerId,
): void {
  const paint = getPaintJob(paintId);
  const frCtx = canvas.getContext('2d')!;
  frCtx.clearRect(0, 0, 512, 512);

  const frGrad = frCtx.createLinearGradient(0, 0, 0, 512);
  frGrad.addColorStop(0, paint.primaryCss);
  frGrad.addColorStop(0.62, paint.primaryCss);
  frGrad.addColorStop(1, '#0f172a');
  frCtx.fillStyle = frGrad;
  frCtx.fillRect(0, 0, 512, 512);
  frCtx.fillStyle = paint.bandCss;
  frCtx.fillRect(0, 32, 512, 26);
  frCtx.fillStyle = paint.stripeCss;
  frCtx.fillRect(0, 60, 512, 16);
  frCtx.strokeStyle = paint.secondaryCss;
  frCtx.lineWidth = 8;
  frCtx.strokeRect(16, 16, 480, 480);

  frCtx.fillStyle = paint.stripeCss;
  frCtx.beginPath();
  frCtx.roundRect(62, 92, 388, 86, 16);
  frCtx.fill();
  frCtx.strokeStyle = paint.bandCss;
  frCtx.lineWidth = 5;
  frCtx.stroke();

  frCtx.fillStyle = paint.textCss;
  frCtx.font = '900 42px "Segoe UI", system-ui, sans-serif';
  frCtx.textAlign = 'center';
  frCtx.textBaseline = 'middle';
  frCtx.fillText('FLOTA EXÓTICA', 256, 137);

  frCtx.fillStyle = paint.secondaryCss;
  frCtx.fillRect(54, 194, 404, 54);
  frCtx.fillStyle = '#0f172a';
  frCtx.font = '900 24px "Segoe UI", system-ui, sans-serif';
  frCtx.fillText('TRANS BOLIVIA · EXPRESS', 256, 222);

  if (stickerId !== 'none') {
    drawStickerArt(frCtx, stickerId, 256, 336, 384, 144);
  } else {
    frCtx.fillStyle = paint.bandCss;
    frCtx.fillRect(72, 306, 368, 54);
    frCtx.fillStyle = '#7f1d1d';
    frCtx.font = '900 28px "Segoe UI", system-ui, sans-serif';
    frCtx.fillText('★ TRANS BOLIVIA ★', 256, 334);
  }

  for (let x = 24; x < 488; x += 36) {
    frCtx.fillStyle = (x / 36) % 2 === 0 ? paint.bandCss : paint.stripeCss;
    frCtx.fillRect(x, 428, 30, 26);
  }
  addDustWear(frCtx, 512, 512);
}

function paintFlotaSideCanvas(
  canvas: HTMLCanvasElement,
  paintId: PaintJobId,
  stickerId: StickerId,
): void {
  const paint = getPaintJob(paintId);
  const fsCtx = canvas.getContext('2d')!;
  fsCtx.clearRect(0, 0, 1024, 256);

  fsCtx.fillStyle = paint.primaryCss;
  fsCtx.fillRect(0, 0, 1024, 256);
  fsCtx.fillStyle = paint.secondaryCss;
  fsCtx.fillRect(0, 20, 1024, 30);
  fsCtx.fillStyle = paint.bandCss;
  fsCtx.fillRect(0, 62, 1024, 46);
  fsCtx.fillStyle = paint.stripeCss;
  fsCtx.fillRect(0, 108, 1024, 20);
  fsCtx.fillStyle = '#0f172a';
  fsCtx.font = '900 38px "Segoe UI", system-ui, sans-serif';
  fsCtx.textAlign = 'center';
  fsCtx.textBaseline = 'middle';
  fsCtx.fillText('FLOTA EXÓTICA  ·  BOLIVIA TOUR', 512, 86);

  fsCtx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  fsCtx.lineWidth = 4;
  for (let bx = 180; bx < 860; bx += 165) {
    fsCtx.strokeRect(bx, 144, 150, 92);
  }

  if (stickerId !== 'none') {
    drawStickerArt(fsCtx, stickerId, 512, 190, 240, 88);
  }
  addDustWear(fsCtx, 1024, 256);
}

function paintStickerDecalCanvas(canvas: HTMLCanvasElement, stickerId: StickerId): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (stickerId !== 'none') {
    drawStickerArt(ctx, stickerId, canvas.width / 2, canvas.height / 2, canvas.width - 16, canvas.height - 16);
  }
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. Dynamic Bus Rear & Side Canvases
  const rearCanvas = document.createElement('canvas');
  rearCanvas.width = 512;
  rearCanvas.height = 512;
  paintMicroRearCanvas(rearCanvas, 'camba', 'horn_ok');

  const sideCanvas = document.createElement('canvas');
  sideCanvas.width = 1024;
  sideCanvas.height = 256;
  paintMicroSideCanvas(sideCanvas, 'camba', 'horn_ok');

  // 3. Illuminated Route Signboard
  const routeCanvas = document.createElement('canvas');
  routeCanvas.width = 512;
  routeCanvas.height = 128;
  const rtCtx = routeCanvas.getContext('2d')!;
  rtCtx.fillStyle = '#fef3c7';
  rtCtx.fillRect(0, 0, 512, 128);
  rtCtx.fillStyle = '#dc2626';
  rtCtx.fillRect(10, 10, 130, 108);
  rtCtx.fillStyle = '#fde047';
  rtCtx.font = '900 72px "Segoe UI", system-ui, sans-serif';
  rtCtx.textAlign = 'center';
  rtCtx.textBaseline = 'middle';
  rtCtx.fillText('18', 75, 66);

  rtCtx.fillStyle = '#065f46';
  rtCtx.font = '900 36px "Segoe UI", system-ui, sans-serif';
  rtCtx.fillText('LOS POZOS · ANILLO', 325, 48);
  rtCtx.fillStyle = '#b91c1c';
  rtCtx.font = '800 26px "Segoe UI", system-ui, sans-serif';
  rtCtx.fillText('LA RAMADA · CENTRO', 325, 92);

  // 4. Translucent Windshield Sticker
  const wsCanvas = document.createElement('canvas');
  wsCanvas.width = 512;
  wsCanvas.height = 256;
  const wsCtx = wsCanvas.getContext('2d')!;
  wsCtx.clearRect(0, 0, 512, 256);
  wsCtx.fillStyle = 'rgba(6, 78, 59, 0.88)';
  wsCtx.fillRect(0, 0, 512, 46);
  wsCtx.fillStyle = '#fde047';
  wsCtx.font = '900 25px "Segoe UI", system-ui, sans-serif';
  wsCtx.textAlign = 'center';
  wsCtx.textBaseline = 'middle';
  wsCtx.fillText('★  SINDICATO 24 DE SEPTIEMBRE  ★', 256, 24);
  wsCtx.fillStyle = '#fde047';
  wsCtx.strokeStyle = '#dc2626';
  wsCtx.lineWidth = 8;
  wsCtx.font = '900 84px "Segoe UI", system-ui, sans-serif';
  wsCtx.strokeText('18', 442, 196);
  wsCtx.fillText('18', 442, 196);

  // 5. Trufi Roof Sign
  const trufiCanvas = document.createElement('canvas');
  trufiCanvas.width = 256;
  trufiCanvas.height = 96;
  const trCtx = trufiCanvas.getContext('2d')!;
  trCtx.fillStyle = '#fef08a';
  trCtx.fillRect(0, 0, 256, 96);
  trCtx.strokeStyle = '#0f172a';
  trCtx.lineWidth = 8;
  trCtx.strokeRect(4, 4, 248, 88);
  trCtx.fillStyle = '#0f172a';
  trCtx.font = '900 44px "Segoe UI", system-ui, sans-serif';
  trCtx.textAlign = 'center';
  trCtx.textBaseline = 'middle';
  trCtx.fillText('TRUFI', 128, 50);

  // 6. High-Detail 1024x1024 Sun-Baked Two-Way Asphalt + Bump Map
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 1024;
  roadCanvas.height = 1024;
  const roadCtx = roadCanvas.getContext('2d')!;
  roadCtx.fillStyle = '#36383e';
  roadCtx.fillRect(0, 0, 1024, 1024);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 512, 512);

  // Fine asphalt grain & subtle bumps
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const v = 46 + Math.floor(Math.random() * 34);
    roadCtx.fillStyle = `rgb(${v + 4}, ${v + 1}, ${v - 2})`;
    roadCtx.fillRect(x, y, 2, 2);

    if (i < 6000) {
      const bv = 100 + Math.floor(Math.random() * 60);
      bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bCtx.fillRect((x * 0.5) | 0, (y * 0.5) | 0, 2, 2);
    }
  }

  // Worn tire polish tracks in all 4 lanes
  roadCtx.fillStyle = 'rgba(24, 24, 28, 0.22)';
  for (const lx of [128, 384, 640, 896]) {
    roadCtx.fillRect(lx - 48, 0, 26, 1024);
    roadCtx.fillRect(lx + 22, 0, 26, 1024);
  }

  // Repaired tar cracks
  roadCtx.strokeStyle = 'rgba(18, 18, 22, 0.55)';
  roadCtx.lineWidth = 4;
  for (let c = 0; c < 6; c++) {
    roadCtx.beginPath();
    let cx = Math.random() * 1024;
    let cy = Math.random() * 1024;
    roadCtx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += (Math.random() - 0.5) * 90;
      cy += 45 + Math.random() * 50;
      roadCtx.lineTo(cx, cy);
    }
    roadCtx.stroke();
  }

  // Dusty sand drift along outer gutters
  const edgeDustL = roadCtx.createLinearGradient(0, 0, 96, 0);
  edgeDustL.addColorStop(0, 'rgba(198, 154, 102, 0.62)');
  edgeDustL.addColorStop(1, 'rgba(198, 154, 102, 0)');
  roadCtx.fillStyle = edgeDustL;
  roadCtx.fillRect(0, 0, 96, 1024);

  const edgeDustR = roadCtx.createLinearGradient(928, 0, 1024, 0);
  edgeDustR.addColorStop(0, 'rgba(198, 154, 102, 0)');
  edgeDustR.addColorStop(1, 'rgba(198, 154, 102, 0.62)');
  roadCtx.fillStyle = edgeDustR;
  roadCtx.fillRect(928, 0, 96, 1024);

  // Outer yellow curb lines
  roadCtx.fillStyle = '#facc15';
  roadCtx.fillRect(14, 0, 10, 1024);
  roadCtx.fillRect(1000, 0, 10, 1024);

  // Dashed lane dividers for each two-way side (at 256 and 768)
  roadCtx.fillStyle = '#f1f5f9';
  for (let y = 24; y < 1024; y += 128) {
    roadCtx.fillRect(250, y, 12, 64);
    roadCtx.fillRect(762, y, 12, 64);
  }

  // Bold Double-Yellow Center Divider separating opposing directions!
  roadCtx.fillStyle = '#f59e0b';
  roadCtx.fillRect(496, 0, 10, 1024);
  roadCtx.fillRect(518, 0, 10, 1024);

  // 7. Sidewalk Texture
  const swCanvas = document.createElement('canvas');
  swCanvas.width = 256;
  swCanvas.height = 256;
  const swCtx = swCanvas.getContext('2d')!;
  swCtx.fillStyle = '#caa782';
  swCtx.fillRect(0, 0, 256, 256);
  swCtx.strokeStyle = '#9e7d5d';
  swCtx.lineWidth = 3;
  for (let x = 0; x <= 256; x += 64) {
    swCtx.beginPath();
    swCtx.moveTo(x, 0);
    swCtx.lineTo(x, 256);
    swCtx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    swCtx.beginPath();
    swCtx.moveTo(0, y);
    swCtx.lineTo(256, y);
    swCtx.stroke();
  }

  // 8. Market Tarps
  const makeTarp = (c1: string, c2: string): THREE.CanvasTexture => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? c1 : c2;
      ctx.fillRect(i * 32, 0, 32, 128);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.24)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 42);
    ctx.lineTo(256, 54);
    ctx.moveTo(0, 92);
    ctx.lineTo(256, 84);
    ctx.stroke();
    return finalizeTexture(c, maxAnisotropy);
  };

  // 9. Santa Cruz Commercial Shop Signs
  const signConfigs: [string, string, string][] = [
    ['POLLERÍA CAMBA', '#dc2626', '#fef08a'],
    ['FARMACIA 24 HS', '#059669', '#ffffff'],
    ['FERRETERÍA SUR', '#1d4ed8', '#fde047'],
    ['MERCADO POZOS', '#ea580c', '#ffffff'],
  ];
  const shopSigns = signConfigs.map(([label, bg, fg]) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = fg;
    ctx.font = '900 44px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 256, 66);
    return finalizeTexture(c, maxAnisotropy);
  });

  // 10. Radial Contact Shadow
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const shCtx = shCanvas.getContext('2d')!;
  const shGrad = shCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
  shGrad.addColorStop(0, 'rgba(15, 12, 10, 0.68)');
  shGrad.addColorStop(0.55, 'rgba(15, 12, 10, 0.32)');
  shGrad.addColorStop(1, 'rgba(15, 12, 10, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);

  // 11. Flota Exótica Coach Livery (Rear, Side, Route Board) + Standalone Sticker Decal
  const fRearCanvas = document.createElement('canvas');
  fRearCanvas.width = 512;
  fRearCanvas.height = 512;
  paintFlotaRearCanvas(fRearCanvas, 'andino', 'horn_ok');

  const fSideCanvas = document.createElement('canvas');
  fSideCanvas.width = 1024;
  fSideCanvas.height = 256;
  paintFlotaSideCanvas(fSideCanvas, 'andino', 'horn_ok');

  const stickerDecalCanvas = document.createElement('canvas');
  stickerDecalCanvas.width = 512;
  stickerDecalCanvas.height = 220;
  paintStickerDecalCanvas(stickerDecalCanvas, 'horn_ok');

  const fRouteCanvas = document.createElement('canvas');
  fRouteCanvas.width = 512;
  fRouteCanvas.height = 128;
  const frtCtx = fRouteCanvas.getContext('2d')!;
  frtCtx.fillStyle = '#0f172a';
  frtCtx.fillRect(0, 0, 512, 128);
  frtCtx.strokeStyle = '#facc15';
  frtCtx.lineWidth = 6;
  frtCtx.strokeRect(6, 6, 500, 116);
  frtCtx.fillStyle = '#fde047';
  frtCtx.font = '900 40px "Segoe UI", system-ui, sans-serif';
  frtCtx.textAlign = 'center';
  frtCtx.textBaseline = 'middle';
  frtCtx.fillText('FLOTA EXÓTICA', 256, 44);
  frtCtx.fillStyle = '#34d399';
  frtCtx.font = '800 26px "Segoe UI", system-ui, sans-serif';
  frtCtx.fillText('MONTAÑA · SELVA · TIERRA', 256, 90);

  // 12. Rugged Dirt Road + Bump Map (for Flota Mode)
  const dirtCanvas = document.createElement('canvas');
  dirtCanvas.width = 1024;
  dirtCanvas.height = 1024;
  const dCtx = dirtCanvas.getContext('2d')!;
  dCtx.fillStyle = '#9c663b';
  dCtx.fillRect(0, 0, 1024, 1024);

  const dirtBumpCanvas = document.createElement('canvas');
  dirtBumpCanvas.width = 512;
  dirtBumpCanvas.height = 512;
  const dbCtx = dirtBumpCanvas.getContext('2d')!;
  dbCtx.fillStyle = '#808080';
  dbCtx.fillRect(0, 0, 512, 512);

  // Muddy tire ruts in all 4 tracks
  for (const lx of [128, 384, 640, 896]) {
    dCtx.fillStyle = 'rgba(105, 62, 31, 0.42)';
    dCtx.fillRect(lx - 52, 0, 34, 1024);
    dCtx.fillRect(lx + 18, 0, 34, 1024);
    dbCtx.fillStyle = '#5c5c5c';
    dbCtx.fillRect((lx - 52) * 0.5, 0, 17, 512);
    dbCtx.fillRect((lx + 18) * 0.5, 0, 17, 512);
  }

  // Earthy gravel, stones, and dry dusty patches
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const sz = 2 + Math.random() * 4;
    const tone = Math.random();
    dCtx.fillStyle =
      tone < 0.35
        ? 'rgba(120, 74, 38, 0.45)'
        : tone < 0.72
          ? 'rgba(186, 134, 84, 0.35)'
          : 'rgba(82, 54, 34, 0.48)';
    dCtx.fillRect(x, y, sz, sz);

    if (i < 7000) {
      const bv = 80 + Math.floor(Math.random() * 100);
      dbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      dbCtx.fillRect((x * 0.5) | 0, (y * 0.5) | 0, 3, 3);
    }
  }

  // Overgrown jungle moss / grass along dirt road edges
  const dEdgeL = dCtx.createLinearGradient(0, 0, 88, 0);
  dEdgeL.addColorStop(0, 'rgba(63, 98, 18, 0.78)');
  dEdgeL.addColorStop(1, 'rgba(63, 98, 18, 0)');
  dCtx.fillStyle = dEdgeL;
  dCtx.fillRect(0, 0, 88, 1024);

  const dEdgeR = dCtx.createLinearGradient(936, 0, 1024, 0);
  dEdgeR.addColorStop(0, 'rgba(63, 98, 18, 0)');
  dEdgeR.addColorStop(1, 'rgba(63, 98, 18, 0.78)');
  dCtx.fillStyle = dEdgeR;
  dCtx.fillRect(936, 0, 88, 1024);

  // Subtle center gravelly ridge
  dCtx.fillStyle = 'rgba(174, 128, 80, 0.32)';
  dCtx.fillRect(496, 0, 32, 1024);

  // 13. Mountain Cliff Rock Strata Texture
  const rockCanvas = document.createElement('canvas');
  rockCanvas.width = 512;
  rockCanvas.height = 512;
  const rkCtx = rockCanvas.getContext('2d')!;
  rkCtx.fillStyle = '#5c4d3c';
  rkCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 22) {
    rkCtx.fillStyle = y % 44 === 0 ? 'rgba(72, 60, 48, 0.7)' : 'rgba(115, 95, 72, 0.55)';
    rkCtx.fillRect(0, y, 512, 14);
  }
  for (let i = 0; i < 3200; i++) {
    rkCtx.fillStyle = Math.random() < 0.3 ? 'rgba(54, 83, 20, 0.35)' : 'rgba(40, 32, 26, 0.38)';
    rkCtx.fillRect(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 14, 3 + Math.random() * 6);
  }

  // 14. Dense Jungle Floor Texture
  const jgCanvas = document.createElement('canvas');
  jgCanvas.width = 256;
  jgCanvas.height = 256;
  const jgCtx = jgCanvas.getContext('2d')!;
  jgCtx.fillStyle = '#2d4f1e';
  jgCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    jgCtx.fillStyle = Math.random() < 0.5 ? 'rgba(77, 124, 15, 0.45)' : 'rgba(30, 58, 18, 0.55)';
    jgCtx.fillRect(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 6, 4 + Math.random() * 6);
  }

  // 15. Radio Taxi Door Checkered Stripe & Emblem
  const taxiDoorCanvas = document.createElement('canvas');
  taxiDoorCanvas.width = 512;
  taxiDoorCanvas.height = 128;
  const tdCtx = taxiDoorCanvas.getContext('2d')!;
  tdCtx.fillStyle = '#facc15';
  tdCtx.fillRect(0, 0, 512, 128);
  tdCtx.fillStyle = '#18181b';
  for (let i = 0; i < 16; i++) {
    tdCtx.fillRect(i * 32, i % 2 === 0 ? 0 : 18, 32, 18);
  }
  tdCtx.fillStyle = '#0f172a';
  tdCtx.font = '900 44px "Segoe UI", system-ui, sans-serif';
  tdCtx.textAlign = 'center';
  tdCtx.textBaseline = 'middle';
  tdCtx.fillText('RADIO TAXI · EXPRESS', 256, 82);

  // 16. Taxi Destination Finish Arch Banner
  const finishCanvas = document.createElement('canvas');
  finishCanvas.width = 1024;
  finishCanvas.height = 192;
  const fnCtx = finishCanvas.getContext('2d')!;
  fnCtx.fillStyle = '#047857';
  fnCtx.fillRect(0, 0, 1024, 192);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 32; col++) {
      fnCtx.fillStyle = (row + col) % 2 === 0 ? '#f8fafc' : '#111827';
      fnCtx.fillRect(col * 32, row * 22, 32, 22);
      fnCtx.fillRect(col * 32, 148 + row * 22, 32, 22);
    }
  }
  fnCtx.fillStyle = '#fde047';
  fnCtx.font = '900 66px "Segoe UI", system-ui, sans-serif';
  fnCtx.textAlign = 'center';
  fnCtx.textBaseline = 'middle';
  fnCtx.fillText('★ DESTINO · META ★', 512, 98);

  // 17. Deep Jungle Mud Trail + Bump Map (wet ruts, dark soil, mossy roots)
  const jMudCanvas = document.createElement('canvas');
  jMudCanvas.width = 1024;
  jMudCanvas.height = 1024;
  const jmCtx = jMudCanvas.getContext('2d')!;
  jmCtx.fillStyle = '#5a3c24';
  jmCtx.fillRect(0, 0, 1024, 1024);

  const jMudBumpCanvas = document.createElement('canvas');
  jMudBumpCanvas.width = 512;
  jMudBumpCanvas.height = 512;
  const jmbCtx = jMudBumpCanvas.getContext('2d')!;
  jmbCtx.fillStyle = '#808080';
  jmbCtx.fillRect(0, 0, 512, 512);

  // Deep knobby 4x4 tire ruts
  for (const lx of [160, 380, 644, 864]) {
    jmCtx.fillStyle = 'rgba(46, 28, 15, 0.58)';
    jmCtx.fillRect(lx - 42, 0, 36, 1024);
    jmCtx.fillRect(lx + 12, 0, 36, 1024);
    jmbCtx.fillStyle = '#484848';
    jmbCtx.fillRect((lx - 42) * 0.5, 0, 18, 512);
    jmbCtx.fillRect((lx + 12) * 0.5, 0, 18, 512);
  }

  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const sz = 2 + Math.random() * 5;
    const r = Math.random();
    jmCtx.fillStyle =
      r < 0.35
        ? 'rgba(42, 26, 14, 0.55)'
        : r < 0.72
          ? 'rgba(118, 82, 48, 0.42)'
          : 'rgba(54, 83, 20, 0.32)';
    jmCtx.fillRect(x, y, sz, sz);
    if (i < 6000) {
      const bv = 70 + Math.floor(Math.random() * 115);
      jmbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      jmbCtx.fillRect((x * 0.5) | 0, (y * 0.5) | 0, 3, 3);
    }
  }

  const jmEdgeL = jmCtx.createLinearGradient(0, 0, 120, 0);
  jmEdgeL.addColorStop(0, 'rgba(34, 84, 28, 0.88)');
  jmEdgeL.addColorStop(1, 'rgba(34, 84, 28, 0)');
  jmCtx.fillStyle = jmEdgeL;
  jmCtx.fillRect(0, 0, 120, 1024);

  const jmEdgeR = jmCtx.createLinearGradient(904, 0, 1024, 0);
  jmEdgeR.addColorStop(0, 'rgba(34, 84, 28, 0)');
  jmEdgeR.addColorStop(1, 'rgba(34, 84, 28, 0.88)');
  jmCtx.fillStyle = jmEdgeR;
  jmCtx.fillRect(904, 0, 120, 1024);

  // 18. Ancient Mossy Carved Stone Ruin Texture
  const ruinCanvas = document.createElement('canvas');
  ruinCanvas.width = 512;
  ruinCanvas.height = 512;
  const rnCtx = ruinCanvas.getContext('2d')!;
  rnCtx.fillStyle = '#78716c';
  rnCtx.fillRect(0, 0, 512, 512);
  rnCtx.strokeStyle = '#44403c';
  rnCtx.lineWidth = 6;
  for (let y = 0; y < 512; y += 64) {
    rnCtx.strokeRect(0, y, 512, 64);
    for (let x = (y % 128 === 0 ? 0 : 64); x < 512; x += 128) {
      rnCtx.beginPath();
      rnCtx.moveTo(x, y);
      rnCtx.lineTo(x, y + 64);
      rnCtx.stroke();
    }
  }
  for (let i = 0; i < 1600; i++) {
    rnCtx.fillStyle = Math.random() < 0.45 ? 'rgba(63, 98, 18, 0.48)' : 'rgba(41, 37, 36, 0.32)';
    rnCtx.fillRect(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 14, 4 + Math.random() * 10);
  }

  // 19. Volcanic Basalt & Magma-Cracked Highway
  const lavaCanvas = document.createElement('canvas');
  lavaCanvas.width = 1024;
  lavaCanvas.height = 1024;
  const lvCtx = lavaCanvas.getContext('2d')!;
  lvCtx.fillStyle = '#1c1917';
  lvCtx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 6500; i++) {
    const shade = 20 + Math.floor(Math.random() * 28);
    lvCtx.fillStyle = `rgb(${shade + 6},${shade},${shade})`;
    lvCtx.fillRect(Math.random() * 1024, Math.random() * 1024, 3 + Math.random() * 6, 3 + Math.random() * 6);
  }
  // Molten lava edge glow strips
  const lvEdgeL = lvCtx.createLinearGradient(0, 0, 110, 0);
  lvEdgeL.addColorStop(0, 'rgba(249, 115, 22, 0.92)');
  lvEdgeL.addColorStop(0.5, 'rgba(220, 38, 38, 0.45)');
  lvEdgeL.addColorStop(1, 'rgba(220, 38, 38, 0)');
  lvCtx.fillStyle = lvEdgeL;
  lvCtx.fillRect(0, 0, 110, 1024);
  const lvEdgeR = lvCtx.createLinearGradient(914, 0, 1024, 0);
  lvEdgeR.addColorStop(0, 'rgba(220, 38, 38, 0)');
  lvEdgeR.addColorStop(0.5, 'rgba(220, 38, 38, 0.45)');
  lvEdgeR.addColorStop(1, 'rgba(249, 115, 22, 0.92)');
  lvCtx.fillStyle = lvEdgeR;
  lvCtx.fillRect(914, 0, 110, 1024);
  // Glowing magma fissures across basalt road
  for (let c = 0; c < 18; c++) {
    let cx = 80 + Math.random() * 864;
    let cy = Math.random() * 1024;
    lvCtx.strokeStyle = c % 2 === 0 ? 'rgba(251, 146, 60, 0.85)' : 'rgba(250, 204, 21, 0.72)';
    lvCtx.lineWidth = 3 + Math.random() * 4;
    lvCtx.beginPath();
    lvCtx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += (Math.random() - 0.5) * 90;
      cy += 35 + Math.random() * 55;
      lvCtx.lineTo(cx, cy);
    }
    lvCtx.stroke();
  }
  // Glowing ember center lane dashes
  lvCtx.fillStyle = '#fb923c';
  for (let y = 24; y < 1024; y += 128) {
    lvCtx.fillRect(500, y, 24, 72);
  }

  // 20. Futuristic Neon Alien Cyber Highway
  const alienCanvas = document.createElement('canvas');
  alienCanvas.width = 1024;
  alienCanvas.height = 1024;
  const alCtx = alienCanvas.getContext('2d')!;
  alCtx.fillStyle = '#0b1026';
  alCtx.fillRect(0, 0, 1024, 1024);
  // Subtle circuit panel grid
  alCtx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  alCtx.lineWidth = 2;
  for (let x = 0; x <= 1024; x += 64) {
    alCtx.beginPath();
    alCtx.moveTo(x, 0);
    alCtx.lineTo(x, 1024);
    alCtx.stroke();
  }
  for (let y = 0; y <= 1024; y += 64) {
    alCtx.beginPath();
    alCtx.moveTo(0, y);
    alCtx.lineTo(1024, y);
    alCtx.stroke();
  }
  // Cyan & Magenta laser guide rails
  alCtx.fillStyle = '#22d3ee';
  alCtx.fillRect(24, 0, 18, 1024);
  alCtx.fillRect(982, 0, 18, 1024);
  alCtx.fillStyle = 'rgba(232, 121, 249, 0.78)';
  alCtx.fillRect(256, 0, 8, 1024);
  alCtx.fillRect(760, 0, 8, 1024);
  // Center neon chevrons
  alCtx.strokeStyle = '#38bdf8';
  alCtx.lineWidth = 10;
  for (let y = 80; y < 1024; y += 160) {
    alCtx.beginPath();
    alCtx.moveTo(462, y + 36);
    alCtx.lineTo(512, y);
    alCtx.lineTo(562, y + 36);
    alCtx.stroke();
  }

  // 21. Martian Red Iron-Oxide Rover Track
  const marsCanvas = document.createElement('canvas');
  marsCanvas.width = 1024;
  marsCanvas.height = 1024;
  const msCtx = marsCanvas.getContext('2d')!;
  msCtx.fillStyle = '#8b3a22';
  msCtx.fillRect(0, 0, 1024, 1024);
  for (const lx of [165, 385, 639, 859]) {
    msCtx.fillStyle = 'rgba(78, 25, 14, 0.56)';
    msCtx.fillRect(lx - 38, 0, 34, 1024);
    msCtx.fillRect(lx + 10, 0, 34, 1024);
  }
  for (let i = 0; i < 9500; i++) {
    const r = Math.random();
    msCtx.fillStyle =
      r < 0.4
        ? 'rgba(180, 83, 45, 0.45)'
        : r < 0.78
          ? 'rgba(92, 30, 16, 0.45)'
          : 'rgba(245, 158, 11, 0.22)';
    msCtx.fillRect(Math.random() * 1024, Math.random() * 1024, 3 + Math.random() * 5, 3 + Math.random() * 5);
  }
  msCtx.fillStyle = 'rgba(251, 191, 36, 0.55)';
  for (let y = 32; y < 1024; y += 128) {
    msCtx.fillRect(504, y, 16, 62);
  }

  const microRear = finalizeTexture(rearCanvas, maxAnisotropy);
  const microSide = finalizeTexture(sideCanvas, maxAnisotropy);
  const microRouteBoard = finalizeTexture(routeCanvas, maxAnisotropy);
  const windshieldSticker = finalizeTexture(wsCanvas, maxAnisotropy);
  const flotaRear = finalizeTexture(fRearCanvas, maxAnisotropy);
  const flotaSide = finalizeTexture(fSideCanvas, maxAnisotropy);
  const flotaRouteBoard = finalizeTexture(fRouteCanvas, maxAnisotropy);
  const stickerDecal = finalizeTexture(stickerDecalCanvas, maxAnisotropy);
  const trufiSign = finalizeTexture(trufiCanvas, maxAnisotropy);
  const taxiDoor = finalizeTexture(taxiDoorCanvas, maxAnisotropy);
  const finishBanner = finalizeTexture(finishCanvas, maxAnisotropy);
  const asphalt = finalizeTexture(roadCanvas, maxAnisotropy, 1, 2);
  const asphaltBump = finalizeTexture(bumpCanvas, maxAnisotropy, 1, 2, false);
  const dirtRoad = finalizeTexture(dirtCanvas, maxAnisotropy, 1, 2);
  const dirtBump = finalizeTexture(dirtBumpCanvas, maxAnisotropy, 1, 2, false);
  const jeepMud = finalizeTexture(jMudCanvas, maxAnisotropy, 1, 2);
  const jeepMudBump = finalizeTexture(jMudBumpCanvas, maxAnisotropy, 1, 2, false);
  const lavaRoad = finalizeTexture(lavaCanvas, maxAnisotropy, 1, 2);
  const alienGrid = finalizeTexture(alienCanvas, maxAnisotropy, 1, 2);
  const marsRoad = finalizeTexture(marsCanvas, maxAnisotropy, 1, 2);
  const stoneRuin = finalizeTexture(ruinCanvas, maxAnisotropy);
  const cliffRock = finalizeTexture(rockCanvas, maxAnisotropy, 2, 2);
  const jungleGround = finalizeTexture(jgCanvas, maxAnisotropy, 4, 10);
  const sidewalk = finalizeTexture(swCanvas, maxAnisotropy, 2, 12);
  const tarpA = makeTarp('#0284c7', '#38bdf8');
  const tarpB = makeTarp('#ea580c', '#fde047');
  const tarpC = makeTarp('#be123c', '#f8fafc');
  const contactShadow = finalizeTexture(shCanvas, maxAnisotropy);

  return {
    microRear,
    microSide,
    microRouteBoard,
    windshieldSticker,
    flotaRear,
    flotaSide,
    flotaRouteBoard,
    stickerDecal,
    trufiSign,
    taxiDoor,
    finishBanner,
    asphalt,
    asphaltBump,
    dirtRoad,
    dirtBump,
    jeepMud,
    jeepMudBump,
    lavaRoad,
    alienGrid,
    marsRoad,
    stoneRuin,
    cliffRock,
    jungleGround,
    sidewalk,
    tarpA,
    tarpB,
    tarpC,
    shopSigns,
    contactShadow,
    applyDecoration: (paintId: PaintJobId, stickerId: StickerId) => {
      paintMicroRearCanvas(rearCanvas, paintId, stickerId);
      paintMicroSideCanvas(sideCanvas, paintId, stickerId);
      paintFlotaRearCanvas(fRearCanvas, paintId, stickerId);
      paintFlotaSideCanvas(fSideCanvas, paintId, stickerId);
      paintStickerDecalCanvas(stickerDecalCanvas, stickerId);
      microRear.needsUpdate = true;
      microSide.needsUpdate = true;
      flotaRear.needsUpdate = true;
      flotaSide.needsUpdate = true;
      stickerDecal.needsUpdate = true;
    },
    dispose: () => {
      microRear.dispose();
      microSide.dispose();
      microRouteBoard.dispose();
      windshieldSticker.dispose();
      flotaRear.dispose();
      flotaSide.dispose();
      flotaRouteBoard.dispose();
      stickerDecal.dispose();
      trufiSign.dispose();
      taxiDoor.dispose();
      finishBanner.dispose();
      asphalt.dispose();
      asphaltBump.dispose();
      dirtRoad.dispose();
      dirtBump.dispose();
      jeepMud.dispose();
      jeepMudBump.dispose();
      lavaRoad.dispose();
      alienGrid.dispose();
      marsRoad.dispose();
      stoneRuin.dispose();
      cliffRock.dispose();
      jungleGround.dispose();
      sidewalk.dispose();
      tarpA.dispose();
      tarpB.dispose();
      tarpC.dispose();
      shopSigns.forEach((s) => s.dispose());
      contactShadow.dispose();
    },
  };
}
