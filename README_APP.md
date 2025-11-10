# 🎯 Planificador Inteligente de Tareas

Un asistente de productividad impulsado por IA que utiliza Google Gemini para analizar tus tareas diarias y recomendarte qué hacer en cada momento, considerando tu energía, preferencias y objetivos.

## ✨ Características Principales

### 🤖 Análisis Inteligente con IA
- Motor de decisiones basado en **Gemini 2.0 Flash** para análisis contextual de tareas
- Evaluación multifactorial: impacto, urgencia, esfuerzo, afinidad personal y fechas límite
- Recomendaciones personalizadas según tu perfil de energía y hora del día
- Explicación detallada del razonamiento detrás de cada recomendación

### 💾 Sistema de Memoria Persistente
- **Preferencias de usuario**: Perfil de energía por horarios, reglas personales y preferencias por categoría
- **Historial de decisiones**: Registro de qué elegiste, cuándo y si lo completaste
- **Aprendizaje continuo**: El sistema mejora sus recomendaciones basándose en tu historial
- **Configuración personalizable**: Modifica preferencias en tiempo real

### 📋 Gestión de Tareas
- Importación desde Google Calendar
- Creación manual de tareas en la aplicación
- Categorización automática de tareas por tipo de trabajo
- Seguimiento de progreso con estado de completado
- Sincronización bidireccional con Google Calendar

### ⚡ Perfil de Energía Inteligente
- **Mapeo horario de energía**: Define cuándo tienes más o menos energía
- **Matching automático**: Asigna tareas complejas a horas de alta energía
- **Respeto de reglas personales**: No trabajo después de cierta hora, breaks obligatorios, etc.
- **Adaptación dinámica**: Ajusta recomendaciones según el momento del día

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- Expo CLI
- Cuenta de Google con acceso a Google Calendar
- API Key de Google Gemini

### Paso 1: Instalar dependencias

\`\`\`bash
cd ToDoApp
npm install
\`\`\`

### Paso 2: Configurar API Key de Gemini

Tu API key ya está configurada en `constants/env.ts`. Si necesitas cambiarla, edita ese archivo.

### Paso 3: Ejecutar la aplicación

\`\`\`bash
# Iniciar el servidor de desarrollo
npm start

# Para ejecutar en Android
npm run android

# Para ejecutar en iOS
npm run ios

# Para ejecutar en web
npm run web
\`\`\`

## 📱 Estructura del Proyecto

\`\`\`
ToDoApp/
├── app/                          # Pantallas de la aplicación
│   ├── (tabs)/
│   │   ├── index.tsx            # Dashboard con recomendación IA
│   │   ├── explore.tsx          # Lista de tareas
│   │   └── _layout.tsx          # Navegación de tabs
│   ├── _layout.tsx              # Layout principal
│   └── modal.tsx                # Modal general
├── services/                     # Servicios de la aplicación
│   ├── geminiService.ts         # Integración con Gemini AI
│   ├── googleCalendarService.ts # Integración con Google Calendar
│   └── storageService.ts        # Almacenamiento local
├── contexts/                     # Contextos de React
│   └── AppContext.tsx           # Estado global de la aplicación
├── types/                        # Definiciones TypeScript
│   └── index.ts                 # Tipos principales
├── constants/                    # Constantes
│   ├── env.ts                   # Variables de entorno
│   └── theme.ts                 # Tema de la aplicación
└── components/                   # Componentes reutilizables
\`\`\`

## 🎮 Uso de la Aplicación

### 1️⃣ Pantalla Principal (Dashboard)
- Muestra la **tarea recomendada** por la IA en este momento
- Incluye razonamiento detallado de por qué es la mejor opción
- Estadísticas rápidas: tareas pendientes, completadas hoy, nivel de energía
- Botones para aceptar recomendación u obtener otra sugerencia

### 2️⃣ Pantalla de Tareas
- Lista completa de todas tus tareas
- Filtros: Todas, Pendientes, Completadas
- Agregar nuevas tareas manualmente
- Importar tareas desde Google Calendar
- Sincronizar con Google Calendar
- Marcar tareas como completadas con un tap

### 3️⃣ Agregar Tarea
- Título (obligatorio)
- Descripción
- Tiempo estimado
- Categoría (trabajo, personal, aprendizaje, salud, etc.)
- Prioridad (baja, media, alta, urgente)
- Nivel de energía requerida

## 🔧 Configuración de Google Calendar

### Permisos necesarios:
- **iOS**: Se solicita automáticamente al usar la app
- **Android**: Se solicita automáticamente al usar la app

### Funcionalidades de Calendar:
1. **Importar tareas**: Lee eventos de tu calendario y los convierte en tareas
2. **Exportar tareas**: Crea eventos en tu calendario desde las tareas
3. **Sincronización**: Mantiene tareas y eventos sincronizados

## 🧠 Cómo Funciona la IA

### Factores que considera Gemini:
1. **Nivel de energía actual** (según la hora del día)
2. **Urgencia** (proximidad a la fecha límite)
3. **Impacto** (importancia de la tarea)
4. **Esfuerzo estimado** (tiempo necesario)
5. **Afinidad personal** (qué tan cómodo te sientes con la tarea)
6. **Reglas personales** (restricciones de horario)
7. **Historial de decisiones** (aprende de tus elecciones previas)

### Sistema de Aprendizaje:
- Registra qué tareas aceptas o rechazas
- Aprende tus patrones de productividad
- Mejora recomendaciones con el tiempo
- Se adapta a tus preferencias

## 📊 Perfil de Energía

El sistema viene con un perfil de energía por defecto basado en patrones comunes:

- **6:00 - 9:00**: Energía media (despertar)
- **9:00 - 12:00**: Energía alta (pico matutino)
- **12:00 - 14:00**: Energía media (almuerzo)
- **14:00 - 17:00**: Energía alta (pico vespertino)
- **17:00 - 20:00**: Energía media (tarde)
- **20:00 - 22:00**: Energía baja (noche)
- **22:00 - 6:00**: Energía baja (descanso)

Podrás personalizar este perfil en futuras versiones.

## 🔐 Privacidad y Datos

- Todos los datos se almacenan **localmente** en tu dispositivo
- No se envían datos personales a servidores externos (excepto a Gemini AI para análisis)
- Gemini AI solo recibe información de tareas para generar recomendaciones
- No se comparte información con terceros

## 🛠️ Próximas Características

- [ ] Pantalla de configuración de perfil de energía
- [ ] Pantalla de estadísticas y métricas de productividad
- [ ] Autenticación con Google (OAuth)
- [ ] Notificaciones inteligentes
- [ ] Widget de inicio
- [ ] Modo offline completo
- [ ] Exportar/Importar datos
- [ ] Temas personalizados

## 📝 Notas de Desarrollo

### Estado Actual:
✅ Integración con Gemini AI completada
✅ Servicio de Google Calendar implementado
✅ Sistema de almacenamiento local funcional
✅ Dashboard con recomendaciones IA
✅ Gestión de tareas básica
✅ Perfil de energía por defecto

### Pendiente:
⏳ Autenticación con Google OAuth
⏳ Pantalla de configuración
⏳ Pantalla de perfil de energía personalizable
⏳ Historial de decisiones UI
⏳ Estadísticas y gráficos

## 🤝 Contribución

Este es un proyecto en desarrollo. Sugerencias y mejoras son bienvenidas.

## 📄 Licencia

MIT License

---

**Hecho con ❤️**
