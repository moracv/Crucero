export interface Profile { id: string; name: string; gender: 'H' | 'M'; color?: string; body?: string | null; updated_at?: number }
export interface Trip { id: string; name?: string; cruise_line?: string; ship?: string; start_date?: string; nights?: number; cabin?: string; booking?: string; embark_port?: string; notes?: string; updated_at?: number }
export type DayType = 'embarque' | 'puerto' | 'navegacion' | 'desembarque';
export interface Day {
  id: string; day_number: number; date?: string; type: DayType; port?: string; country?: string;
  lat?: number | null; lon?: number | null; tz?: string; arrive?: string; depart?: string; all_aboard?: string;
  dress_code?: string; notes?: string; updated_at?: number;
}
export interface Activity {
  id: string; day_id: string; profile_id?: string | null; start_time?: string; end_time?: string; title: string; type: string;
  location?: string; included?: number; price?: number | null; currency?: string; booked?: number; meeting_point?: string; notes?: string; updated_at?: number;
}
export interface Item {
  id: string; profile_id?: string | null; kind: 'ropa' | 'equipaje'; category: string; name?: string; color?: string; tags?: string;
  image_key?: string | null; packed?: number; qty?: number; notes?: string; fit?: string | null; updated_at?: number;
}
export type Slot = 'head' | 'eyes' | 'outer' | 'top' | 'dress' | 'bottom' | 'shoes';
export interface OutfitItems { head?: string; eyes?: string; outer?: string; top?: string; dress?: string; bottom?: string; shoes?: string; accessories?: string[] }
export interface Outfit { id: string; day_id: string; profile_id: string; slot: 'dia' | 'noche'; items: string; notes?: string; updated_at?: number }
export interface Reminder { id: string; day_id?: string | null; profile_id?: string | null; remind_at?: string; title: string; notes?: string; done?: number; sent?: number; updated_at?: number }
export interface Me { id: string; email: string; name: string; picture?: string; profile_id?: string | null }
