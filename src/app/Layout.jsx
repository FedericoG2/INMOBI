import { Fragment, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { authService } from '../services/authService';
import { Icon } from '../shared/components/Icons';
import { precargarModulos } from './precarga';
import './Layout.css';

const MENU = [
  { path: '/app', label: 'Dashboard', icon: 'dashboard' },
  { grupo: 'Cartera', path: '/app/propietarios', label: 'Propietarios', icon: 'users' },
  { grupo: 'Cartera', path: '/app/propiedades', label: 'Propiedades', icon: 'building' },
  { grupo: 'Cartera', path: '/app/inquilinos', label: 'Inquilinos', icon: 'user' },
  { grupo: 'Gestión', path: '/app/contratos', label: 'Contratos', icon: 'file' },
  { grupo: 'Gestión', path: '/app/alquileres', label: 'Alquileres', icon: 'receipt' },
  { grupo: 'Gestión', path: '/app/aumentos', label: 'Aumentos', icon: 'trend' },
  { grupo: 'Gestión', path: '/app/reclamos', label: 'Reclamos', icon: 'alert' },
];

function activo(path, actual) {
  if (path === '/app' || path === '/admin' || path.startsWith('/portal')) return actual === path;
  return actual.startsWith(path);
}

export function Layout({ menu = MENU, titulo = 'Panel del encargado', rolLabel = 'Encargado' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const inicial = user?.email?.[0]?.toUpperCase() || 'E';
  const panelEncargado = menu === MENU;

  // Solo al ingresar: despues cada modulo actualiza sus datos al abrirse.
  useEffect(() => {
    if (panelEncargado) precargarModulos(window.location.pathname);
  }, [panelEncargado]);

  const cerrarSesion = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <button type="button" className="menu-toggle" onClick={() => setMenuAbierto((abierto) => !abierto)} aria-label="Abrir menú">
            <span />
            <span />
            <span />
          </button>
          <span className="brand-mark"><Icon name="casa" size={22} /></span>
          <div>
            <strong>Inmobi</strong>
            <small>{titulo}</small>
          </div>
        </div>
        <div className="topbar-user">
          <div className="topbar-perfil">
            <span className="user-avatar">{inicial}</span>
            <span className="user-meta">
              <strong>{rolLabel}</strong>
              <small>{user?.email}</small>
            </span>
          </div>
          <button type="button" className="logout-button" onClick={cerrarSesion}>
            <Icon name="logout" size={16} />
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>
          <nav>
            {menu.map((item, indice) => {
              const esActivo = activo(item.path, location.pathname);
              // El título del grupo va antes de su primer módulo.
              const abreGrupo = item.grupo && item.grupo !== menu[indice - 1]?.grupo;
              return (
                <Fragment key={item.path}>
                  {abreGrupo && <p className="nav-grupo">{item.grupo}</p>}
                  <Link
                    to={item.path}
                    className={`nav-item ${esActivo ? 'active' : ''}`}
                    aria-current={esActivo ? 'page' : undefined}
                    onClick={() => setMenuAbierto(false)}
                  >
                    <span className="nav-icono"><Icon name={item.icon} size={18} /></span>
                    <span>{item.label}</span>
                  </Link>
                </Fragment>
              );
            })}
          </nav>
        </aside>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
