import { useState, useEffect } from 'react';
import { authService } from '../../../services/authService';

/**
 * Hook para manejar el estado de autenticación
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    authService.getCurrentSession().then((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios en autenticación
    const subscription = authService.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
  };
}
