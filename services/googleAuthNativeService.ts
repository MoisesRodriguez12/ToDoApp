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
        webClientId: GOOGLE_CONFIG.WEB_CLIENT_ID, // Requerido para Android
        iosClientId: GOOGLE_CONFIG.IOS_CLIENT_ID,
        scopes: GOOGLE_CONFIG.SCOPES,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
      console.log('✅ Google Sign-In configurado correctamente');
    } catch (error) {
      console.error('❌ Error configurando Google Sign-In:', error);
    }
  }

  /**
   * Inicia sesión con Google usando el método nativo
   */
  async signIn(): Promise<User | null> {
    try {
      console.log('🔐 Iniciando Google Sign-In nativo...');
      
      // Verificar servicios de Google Play
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      
      // Obtener información del usuario
      const userInfo = await GoogleSignin.signIn();
      
      // En v16, data contiene la información del usuario
      const userData = userInfo.data;
      if (!userData) {
        throw new Error('No se pudo obtener información del usuario');
      }
      
      console.log('✅ Usuario autenticado:', userData.user.email);
      
      // Obtener tokens
      const tokens = await GoogleSignin.getTokens();
      
      // Crear objeto User
      const user: User = {
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.name || '',
        photoUrl: userData.user.photo || '',
        googleAccessToken: tokens.accessToken,
        googleRefreshToken: tokens.idToken || '', // v16 usa idToken en lugar de refreshToken
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      await StorageService.saveUser(user);
      return user;

    } catch (error: any) {
      console.error('❌ Error en Google Sign-In:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('⚠️ Usuario canceló el inicio de sesión');
        return null;
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('⏳ Inicio de sesión en progreso...');
        return null;
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.error('❌ Google Play Services no disponible');
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
      const userInfo = await GoogleSignin.signInSilently();
      
      if (userInfo && userInfo.data) {
        const tokens = await GoogleSignin.getTokens();
        const userData = userInfo.data;
        
        const user: User = {
          id: userData.user.id,
          email: userData.user.email,
          name: userData.user.name || '',
          photoUrl: userData.user.photo || '',
          googleAccessToken: tokens.accessToken,
          googleRefreshToken: tokens.idToken || '',
          createdAt: new Date(),
          lastLoginAt: new Date(),
        };
        
        return user;
      }
    } catch (error) {
      console.log('No hay usuario autenticado silenciosamente');
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
      console.log('✅ Sesión cerrada correctamente');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
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
      console.log('✅ Acceso revocado correctamente');
    } catch (error) {
      console.error('❌ Error al revocar acceso:', error);
      await StorageService.clearUser();
    }
  }
}

export default GoogleAuthNativeService.getInstance();