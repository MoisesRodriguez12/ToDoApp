import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useApp } from '@/contexts/AppContext';
import { EnergyLevel, TaskCategory } from '@/types';

type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, energyProfile, preferences, updateEnergyProfile, updatePreferences, logout } = useApp();
  
  const [userName, setUserName] = useState(user?.name || '');
  const [workStart, setWorkStart] = useState(preferences?.workingHours.start.toString() || '9');
  const [workEnd, setWorkEnd] = useState(preferences?.workingHours.end.toString() || '18');
  const [breakDuration, setBreakDuration] = useState(preferences?.breakDuration.toString() || '15');
  
  // Estado para energía por día
  const [energyByDay, setEnergyByDay] = useState<Record<DayOfWeek, EnergyLevel>>({
    'Lunes': EnergyLevel.MEDIUM,
    'Martes': EnergyLevel.MEDIUM,
    'Miércoles': EnergyLevel.MEDIUM,
    'Jueves': EnergyLevel.MEDIUM,
    'Viernes': EnergyLevel.MEDIUM,
    'Sábado': EnergyLevel.HIGH,
    'Domingo': EnergyLevel.HIGH,
  });

  // Estado para preferencias de categorías
  const [categoryPreferences, setCategoryPreferences] = useState<Record<TaskCategory, boolean>>({
    [TaskCategory.WORK]: true,
    [TaskCategory.PERSONAL]: true,
    [TaskCategory.HEALTH]: true,
    [TaskCategory.CREATIVE]: true,
    [TaskCategory.LEARNING]: true,
    [TaskCategory.ADMINISTRATIVE]: true,
    [TaskCategory.SOCIAL]: true,
  });

  const handleSaveProfile = async () => {
    try {
      await updatePreferences({
        workingHours: {
          start: parseInt(workStart) || 9,
          end: parseInt(workEnd) || 18,
        },
        breakDuration: parseInt(breakDuration) || 15,
      });

      Alert.alert('✓ Guardado', 'Tu perfil se ha actualizado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el perfil');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user?.photoUrl ? (
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color="#FFFFFF" />
              </View>
            )}
          </View>
          <ThemedText style={styles.userName}>{user?.name || 'Usuario'}</ThemedText>
          <ThemedText style={styles.userEmail}>{user?.email || ''}</ThemedText>
        </View>
      </LinearGradient>

      {/* Configuración */}
      <View style={styles.content}>
        {/* Horario de Trabajo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={24} color="#667eea" />
            <ThemedText style={styles.sectionTitle}>Horario de Trabajo</ThemedText>
          </View>

          <View style={styles.card}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Hora de Inicio</ThemedText>
                <View style={styles.inputContainer}>
                  <Ionicons name="sunny-outline" size={20} color="#666" />
                  <TextInput
                    style={styles.input}
                    value={workStart}
                    onChangeText={setWorkStart}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="9"
                  />
                  <ThemedText style={styles.inputSuffix}>:00</ThemedText>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Hora de Fin</ThemedText>
                <View style={styles.inputContainer}>
                  <Ionicons name="moon-outline" size={20} color="#666" />
                  <TextInput
                    style={styles.input}
                    value={workEnd}
                    onChangeText={setWorkEnd}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="18"
                  />
                  <ThemedText style={styles.inputSuffix}>:00</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Duración de Descansos</ThemedText>
              <View style={styles.inputContainer}>
                <Ionicons name="cafe-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  value={breakDuration}
                  onChangeText={setBreakDuration}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="15"
                />
                <ThemedText style={styles.inputSuffix}>minutos</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Perfil de Energía */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={24} color="#667eea" />
            <ThemedText style={styles.sectionTitle}>Perfil de Energía</ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.description}>
              Tu energía varía durante el día. Configura tus momentos de mayor y menor energía.
            </ThemedText>
            
            <View style={styles.energyPreview}>
              <View style={styles.energyItem}>
                <Ionicons name="sunny" size={32} color="#fbbf24" />
                <ThemedText style={styles.energyLabel}>Mañana</ThemedText>
                <ThemedText style={styles.energyValue}>
                  {energyProfile?.hourlyEnergyMap.filter(e => e.hour >= 6 && e.hour < 12).filter(e => e.energyLevel === EnergyLevel.HIGH).length || 0} horas alta
                </ThemedText>
              </View>

              <View style={styles.energyItem}>
                <Ionicons name="partly-sunny" size={32} color="#f97316" />
                <ThemedText style={styles.energyLabel}>Tarde</ThemedText>
                <ThemedText style={styles.energyValue}>
                  {energyProfile?.hourlyEnergyMap.filter(e => e.hour >= 12 && e.hour < 18).filter(e => e.energyLevel === EnergyLevel.HIGH).length || 0} horas alta
                </ThemedText>
              </View>

              <View style={styles.energyItem}>
                <Ionicons name="moon" size={32} color="#8b5cf6" />
                <ThemedText style={styles.energyLabel}>Noche</ThemedText>
                <ThemedText style={styles.energyValue}>
                  {energyProfile?.hourlyEnergyMap.filter(e => e.hour >= 18 && e.hour < 24).filter(e => e.energyLevel === EnergyLevel.HIGH).length || 0} horas alta
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Energía por Día de la Semana */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={24} color="#667eea" />
            <ThemedText style={styles.sectionTitle}>Energía por Día</ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.description}>
              Configura tu nivel de energía típico para cada día de la semana
            </ThemedText>
            
            {(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as DayOfWeek[]).map((day) => (
              <View key={day} style={styles.dayRow}>
                <ThemedText style={styles.dayLabel}>{day}</ThemedText>
                <View style={styles.energySelector}>
                  {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => {
                    const isSelected = energyByDay[day] === level;
                    const iconName = level === 'high' ? 'flash' : level === 'medium' ? 'fitness' : 'moon';
                    const color = level === 'high' ? '#10b981' : level === 'medium' ? '#f59e0b' : '#8b5cf6';
                    
                    return (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.energyButton,
                          isSelected && { backgroundColor: color + '20', borderColor: color }
                        ]}
                        onPress={() => setEnergyByDay(prev => ({ ...prev, [day]: level }))}
                      >
                        <Ionicons 
                          name={iconName} 
                          size={20} 
                          color={isSelected ? color : '#999'} 
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Preferencias de Categorías */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid-outline" size={24} color="#667eea" />
            <ThemedText style={styles.sectionTitle}>Categorías Favoritas</ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.description}>
              Selecciona las categorías de tareas que más te interesan
            </ThemedText>
            
            {Object.entries(categoryPreferences).map(([category, enabled]) => {
              const categoryLabels: Record<TaskCategory, string> = {
                [TaskCategory.WORK]: 'Trabajo',
                [TaskCategory.PERSONAL]: 'Personal',
                [TaskCategory.LEARNING]: 'Aprendizaje',
                [TaskCategory.HEALTH]: 'Salud',
                [TaskCategory.CREATIVE]: 'Creatividad',
                [TaskCategory.ADMINISTRATIVE]: 'Administrativo',
                [TaskCategory.SOCIAL]: 'Social',
              };
              
              const categoryIcons: Record<TaskCategory, any> = {
                [TaskCategory.WORK]: 'briefcase-outline',
                [TaskCategory.PERSONAL]: 'person-outline',
                [TaskCategory.LEARNING]: 'school-outline',
                [TaskCategory.HEALTH]: 'fitness-outline',
                [TaskCategory.CREATIVE]: 'color-palette-outline',
                [TaskCategory.ADMINISTRATIVE]: 'document-text-outline',
                [TaskCategory.SOCIAL]: 'people-outline',
              };

              return (
                <View key={category} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <Ionicons 
                      name={categoryIcons[category as TaskCategory]} 
                      size={24} 
                      color="#667eea" 
                    />
                    <ThemedText style={styles.categoryLabel}>
                      {categoryLabels[category as TaskCategory]}
                    </ThemedText>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={(value) => 
                      setCategoryPreferences(prev => ({ ...prev, [category]: value }))
                    }
                    trackColor={{ false: '#ddd', true: '#667eea' }}
                    thumbColor={enabled ? '#FFFFFF' : '#f4f3f4'}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveProfile}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
            <ThemedText style={styles.saveButtonText}>Guardar Cambios</ThemedText>
          </LinearGradient>
        </TouchableOpacity>

        {/* Botón Cerrar Sesión */}
        {user && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <ThemedText style={styles.logoutButtonText}>Cerrar Sesión</ThemedText>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  inputSuffix: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  energyPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  energyItem: {
    alignItems: 'center',
  },
  energyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 8,
  },
  energyValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  energySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  energyButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
});
