import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSlotsContext } from '../context/SlotsContext.jsx';

// Loads the guard-only data and reloads it whenever the live slot list changes.
export function useGuardData() {
  const { logout } = useAuth();
  const { slots: liveSlots } = useSlotsContext(); // used as a refresh trigger
  const [slots, setSlots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [slotData, reservationData, eventData] = await Promise.all([
        api.get('/api/guard/slots'),
        api.get('/api/guard/reservations'),
        api.get('/api/guard/events'),
      ]);
      setSlots(slotData);
      setReservations(reservationData);
      setEvents(eventData);
    } catch (err) {
      if (err.status === 401) logout();
      else setError(err.message);
    }
  }, [logout]);

  useEffect(() => {
    load();
  }, [load, liveSlots]);

  return { slots, reservations, events, error, setError, reload: load };
}
