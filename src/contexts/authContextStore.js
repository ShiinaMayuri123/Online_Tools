import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  role: null,
  loading: false,
  login: async () => {},
  logout: async () => {},
});
