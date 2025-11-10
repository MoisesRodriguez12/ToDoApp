// Configuración de variables de entorno
// Las variables se cargan desde .env

import Constants from 'expo-constants';

export const ENV = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || Constants.expoConfig?.extra?.GEMINI_API_KEY || '',
};

