import type { Slot } from './types';

export interface Category { id: string; label: string; slot: Slot | 'accessory'; for?: 'H' | 'M' }

export const CLOTHES: Category[] = [
  { id: 'camisa', label: 'Camisa', slot: 'top' },
  { id: 'polo', label: 'Polo', slot: 'top' },
  { id: 'camiseta', label: 'Camiseta / T-shirt', slot: 'top' },
  { id: 'blusa', label: 'Blusa', slot: 'top', for: 'M' },
  { id: 'top', label: 'Top', slot: 'top', for: 'M' },
  { id: 'chaqueta', label: 'Chaqueta / Saco', slot: 'outer' },
  { id: 'sueter', label: 'Suéter / Cárdigan', slot: 'outer' },
  { id: 'short', label: 'Short / Bermuda', slot: 'bottom' },
  { id: 'pantalon', label: 'Pantalón', slot: 'bottom' },
  { id: 'falda', label: 'Falda', slot: 'bottom', for: 'M' },
  { id: 'bano', label: 'Traje de baño', slot: 'bottom' },
  { id: 'vestido', label: 'Vestido', slot: 'dress', for: 'M' },
  { id: 'enterizo', label: 'Enterizo / Salida de baño', slot: 'dress', for: 'M' },
  { id: 'zapatos', label: 'Zapatos', slot: 'shoes' },
  { id: 'sandalias', label: 'Sandalias', slot: 'shoes' },
  { id: 'tenis', label: 'Tenis', slot: 'shoes' },
  { id: 'sombrero', label: 'Sombrero / Gorra', slot: 'head' },
  { id: 'lentes', label: 'Lentes de sol', slot: 'eyes' },
  { id: 'reloj', label: 'Reloj', slot: 'accessory' },
  { id: 'bolso', label: 'Bolso / Mochila', slot: 'accessory' },
  { id: 'joyeria', label: 'Joyería', slot: 'accessory' },
  { id: 'cinturon', label: 'Cinturón', slot: 'accessory' },
  { id: 'otro', label: 'Otro accesorio', slot: 'accessory' },
];

export const SLOT_LABEL: Record<Slot | 'accessory', string> = {
  head: 'Sombrero / gorra', eyes: 'Lentes', outer: 'Abrigo', top: 'Parte de arriba', dress: 'Vestido', bottom: 'Parte de abajo', shoes: 'Calzado', accessory: 'Accesorios',
};

export const catById = (id: string) => CLOTHES.find((c) => c.id === id);
export const catsForSlot = (slot: string) => CLOTHES.filter((c) => c.slot === slot).map((c) => c.id);

export const PACKING_CATS = [
  { id: 'documentos', label: '📄 Documentos' },
  { id: 'aseo', label: '🧴 Aseo' },
  { id: 'electronica', label: '🔌 Electrónica' },
  { id: 'medicinas', label: '💊 Medicinas' },
  { id: 'playa', label: '🏖️ Playa' },
  { id: 'otros', label: '🎒 Otros' },
];

export const PACKING_SUGGESTIONS: Record<string, string[]> = {
  documentos: ['Pasaportes', 'Boarding pass / e-docs NCL', 'Tarjeta de crédito', 'Seguro de viaje', 'Copias de documentos'],
  aseo: ['Bloqueador solar (reef safe)', 'Repelente', 'Cepillo y pasta dental', 'Desodorante', 'Shampoo'],
  electronica: ['Cargadores', 'Power bank', 'Extensión sin protección de sobretensión', 'Audífonos', 'Funda acuática para celular'],
  medicinas: ['Pastillas para el mareo', 'Analgésicos', 'Medicinas personales', 'Curitas'],
  playa: ['Toalla de playa', 'Snorkel', 'Zapatos de agua', 'Bolsa seca'],
  otros: ['Lanyard para tarjeta del barco', 'Imanes para la puerta', 'Botella reutilizable'],
};

export const ACTIVITY_TYPES = [
  { id: 'tour', label: 'Tour / Excursión', icon: '🗺️' },
  { id: 'espectaculo', label: 'Espectáculo', icon: '🎭' },
  { id: 'restaurante', label: 'Restaurante / Cena', icon: '🍽️' },
  { id: 'abordo', label: 'Actividad a bordo', icon: '🛳️' },
  { id: 'fiesta', label: 'Fiesta / Bar', icon: '🎉' },
  { id: 'spa', label: 'Spa / Gimnasio', icon: '💆' },
  { id: 'playa', label: 'Playa / Piscina', icon: '🏖️' },
  { id: 'otro', label: 'Otro', icon: '📌' },
];
export const actType = (id: string) => ACTIVITY_TYPES.find((a) => a.id === id) || ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];

export const DAY_TYPES = [
  { id: 'embarque', label: 'Embarque', icon: '🧳' },
  { id: 'puerto', label: 'Puerto', icon: '⚓' },
  { id: 'navegacion', label: 'Día en altamar', icon: '🌊' },
  { id: 'desembarque', label: 'Desembarque', icon: '🏁' },
];
export const dayType = (id: string) => DAY_TYPES.find((d) => d.id === id) || DAY_TYPES[1];

export const DRESS_CODES = [
  { id: 'casual', label: 'Casual' },
  { id: 'elegante', label: 'Elegante / Smart casual' },
  { id: 'gala', label: 'Gala (Dress Up)' },
  { id: 'tematica', label: 'Temática (ej. White Hot Party)' },
];
