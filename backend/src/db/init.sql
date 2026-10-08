-- Runs automatically the first time the Postgres container starts (empty volume).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sensor_status is what the ESP32 last reported. The status shown to users
-- (free / occupied / reserved / unknown) is computed from it plus reservations.
CREATE TABLE IF NOT EXISTS slots (
  id             SERIAL PRIMARY KEY,
  label          VARCHAR(20) UNIQUE NOT NULL,
  zone           VARCHAR(50) NOT NULL DEFAULT 'Main',
  sensor_status  VARCHAR(10) NOT NULL DEFAULT 'free'
                 CHECK (sensor_status IN ('free', 'occupied')),
  last_seen      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reservations (
  id            SERIAL PRIMARY KEY,
  slot_id       INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  faculty_name  VARCHAR(100) NOT NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  cancelled     BOOLEAN NOT NULL DEFAULT false,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_reservations_slot_time
  ON reservations (slot_id, start_time, end_time);

-- One row per real state change (free <-> occupied), used for history/analytics.
CREATE TABLE IF NOT EXISTS slot_events (
  id          BIGSERIAL PRIMARY KEY,
  slot_id     INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  status      VARCHAR(10) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slot_events_slot_time
  ON slot_events (slot_id, created_at DESC);

-- The 10 real slots, one per HC-SR04 sensor on the ESP32.
-- Labels A01..A10 must match slotLabels[] in firmware/smart_parking.ino
-- (and the labels used in simulate.js).
INSERT INTO slots (label, zone)
SELECT 'A' || lpad(n::text, 2, '0'), 'SLOT 1'
FROM generate_series(1, 10) AS n
ON CONFLICT (label) DO NOTHING;