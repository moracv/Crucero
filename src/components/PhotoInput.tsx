import { useRef, useState } from 'react';
import { Toggle } from './ui';

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
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
      if (data[(y * sw + x) * 4 + 3] > 20) {
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

export function PhotoInput({ onPhoto, removeBgDefault = true, preview }: { onPhoto: (b: Blob) => void; removeBgDefault?: boolean; preview?: string }) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [removeBg, setRemoveBg] = useState(removeBgDefault);
  const [status, setStatus] = useState('');
  const [local, setLocal] = useState('');

  async function onFile(f?: File | null) {
    if (!f) return;
    try {
      setStatus('Procesando foto…');
      let blob: Blob = await processImage(f, 1024, false);
      if (removeBg) {
        setStatus('Quitando el fondo… (la primera vez descarga el modelo, ~1 min)');
        const { removeBackground } = await import('@imgly/background-removal');
        blob = await removeBackground(blob, {
          progress: (k: string, cur: number, total: number) => {
            if (k.startsWith('fetch')) setStatus(`Descargando modelo… ${Math.round((cur / total) * 100)}%`);
          },
        } as any);
      }
      const final = await processImage(blob, 800, removeBg);
      setLocal(URL.createObjectURL(final));
      onPhoto(final);
      setStatus('');
    } catch (e: any) {
      console.error(e);
      setStatus('No se pudo quitar el fondo (' + (e?.message || e) + '). Se guardó la foto original.');
      const plain = await processImage(f, 800, false);
      setLocal(URL.createObjectURL(plain));
      onPhoto(plain);
    }
  }

  const shown = local || preview;
  return (
    <div className="photo-input">
      <div className="photo-preview checker">{shown ? <img src={shown} alt="" /> : <span>Sin foto</span>}</div>
      <div className="row">
        <button type="button" className="btn" onClick={() => cam.current?.click()}>📷 Cámara</button>
        <button type="button" className="btn" onClick={() => gal.current?.click()}>🖼️ Galería</button>
      </div>
      <Toggle checked={removeBg} onChange={setRemoveBg} label="Quitar fondo automáticamente" />
      {status && <p className="muted small">{status}</p>}
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}
