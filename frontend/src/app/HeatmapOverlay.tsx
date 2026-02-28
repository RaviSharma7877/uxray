"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface HeatmapOverlayProps {
  imageUrl: string;
  uploadUrl?: string | null;
  heatmapUrl?: string | null;
  screenshotId: string;
}

/** Professional, no-controls attention heatmap. */
export default function HeatmapOverlayPro({ imageUrl, uploadUrl, heatmapUrl, screenshotId }: HeatmapOverlayProps) {
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const uploadAttemptedRef = useRef<boolean>(Boolean(heatmapUrl));
  const uploadInFlightRef = useRef(false);

  useEffect(() => {
    uploadAttemptedRef.current = Boolean(heatmapUrl);
  }, [heatmapUrl, screenshotId]);

  const maybeUploadHeatmap = useCallback(async () => {
    if (!uploadUrl || uploadAttemptedRef.current || uploadInFlightRef.current) return;
    const base = baseRef.current;
    const overlay = overlayRef.current;
    if (!base || !overlay || base.width === 0 || overlay.width === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = base.width;
    canvas.height = base.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(base, 0, 0);
    ctx.drawImage(overlay, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    if (!dataUrl) return;

    uploadInFlightRef.current = true;
    try {
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          heatmapBase64: dataUrl,
          contentType: "image/png",
          fileName: `${screenshotId}-heatmap.png`,
        }),
      });
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      uploadAttemptedRef.current = true;
      uploadInFlightRef.current = false;
    } catch (uploadErr) {
      console.error("[HeatmapOverlay] Failed to upload heatmap", uploadErr);
      uploadInFlightRef.current = false;
    }
  }, [uploadUrl, screenshotId]);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    setLoaded(false);

    (async () => {
      try {
        const img = await loadImage(imageUrl);
        if (cancelled) return;

        // Draw base image (pixel-perfect sizes)
        const base = baseRef.current!;
        base.width = img.naturalWidth|0;
        base.height = img.naturalHeight|0;
        const bctx = base.getContext('2d', { willReadFrequently: true })!;
        bctx.clearRect(0,0,base.width,base.height);
        bctx.drawImage(img, 0, 0);

        // Work resolution for analysis
        const maxWorkPixels = 1_000_000; // fixed
        const scale = pickScale(img.naturalWidth, img.naturalHeight, maxWorkPixels);
        const dw = Math.max(1, Math.floor(img.naturalWidth * scale));
        const dh = Math.max(1, Math.floor(img.naturalHeight * scale));

        const work = document.createElement('canvas');
        work.width = dw; work.height = dh;
        const wctx = work.getContext('2d', { willReadFrequently: true })!;
        wctx.drawImage(img, 0, 0, dw, dh);
        const src = wctx.getImageData(0, 0, dw, dh);

        // ---------- Feature extraction (fixed, professional blend) ----------
        // Grayscale
        const gray = new Float32Array(dw*dh);
        for (let i=0;i<dw*dh;i++){
          const r=src.data[i*4], g=src.data[i*4+1], b=src.data[i*4+2];
          gray[i] = 0.299*r + 0.587*g + 0.114*b;
        }
        // Edges & texture
        const sobel = sobelMag(gray, dw, dh);
        const texture = localVariance(gray, dw, dh, 5);
        // Color pop: saturation + local color contrast + slight warm hue bias
        const blurRGBA = boxBlurRGBA(src, dw, dh, 5);
        const colorPop = new Float32Array(dw*dh);
        for (let i=0;i<dw*dh;i++){
          const r=src.data[i*4]/255, g=src.data[i*4+1]/255, b=src.data[i*4+2]/255;
          const br=blurRGBA[i*4]/255, bg=blurRGBA[i*4+1]/255, bb=blurRGBA[i*4+2]/255;
          const maxc=Math.max(r,g,b), minc=Math.min(r,g,b);
          const sat = maxc===0?0:(maxc-minc)/maxc;
          const dcol = Math.hypot(r-br, g-bg, b-bb);
          const warmBias = (r>g && r>b) ? 0.10 : 0.0;
          colorPop[i] = 0.55*sat + 0.45*dcol + warmBias;
        }
        // Size/scale bias (multi-scale DoG)
        const dog = multiScaleDoG(gray, dw, dh, [2,4,8,12]);
        // Layout prior: centered + top-left bias
        const prior = layoutPriorMap(dw, dh, { centerSigma: 0.35, topLeftBoost: 0.35 });
        // Optional face/text boosts (best-effort; silently 0 if unsupported)
        const fxBoost = new Float32Array(dw*dh);
        const txBoost = new Float32Array(dw*dh);
        await Promise.all([boostFaces(img, fxBoost, dw, dh), boostText(img, txBoost, dw, dh)]);

        // Normalize maps
        normalizeInplace(sobel); normalizeInplace(texture); normalizeInplace(colorPop);
        normalizeInplace(dog); normalizeInplace(prior); normalizeInplace(fxBoost); normalizeInplace(txBoost);

        // Fixed professional weights (no customization)
        const W = { edges: 0.28, texture: 0.10, colorPop: 0.32, sizeScale: 0.16, layoutPrior: 0.10, faces: 0.03, text: 0.01 };

        // Content-aware coverage mask (keeps low-signal whitespace from washing out the heatmap)
        const contentMask = buildContentMask({
          sobel,
          texture,
          colorPop,
          gray,
          w: dw,
          h: dh,
        });

        // Blend to saliency
        const sal = new Float32Array(dw*dh);
        for (let i=0;i<sal.length;i++){
          sal[i] = W.edges*sobel[i] + W.texture*texture[i] + W.colorPop*colorPop[i]
                 + W.sizeScale*dog[i] + W.layoutPrior*prior[i] + W.faces*fxBoost[i] + W.text*txBoost[i];
        }

        // Blend in coverage mask so quiet-but-meaningful content still gets coverage
        for (let i = 0; i < sal.length; i++) {
          sal[i] = 0.72 * sal[i] + 0.28 * contentMask[i];
        }

        // Shaping for impact: blur + percentile normalization + gamma (fixed)
        const SPREAD = 8;  // stronger area merge
        gaussianBlurInplace(sal, dw, dh, SPREAD);
        normalizeWithClipping(sal, 3, 99.5);
        const GAMMA = 0.85; // <1 widens high-areas slightly
        for (let i=0;i<sal.length;i++) sal[i] = Math.pow(sal[i], GAMMA);

        // Ensure high-confidence content keeps a baseline coverage
        const COVERAGE_FLOOR = 0.18;
        for (let i = 0; i < sal.length; i++) {
          const mask = contentMask[i];
          const floor = COVERAGE_FLOOR * mask;
          sal[i] = floor + (1 - floor) * sal[i];
        }

        // Colorize with warm attention palette (fixed)
        const heat = wctx.createImageData(dw, dh);
        const MIN_ALPHA = 0.26;
        const MAX_ALPHA = 0.94;
        for (let i=0;i<sal.length;i++){
          const [r,g,b] = warmColormap(sal[i]);
          heat.data[i*4] = r; heat.data[i*4+1] = g; heat.data[i*4+2] = b;
          const alphaMask = 0.25 + 0.75 * contentMask[i];
          const alpha = (MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * sal[i]) * alphaMask;
          heat.data[i*4+3] = Math.floor(255 * Math.max(0, Math.min(1, alpha)));
        }

        // Draw overlay at native size
        const overlay = overlayRef.current!;
        overlay.width = base.width; overlay.height = base.height;
        const octx = overlay.getContext('2d')!;
        octx.clearRect(0,0,overlay.width,overlay.height);
        const tmp = document.createElement('canvas');
        tmp.width = dw; tmp.height = dh;
        tmp.getContext('2d')!.putImageData(heat, 0, 0);
        const OPACITY = 1;            // rely on per-pixel alpha
        const BLEND_MODE: GlobalCompositeOperation | any = 'multiply';
        (octx as any).globalCompositeOperation = BLEND_MODE;
        octx.globalAlpha = OPACITY;
        octx.drawImage(tmp, 0, 0, overlay.width, overlay.height);
        octx.globalAlpha = 1;
        (octx as any).globalCompositeOperation = 'source-over';

        drawContourLayers(octx, sal, dw, dh, overlay.width, overlay.height);

        // Hotspot detection (fixed threshold percentile and top-N)
        const THRESH_PCT = 68; // lowered slightly to match broader coverage
        const MAX_HOTSPOTS = 7;
        const thresh = percentile(sal, THRESH_PCT);
        const comps = findComponents(sal, dw, dh, thresh, MAX_HOTSPOTS);
        const rows: HotspotRow[] = comps.map((c, i) => ({
          rank: i+1,
          coveragePct: 100 * c.size / (dw*dh),
          mean: c.mean,
          cx: c.cx / dw, cy: c.cy / dh,
          x: c.x0 / dw, y: c.y0 / dh, w: (c.x1 - c.x0 + 1) / dw, h: (c.y1 - c.y0 + 1) / dh
        }));
        setHotspots(rows);

        drawHotspotGlow(octx, rows, overlay.width, overlay.height);

        // Annotate hotspots (clean, unobtrusive)
        octx.save();
        octx.lineWidth = Math.max(1.5, overlay.width * 0.0025);
        octx.strokeStyle = 'rgba(255,255,255,0.95)';
        octx.fillStyle = 'rgba(0,0,0,0.55)';
        octx.font = `${Math.max(11, overlay.width * 0.018)}px ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto`;
        for (const r of rows) {
          const x = r.x * overlay.width, y = r.y * overlay.height;
          const w = r.w * overlay.width, h = r.h * overlay.height;
          octx.strokeRect(x, y, w, h);
          const label = `${r.rank} • ${(r.coveragePct).toFixed(1)}%`;
          const tw = octx.measureText(label).width + 10;
          const th = parseInt(octx.font) + 6;
          octx.fillRect(x, Math.max(0, y - th), tw, th);
          octx.fillStyle = '#fff';
          octx.fillText(label, x + 5, Math.max(th - 6, y - 6));
          octx.fillStyle = 'rgba(0,0,0,0.55)';
        }
        octx.restore();

        // Legend (fixed)
        drawLegend(octx, overlay.width, overlay.height);

        setLoaded(true);
        void maybeUploadHeatmap();
      } catch (e: any) {
        setErr(e?.message || 'Heatmap failed');
      }
    })();

    return () => { cancelled = true; };
  }, [imageUrl, maybeUploadHeatmap]);

  // Exports
  const downloadPNG = () => {
    const base = baseRef.current!, overlay = overlayRef.current!;
    const c = document.createElement('canvas');
    c.width = base.width; c.height = base.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(base, 0, 0);
    ctx.drawImage(overlay, 0, 0);
    triggerDownload(c.toDataURL('image/png'), 'attention-heatmap.png');
  };
  const downloadCSV = () => {
    const rows = [['rank','coverage_pct','mean','cx','cy','x','y','w','h'], ...hotspots.map(h =>
      [h.rank, h.coveragePct.toFixed(2), h.mean.toFixed(4), h.cx.toFixed(4), h.cy.toFixed(4), h.x.toFixed(4), h.y.toFixed(4), h.w.toFixed(4), h.h.toFixed(4)]
    )];
    const csv = rows.map(r => r.join(',')).join('\n');
    triggerDownload(URL.createObjectURL(new Blob([csv], { type:'text/csv'})), 'hotspots.csv');
  };

  return (
    <div className="relative inline-block w-full select-none">
      {/* Canvases (same CSS box to avoid seams) */}
      <canvas ref={baseRef} style={{ width:'100%', height:'auto', display:'block', verticalAlign:'top' }} />
      <canvas
        ref={overlayRef}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', mixBlendMode:'multiply', pointerEvents:'none' }}
        aria-label="attention heatmap"
      />

      {/* Top-right actions (small, professional) */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          className="px-2 py-1 text-xs bg-black/65 hover:bg-black/80 text-white rounded-md border border-white/20"
        >
          Enlarge
        </button>
        <button
          type="button"
          onClick={downloadPNG}
          className="px-2 py-1 text-xs bg-black/65 hover:bg-black/80 text-white rounded-md border border-white/20"
        >
          PNG
        </button>
        <button
          type="button"
          onClick={downloadCSV}
          className="px-2 py-1 text-xs bg-black/65 hover:bg-black/80 text-white rounded-md border border-white/20"
        >
          CSV
        </button>
      </div>

      {!loaded && !err && (
        <div className="absolute inset-0 grid place-items-center bg-black/20">
          <span className="text-xs text-slate-200">Generating attention heatmap…</span>
        </div>
      )}
      {err && <div className="mt-2 text-xs text-red-400">{err}</div>}

      {/* Fullscreen viewer (mirror the two canvases) */}
      {zoomOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={() => setZoomOpen(false)}>
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-slate-900 rounded-xl shadow-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              className="absolute top-3 right-3 z-10 text-sm bg-black/60 hover:bg-black/75 text-white px-2 py-1 rounded-md border border-white/20"
            >
              Close
            </button>
            <ZoomMirror baseRef={baseRef} overlayRef={overlayRef}/>
          </div>
        </div>
      )}
    </div>
  );
}


function ZoomMirror({ baseRef, overlayRef }:{ baseRef: React.RefObject<HTMLCanvasElement | null>, overlayRef: React.RefObject<HTMLCanvasElement | null> }) {
  const bigBase = useRef<HTMLCanvasElement | null>(null);
  const bigOverlay = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const b = baseRef.current!, o = overlayRef.current!;
    if (!b || !o) return;
    const W = b.width, H = b.height;
    const maxW = 2400;
    const scale = Math.min(maxW / W, 1);
    const w = Math.floor(W*scale), h = Math.floor(H*scale);
    const B = bigBase.current!; B.width = w; B.height = h;
    B.getContext('2d')!.drawImage(b, 0, 0, w, h);
    const O = bigOverlay.current!; O.width = w; O.height = h;
    O.getContext('2d')!.drawImage(o, 0, 0, w, h);
  }, [baseRef, overlayRef]);
  return (
    <div className="relative w-full">
      <canvas ref={bigBase} style={{ width:'100%', height:'auto', display:'block' }} />
      <canvas ref={bigOverlay} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} />
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Image load failed (CORS/404)'));
    img.src = src;
  });
}
function pickScale(w:number,h:number,target:number){ const pix=w*h; return pix>target? Math.sqrt(target/pix):1; }
function normalizeInplace(a: Float32Array){ let min=Infinity,max=-Infinity; for(const v of a){ if(v<min) min=v; if(v>max) max=v; } const r=max-min||1; for(let i=0;i<a.length;i++) a[i]=(a[i]-min)/r; }
function sobelMag(gray: Float32Array, w:number, h:number){
  const out=new Float32Array(w*h);
  const gx=[-1,0,1,-2,0,2,-1,0,1], gy=[-1,-2,-1,0,0,0,1,2,1];
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
    let sx=0, sy=0, k=0;
    for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++){ const v=gray[(y+j)*w+(x+i)]; sx+=v*gx[k]; sy+=v*gy[k]; k++;}
    out[y*w+x] = Math.hypot(sx, sy);
  }
  return out;
}
function integral(gray: Float32Array, w:number, h:number, sq=false){
  const I=new Float32Array(w*h);
  for(let y=0;y<h;y++){ let row=0; for(let x=0;x<w;x++){ const v=gray[y*w+x]; row+=sq? v*v : v; I[y*w+x]=row+(y>0?I[(y-1)*w+x]:0); } }
  return I;
}
function rectSum(I: Float32Array, w:number, x0:number,y0:number,x1:number,y1:number){
  const A=(y0>0&&x0>0)?I[(y0-1)*w+(x0-1)]:0, B=(y0>0)?I[(y0-1)*w+x1]:0, C=(x0>0)?I[y1*w+(x0-1)]:0, D=I[y1*w+x1];
  return D + A - B - C;
}
function localVariance(gray: Float32Array, w:number, h:number, r:number){
  const I=integral(gray,w,h,false), I2=integral(gray,w,h,true), out=new Float32Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const x0=Math.max(0,x-r), y0=Math.max(0,y-r), x1=Math.min(w-1,x+r), y1=Math.min(h-1,y+r);
    const area=(x1-x0+1)*(y1-y0+1);
    const sum=rectSum(I,w,x0,y0,x1,y1), sum2=rectSum(I2,w,x0,y0,x1,y1);
    const mean=sum/area, mean2=sum2/area;
    out[y*w+x]=Math.sqrt(Math.max(0, mean2 - mean*mean));
  }
  return out;
}
function gaussianKernel(radius:number, sigma:number){ const k=new Float32Array(radius+1); const s2=2*sigma*sigma; for(let i=0;i<=radius;i++) k[i]=Math.exp(-(i*i)/s2); return k; }
function gaussianBlurInplace(a: Float32Array, w:number, h:number, radius:number){
  if(radius<1) return;
  const k=gaussianKernel(radius, radius/2), tmp=new Float32Array(a.length);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    let acc=0,n=0; for(let i=-radius;i<=radius;i++){ const xx=Math.min(w-1,Math.max(0,x+i)); const kv=k[Math.abs(i)]; acc+=a[y*w+xx]*kv; n+=kv; }
    tmp[y*w+x]=acc/n;
  }
  for(let x=0;x<w;x++) for(let y=0;y<h;y++){
    let acc=0,n=0; for(let j=-radius;j<=radius;j++){ const yy=Math.min(h-1,Math.max(0,y+j)); const kv=k[Math.abs(j)]; acc+=tmp[yy*w+x]*kv; n+=kv; }
    a[y*w+x]=acc/n;
  }
}
function clamp8(v:number){ return Math.max(0,Math.min(255,v|0)); }
function warmColormap(t:number): [number,number,number] {
  t=Math.max(0,Math.min(1,t));
  const stops = [
    [0.00,[ 10,  18,  86]],[0.16,[ 40,   0, 140]],[0.32,[  0, 155, 255]],
    [0.54,[  0, 205, 150]],[0.70,[255, 220,  60]],[0.86,[255, 120,  30]],[0.95,[255,  45,  20]],[1.00,[255, 255, 255]],
  ] as const;
  for(let i=1;i<stops.length;i++){
    const [p1,c1]=stops[i-1] as any, [p2,c2]=stops[i] as any;
    if(t<=p2){ const u=(t-p1)/(p2-p1);
      return [clamp8(c1[0]+(c2[0]-c1[0])*u), clamp8(c1[1]+(c2[1]-c1[1])*u), clamp8(c1[2]+(c2[2]-c1[2])*u)];
    }
  }
  return [255,255,255];
}
// Fast box blur on RGBA (horizontal + vertical passes)
function boxBlurRGBA(src: ImageData, w: number, h: number, r: number) {
  const out = new Uint8ClampedArray(src.data.length);
  const tmp = new Float32Array(src.data.length);

  // --- horizontal pass ---
  for (let y = 0; y < h; y++) {
    let accR = 0, accG = 0, accB = 0, accA = 0;
    const row = y * w;
    for (let x = 0; x < w + r; x++) {
      const addX = Math.min(w - 1, x);
      const remX = Math.max(0, x - (2 * r + 1));
      if (x < w) {
        accR += src.data[(row + addX) * 4 + 0];
        accG += src.data[(row + addX) * 4 + 1];
        accB += src.data[(row + addX) * 4 + 2];
        accA += src.data[(row + addX) * 4 + 3];
      }
      if (x >= 2 * r + 1) {
        accR -= src.data[(row + remX) * 4 + 0];
        accG -= src.data[(row + remX) * 4 + 1];
        accB -= src.data[(row + remX) * 4 + 2];
        accA -= src.data[(row + remX) * 4 + 3];
      }
      if (x >= r && x - r < w) {
        const xx = x - r;
        const idx = (row + xx) * 4;
        const n = Math.min(2 * r + 1, Math.min(x + 1, w) - Math.max(0, x - (2 * r)));
        tmp[idx + 0] = accR / n;
        tmp[idx + 1] = accG / n;
        tmp[idx + 2] = accB / n;
        tmp[idx + 3] = accA / n;
      }
    }
  }

  // --- vertical pass ---
  for (let x = 0; x < w; x++) {
    let accR = 0, accG = 0, accB = 0, accA = 0;
    for (let y = 0; y < h + r; y++) {
      const addY = Math.min(h - 1, y);
      const remY = Math.max(0, y - (2 * r + 1));
      if (y < h) {
        const idx = (addY * w + x) * 4;
        accR += tmp[idx + 0];
        accG += tmp[idx + 1];
        accB += tmp[idx + 2];
        accA += tmp[idx + 3];
      }
      if (y >= 2 * r + 1) {
        const idx = (remY * w + x) * 4;
        accR -= tmp[idx + 0];
        accG -= tmp[idx + 1];
        accB -= tmp[idx + 2];
        accA -= tmp[idx + 3];
      }
      if (y >= r && y - r < h) {
        const yy = y - r;
        const outIdx = (yy * w + x) * 4;
        const n = Math.min(2 * r + 1, Math.min(y + 1, h) - Math.max(0, y - (2 * r)));
        out[outIdx + 0] = accR / n;
        out[outIdx + 1] = accG / n;
        out[outIdx + 2] = accB / n;
        out[outIdx + 3] = accA / n;
      }
    }
  }
  return out;
}

function multiScaleDoG(gray: Float32Array, w:number, h:number, sigmas:number[]){
  const resp=new Float32Array(w*h).fill(0);
  for(const s of sigmas){
    const g1=blurGray(gray,w,h,Math.round(s)), g2=blurGray(gray,w,h,Math.round(s*1.6));
    for(let i=0;i<resp.length;i++){ const v=Math.abs(g1[i]-g2[i]); if(v>resp[i]) resp[i]=v; }
  }
  return resp;
}
function blurGray(src: Float32Array, w:number, h:number, r:number){
  if(r<1) return src.slice();
  const k=gaussianKernel(r,r/2), tmp=new Float32Array(w*h), out=new Float32Array(w*h);
  for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ let a=0,n=0; for(let i=-r;i<=r;i++){ const xx=Math.min(w-1,Math.max(0,x+i)); const kv=k[Math.abs(i)]; a+=src[y*w+xx]*kv; n+=kv; } tmp[y*w+x]=a/n; } }
  for(let x=0;x<w;x++){ for(let y=0;y<h;y++){ let a=0,n=0; for(let j=-r;j<=r;j++){ const yy=Math.min(h-1,Math.max(0,y+j)); const kv=k[Math.abs(j)]; a+=tmp[yy*w+x]*kv; n+=kv; } out[y*w+x]=a/n; } }
  return out;
}
function layoutPriorMap(w:number,h:number,opts:{centerSigma:number; topLeftBoost:number}){
  const out=new Float32Array(w*h); const cx=(w-1)/2, cy=(h-1)/2, sx=w*opts.centerSigma, sy=h*opts.centerSigma;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const dx=(x-cx)/sx, dy=(y-cy)/sy; const center=Math.exp(-0.5*(dx*dx+dy*dy));
    const tl=Math.exp(-((x/(w*0.35))**2 + (y/(h*0.35))**2));
    out[y*w+x]=0.7*center + opts.topLeftBoost*tl;
  }
  return out;
}
async function boostFaces(img: HTMLImageElement, out: Float32Array, w:number, h:number){
  // @ts-ignore
  if(typeof window!=='undefined' && window.FaceDetector){
    try{
      // @ts-ignore
      const det=new window.FaceDetector({fastMode:true}); const faces=await det.detect(img);
      for(const f of faces){
        const rx0=Math.max(0, Math.floor((f.boundingBox.x/img.naturalWidth)*w));
        const ry0=Math.max(0, Math.floor((f.boundingBox.y/img.naturalHeight)*h));
        const rx1=Math.min(w-1, Math.floor(((f.boundingBox.x+f.boundingBox.width)/img.naturalWidth)*w));
        const ry1=Math.min(h-1, Math.floor(((f.boundingBox.y+f.boundingBox.height)/img.naturalHeight)*h));
        radialBoost(out,w,h,rx0,ry0,rx1,ry1,1.0);
      }
      normalizeInplace(out); return;
    }catch{}
  }
  out.fill(0);
}
async function boostText(img: HTMLImageElement, out: Float32Array, w:number, h:number){
  // @ts-ignore
  if(typeof window!=='undefined' && window.TextDetector){
    try{
      // @ts-ignore
      const det=new window.TextDetector(); const texts=await det.detect(img);
      for(const t of texts){
        const bb:any=(t as any).boundingBox || (t as any).boundingClientRect || t;
        const rx0=Math.max(0, Math.floor((bb.x/img.naturalWidth)*w));
        const ry0=Math.max(0, Math.floor((bb.y/img.naturalHeight)*h));
        const rx1=Math.min(w-1, Math.floor(((bb.x+bb.width)/img.naturalWidth)*w));
        const ry1=Math.min(h-1, Math.floor(((bb.y+bb.height)/img.naturalHeight)*h));
        radialBoost(out,w,h,rx0,ry0,rx1,ry1,0.8);
      }
      normalizeInplace(out); return;
    }catch{}
  }
  out.fill(0);
}
function radialBoost(out: Float32Array, w:number,h:number,x0:number,y0:number,x1:number,y1:number,gain:number){
  const cx=(x0+x1)/2, cy=(y0+y1)/2, rx=Math.max(1,(x1-x0)/2), ry=Math.max(1,(y1-y0)/2);
  const invRx2=1/(rx*rx), invRy2=1/(ry*ry);
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const dx=x-cx, dy=y-cy; const d=(dx*dx)*invRx2 + (dy*dy)*invRy2; const v=Math.max(0,1-d);
    const i=y*w+x; out[i]=Math.max(out[i], gain*v);
  }
}
function percentile(arr: Float32Array, pct:number){
  const a=Array.from(arr).sort((x,y)=>x-y);
  const i=Math.min(a.length-1, Math.max(0, Math.floor((pct/100)*a.length)));
  return a[i];
}
function findComponents(sal: Float32Array, w:number, h:number, thresh:number, topN:number){
  const seen=new Uint8Array(w*h); const comps:Comp[]=[];
  const qx=new Int32Array(w*h), qy=new Int32Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const idx=y*w+x; if(seen[idx]||sal[idx]<thresh) continue;
    let hHead=0, tHead=0;
    const push=(xx:number,yy:number)=>{ const id=yy*w+xx; seen[id]=1; qx[tHead]=xx; qy[tHead]=yy; tHead++; };
    push(x,y);
    let x0=x, y0=y, x1=x, y1=y, size=0, sum=0, cx=0, cy=0;
    while(hHead<tHead){
      const px=qx[hHead], py=qy[hHead]; hHead++;
      const id=py*w+px, v=sal[id]; size++; sum+=v; cx+=px; cy+=py;
      if(px<x0) x0=px; if(py<y0) y0=py; if(px>x1) x1=px; if(py>y1) y1=py;
      if(px>0){ const q=py*w+(px-1); if(!seen[q]&&sal[q]>=thresh){ seen[q]=1; qx[tHead]=px-1; qy[tHead]=py; tHead++; } }
      if(px<w-1){ const q=py*w+(px+1); if(!seen[q]&&sal[q]>=thresh){ seen[q]=1; qx[tHead]=px+1; qy[tHead]=py; tHead++; } }
      if(py>0){ const q=(py-1)*w+px; if(!seen[q]&&sal[q]>=thresh){ seen[q]=1; qx[tHead]=px; qy[tHead]=py-1; tHead++; } }
      if(py<h-1){ const q=(py+1)*w+px; if(!seen[q]&&sal[q]>=thresh){ seen[q]=1; qx[tHead]=px; qy[tHead]=py+1; tHead++; } }
    }
    const mean=sum/size; comps.push({x0,y0,x1,y1,size,sum,cx:cx/size,cy:cy/size,mean});
  }
  comps.sort((a,b)=> (b.mean*b.size) - (a.mean*a.size));
  return comps.slice(0, topN);
}
function drawLegend(ctx: CanvasRenderingContext2D, W:number, H:number){
  const w=Math.max(120, Math.floor(W*0.12)), h=10, pad=10, x=W-w-pad, y=H-h-pad;
  const grad=ctx.createLinearGradient(x,y,x+w,y);
  for(let i=0;i<=100;i+=10){ const t=i/100; const [r,g,b]=warmColormap(t); grad.addColorStop(t, `rgb(${r},${g},${b})`); }
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(x-6,y-8,w+12,h+26);
  ctx.fillStyle=grad; ctx.fillRect(x,y,w,h);
  ctx.fillStyle='#fff'; ctx.font='12px ui-sans-serif,system-ui'; ctx.fillText('Low', x, y+h+14); ctx.fillText('High', x+w-28, y+h+14);
  ctx.restore();
}
function triggerDownload(url:string, name:string){ const a=document.createElement('a'); a.href=url; a.download=name; a.click(); }

function normalizeWithClipping(a: Float32Array, loPct: number, hiPct: number) {
  if (a.length === 0) return;
  const lo = percentile(a, loPct);
  const hi = percentile(a, hiPct);
  if (!(hi > lo)) {
    normalizeInplace(a);
    return;
  }
  const inv = 1 / (hi - lo);
  for (let i = 0; i < a.length; i++) {
    const v = (a[i] - lo) * inv;
    a[i] = Math.max(0, Math.min(1, v));
  }
}

function buildContentMask(opts: {
  sobel: Float32Array;
  texture: Float32Array;
  colorPop: Float32Array;
  gray: Float32Array;
  w: number;
  h: number;
}) {
  const { sobel, texture, colorPop, gray, w, h } = opts;
  const out = new Float32Array(w * h);
  const inv255 = 1 / 255;
  for (let i = 0; i < out.length; i++) {
    const luminance = gray[i] * inv255;
    const structural = 0.58 * sobel[i] + 0.27 * texture[i] + 0.15 * colorPop[i];
    const whitespacePenalty = Math.max(0, luminance - 0.88) * 0.9;
    out[i] = Math.max(0, structural - whitespacePenalty);
  }
  const baseRadius = Math.max(2, Math.round(Math.max(w, h) / 220));
  gaussianBlurInplace(out, w, h, baseRadius);
  gaussianBlurInplace(out, w, h, Math.max(baseRadius + 2, 6));
  normalizeInplace(out);
  for (let i = 0; i < out.length; i++) out[i] = Math.pow(out[i], 0.82);
  return out;
}

function drawContourLayers(ctx: CanvasRenderingContext2D, sal: Float32Array, srcW: number, srcH: number, outW: number, outH: number) {
  const layers = [
    { level: 0.58, color: [0, 230, 255, 0.32] },
    { level: 0.72, color: [255, 190, 60, 0.28] },
    { level: 0.86, color: [255, 255, 255, 0.36] },
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const layer of layers) {
    const mask = computeContourMask(sal, srcW, srcH, layer.level, 0.015);
    if (!mask) continue;
    const edgeCanvas = document.createElement('canvas');
    edgeCanvas.width = srcW;
    edgeCanvas.height = srcH;
    const ectx = edgeCanvas.getContext('2d')!;
    const img = ectx.createImageData(srcW, srcH);
    let hasEdge = false;
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      hasEdge = true;
      img.data[i * 4 + 0] = layer.color[0];
      img.data[i * 4 + 1] = layer.color[1];
      img.data[i * 4 + 2] = layer.color[2];
      img.data[i * 4 + 3] = Math.floor(255 * layer.color[3]);
    }
    if (!hasEdge) continue;
    ectx.putImageData(img, 0, 0);
    ctx.drawImage(edgeCanvas, 0, 0, outW, outH);
  }
  ctx.restore();
}

function drawHotspotGlow(ctx: CanvasRenderingContext2D, rows: HotspotRow[], width: number, height: number) {
  if (!rows.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const maxDim = Math.max(width, height);
  rows.slice(0, 3).forEach((row, idx) => {
    const cx = row.cx * width;
    const cy = row.cy * height;
    const footprint = Math.sqrt(Math.max(row.w * row.h, 0.0004));
    const outer = Math.max(maxDim * 0.12, footprint * maxDim * 1.25) + idx * 18;
    const inner = outer * 0.28;
    const grad = ctx.createRadialGradient(cx, cy, inner * 0.35, cx, cy, outer);
    grad.addColorStop(0, 'rgba(255,255,255,0.35)');
    grad.addColorStop(0.35, 'rgba(255,200,80,0.28)');
    grad.addColorStop(0.7, 'rgba(255,80,40,0.16)');
    grad.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function computeContourMask(data: Float32Array, w: number, h: number, level: number, softness: number) {
  const mask = new Uint8Array(w * h);
  let count = 0;
  const low = level - softness;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const v = data[idx];
      if (v < low) continue;
      let edge = false;
      const neighbors = [
        x > 0 ? data[idx - 1] : 0,
        x < w - 1 ? data[idx + 1] : 0,
        y > 0 ? data[idx - w] : 0,
        y < h - 1 ? data[idx + w] : 0,
        x > 0 && y > 0 ? data[idx - w - 1] : 0,
        x < w - 1 && y > 0 ? data[idx - w + 1] : 0,
        x > 0 && y < h - 1 ? data[idx + w - 1] : 0,
        x < w - 1 && y < h - 1 ? data[idx + w + 1] : 0,
      ];
      for (const n of neighbors) {
        if (n < level - softness) {
          edge = true;
          break;
        }
      }
      if (!edge) continue;
      mask[idx] = 1;
      count++;
    }
  }
  return count ? mask : null;
}

/* Types for components */
type Comp = { x0:number; y0:number; x1:number; y1:number; size:number; sum:number; cx:number; cy:number; mean:number; };
type HotspotRow = { rank:number; coveragePct:number; mean:number; cx:number; cy:number; x:number; y:number; w:number; h:number; };
