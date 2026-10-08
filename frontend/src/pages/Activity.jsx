import { useGuardData } from '../hooks/useGuardData.js';
import { STATUS_LABELS, formatDateTime } from '../utils.js';

export default function Activity() {
  const { events, error } = useGuardData();

  return (
    <section className="panel">
      <h2>Recent sensor activity</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {events.length === 0 ? (
        <p className="muted">No sensor activity recorded yet.</p>
      ) : (
        <ul className="events">
          {events.map((e) => (
            <li key={e.id}>
              <span className="events__time">{formatDateTime(e.createdAt)}</span>
              Slot {e.label} became {STATUS_LABELS[e.status === 'free' ? 'free' : 'occupied'].toLowerCase()}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
