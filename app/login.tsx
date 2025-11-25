import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Image,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
      <LinearGradient
        colors={['#0066FF', '#00C6FF']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo y título centrado */}
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <ThemedText 
                style={styles.appTitle}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                TaskFlow
              </ThemedText>
              <ThemedText 
                style={styles.appSubtitle}
                adjustsFontSizeToFit
                numberOfLines={2}
              >
                Tu asistente de productividad
              </ThemedText>
            </View>
          </Animated.View>

        {/* Botones de acción */}
        <Animated.View 
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
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
              Usar sin cuenta
            </ThemedText>
          </TouchableOpacity>
        </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Math.max(height * 0.05, 20),
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Math.max(width * 0.08, 20),
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: Math.min(width * 0.35, 150),
    height: Math.min(width * 0.35, 150),
    marginBottom: Math.max(height * 0.03, 20),
  },
  appTitle: {
    fontSize: Math.min(width * 0.09, 38),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    paddingHorizontal: 20,
  },
  appSubtitle: {
    fontSize: Math.min(width * 0.042, 17),
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Math.max(width * 0.08, 20),
    paddingBottom: Platform.OS === 'ios' ? Math.max(height * 0.04, 30) : Math.max(height * 0.03, 20),
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 17,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F3F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIcon: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0066FF',
    includeFontPadding: false,
  },
  primaryButtonText: {
    color: '#0066FF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
});
