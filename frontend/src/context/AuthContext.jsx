import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);
const USER_KEY = 'parking_user';

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [username, setUsername] = useState(localStorage.getItem(USER_KEY));

  const login = useCallback(async (user, password) => {
    const data = await api.post('/api/auth/login', { username: user, password });
    setToken(data.token);
    localStorage.setItem(USER_KEY, data.user.username);
    setTokenState(data.token);
    setUsername(data.user.username);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setTokenState(null);
    setUsername(null);
  }, []);

  const value = useMemo(
    () => ({ token, username, login, logout }),
    [token, username, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
