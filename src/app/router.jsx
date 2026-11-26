import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROL } from '../constants/estados';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { CuentasPage } from '../features/cuentas/pages/CuentasPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { PropietariosPage } from '../features/propietarios/pages/PropietariosPage';
import { PropiedadesPage } from '../features/propiedades/pages/PropiedadesPage';
import { InquilinosPage } from '../features/inquilinos/pages/InquilinosPage';
import { ContratosPage } from '../features/contratos/pages/ContratosPage';
import { AlquileresPage } from '../features/alquileres/pages/AlquileresPage';
import { AumentosPage } from '../features/aumentos/pages/AumentosPage';
import { ReclamosPage } from '../features/reclamos/pages/ReclamosPage';
import { ProximamentePage } from '../features/proximamente/ProximamentePage';
import { Layout } from './Layout';
import { ProtectedRoute } from './ProtectedRoute';

const MENU_ADMIN = [
  { path: '/admin', label: 'Cuentas', icon: 'users' },
];

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute roles={[ROL.ADMINISTRADOR]}>
        <Layout menu={MENU_ADMIN} titulo="Administración" rolLabel="Administrador" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <CuentasPage /> },
    ],
  },
  {
    path: '/portal/inquilino',
    element: (
      <ProtectedRoute roles={[ROL.INQUILINO]}>
        <Layout
          menu={[{ path: '/portal/inquilino', label: 'Inicio', icon: 'user' }]}
          titulo="Portal del inquilino"
          rolLabel="Inquilino"
        />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ProximamentePage titulo="Portal del inquilino" texto="Acá vas a consultar tus contratos, pagos y reclamos." />,
      },
    ],
  },
  {
    path: '/portal/propietario',
    element: (
      <ProtectedRoute roles={[ROL.PROPIETARIO]}>
        <Layout
          menu={[{ path: '/portal/propietario', label: 'Inicio', icon: 'building' }]}
          titulo="Portal del propietario"
          rolLabel="Propietario"
        />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ProximamentePage titulo="Portal del propietario" texto="Acá vas a consultar tus propiedades, contratos y cobros." />,
      },
    ],
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute roles={[ROL.ENCARGADO]}>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'propietarios', element: <PropietariosPage /> },
      { path: 'propiedades', element: <PropiedadesPage /> },
      { path: 'inquilinos', element: <InquilinosPage /> },
      { path: 'contratos', element: <ContratosPage /> },
      { path: 'alquileres', element: <AlquileresPage /> },
      { path: 'aumentos', element: <AumentosPage /> },
      { path: 'reclamos', element: <ReclamosPage /> },
    ],
  },
]);
