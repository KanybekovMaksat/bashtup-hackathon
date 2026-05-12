import { useContext } from 'react';
import { AuthContext } from '../store/authContext';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside V2AuthProvider');
  }

  return context;
}
