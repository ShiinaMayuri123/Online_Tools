import { useContext } from 'react';
import { AuthContext } from '../contexts/authContextStore';

export const useAuth = () => useContext(AuthContext);
