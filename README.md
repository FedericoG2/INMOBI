# Inmobi

Sistema de gestión inmobiliaria para la administración de alquileres. Proyecto de tesis universitaria.

El foco actual es el panel del **Encargado de alquileres**.

## Módulos

| Módulo | Qué permite |
|---|---|
| Dashboard | Indicadores generales, reclamos pendientes, contratos por vencer y evolución del IPC |
| Propietarios | Alta, edición y baja, con las propiedades de cada uno |
| Propiedades | Alta, edición y baja, estados e historial de contratos y reclamos |
| Inquilinos | Alta, edición y baja, con sus contratos y reclamos |
| Contratos | Alta guiada en cuatro pasos, documentos adjuntos y cierre de contratos |
| Alquileres | Períodos mensuales, comprobantes y confirmación de pagos |
| Aumentos | Cálculo por IPC e ICL, revisión, confirmación y comprobante en PDF |
| Reclamos | Registro, seguimiento por etapas, comentarios e imágenes |

El rol **Administrador** gestiona las cuentas de usuario. Los portales de inquilino y propietario todavía no están desarrollados.

## Estados principales

| Entidad | Transiciones |
|---|---|
| Propiedad | Disponible ↔ Mantenimiento. Un contrato programado la deja Reservada, uno activo Alquilada, y al cerrarse vuelve a Disponible |
| Contrato | Programado → Activo o Cancelado. Activo → Finalizado o Rescindido |
| Período de alquiler | Pendiente ↔ Pagado |
| Aumento | Pendiente → Revisado → Confirmado. Un confirmado puede deshacerse bajo ciertas condiciones |
| Reclamo | Pendiente → En proceso → Revisión → Resuelto. Un resuelto puede reabrirse (vuelve a En proceso) |

## Reglas de negocio destacadas

- No se permiten personas ni propiedades repetidas.
- Un pago requiere un comprobante adjunto y, si corresponde, el aumento del mes ya aplicado.
- El período de trabajo es el mes anterior hasta el día 10 inclusive; desde el 11 pasa al mes en curso.
- Los reclamos solo se registran sobre contratos activos.
- La carga manual de índices se habilita únicamente si la API de índices no responde.

## Tecnologías

- React 19, React Router 7 y Vite 8
- Supabase: PostgreSQL, autenticación y almacenamiento de archivos
- Índices IPC e ICL desde la API de [Argly](https://api.argly.com.ar)
- oxlint para el análisis del código

## Cómo levantarlo

### Requisitos

- Node.js 20.19 o superior (en la línea 20), o 22.12 en adelante
- Un proyecto de Supabase con la base de datos del sistema

### Pasos

```bash
git clone https://github.com/FedericoG2/INMOBI.git
cd INMOBI
npm install
```

Copiar `.env.example` como `.env` y completar los datos del proyecto de Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

### Base de datos

Este repositorio contiene solo la aplicación: **no incluye los scripts de la base de datos**. El sistema necesita las tablas, funciones y disparadores ya creados en Supabase, además de estos espacios de almacenamiento:

- `documentos-contratos`
- `comprobantes-pago`
- `comprobantes-aumentos`
- `reclamos-imagenes`

Los usuarios y sus roles también se administran en Supabase; no se publican credenciales.

## Comandos

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación para producción |
| `npm run preview` | Vista previa de la compilación |
| `npm run lint` | Análisis del código |

En desarrollo, las consultas a Argly pasan por un proxy de Vite (`/argly`).

## Estructura

```
src/
  app/        Rutas, diseño general y precarga de datos
  features/   Un directorio por módulo
  services/   Acceso a Supabase y reglas de negocio
  shared/     Componentes y estilos reutilizables
  constants/  Estados y etiquetas
```
