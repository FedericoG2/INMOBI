import { useEffect, useState } from 'react';
import { ROL, ROL_LABELS } from '../../../constants/estados';
import { useAuth } from '../../auth/hooks/useAuth';
import { cuentasService } from '../../../services/cuentasService';
import { nombreInquilino } from '../../../services/inquilinosService';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Modal } from '../../../shared/components/Modal';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { useToast } from '../../../shared/components/Toast';
import '../../../shared/styles/forms.css';
import './CuentasPage.css';

const FORM_VACIO = {
  email: '',
  clave: '',
  rol: ROL.ENCARGADO,
  inquilinoId: '',
  propietarioId: '',
};

export function CuentasPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [cuentas, setCuentas] = useState([]);
  const [inquilinos, setInquilinos] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [claveDe, setClaveDe] = useState(null);
  const [clave, setClave] = useState('');
  const [bloqueo, setBloqueo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);

  async function cargar() {
    setError(null);
    const [lista, listaInquilinos, listaPropietarios] = await Promise.all([
      cuentasService.listar(),
      cuentasService.listarInquilinos(),
      cuentasService.listarPropietarios(),
    ]);
    setCuentas(lista);
    setInquilinos(listaInquilinos);
    setPropietarios(listaPropietarios);
  }

  useEffect(() => {
    let vigente = true;
    cargar()
      .catch((err) => {
        if (vigente) setError(err.message);
      })
      .finally(() => {
        if (vigente) setLoading(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  function personasDisponibles(lista, seleccionada) {
    return lista.filter((persona) => !persona.usuario_id || persona.id === seleccionada);
  }

  function nombreVinculo(cuenta) {
    if (cuenta.inquilino_id) {
      return nombreInquilino(inquilinos.find((persona) => persona.id === cuenta.inquilino_id)) || 'Inquilino';
    }
    if (cuenta.propietario_id) {
      return nombreInquilino(propietarios.find((persona) => persona.id === cuenta.propietario_id)) || 'Propietario';
    }
    return '—';
  }

  async function guardarCuenta(event) {
    event.preventDefault();
    setProcesando(true);
    setErrorAccion(null);
    try {
      if (form.usuarioId) {
        await cuentasService.actualizar({
          usuarioId: form.usuarioId,
          rol: form.rol,
          inquilinoId: form.inquilinoId,
          propietarioId: form.propietarioId,
        });
        toast.success('Cuenta actualizada');
      } else {
        await cuentasService.crear({
          email: form.email,
          clave: form.clave,
          rol: form.rol,
          inquilinoId: form.inquilinoId,
          propietarioId: form.propietarioId,
        });
        toast.success('Cuenta creada');
      }
      setForm(null);
      await cargar();
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarBloqueo() {
    if (!bloqueo) return;
    setProcesando(true);
    setErrorAccion(null);
    try {
      if (bloqueo.bloqueado) await cuentasService.desbloquear(bloqueo.usuario_id);
      else await cuentasService.bloquear(bloqueo.usuario_id);
      toast.success(bloqueo.bloqueado ? 'Cuenta desbloqueada' : 'Cuenta bloqueada');
      setBloqueo(null);
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function guardarClave(event) {
    event.preventDefault();
    setProcesando(true);
    setErrorAccion(null);
    try {
      await cuentasService.cambiarClave(claveDe.usuario_id, clave);
      toast.success('Contraseña actualizada');
      setClaveDe(null);
      setClave('');
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setProcesando(false);
    }
  }

  const paginacion = usePaginacion(cuentas);

  if (loading) return <div className="loading-container"><div className="loading-spinner">Cargando cuentas...</div></div>;

  return (
    <div className="cuentas-page">
      <div className="page-header">
        <div>
          <h1>Cuentas</h1>
          <p className="page-subtitle">Cada cuenta tiene un solo rol. El acceso al portal se habilita al vincular un inquilino o un propietario.</p>
        </div>
        <Button variant="success" onClick={() => { setErrorAccion(null); setForm({ ...FORM_VACIO }); }}>Nueva cuenta</Button>
      </div>

      {error && (
        <div className="error-message">
          Error al cargar cuentas: {error}
          <Button size="small" onClick={() => cargar().catch((err) => setError(err.message))}>Reintentar</Button>
        </div>
      )}

      {!error && cuentas.length === 0 && (
        <div className="empty-state"><p>Todavía no hay cuentas.</p></div>
      )}

      {cuentas.length > 0 && (
        <div className="cuentas-resumen">
          <article>
            <span>Cuentas</span>
            <strong>{cuentas.length}</strong>
          </article>
          <article>
            <span>Activas</span>
            <strong>{cuentas.filter((cuenta) => !cuenta.bloqueado).length}</strong>
          </article>
          <article>
            <span>Bloqueadas</span>
            <strong>{cuentas.filter((cuenta) => cuenta.bloqueado).length}</strong>
          </article>
        </div>
      )}

      {cuentas.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Vinculado a</th>
                <th className="cuentas-th-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((cuenta) => {
                const propia = cuenta.usuario_id === user?.id;
                const vinculo = nombreVinculo(cuenta);
                return (
                  <tr key={cuenta.usuario_id}>
                    <td>
                      <div className="cuenta-persona">
                        <span className="cuenta-avatar">{cuenta.email?.[0]?.toUpperCase() || '?'}</span>
                        <span>
                          <strong>{cuenta.email}</strong>
                          {propia && <span className="cuenta-vos">Esta sesión</span>}
                        </span>
                      </div>
                    </td>
                    <td><span className={`cuenta-rol cuenta-rol-${cuenta.rol}`}>{ROL_LABELS[cuenta.rol]}</span></td>
                    <td>
                      <span className={`badge ${cuenta.bloqueado ? 'badge-mantenimiento' : 'badge-disponible'}`}>
                        {cuenta.bloqueado ? 'Bloqueada' : 'Activa'}
                      </span>
                    </td>
                    <td className={vinculo === '—' ? 'cuenta-vacio' : undefined}>{vinculo === '—' ? 'Sin vínculo' : vinculo}</td>
                    <td>
                      <div className="cuentas-acciones">
                        <Button size="small" variant="secondary" onClick={() => {
                          setErrorAccion(null);
                          setForm({
                            usuarioId: cuenta.usuario_id,
                            email: cuenta.email,
                            clave: '',
                            rol: cuenta.rol,
                            inquilinoId: cuenta.inquilino_id || '',
                            propietarioId: cuenta.propietario_id || '',
                          });
                        }}>Editar</Button>
                        <Button size="small" variant="secondary" onClick={() => { setErrorAccion(null); setClave(''); setClaveDe(cuenta); }}>Clave</Button>
                        <Button
                          size="small"
                          variant={cuenta.bloqueado ? 'primary' : 'warning'}
                          disabled={propia}
                          onClick={() => { setErrorAccion(null); setBloqueo(cuenta); }}
                        >
                          {cuenta.bloqueado ? 'Desbloquear' : 'Bloquear'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Paginacion {...paginacion} onChange={paginacion.setPagina} />
        </div>
      )}

      <Modal isOpen={!!form} onClose={() => { if (!procesando) setForm(null); }} title={form?.usuarioId ? 'Editar cuenta' : 'Nueva cuenta'} size="medium">
        {form && (
          <form onSubmit={guardarCuenta}>
            {errorAccion && <div className="form-error-global">{errorAccion}</div>}

            <div className="form-section">
              <p className="form-section-title">Acceso</p>

              <div className="form-group">
                <label htmlFor="cuenta_email">Email *</label>
                <input id="cuenta_email" type="email" value={form.email} disabled={!!form.usuarioId} required onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              {!form.usuarioId && (
                <div className="form-group">
                  <label htmlFor="cuenta_clave">Contraseña *</label>
                  <input id="cuenta_clave" type="text" minLength={6} value={form.clave} required onChange={(event) => setForm({ ...form, clave: event.target.value })} />
                  <p className="form-hint">Mínimo 6 caracteres.</p>
                </div>
              )}
            </div>

            <div className="form-section">
              <p className="form-section-title">Rol y vínculo</p>

              <div className="form-group">
                <label htmlFor="cuenta_rol">Rol *</label>
                <select id="cuenta_rol" value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value, inquilinoId: '', propietarioId: '' })}>
                  {Object.values(ROL).map((rol) => (
                    <option key={rol} value={rol}>{ROL_LABELS[rol]}</option>
                  ))}
                </select>
              </div>
              {form.rol === ROL.INQUILINO && (
                <div className="form-group">
                  <label htmlFor="cuenta_inquilino">Inquilino *</label>
                  <select id="cuenta_inquilino" value={form.inquilinoId} required onChange={(event) => setForm({ ...form, inquilinoId: event.target.value })}>
                    <option value="">Seleccionar</option>
                    {personasDisponibles(inquilinos, form.inquilinoId).map((persona) => (
                      <option key={persona.id} value={persona.id}>{nombreInquilino(persona)} · {persona.documento}</option>
                    ))}
                  </select>
                </div>
              )}
              {form.rol === ROL.PROPIETARIO && (
                <div className="form-group">
                  <label htmlFor="cuenta_propietario">Propietario *</label>
                  <select id="cuenta_propietario" value={form.propietarioId} required onChange={(event) => setForm({ ...form, propietarioId: event.target.value })}>
                    <option value="">Seleccionar</option>
                    {personasDisponibles(propietarios, form.propietarioId).map((persona) => (
                      <option key={persona.id} value={persona.id}>{nombreInquilino(persona)} · {persona.documento}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="confirm-actions">
              <Button type="button" variant="secondary" disabled={procesando} onClick={() => setForm(null)}>Cancelar</Button>
              <Button type="submit" variant={form.usuarioId ? 'primary' : 'success'} disabled={procesando}>{procesando ? 'Guardando...' : form.usuarioId ? 'Guardar Cambios' : 'Crear Cuenta'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!claveDe} onClose={() => { if (!procesando) setClaveDe(null); }} title="Cambiar contraseña" size="small">
        <form onSubmit={guardarClave}>
          {errorAccion && <div className="form-error-global">{errorAccion}</div>}

          <div className="form-section">
            <p className="form-section-title">Nueva contraseña</p>

            <p className="form-hint">Cuenta: {claveDe?.email}</p>
            <div className="form-group">
              <label htmlFor="nueva_clave">Contraseña *</label>
              <input id="nueva_clave" type="text" minLength={6} value={clave} required onChange={(event) => setClave(event.target.value)} />
            </div>
          </div>

          <div className="confirm-actions">
            <Button type="button" variant="secondary" disabled={procesando} onClick={() => setClaveDe(null)}>Cancelar</Button>
            <Button type="submit" disabled={procesando}>{procesando ? 'Guardando...' : 'Cambiar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!bloqueo}
        title={bloqueo?.bloqueado ? 'Desbloquear cuenta' : 'Bloquear cuenta'}
        message={bloqueo?.bloqueado
          ? `¿Desbloquear ${bloqueo.email}? Va a poder iniciar sesión de nuevo.`
          : `¿Bloquear ${bloqueo?.email}? No va a poder iniciar sesión hasta que la rehabilites.`}
        confirmLabel={bloqueo?.bloqueado ? 'Desbloquear' : 'Bloquear'}
        variant={bloqueo?.bloqueado ? 'primary' : 'warning'}
        busy={procesando}
        onConfirm={confirmarBloqueo}
        onCancel={() => { if (!procesando) setBloqueo(null); }}
      />
    </div>
  );
}
