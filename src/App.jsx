import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import './App.css';

function App() {
  const [conexionOk, setConexionOk] = useState(false);
  const [tablas, setTablas] = useState([]);

  useEffect(() => {
    // Verificar conexión listando tablas del schema public
    const verificarConexion = async () => {
      try {
        const { data, error } = await supabase
          .from('propietarios')
          .select('id')
          .limit(1);
        
        if (!error) {
          setConexionOk(true);
          // Lista de tablas del proyecto
          setTablas([
            'propietarios',
            'propiedades', 
            'inquilinos',
            'contratos',
            'documentos_contrato',
            'periodos_alquiler',
            'comprobantes_pago'
          ]);
        }
      } catch (err) {
        console.error('Error al conectar con Supabase:', err);
      }
    };

    verificarConexion();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏢 Inmobi</h1>
        <h2>Sistema de Gestión Inmobiliaria</h2>
        
        <div style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '600px' }}>
          <h3>✅ Etapa 0 Completada</h3>
          <ul style={{ lineHeight: '1.8' }}>
            <li>Proyecto Vite + React creado</li>
            <li>Dependencias instaladas (react-router-dom, @supabase/supabase-js)</li>
            <li>Estructura de carpetas lista (app, lib, services, features, shared, constants)</li>
            <li>Cliente Supabase configurado</li>
            <li>Enums alineados con la DB</li>
          </ul>

          <h3 style={{ marginTop: '2rem' }}>
            {conexionOk ? '✅' : '⏳'} Conexión a Supabase
          </h3>
          {conexionOk ? (
            <>
              <p>✨ Conectado exitosamente</p>
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer' }}>Ver tablas disponibles</summary>
                <ul style={{ marginTop: '0.5rem' }}>
                  {tablas.map(tabla => (
                    <li key={tabla}><code>{tabla}</code></li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <p>Verificando conexión...</p>
          )}

          <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px', color: '#333' }}>
            <strong>Próximo paso:</strong> Etapa 1 - Auth y Layout del Encargado
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
