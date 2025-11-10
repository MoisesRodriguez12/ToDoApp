import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { GOOGLE_CONFIG } from '../constants/googleConfig';
import StorageService from './storageService';
import { User } from '../types';

WebBrowser.maybeCompleteAuthSession();

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
   * Hook para autenticación con Google
   */
  useGoogleAuth() {
    // Para Expo, usar el Web Client ID funciona mejor en desarrollo
    const [request, response, promptAsync] = Google.useAuthRequest({
      clientId: GOOGLE_CONFIG.WEB_CLIENT_ID,
      iosClientId: GOOGLE_CONFIG.IOS_CLIENT_ID,
      androidClientId: GOOGLE_CONFIG.ANDROID_CLIENT_ID,
      scopes: GOOGLE_CONFIG.SCOPES,
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
    await StorageService.clearUser();
  }
}

export default GoogleAuthService.getInstance();