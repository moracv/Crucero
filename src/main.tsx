import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { init } from './store';
import './styles.css';

registerSW({ immediate: true });
init();
createRoot(document.getElementById('root')!).render(<App />);
