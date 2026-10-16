CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  gender TEXT,            -- 'H' hombre | 'M' mujer
  color TEXT,
  updated_at INTEGER
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  profile_id TEXT,
  created_at INTEGER
);

CREATE TABLE trip (
  id TEXT PRIMARY KEY,
  name TEXT,
  cruise_line TEXT,
  ship TEXT,
  start_date TEXT,        -- YYYY-MM-DD
  nights INTEGER,
  cabin TEXT,
  booking TEXT,
  embark_port TEXT,
  notes TEXT,
  updated_at INTEGER
);

CREATE TABLE days (
  id TEXT PRIMARY KEY,
  day_number INTEGER,
  date TEXT,
  type TEXT,              -- embarque | puerto | navegacion | desembarque
  port TEXT,
  country TEXT,
  lat REAL,
  lon REAL,
  tz TEXT,
  arrive TEXT,
  depart TEXT,
  all_aboard TEXT,
  dress_code TEXT,        -- casual | elegante | gala | tematica
  notes TEXT,
  updated_at INTEGER
);

CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  day_id TEXT,
  profile_id TEXT,        -- NULL = ambos
  start_time TEXT,
  end_time TEXT,
  title TEXT,
  type TEXT,
  location TEXT,
  included INTEGER DEFAULT 0,
  price REAL,
  currency TEXT,
  booked INTEGER DEFAULT 0,
  meeting_point TEXT,
  notes TEXT,
  updated_at INTEGER
);
CREATE INDEX idx_act_day ON activities(day_id);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  profile_id TEXT,        -- NULL = compartido (equipaje)
  kind TEXT,              -- ropa | equipaje
  category TEXT,
  name TEXT,
  color TEXT,
  tags TEXT,
  image_key TEXT,
  packed INTEGER DEFAULT 0,
  qty INTEGER DEFAULT 1,
  notes TEXT,
  updated_at INTEGER
);

CREATE TABLE outfits (
  id TEXT PRIMARY KEY,    -- {day_id}_{profile_id}_{slot}
  day_id TEXT,
  profile_id TEXT,
  slot TEXT,              -- dia | noche
  items TEXT,             -- JSON
  notes TEXT,
  updated_at INTEGER
);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  day_id TEXT,
  profile_id TEXT,        -- NULL = ambos
  remind_at TEXT,         -- ISO UTC
  title TEXT,
  notes TEXT,
  done INTEGER DEFAULT 0,
  sent INTEGER DEFAULT 0,
  updated_at INTEGER
);
CREATE INDEX idx_rem_pending ON reminders(sent, done, remind_at);

CREATE TABLE push_subs (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT,
  p256dh TEXT,
  auth TEXT,
  created_at INTEGER
);

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  ai_provider TEXT,
  ai_key TEXT,
  ai_model TEXT,
  updated_at INTEGER
);
