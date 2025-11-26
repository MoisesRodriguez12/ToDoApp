import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_CONFIG } from '../constants/googleConfig';
import StorageService from './storageService';
import { User } from '../types';

export class GoogleAuthNativeService {
  private static instance: GoogleAuthNativeService;

  private constructor() {
    this.configure();
  }

  static getInstance(): GoogleAuthNativeService {
    if (!GoogleAuthNativeService.instance) {
      GoogleAuthNativeService.instance = new GoogleAuthNativeService();
    }
    return GoogleAuthNativeService.instance;
  }

  /**
   * Configura Google Sign-In
   */
  private configure() {
    try {
      GoogleSignin.configure({
        webClientId: GOOGLE_CONFIG.WEB_CLIENT_ID, // Requerido para Android - debe ser el OAuth 2.0 Web Client ID
        iosClientId: GOOGLE_CONFIG.IOS_CLIENT_ID,
        scopes: GOOGLE_CONFIG.SCOPES,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
    } catch (error) {
      console.error('Error configurando Google Sign-In:', error);
    }
  }

  /**
   * Inicia sesión con Google usando el método nativo
   */
  async signIn(): Promise<User | null> {
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      
      const response = await GoogleSignin.signIn();
      
      // v13 retorna { type, data }
      if (response.type === 'cancelled') {
        return null;
      }
      
      const userInfo = response.data;
      
      // Obtener tokens
      const tokens = await GoogleSignin.getTokens();
      
      // Crear objeto User
      const user: User = {
        id: userInfo.user.id,
        email: userInfo.user.email,
        name: userInfo.user.name || '',
        photoUrl: userInfo.user.photo || '',
        googleAccessToken: tokens.accessToken,
        googleRefreshToken: userInfo.idToken || tokens.accessToken,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      await StorageService.saveUser(user);
      return user;

    } catch (error: any) {
      console.error('Error en Google Sign-In:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return null;
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return null;
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services no está disponible en este dispositivo');
      }
      
      throw error;
    }
  }

  /**
   * Verifica si el usuario está autenticado
   */
  async isSignedIn(): Promise<boolean> {
    try {
      const currentUser = await GoogleSignin.getCurrentUser();
      return currentUser !== null;
    } catch (error) {
      console.error('Error verificando estado de autenticación:', error);
      return false;
    }
  }

  /**
   * Obtiene información del usuario actual
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await GoogleSignin.signInSilently();
      
      if (response && response.type === 'success') {
        const tokens = await GoogleSignin.getTokens();
        const userInfo = response.data;
        
        const user: User = {
          id: userInfo.user.id,
          email: userInfo.user.email,
          name: userInfo.user.name || '',
          photoUrl: userInfo.user.photo || '',
          googleAccessToken: tokens.accessToken,
          googleRefreshToken: userInfo.idToken || tokens.accessToken,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        };
        
        return user;
      }
    } catch (error) {
      // Silent sign-in failed
    }
    
    return null;
  }

  /**
   * Cierra sesión
   */
  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      await StorageService.clearUser();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Limpiar storage local aunque falle el signOut de Google
      await StorageService.clearUser();
    }
  }

  /**
   * Revoca el acceso completamente
   */
  async revokeAccess(): Promise<void> {
    try {
      await GoogleSignin.revokeAccess();
      await StorageService.clearUser();
    } catch (error) {
      console.error('Error al revocar acceso:', error);
      await StorageService.clearUser();
    }
  }
}

export default GoogleAuthNativeService.getInstance();