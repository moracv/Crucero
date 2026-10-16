// Quitar fondo en el celular. Usa la GPU (WebGPU) cuando existe; si no, el modelo
// cuantizado (más liviano y rápido en CPU). El modelo se precarga en segundo plano.

export type BgProgress = { stage: 'modelo' | 'procesando'; pct: number };

const hasGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
let device: 'gpu' | 'cpu' = hasGpu ? 'gpu' : 'cpu';

function config(onProgress?: (p: BgProgress) => void) {
  return {
    device,
    model: device === 'gpu' ? 'isnet_fp16' : 'isnet_quint8',
    proxyToWorker: true,
    output: { format: 'image/png' as const },
    progress: (key: string, cur: number, total: number) => {
      if (key.startsWith('fetch') && total) onProgress?.({ stage: 'modelo', pct: Math.round((cur / total) * 100) });
    },
  } as any;
}

let preloading: Promise<void> | null = null;
export function preloadBg() {
  if (preloading) return preloading;
  preloading = import('@imgly/background-removal')
    .then(({ preload }) => preload(config()))
    .catch(() => { preloading = null; });
  return preloading;
}

const lastMs = () => Number(localStorage.getItem('bg:ms')) || 8000;

export async function removeBg(blob: Blob, onProgress: (p: BgProgress) => void): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');
  const start = Date.now();
  // Avance estimado según cuánto tardó la última vez (el modelo no informa su avance)
  const estimate = lastMs();
  let lastFetch = 0;
  let procStart = start;
  const timer = setInterval(() => {
    if (Date.now() - lastFetch < 400) return; // aún descargando el modelo
    onProgress({ stage: 'procesando', pct: Math.min(95, Math.round(((Date.now() - procStart) / estimate) * 100)) });
  }, 200);
  const cfg = config((p) => { lastFetch = Date.now(); procStart = Date.now(); onProgress(p); });
  try {
    let out: Blob;
    try {
      out = await removeBackground(blob, cfg);
    } catch (e) {
      if (device !== 'gpu') throw e;
      device = 'cpu'; // el celular no soporta WebGPU: usar CPU
      out = await removeBackground(blob, config((p) => onProgress(p)));
    }
    localStorage.setItem('bg:ms', String(Math.max(1500, Date.now() - procStart)));
    onProgress({ stage: 'procesando', pct: 100 });
    return out;
  } finally {
    clearInterval(timer);
  }
}
