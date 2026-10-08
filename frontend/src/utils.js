export const STATUS_LABELS = {
  free: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  unknown: 'No signal',
};

export function countByStatus(slots) {
  const counts = { free: 0, occupied: 0, reserved: 0, unknown: 0 };
  slots.forEach((slot) => {
    counts[slot.status] += 1;
  });
  return counts;
}

export function groupByZone(slots) {
  const zones = new Map();
  slots.forEach((slot) => {
    if (!zones.has(slot.zone)) zones.set(slot.zone, []);
    zones.get(slot.zone).push(slot);
  });
  return [...zones.entries()];
}

export const formatDateTime = (value) =>
  new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time.
export function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}
