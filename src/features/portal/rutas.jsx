import { ROL } from '../../constants/estados';
import { PortalContratos } from './pages/PortalContratos';
import { PortalInicio } from './pages/PortalInicio';
import { PortalPagos } from './pages/PortalPagos';
import { PortalPerfil } from './pages/PortalPerfil';
import { PortalPropiedades } from './pages/PortalPropiedades';
import { PortalReclamos } from './pages/PortalReclamos';

export const MENU_INQUILINO = [
  { path: '/portal/inquilino', label: 'Inicio', icon: 'dashboard' },
  { path: '/portal/inquilino/contratos', label: 'Mis Contratos', icon: 'file' },
  { path: '/portal/inquilino/pagos', label: 'Mis Pagos', icon: 'receipt' },
  { path: '/portal/inquilino/reclamos', label: 'Reclamos', icon: 'alert' },
  { path: '/portal/inquilino/perfil', label: 'Mi Perfil', icon: 'user' },
];

export const MENU_PROPIETARIO = [
  { path: '/portal/propietario', label: 'Inicio', icon: 'dashboard' },
  { path: '/portal/propietario/propiedades', label: 'Mis Propiedades', icon: 'building' },
  { path: '/portal/propietario/contratos', label: 'Contratos', icon: 'file' },
  { path: '/portal/propietario/alquileres', label: 'Alquileres', icon: 'receipt' },
  { path: '/portal/propietario/perfil', label: 'Mi Perfil', icon: 'user' },
];

export const RUTAS_INQUILINO = [
  { index: true, element: <PortalInicio rol={ROL.INQUILINO} /> },
  { path: 'contratos', element: <PortalContratos rol={ROL.INQUILINO} /> },
  { path: 'pagos', element: <PortalPagos rol={ROL.INQUILINO} /> },
  { path: 'reclamos', element: <PortalReclamos /> },
  { path: 'perfil', element: <PortalPerfil rol={ROL.INQUILINO} /> },
];

export const RUTAS_PROPIETARIO = [
  { index: true, element: <PortalInicio rol={ROL.PROPIETARIO} /> },
  { path: 'propiedades', element: <PortalPropiedades /> },
  { path: 'contratos', element: <PortalContratos rol={ROL.PROPIETARIO} /> },
  { path: 'alquileres', element: <PortalPagos rol={ROL.PROPIETARIO} /> },
  { path: 'perfil', element: <PortalPerfil rol={ROL.PROPIETARIO} /> },
];
