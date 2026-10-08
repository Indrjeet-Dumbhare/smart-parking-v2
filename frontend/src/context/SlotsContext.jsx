import { createContext, useContext } from 'react';
import { useSlots } from '../hooks/useSlots.js';

const SlotsContext = createContext({ slots: [], connected: false, loaded: false });

export function SlotsProvider({ children }) {
  const value = useSlots();
  return <SlotsContext.Provider value={value}>{children}</SlotsContext.Provider>;
}

export const useSlotsContext = () => useContext(SlotsContext);
