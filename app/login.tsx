import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApp } from '@/contexts/AppContext';
import GoogleAuthService from '@/services/googleAuthService';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useApp();
  const { request, response, promptAsync } = GoogleAuthService.useGoogleAuth();
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Animación de entrada suave
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      handleAuthSuccess();
    } else if (response?.type === 'error') {
      setIsLoading(false);
    }
  }, [response]);

  const handleAuthSuccess = async () => {
    const user = await GoogleAuthService.processAuthResponse(response);
    if (user) {
      setUser(user);
      router.replace('/(tabs)');
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await promptAsync();
  };

  const handleSkipLogin = () => {
    router.replace('/(tabs)');
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header con logo minimalista */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <ThemedText style={styles.logoEmoji}>✓</ThemedText>
            </View>
            <ThemedText style={styles.appTitle}>TaskFlow</ThemedText>
            <ThemedText style={styles.appSubtitle}>Gestión Inteligente</ThemedText>
          </View>
        </Animated.View>

        {/* Contenido principal */}
        <Animated.View 
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.welcomeSection}>
            <ThemedText style={styles.welcomeTitle}>
              Bienvenido
            </ThemedText>
            <ThemedText style={styles.welcomeDescription}>
              Organiza tu día con recomendaciones{'\n'}
              inteligentes basadas en IA
            </ThemedText>
          </View>

          {/* Features minimalistas */}
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <ThemedText style={styles.featureIcon}>🎯</ThemedText>
              </View>
              <ThemedText style={styles.featureTitle}>Enfoque IA</ThemedText>
              <ThemedText style={styles.featureDesc}>Recomendaciones personalizadas</ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <ThemedText style={styles.featureIcon}>⚡</ThemedText>
              </View>
              <ThemedText style={styles.featureTitle}>Productivo</ThemedText>
              <ThemedText style={styles.featureDesc}>Optimiza tu energía</ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <ThemedText style={styles.featureIcon}>📊</ThemedText>
              </View>
              <ThemedText style={styles.featureTitle}>Analytics</ThemedText>
              <ThemedText style={styles.featureDesc}>Seguimiento de progreso</ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Footer con acciones */}
        <Animated.View 
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!request || isLoading) && styles.primaryButtonDisabled,
            ]}
            onPress={handleGoogleLogin}
            disabled={!request || isLoading}
            activeOpacity={0.9}
          >
            <View style={styles.buttonContent}>
              <View style={styles.googleIconContainer}>
                <ThemedText style={styles.googleIcon}>G</ThemedText>
              </View>
              <ThemedText style={styles.primaryButtonText}>
                {isLoading ? 'Conectando...' : 'Continuar con Google'}
              </ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSkipLogin}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.secondaryButtonText}>
              Probar sin cuenta
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.legalText}>
            Al continuar aceptas la sincronización{'\n'}
            segura con Google Calendar
          </ThemedText>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flex: 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -1,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  mainContent: {
    flex: 0.5,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  welcomeDescription: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    flex: 0.3,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FAFAFA',
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  legalText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});