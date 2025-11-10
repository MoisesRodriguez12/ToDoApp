// Configuración de Google OAuth
// Las credenciales se cargan desde .env

export const GOOGLE_CONFIG = {
  // Client IDs de Google Cloud Console
  IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '869108899367-m6odatnphdb1io2i1j4c4jt0p390p18t.apps.googleusercontent.com',
  ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '869108899367-m6odatnphdb1io2i1j4c4jt0p390p18t.apps.googleusercontent.com',
  WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '869108899367-h0jt1mmmaom6kursmmkpf62e5jd87tuo.apps.googleusercontent.com',
  
  // Scopes que necesitamos
  SCOPES: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
};
