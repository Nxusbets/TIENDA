# Plataforma Purificadora - Nuevo Proyecto

Esta plataforma permite:
- Registrar productos (nombre, código, precio proveedor, precio cliente)
- Registrar ventas con escáner
- Consultar ventas e inventario
- Apertura y corte de caja

## Tecnologías
- React con Material-UI (frontend)
- Node.js con Express (backend)
- Firebase (base de datos)

## Estructura del Proyecto
- `/frontend`: Aplicación React con Material-UI
- `/backend`: API Node.js con Express
- `/api`: Funciones serverless (Vercel)

## Instalación y Configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm
- Cuenta de Firebase

### Pasos de Instalación
1. **Clonar e instalar dependencias:**
   ```bash
   # Frontend
   cd frontend
   npm install
   
   # Backend  
   cd ../backend
   npm install
   ```

2. **Configurar Firebase:**
   - Crear proyecto en Firebase Console
   - Configurar Firestore Database
   - Añadir credenciales en ambos proyectos

3. **Ejecutar el proyecto:**
   ```bash
   # Desde VS Code: Ctrl+Shift+P -> Tasks: Run Task -> Start Both
   # O manualmente:
   cd frontend && npm start  # Puerto 3000
   cd backend && npm start   # Puerto por defecto
   ```

## Funcionalidades Principales

### Gestión de Productos
- Registro con código de barras
- Precios diferenciados (proveedor/cliente)
- Control de inventario (ahora compatible con litros y presentaciones para purificadora)

### Sistema de Ventas
- Escáner de códigos de barras
- Cálculo automático de totales
- Registro de transacciones (ventas almacenan unidad/litros)

### Administración
- Apertura y corte de caja
- Reportes de ventas
- Consultas de inventario

## Uso
1. Acceder a `http://localhost:3000`
2. Configurar productos en el inventario
3. Realizar ventas usando el escáner o búsqueda manual
4. Consultar reportes y gestionar caja

## Desarrollo
- Frontend se ejecuta en puerto 3000
- Backend se ejecuta en puerto configurado
- Recarga automática durante desarrollo

## Personalización
Este proyecto está basado en el repositorio original pero adaptado para la Purificadora; revisa `frontend/src/models.js` para ver los modelos de datos sugeridos y `backend/scripts/migrate_purificadora_schema.js` para ayudar con migraciones.

# Plataforma Purificadora — Documentación técnica

Resumen
- Aplicación para gestión de una purificadora: control de productos (garrafones, accesorios), registro de compras (pipas), ventas, caja y consultas.
- Arquitectura: Frontend React + Material‑UI, backend Node/Express (opcional), Firebase (Firestore) como BBDD en tiempo real.

Objetivos del proyecto
- Controlar inventario por unidades y por litros.
- Registrar entradas de pipa y mantener un almacén central de litros.
- Descontar litros del almacén automáticamente al registrar ventas.
- Auditar movimientos (compras, pipas, ventas, cambios de inventario).
- Interfaz ágil para punto de venta con escáner.

Arquitectura y componentes
- Frontend (frontend/): React, MUI, suscripciones onSnapshot a Firestore.
- Servicios (frontend/src/services/): lógica compartida (p. ej. cálculos de litros, transacciones atomicas).
- Backend (backend/, opcional): API REST para tareas administrativas o migraciones.
- Firestore:
  - colecciones principales: productos, ventas, compras, pipas, almacen (doc: agua)
  - reglas: limitar escrituras según rol; validar schema mínimo.

Modelo de datos (resumen)
- productos: { codigo, nombre, presentacion, stock, stockLitros, precioProveedor, precioCliente, categoria }
- pipas: { proveedor, litrosTotales, numeroFactura, referencia, notas, fecha, usuario }
- compras: { ... } (registro contable)
- ventas: { fecha, usuario, total, productos: [{id, nombre, cantidad, litros}], metodoPago }
- almacen/agua (doc): { litrosDisponibles }

Instalación (desarrollo, Windows)
1. Clonar repo
2. Frontend:
   - cd frontend
   - npm install
   - npm start (http://localhost:3000)
3. Backend (si aplica):
   - cd backend
   - npm install
   - npm start

Configuración de Firebase
- Crear proyecto en Firebase Console y Firestore.
- Crear credenciales (web config) en frontend/src/firebase.js.
- Para tareas de backend con service account, definir GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON.

Operaciones clave y buenas prácticas
- Registrar pipas mediante el formulario de Compras: suma litros a almacen/agua con transacción.
- Al registrar una venta, usar transacciones para:
  - descontar unidades del producto,
  - descontar litros del doc almacen/agua,
  - crear documento en ventas.
- Usar presentacion en productos (ej. "20 L") para cálculo de litros por unidad.
- Mantener onSnapshot en vistas principales para consistencia en tiempo real.
- Realizar backfill de stockLitros si hay datos históricos incompletos.

Pruebas y migración
- Scripts de migración/validación disponibles en backend/scripts.
- Probar en entorno local con datos de ejemplo antes de producción.

Seguridad y backup
- Reglas Firestore para roles (admin vs vendedor).
- Copias regulares/export de Firestore (console o gcloud).
- Registrar auditoría de acciones críticas (quien, cuándo, qué cambió).

Despliegue
- Frontend: hosting estático (Vercel, Firebase Hosting, Netlify).
- Backend: servidor Node o funciones serverless; proteger endpoints con auth.

Contribución
- Fork → branch por feature → PR con descripción y pruebas mínimas.
- Mantener coherencia en estilos y validaciones.

Contacto / Soporte
- Documentar issues y logs en repo; añadir pasos para replicar errores.

Licencia
- Añadir licencia apropiada (MIT, Apache, etc.) según preferencia del proyecto.
