import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { rutaDeRol } from '../constants/estados';
import { useAuth } from '../features/auth/hooks/useAuth';
import { authService } from '../services/authService';
import { cuentasService } from '../services/cuentasService';

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const [perfil, setPerfil] = useState(undefined);

  useEffect(() => {
    let vigente = true;
    if (loading) return undefined;
    if (!user) {
      setPerfil(null);
      return undefined;
    }
    cuentasService.miPerfil()
      .then((data) => {
        if (vigente) setPerfil(data);
      })
      .catch(() => {
        if (vigente) setPerfil(null);
      });
    return () => {
      vigente = false;
    };
  }, [user, loading]);

  if (loading || (user && perfil === undefined)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '1.25rem',
        color: '#7b8bd5',
      }}>
        Cargando...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!perfil?.rol) {
    authService.logout();
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(perfil.rol)) {
    return <Navigate to={rutaDeRol(perfil.rol)} replace />;
  }

  return children;
}
