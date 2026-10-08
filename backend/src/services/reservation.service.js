const { query, withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');

const toDto = (r) => ({
  id: r.id,
  slotId: r.slot_id,
  slotLabel: r.label,
  facultyName: r.faculty_name,
  startTime: r.start_time,
  endTime: r.end_time,
});

async function create({ slotId, facultyName, startTime, endTime, userId }) {
  return withTransaction(async (client) => {
    // Lock the slot row so two guards cannot book the same time at once.
    const slot = await client.query('SELECT id, label FROM slots WHERE id = $1 FOR UPDATE', [
      slotId,
    ]);
    if (slot.rows.length === 0) {
      throw new ApiError(404, 'Slot not found');
    }

    const overlap = await client.query(
      `SELECT 1 FROM reservations
       WHERE slot_id = $1 AND cancelled = false
         AND start_time < $3 AND end_time > $2
       LIMIT 1`,
      [slotId, startTime, endTime]
    );
    if (overlap.rows.length > 0) {
      throw new ApiError(409, 'This slot is already reserved during that time');
    }

    const { rows } = await client.query(
      `INSERT INTO reservations (slot_id, faculty_name, start_time, end_time, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, slot_id, faculty_name, start_time, end_time`,
      [slotId, facultyName, startTime, endTime, userId]
    );
    return toDto({ ...rows[0], label: slot.rows[0].label });
  });
}

// Active and upcoming reservations (expired and cancelled ones are hidden).
async function listUpcoming() {
  const { rows } = await query(
    `SELECT r.id, r.slot_id, s.label, r.faculty_name, r.start_time, r.end_time
     FROM reservations r
     JOIN slots s ON s.id = r.slot_id
     WHERE r.cancelled = false AND r.end_time > now()
     ORDER BY r.start_time`
  );
  return rows.map(toDto);
}

async function cancel(id) {
  const { rowCount } = await query(
    'UPDATE reservations SET cancelled = true WHERE id = $1 AND cancelled = false',
    [id]
  );
  if (rowCount === 0) {
    throw new ApiError(404, 'Reservation not found');
  }
}

module.exports = { create, listUpcoming, cancel };
