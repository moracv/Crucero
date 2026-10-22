// Captura el aviso de instalación de Chrome (Android) para mostrar un botón "Instalar app" propio.
import { useSyncExternalStore } from 'react';

let deferred: any = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  notify();
});
window.addEventListener('appinstalled', () => { deferred = null; notify(); });

export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

/** true cuando Chrome permite instalar y la app aún no está instalada */
export const useCanInstall = () =>
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => !!deferred && !isInstalled());

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return outcome === 'accepted';
}
