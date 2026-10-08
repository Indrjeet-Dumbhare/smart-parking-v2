import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Loads the slot list once over REST, then keeps it live through Socket.IO.
// The server also sends a full snapshot on every (re)connect, so a dropped
// connection heals itself.
export function useSlots() {
  const [slots, setSlots] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    fetch('/api/slots')
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setSlots(data);
          setLoaded(true);
        }
      })
      .catch(() => {});

    const socket = io();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('slots:update', (data) => {
      setSlots(data);
      setLoaded(true);
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, []);

  return { slots, connected, loaded };
}
