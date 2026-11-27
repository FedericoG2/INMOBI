import { useState } from 'react';
import { alquileresService } from '../../../services/alquileresService';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icons';
import { SubirArchivos } from '../../../shared/components/SubirArchivos';
import { useToast } from '../../../shared/components/Toast';
import { formatearFecha, formatearMonto } from '../../propiedades/utils';
import { portalService } from '../portalService';
import { estadoPeriodo, nombrePeriodo } from '../utils';

// Comprobantes de un período. Con puedeCargar, el inquilino registra uno nuevo.
export function ComprobantesPortal({ periodo, puedeCargar, onCargado }) {
  const [archivos, setArchivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();
  const comprobantes = periodo.comprobantes_pago || [];
  const estado = estadoPeriodo(periodo);

  async function registrar() {
    setEnviando(true);
    try {
      await alquileresService.subirComprobante(periodo.id, archivos[0]);
      setArchivos([]);
      await onCargado();
      toast.success('Comprobante registrado. La inmobiliaria tiene que confirmar el pago.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="portal-comprobantes">
      <div className="portal-resumen">
        <div><small>Período</small><strong>{nombrePeriodo(periodo)}</strong></div>
        <div><small>Monto</small><strong>{formatearMonto(periodo.monto)}</strong></div>
        <div><small>Vence</small><strong>{formatearFecha(periodo.fecha_vencimiento)}</strong></div>
        <div><small>Estado</small><span className={`cd-estado cd-estado-${estado.clase}`}>{estado.texto}</span></div>
      </div>

      <h3>Comprobantes registrados</h3>
      {comprobantes.length === 0 ? (
        <p className="cd-vacio">Todavía no hay comprobantes para este período.</p>
      ) : (
        <ul className="portal-archivos">
          {comprobantes.map((comprobante) => (
            <li key={comprobante.id}>
              <span>
                {comprobante.nombre_archivo}
                <small>Subido el {new Date(comprobante.subido_en).toLocaleDateString('es-AR')}</small>
              </span>
              <button
                type="button"
                className="portal-enlace"
                onClick={() => portalService
                  .descargar('comprobantes-pago', comprobante.ruta_storage, comprobante.nombre_archivo)
                  .catch((err) => toast.error(err.message))}
              >
                <Icon name="download" size={15} /> Descargar
              </button>
            </li>
          ))}
        </ul>
      )}

      {puedeCargar && (
        <div className="portal-carga">
          <h3>Registrar comprobante</h3>
          <SubirArchivos value={archivos} onChange={setArchivos} accept=".pdf,image/*" disabled={enviando} />
          <p className="portal-nota">
            <Icon name="alert" size={16} />
            Registrar el comprobante no confirma el pago: lo confirma la inmobiliaria.
          </p>
          <div className="form-actions">
            <Button variant="success" onClick={registrar} disabled={enviando || archivos.length === 0}>
              {enviando ? 'Enviando...' : 'Registrar Comprobante'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
