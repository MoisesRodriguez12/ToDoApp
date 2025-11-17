// Configuración de variables de entorno
// Usando EXPO_PUBLIC_ prefix para que Expo las cargue automáticamente

export const ENV = {
  // @ts-ignore - Las variables EXPO_PUBLIC_ se inyectan en tiempo de compilación
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
};

