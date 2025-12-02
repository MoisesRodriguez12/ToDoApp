# ToDoApp

Aplicación móvil para gestión de tareas y rutinas, creada con Expo + React Native y TypeScript. Permite crear, organizar y programar tareas y rutinas diarias, con soporte para autenticación, sincronización y almacenamiento local.

**Descripción**
- **Propósito**: Gestionar tareas, rutinas y hábitos de forma sencilla y visual.
- **Plataforma**: Aplicación móvil multiplataforma (iOS / Android) basada en Expo.

**Características principales**
- **Crear y editar tareas**: Añadir tareas con detalles, fechas y repetición.
- **Rutinas**: Agrupar tareas en rutinas periódicas.
- **Autenticación**: Integración con Google para inicio de sesión.
- **Integraciones**: Conexión con Google Calendar para sincronizar eventos (servicio disponible en `services/`).
- **Persistencia**: Almacenamiento local y servicios para sincronización remota (ver `services/storageService.ts`).

**Arquitectura**
- **Frontend**: Expo + React Native con TypeScript.
- **Rutas y pantallas**: Carpeta `app/` contiene las pantallas y la navegación (incluye un layout de pestañas en `(tabs)/`).
- **Componentes**: `components/` contiene componentes reutilizables de UI.
- **Servicios**: `services/` alberga la lógica de integración (Google Auth, Google Calendar, Gemini, almacenamiento).
- **Contextos y estado**: `contexts/AppContext.tsx` usa React Context para el estado global y la configuración de la app.
- **Hooks**: `hooks/` contiene hooks personalizados para esquemas de color y lógica compartida.
- **Tipos y constantes**: `types/` y `constants/` centralizan tipos TypeScript y configuraciones.

**Estructura de carpetas (clave)**
- `app/` — pantallas y rutas.
- `components/` — UI reutilizable.
- `services/` — servicios y adaptadores (auth, calendar, storage, gemini).
- `contexts/` — proveedor(es) de estado global.
- `hooks/` — hooks personalizados.
- `assets/` — imágenes y recursos.
- `types/` — definiciones TypeScript.

**Instalación y ejecución (resumen)**
1. Instalar dependencias:

```
npm install
```

2. Ejecutar la app con Expo:

```
npx expo start
```

Abre el proyecto en un emulador o en un dispositivo físico con la app Expo Go.

