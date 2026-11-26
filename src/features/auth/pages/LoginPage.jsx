import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rutaDeRol } from '../../../constants/estados';
import { authService } from '../../../services/authService';
import { cuentasService } from '../../../services/cuentasService';
import { Icon } from '../../../shared/components/Icons';
import './LoginPage.css';

const DESTACADOS = [
  { icono: 'building', titulo: 'Cartera', texto: 'Propietarios, propiedades e inquilinos' },
  { icono: 'file', titulo: 'Contratos y alquileres', texto: 'Períodos, pagos y comprobantes' },
  { icono: 'trend', titulo: 'Aumentos', texto: 'Cálculo automático por IPC e ICL' },
  { icono: 'alert', titulo: 'Reclamos', texto: 'Seguimiento de cada incidencia' },
];

function mensajeDeError(mensaje) {
  if (/invalid login credentials/i.test(mensaje || '')) return 'El email o la contraseña son incorrectos.';
  return mensaje || 'No se pudo iniciar sesión.';
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(email, password);
      const perfil = await cuentasService.miPerfil();
      if (!perfil?.rol) {
        await authService.logout();
        throw new Error('Esta cuenta no tiene un rol asignado.');
      }
      navigate(rutaDeRol(perfil.rol));
    } catch (err) {
      setError(mensajeDeError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <section className="login-brand">
        <div className="login-logo">
          <span className="login-marca"><Icon name="casa" size={24} /></span>
          <strong>Inmobi</strong>
        </div>

        <div className="login-presentacion">
          <h1>Gestión Inmobiliaria Integral</h1>
          <p>Toda la administración de alquileres en un solo lugar.</p>
          <ul>
            {DESTACADOS.map((item) => (
              <li key={item.titulo}>
                <span><Icon name={item.icono} size={18} /></span>
                <div>
                  <strong>{item.titulo}</strong>
                  <small>{item.texto}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer>© 2026 Zitelli &amp; Asociados</footer>
      </section>

      <section className="login-panel">
        <form onSubmit={handleSubmit} className="login-form">
          <span className="login-marca login-marca-form"><Icon name="casa" size={26} /></span>
          <h2>Iniciar sesión</h2>
          <p className="login-lead">Ingresá con tu cuenta para continuar</p>

          {error && (
            <div className="login-error" role="alert">
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </div>
          )}

          <label htmlFor="email">Email</label>
          <div className="login-campo">
            <Icon name="mail" size={18} />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <label htmlFor="password">Contraseña</label>
          <div className="login-campo">
            <Icon name="lock" size={18} />
            <input
              id="password"
              type={verClave ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
              autoComplete="current-password"
              disabled={loading}
            />
            <button type="button" className="login-ver" onClick={() => setVerClave((ver) => !ver)} aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <Icon name={verClave ? 'eye-off' : 'eye'} size={18} />
            </button>
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  );
}
