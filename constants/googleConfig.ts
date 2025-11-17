// Configuración de Google OAuth
// Las credenciales se cargan desde .env

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

export const GOOGLE_CONFIG = {
  // Client IDs de Google Cloud Console - DEBEN configurarse en .env
  IOS_CLIENT_ID: validateEnvVar('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
  ANDROID_CLIENT_ID: validateEnvVar('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
  WEB_CLIENT_ID: validateEnvVar('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  
  // Scopes que necesitamos
  SCOPES: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
};
