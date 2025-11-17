// Configuración de variables de entorno
// Usando EXPO_PUBLIC_ prefix para que Expo las cargue automáticamente

// Validación de variables de entorno requeridas
const validateEnvVar = (name: string, value?: string): string => {
  if (!value || value.includes('YOUR_') || value === '') {
    throw new Error(
      `⚠️ Variable de entorno ${name} no configurada. ` +
      `Por favor configura esta variable en el archivo .env. ` +
      `Usa .env.example como plantilla.`
    );
  }
  return value;
};

export const ENV = {
  // @ts-ignore - Las variables EXPO_PUBLIC_ se inyectan en tiempo de compilación
  GEMINI_API_KEY: validateEnvVar('EXPO_PUBLIC_GEMINI_API_KEY', process.env.EXPO_PUBLIC_GEMINI_API_KEY),
};

