import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { GOOGLE_CONFIG } from '../constants/googleConfig';
import StorageService from './storageService';
import { User } from '../types';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

// Verificar si estamos en un build nativo o en Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

export class GoogleAuthService {
  private static instance: GoogleAuthService;

  private constructor() {}

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  /**
   * Método principal de autenticación que usa Google Play Services solo en builds nativos
   */
  async authenticateUser(): Promise<User | null> {
    try {
      // Si estamos en Expo Go (desarrollo), usar método web
      if (isExpoGo) {
        throw new Error('En desarrollo, usa el botón de login que llama a promptAsync()');
      }
      
      // En builds nativos, usar Google Sign-In nativo
      const GoogleAuthNativeService = require('./googleAuthNativeService').default;
      return await GoogleAuthNativeService.signIn();
    } catch (error) {
      console.error('Error en autenticación:', error);
      throw error;
    }
  }

  /**
   * Hook para autenticación con Google (fallback para desarrollo)
   */
  useGoogleAuth() {
    const redirectUri = makeRedirectUri({
      scheme: 'todoapp',
      preferLocalhost: false,
    });

    const [request, response, promptAsync] = Google.useAuthRequest({
      androidClientId: GOOGLE_CONFIG.ANDROID_CLIENT_ID,
      iosClientId: GOOGLE_CONFIG.IOS_CLIENT_ID,
      webClientId: GOOGLE_CONFIG.WEB_CLIENT_ID,
      scopes: GOOGLE_CONFIG.SCOPES,
      redirectUri,
    });

    return { request, response, promptAsync };
  }

  /**
   * Procesa la respuesta de autenticación
   */
  async processAuthResponse(response: any): Promise<User | null> {
    if (response?.type === 'success') {
      const { authentication } = response;
      
      // Obtener información del usuario
      const userInfo = await this.getUserInfo(authentication.accessToken);
      
      if (userInfo) {
        const user: User = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          photoUrl: userInfo.picture,
          googleAccessToken: authentication.accessToken,
          googleRefreshToken: authentication.refreshToken,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        };

        await StorageService.saveUser(user);
        return user;
      }
    }
    
    return null;
  }

  /**
   * Obtiene información del usuario desde Google
   */
  private async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Cierra sesión
   */
  async signOut(): Promise<void> {
    try {
      // Solo usar el servicio nativo en builds nativos
      if (!isExpoGo) {
        const GoogleAuthNativeService = require('./googleAuthNativeService').default;
        await GoogleAuthNativeService.signOut();
      } else {
        await StorageService.clearUser();
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      await StorageService.clearUser();
    }
  }
}

export default GoogleAuthService.getInstance();