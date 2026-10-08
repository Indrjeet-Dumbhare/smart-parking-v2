const { query, withTransaction } = require('../config/db');
const env = require('../config/env');

// One query gives every slot plus its currently active reservation (if any).
// `stale` is computed by Postgres so we do not depend on the Node clock.
const SLOTS_SQL = `
  SELECT s.id, s.label, s.zone, s.sensor_status, s.last_seen,
         (s.last_seen IS NULL
            OR s.last_seen < now() - make_interval(secs => $1::int)) AS stale,
         r.id AS reservation_id, r.faculty_name, r.start_time, r.end_time
  FROM slots s
  LEFT JOIN LATERAL (
    SELECT id, faculty_name, start_time, end_time
    FROM reservations
    WHERE slot_id = s.id
      AND cancelled = false
      AND now() >= start_time
      AND now() < end_time
    ORDER BY start_time
    LIMIT 1
  ) r ON true
  ORDER BY s.zone, s.label
`;

// unknown  -> ESP32 silent for too long (or never reported)
// occupied -> sensor sees a car (even in a reserved slot)
// reserved -> sensor sees nothing, but a reservation is active
// free     -> sensor sees nothing, no reservation
function computeStatus(row) {
  if (row.stale) return 'unknown';
  if (row.sensor_status === 'occupied') return 'occupied';
  if (row.reservation_id) return 'reserved';
  return 'free';
}

async function fetchRows() {
  const { rows } = await query(SLOTS_SQL, [env.offlineAfterSeconds]);
  return rows;
}

// Public view: no faculty names, no timestamps.
async function getPublicSlots() {
  const rows = await fetchRows();
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    zone: row.zone,
    status: computeStatus(row),
  }));
}

// Guard view: includes reservation details and a flag when a reserved slot is taken.
async function getGuardSlots() {
  const rows = await fetchRows();
  return rows.map((row) => {
    const status = computeStatus(row);
    return {
      id: row.id,
      label: row.label,
      zone: row.zone,
      status,
      sensorStatus: row.sensor_status,
      lastSeen: row.last_seen,
      reservation: row.reservation_id
        ? {
            id: row.reservation_id,
            facultyName: row.faculty_name,
            startTime: row.start_time,
            endTime: row.end_time,
          }
        : null,
      reservedButOccupied: Boolean(row.reservation_id) && status === 'occupied',
    };
  });
}

// Applies a batch of ESP32 readings. Every reading refreshes last_seen (heartbeat);
// a row is added to slot_events only when the state actually changed.
async function applyReadings(readings) {
  return withTransaction(async (client) => {
    const unknownSlots = [];
    let updated = 0;

    for (const { slot, status } of readings) {
      const { rows } = await client.query(
        `WITH prev AS (
           SELECT id, sensor_status FROM slots WHERE label = $1 FOR UPDATE
         )
         UPDATE slots s
         SET sensor_status = $2, last_seen = now()
         FROM prev
         WHERE s.id = prev.id
         RETURNING s.id, prev.sensor_status AS previous_status`,
        [slot, status]
      );

      if (rows.length === 0) {
        unknownSlots.push(slot);
        continue;
      }

      updated += 1;
      if (rows[0].previous_status !== status) {
        await client.query('INSERT INTO slot_events (slot_id, status) VALUES ($1, $2)', [
          rows[0].id,
          status,
        ]);
      }
    }

    return { updated, unknownSlots };
  });
}

async function getRecentEvents(limit = 30) {
  const { rows } = await query(
    `SELECT e.id, s.label, e.status, e.created_at
     FROM slot_events e
     JOIN slots s ON s.id = e.slot_id
     ORDER BY e.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    status: r.status,
    createdAt: r.created_at,
  }));
}

module.exports = { getPublicSlots, getGuardSlots, applyReadings, getRecentEvents };
