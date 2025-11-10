import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApp } from '@/contexts/AppContext';
import { TaskStatus } from '@/types';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const {
    tasks,
    user,
    currentRecommendation,
    dayPlan,
    energyProfile,
    isLoading,
    getRecommendation,
    generateDayPlan,
    completeTask,
    recordDecision,
  } = useApp();

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [showDayPlan, setShowDayPlan] = useState(false);

  useEffect(() => {
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
    if (tasks.length > 0 && !currentRecommendation && !isLoading) {
      getRecommendation();
    }
  }, [tasks.length]);

  const handleAcceptRecommendation = async () => {
    if (!currentRecommendation) return;

    Alert.alert(
      '✓ Completar Tarea',
      `¿Marcar "${currentRecommendation.recommendedTask.title}" como completada?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          style: 'default',
          onPress: async () => {
            try {
              await completeTask(currentRecommendation.recommendedTask.id);
              await recordDecision(
                currentRecommendation.recommendedTask.id,
                currentRecommendation.recommendedTask.id,
                true
              );
              
              Alert.alert(
                '🎉 ¡Excelente!',
                'Has completado la tarea recomendada.',
                [{ text: 'OK', onPress: () => getRecommendation() }]
              );
            } catch (error) {
              Alert.alert('Error', 'No se pudo completar la tarea');
            }
          },
        },
      ]
    );
  };

  const handleRefreshRecommendation = () => {
    getRecommendation();
  };

  const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
  const completedToday = tasks.filter(
    t =>
      t.status === TaskStatus.COMPLETED &&
      t.completedAt &&
      new Date(t.completedAt).toDateString() === new Date().toDateString()
  );

  const currentHour = new Date().getHours();
  const currentEnergy =
    energyProfile?.hourlyEnergyMap.find(e => e.hour === currentHour)?.energyLevel || 'medium';

  const greeting = getGreeting();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            <ThemedText style={styles.greeting}>{greeting}</ThemedText>
            <ThemedText style={styles.userName}>
              {user?.name || 'Usuario'}
            </ThemedText>
            <ThemedText style={styles.date}>
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </ThemedText>
          </Animated.View>
          
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('../profile' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Estadísticas con cards modernas */}
      <Animated.View
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#f093fb', '#f5576c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Ionicons name="list-outline" size={28} color="#FFFFFF" />
          <ThemedText style={styles.statNumber}>{pendingTasks.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Pendientes</ThemedText>
        </LinearGradient>

        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Ionicons name="checkmark-circle-outline" size={28} color="#FFFFFF" />
          <ThemedText style={styles.statNumber}>{completedToday.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Hoy</ThemedText>
        </LinearGradient>

        <LinearGradient
          colors={['#43e97b', '#38f9d7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Ionicons name={getEnergyIcon(currentEnergy)} size={28} color="#FFFFFF" />
          <ThemedText style={styles.statEnergyText}>{currentEnergy.toUpperCase()}</ThemedText>
          <ThemedText style={styles.statLabel}>Energía</ThemedText>
        </LinearGradient>
      </Animated.View>

      {/* Botón para generar plan del día */}
      <View style={styles.planButtonContainer}>
        <TouchableOpacity
          style={styles.planButton}
          onPress={async () => {
            await generateDayPlan();
            setShowDayPlan(true);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.planButtonGradient}
          >
            <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
            <ThemedText style={styles.planButtonText}>
              Generar Plan del Día
            </ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Vista del Plan del Día */}
      {showDayPlan && dayPlan && (
        <View style={styles.dayPlanSection}>
          <View style={styles.dayPlanHeader}>
            <ThemedText style={styles.dayPlanTitle}>📋 Tu Plan para Hoy</ThemedText>
            <TouchableOpacity onPress={() => setShowDayPlan(false)}>
              <ThemedText style={styles.closeButton}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.dayPlanSummary}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.summaryGradient}
            >
              <ThemedText style={styles.summaryText}>
                {dayPlan.totalTasks} tareas • {Math.floor(dayPlan.estimatedTotalTime / 60)}h{' '}
                {dayPlan.estimatedTotalTime % 60}min estimados
              </ThemedText>
            </LinearGradient>
          </View>

          <ThemedText style={styles.dayPlanReasoning}>
            {dayPlan.reasoning}
          </ThemedText>

          {/* Mañana */}
          {dayPlan.tasksByTimeSlot.morning.length > 0 && (
            <View style={styles.timeSlotCard}>
              <View style={styles.timeSlotHeader}>
                <Ionicons name="partly-sunny-outline" size={24} color="#667eea" />
                <ThemedText style={styles.timeSlotTitle}>
                  Mañana ({dayPlan.tasksByTimeSlot.morning.length} tareas)
                </ThemedText>
              </View>
              {dayPlan.tasksByTimeSlot.morning.slice(0, 3).map((task, index) => (
                <View key={`morning-${task.id}`} style={styles.miniTaskCard}>
                  <View style={styles.miniTaskNumber}>
                    <ThemedText style={styles.miniTaskNumberText}>{index + 1}</ThemedText>
                  </View>
                  <ThemedText style={styles.miniTaskTitle}>{task.title}</ThemedText>
                  <ThemedText style={styles.miniTaskTime}>
                    {task.estimatedEffort || 30}min
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Tarde */}
          {dayPlan.tasksByTimeSlot.afternoon.length > 0 && (
            <View style={styles.timeSlotCard}>
              <View style={styles.timeSlotHeader}>
                <Ionicons name="sunny-outline" size={24} color="#f97316" />
                <ThemedText style={styles.timeSlotTitle}>
                  Tarde ({dayPlan.tasksByTimeSlot.afternoon.length} tareas)
                </ThemedText>
              </View>
              {dayPlan.tasksByTimeSlot.afternoon.slice(0, 3).map((task, index) => (
                <View key={`afternoon-${task.id}`} style={styles.miniTaskCard}>
                  <View style={styles.miniTaskNumber}>
                    <ThemedText style={styles.miniTaskNumberText}>{index + 1}</ThemedText>
                  </View>
                  <ThemedText style={styles.miniTaskTitle}>{task.title}</ThemedText>
                  <ThemedText style={styles.miniTaskTime}>
                    {task.estimatedEffort || 30}min
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Noche */}
          {dayPlan.tasksByTimeSlot.evening.length > 0 && (
            <View style={styles.timeSlotCard}>
              <View style={styles.timeSlotHeader}>
                <Ionicons name="moon-outline" size={24} color="#8b5cf6" />
                <ThemedText style={styles.timeSlotTitle}>
                  Noche ({dayPlan.tasksByTimeSlot.evening.length} tareas)
                </ThemedText>
              </View>
              {dayPlan.tasksByTimeSlot.evening.slice(0, 3).map((task, index) => (
                <View key={`evening-${task.id}`} style={styles.miniTaskCard}>
                  <View style={styles.miniTaskNumber}>
                    <ThemedText style={styles.miniTaskNumberText}>{index + 1}</ThemedText>
                  </View>
                  <ThemedText style={styles.miniTaskTitle}>{task.title}</ThemedText>
                  <ThemedText style={styles.miniTaskTime}>
                    {task.estimatedEffort || 30}min
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Recomendación de IA con diseño premium */}
      <View style={styles.recommendationSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.aiIconContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.aiIconGradient}
            >
              <Ionicons name="bulb-outline" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.sectionTitleContainer}>
            <ThemedText style={styles.sectionTitle}>Recomendación IA</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Optimizada para este momento
            </ThemedText>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#667eea" />
            <ThemedText style={styles.loadingText}>
              Analizando tus tareas con IA...
            </ThemedText>
            <ThemedText style={styles.loadingSubtext}>
              Considerando energía, urgencia e impacto
            </ThemedText>
          </View>
        ) : currentRecommendation ? (
          <View style={styles.recommendationCard}>
            <LinearGradient
              colors={['#ffffff', '#f8f9ff']}
              style={styles.cardGradient}
            >
              {/* Badge de confianza */}
              <View style={styles.confidenceBadge}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confidenceGradient}
                >
                  <ThemedText style={styles.confidenceText}>
                    {Math.round(currentRecommendation.confidenceScore * 100)}% Match
                  </ThemedText>
                </LinearGradient>
              </View>

              {/* Título de la tarea */}
              <ThemedText style={styles.taskTitle}>
                {currentRecommendation.recommendedTask.title}
              </ThemedText>

              {/* Descripción */}
              {currentRecommendation.recommendedTask.description && (
                <ThemedText style={styles.taskDescription}>
                  {currentRecommendation.recommendedTask.description}
                </ThemedText>
              )}

              {/* Métricas visuales */}
              <View style={styles.metricsContainer}>
                <View style={styles.metricItem}>
                  <View style={styles.metricIconContainer}>
                    <Ionicons name="time-outline" size={24} color="#667eea" />
                  </View>
                  <ThemedText style={styles.metricLabel}>Tiempo</ThemedText>
                  <ThemedText style={styles.metricValue}>
                    {currentRecommendation.estimatedCompletionTime} min
                  </ThemedText>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <View style={styles.metricIconContainer}>
                    <Ionicons name="flash-outline" size={24} color="#667eea" />
                  </View>
                  <ThemedText style={styles.metricLabel}>Energía</ThemedText>
                  <ThemedText style={styles.metricValue}>
                    {currentRecommendation.recommendedTask.energyRequired}
                  </ThemedText>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <View style={styles.metricIconContainer}>
                    <Ionicons name="trophy-outline" size={24} color="#667eea" />
                  </View>
                  <ThemedText style={styles.metricLabel}>Impacto</ThemedText>
                  <ThemedText style={styles.metricValue}>
                    {currentRecommendation.recommendedTask.impact}/10
                  </ThemedText>
                </View>
              </View>

              {/* Razonamiento */}
              <View style={styles.reasoningContainer}>
                <View style={styles.reasoningHeader}>
                  <Ionicons name="bulb-outline" size={20} color="#fbbf24" />
                  <ThemedText style={styles.reasoningTitle}>
                    Por qué ahora
                  </ThemedText>
                </View>
                <ThemedText style={styles.reasoningText}>
                  {currentRecommendation.reasoning}
                </ThemedText>
              </View>

              {/* Factores contextuales */}
              {currentRecommendation.contextualFactors.length > 0 && (
                <View style={styles.factorsContainer}>
                  {currentRecommendation.contextualFactors.slice(0, 3).map((factor, index) => (
                    <View key={index} style={styles.factorChip}>
                      <ThemedText style={styles.factorText}>
                        {factor.factor}
                      </ThemedText>
                      <View style={styles.factorWeight}>
                        <ThemedText style={styles.factorWeightText}>
                          {Math.round(factor.weight * 100)}%
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Botones de acción */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={handleAcceptRecommendation}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryActionGradient}
                  >
                    <ThemedText style={styles.primaryActionText}>
                      ✓ Empezar Ahora
                    </ThemedText>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleRefreshRecommendation}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.secondaryActionText}>
                    🔄 Otra Sugerencia
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.emptyStateCard}>
            <ThemedText style={styles.emptyIcon}>📝</ThemedText>
            <ThemedText style={styles.emptyTitle}>
              No hay tareas pendientes
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              Agrega nuevas tareas para recibir recomendaciones inteligentes
            </ThemedText>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => Alert.alert('Próximamente', 'Ve a la pestaña Tareas para agregar')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.emptyActionGradient}
              >
                <ThemedText style={styles.emptyActionText}>+ Agregar Tarea</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Alternativas */}
      {currentRecommendation && currentRecommendation.alternativeTasks.length > 0 && (
        <View style={styles.alternativesSection}>
          <ThemedText style={styles.alternativesTitle}>
            Otras opciones para ti
          </ThemedText>
          {currentRecommendation.alternativeTasks.slice(0, 3).map((task, index) => (
            <View key={`alternative-${task.id}-${index}`} style={styles.alternativeCard}>
              <View style={styles.alternativeHeader}>
                <View style={styles.alternativeNumber}>
                  <ThemedText style={styles.alternativeNumberText}>
                    {index + 1}
                  </ThemedText>
                </View>
                <View style={styles.alternativeContent}>
                  <ThemedText style={styles.alternativeTitle}>
                    {task.title}
                  </ThemedText>
                  <View style={styles.alternativeDetails}>
                    <ThemedText style={styles.alternativeDetail}>
                      ⏱️ {task.estimatedEffort} min
                    </ThemedText>
                    <ThemedText style={styles.alternativeDetail}>
                      • {task.category}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '¡Buenos días!';
  if (hour < 18) return '¡Buenas tardes!';
  return '¡Buenas noches!';
}

function getEnergyIcon(level: string): any {
  switch (level.toLowerCase()) {
    case 'high':
      return 'flash-outline';
    case 'medium':
      return 'fitness-outline';
    case 'low':
      return 'moon-outline';
    default:
      return 'fitness-outline';
  }
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'capitalize',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statEnergyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  recommendationSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiIconContainer: {
    marginRight: 16,
  },
  aiIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  aiIcon: {
    fontSize: 28,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  recommendationCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    padding: 24,
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  confidenceGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    lineHeight: 32,
  },
  taskDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 24,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 12,
  },
  reasoningContainer: {
    backgroundColor: '#fffbf0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reasoningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  reasoningText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  factorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  factorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 8,
  },
  factorText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  factorWeight: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  factorWeightText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryAction: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryActionGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryAction: {
    backgroundColor: '#f8f9ff',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  secondaryActionText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyAction: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alternativesSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  alternativesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  alternativeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  alternativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alternativeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alternativeNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  alternativeContent: {
    flex: 1,
  },
  alternativeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  alternativeDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  alternativeDetail: {
    fontSize: 13,
    color: '#666',
  },
  // Estilos del botón de planificar día
  planButtonContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 20,
  },
  planButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f093fb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  planButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  planButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  planButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos del plan del día
  dayPlanSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  dayPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayPlanTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 4,
  },
  dayPlanSummary: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  summaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  dayPlanReasoning: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
  },
  timeSlotCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9ff',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeSlotIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  timeSlotTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  miniTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  miniTaskNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  miniTaskNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  miniTaskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  miniTaskTime: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
  },
});
