import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useGuardData } from '../hooks/useGuardData.js';
import { STATUS_LABELS, formatDateTime, toLocalInputValue } from '../utils.js';

const defaultForm = () => {
  const start = new Date();
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return {
    slotId: '',
    facultyName: '',
    startTime: toLocalInputValue(start),
    endTime: toLocalInputValue(end),
  };
};

export default function Reservations() {
  const { logout } = useAuth();
  const { slots, reservations, error, setError, reload } = useGuardData();
  const [form, setForm] = useState(defaultForm);
  const [busy, setBusy] = useState(false);

  const updateForm = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleError = (err) => {
    if (err.status === 401) logout();
    else setError(err.message);
  };

  const handleReserve = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/api/guard/reservations', {
        slotId: Number(form.slotId),
        facultyName: form.facultyName,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      });
      setForm(defaultForm());
      await reload();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (id) => {
    setError('');
    try {
      await api.del(`/api/guard/reservations/${id}`);
      await reload();
    } catch (err) {
      handleError(err);
    }
  };

  const violations = slots.filter((slot) => slot.reservedButOccupied);

  return (
    <>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {violations.length > 0 && (
        <p className="alert" role="alert">
          {violations.map((s) => `${s.label} (reserved for ${s.reservation.facultyName})`).join(', ')}{' '}
          {violations.length === 1 ? 'is' : 'are'} occupied. Check the vehicle.
        </p>
      )}

      <section className="panel">
        <h2>Reserve a slot for faculty</h2>
        <form className="reserve-form" onSubmit={handleReserve}>
          <label className="field">
            Slot
            <select value={form.slotId} onChange={updateForm('slotId')} required>
              <option value="" disabled>
                Choose a slot
              </option>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.label} ({slot.zone})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Faculty member
            <input
              value={form.facultyName}
              onChange={updateForm('facultyName')}
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <label className="field">
            From
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={updateForm('startTime')}
              required
            />
          </label>
          <label className="field">
            Until
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={updateForm('endTime')}
              required
            />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Reserving…' : 'Reserve slot'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Active and upcoming reservations</h2>
        {reservations.length === 0 ? (
          <p className="muted">No reservations yet. Use the form above to reserve a slot.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Faculty member</th>
                  <th>From</th>
                  <th>Until</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id}>
                    <td>{r.slotLabel}</td>
                    <td>{r.facultyName}</td>
                    <td>{formatDateTime(r.startTime)}</td>
                    <td>{formatDateTime(r.endTime)}</td>
                    <td>
                      <button className="btn btn--quiet" onClick={() => handleCancel(r.id)}>
                        Cancel reservation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>All slots</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Slot</th>
                <th>Zone</th>
                <th>Status</th>
                <th>Reserved for</th>
                <th>Last signal</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id}>
                  <td>{slot.label}</td>
                  <td>{slot.zone}</td>
                  <td>
                    <span className={`chip chip--${slot.status}`}>{STATUS_LABELS[slot.status]}</span>
                  </td>
                  <td>
                    {slot.reservation
                      ? `${slot.reservation.facultyName} until ${formatDateTime(slot.reservation.endTime)}`
                      : '-'}
                  </td>
                  <td>{slot.lastSeen ? formatDateTime(slot.lastSeen) : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
