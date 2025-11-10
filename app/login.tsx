import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApp } from '@/contexts/AppContext';
import GoogleAuthService from '@/services/googleAuthService';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useApp();
  const { request, response, promptAsync } = GoogleAuthService.useGoogleAuth();
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
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
    <View style={styles.container}>
      {/* Fondo con gradiente */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Círculos decorativos animados */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo y branding */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <ThemedText style={styles.logoIcon}>🎯</ThemedText>
          </View>
          <ThemedText style={styles.appName}>TaskMaster AI</ThemedText>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>Powered by Gemini</ThemedText>
          </View>
        </View>

        {/* Título y descripción */}
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>
            Bienvenido al Futuro{'\n'}de la Productividad
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Deja que la IA analice tus tareas y te recomiende{'\n'}
            qué hacer en cada momento del día
          </ThemedText>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <ThemedText style={styles.featureIcon}>🤖</ThemedText>
            <ThemedText style={styles.featureText}>Recomendaciones IA</ThemedText>
          </View>
          <View style={styles.feature}>
            <ThemedText style={styles.featureIcon}>⚡</ThemedText>
            <ThemedText style={styles.featureText}>Perfil de Energía</ThemedText>
          </View>
          <View style={styles.feature}>
            <ThemedText style={styles.featureIcon}>📅</ThemedText>
            <ThemedText style={styles.featureText}>Sync Calendar</ThemedText>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.googleButton,
              (!request || isLoading) && styles.googleButtonDisabled,
            ]}
            onPress={handleGoogleLogin}
            disabled={!request || isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.googleButtonContent}>
              <ThemedText style={styles.googleIcon}>🔐</ThemedText>
              <ThemedText style={styles.googleButtonText}>
                {isLoading ? 'Conectando...' : 'Continuar con Google'}
              </ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipLogin}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.skipButtonText}>
              Explorar sin cuenta
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <ThemedText style={styles.disclaimer}>
          Al continuar, aceptas sincronizar con Google Calendar{'\n'}
          y que la IA analice tus tareas de forma segura
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -100,
    right: -100,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -50,
    left: -50,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    top: height * 0.4,
    right: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#FFFFFF',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleIcon: {
    fontSize: 24,
  },
  googleButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 24,
    lineHeight: 16,
  },
});