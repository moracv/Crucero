import { useEffect, useRef, useState } from 'react';
import { Toggle } from './ui';
import { preloadBg, removeBg } from '../bg';

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('No se pudo leer la imagen'));
    img.src = URL.createObjectURL(blob);
  });
}

/** Redimensiona y, si hay transparencia, recorta los bordes vacíos para que la prenda llene su zona. */
async function processImage(blob: Blob, max: number, trim: boolean): Promise<Blob> {
  const img = await loadImage(blob);
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (trim) {
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, sw, sh).data;
    let minX = sw, minY = sh, maxX = 0, maxY = 0;
    for (let y = 0; y < sh; y += 2) for (let x = 0; x < sw; x += 2) {
      if (data[(y * sw + x) * 4 + 3] > 40) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (maxX > minX && maxY > minY) { sx = minX; sy = minY; sw = maxX - minX + 2; sh = maxY - minY + 2; }
  }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const out = document.createElement('canvas');
  out.width = Math.round(sw * scale); out.height = Math.round(sh * scale);
  out.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return new Promise((res) => out.toBlob((b) => res(b!), 'image/webp', 0.85));
}

/** Cámara dentro de la app: evita que Android cierre la página al abrir la cámara del sistema. */
function Camera({ onShot, onClose, onFallback }: { onShot: (b: Blob) => void; onClose: () => void; onFallback: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false })
      .then((s) => { stream = s; if (video.current) { video.current.srcObject = s; video.current.play(); } })
      .catch(() => setErr('No se pudo abrir la cámara. Revisa el permiso de cámara del sitio.'));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  function shoot() {
    const v = video.current!;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    c.toBlob((b) => b && onShot(b), 'image/jpeg', 0.92);
  }
  return (
    <div className="camera">
      {err ? <p className="error center">{err}</p> : <video ref={video} playsInline muted />}
      <div className="camera-bar">
        <button className="btn" onClick={onClose}>Cancelar</button>
        {!err && <button className="shutter" onClick={shoot} aria-label="Tomar foto" />}
        <button className="btn" onClick={onFallback}>Cámara del sistema</button>
      </div>
      <p className="camera-tip">Pon la prenda extendida sobre una superficie lisa y de color distinto</p>
    </div>
  );
}

export function PhotoInput({ onPhoto, onBusy, removeBgDefault = true, preview }: { onPhoto: (b: Blob) => void; onBusy?: (b: boolean) => void; removeBgDefault?: boolean; preview?: string }) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [removeBgOn, setRemoveBg] = useState(removeBgDefault);
  const [camera, setCamera] = useState(false);
  const [progress, setProgress] = useState<{ text: string; pct: number } | null>(null);
  const [msg, setMsg] = useState('');
  const [local, setLocal] = useState('');

  useEffect(() => { if (removeBgDefault) preloadBg(); }, []);

  async function onFile(f?: Blob | null) {
    if (!f) return;
    setCamera(false);
    setMsg('');
    const t0 = Date.now();
    onBusy?.(true);
    try {
      setProgress({ text: 'Preparando foto…', pct: 5 });
      let blob: Blob = await processImage(f, 1024, false);
      setLocal(URL.createObjectURL(blob));
      if (removeBgOn) {
        blob = await removeBg(blob, (p) => setProgress(p.stage === 'modelo'
          ? { text: `Descargando modelo (solo la primera vez)… ${p.pct}%`, pct: p.pct }
          : { text: `Quitando el fondo… ${p.pct}%`, pct: p.pct }));
      }
      const final = await processImage(blob, 800, removeBgOn);
      setLocal(URL.createObjectURL(final));
      onPhoto(final);
      if (removeBgOn) setMsg(`Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    } catch (e: any) {
      console.error(e);
      setMsg('No se pudo quitar el fondo (' + (e?.message || e) + '). Se usará la foto original.');
      const plain = await processImage(f, 800, false);
      setLocal(URL.createObjectURL(plain));
      onPhoto(plain);
    } finally {
      setProgress(null);
      onBusy?.(false);
    }
  }

  const shown = local || preview;
  return (
    <div className="photo-input">
      <div className="photo-preview checker">
        {shown ? <img src={shown} alt="" /> : <span>Sin foto</span>}
        {progress && (
          <div className="photo-progress">
            <div className="bar"><div style={{ width: progress.pct + '%' }} /></div>
            <small>{progress.text}</small>
          </div>
        )}
      </div>
      <div className="row">
        <button type="button" className="btn" disabled={!!progress} onClick={() => setCamera(true)}>📷 Cámara</button>
        <button type="button" className="btn" disabled={!!progress} onClick={() => gal.current?.click()}>🖼️ Galería</button>
      </div>
      <Toggle checked={removeBgOn} onChange={setRemoveBg} label="Quitar fondo automáticamente" />
      {msg && <p className="muted small">{msg}</p>}
      {camera && <Camera onShot={onFile} onClose={() => setCamera(false)} onFallback={() => { setCamera(false); cam.current?.click(); }} />}
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
