import { useSlotsContext } from '../context/SlotsContext.jsx';
import { LOT_NAME, WIDE_ZONES } from '../config.js';
import { STATUS_LABELS, countByStatus, groupByZone } from '../utils.js';
import Stat from '../components/Stat.jsx';

const wideZones = WIDE_ZONES.map((z) => z.toLowerCase());

export default function Dashboard() {
  const { slots, loaded } = useSlotsContext();
  const counts = countByStatus(slots);
  const zones = groupByZone(slots);

  return (
    <>
      <section className="stats">
        <Stat icon="P" title="Total Slots" value={slots.length} />
        <Stat color="green" title="Available" value={counts.free} />
        <Stat color="red" title="Occupied" value={counts.occupied} />
        <Stat color="purple" title="Reserved" value={counts.reserved} />
        <Stat color="grey" title="No Signal" value={counts.unknown} />
      </section>

      <section className="parking-card" aria-label={`${LOT_NAME} parking map`}>
        <div className="lot-title">{LOT_NAME}</div>

        {!loaded ? (
          <p className="empty">Checking the lot…</p>
        ) : slots.length === 0 ? (
          <p className="empty">No parking slots are set up yet.</p>
        ) : (
          <div className="parking-layout">
            {zones.map(([zone, zoneSlots]) => (
              <div
                key={zone}
                className={wideZones.includes(zone.toLowerCase()) ? 'zone zone--wide' : 'zone'}
              >
                <h3>{zone.toUpperCase()}</h3>
                <div className="space-grid" role="list">
                  {zoneSlots.map((slot) => (
                    <div
                      key={slot.id}
                      role="listitem"
                      className={`space ${slot.status}`}
                      title={`${slot.label} - ${STATUS_LABELS[slot.status]}`}
                      aria-label={`${slot.label}: ${STATUS_LABELS[slot.status]}`}
                    >
                      {slot.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="legend">
          {['free', 'occupied', 'reserved', 'unknown'].map((status) => (
            <span key={status}>
              <i className={`legend-dot ${status}`} />
              {STATUS_LABELS[status]}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
