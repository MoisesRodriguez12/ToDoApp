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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApp } from '@/contexts/AppContext';
import { TaskStatus } from '@/types';
import * as Notifications from 'expo-notifications';

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
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

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

  // Detectar cuando dayPlan cambia y tiene datos
  useEffect(() => {
    if (dayPlan && dayPlan.detailedPlan) {
      console.log('🔄 dayPlan actualizado en UI con detailedPlan');
      console.log('📊 timeBlocks:', (dayPlan as any).detailedPlan.timeBlocks?.length);
      console.log('☕ breaks:', (dayPlan as any).detailedPlan.breaks?.length);
      console.log('💡 tips:', (dayPlan as any).detailedPlan.productivityTips?.length);
    }
  }, [dayPlan]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const enableDND = async () => {
    try {
      // Request notification permissions first
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        // Set notification handler to not show notifications
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: false,
            shouldShowList: false,
          }),
        });
        console.log('📵 Do Not Disturb mode enabled');
      }
    } catch (error) {
      console.error('Error enabling DND:', error);
    }
  };

  const disableDND = () => {
    // Reset notification handler to default
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    console.log('🔔 Do Not Disturb mode disabled');
  };

  const startTimer = async (minutes: number, urgency: number) => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    const totalSeconds = minutes * 60;
    setTimeRemaining(totalSeconds);
    setTimerActive(true);

    // Enable DND if urgency >= 8
    if (urgency >= 8) {
      await enableDND();
      Alert.alert(
        '📵 Modo Concentración',
        'Se ha activado el modo No Molestar debido a la alta urgencia de esta tarea.',
        [{ text: 'Entendido' }]
      );
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          if (urgency >= 8) {
            disableDND();
          }
          Alert.alert(
            '⏰ Tiempo Completado',
            '¡Has terminado el tiempo estimado para esta tarea!',
            [
              {
                text: 'Marcar como completada',
                onPress: handleAcceptRecommendation,
              },
              { text: 'Continuar trabajando' },
            ]
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimerInterval(interval as any);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setTimerActive(false);
    setTimeRemaining(0);
    disableDND();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTask = async () => {
    if (!currentRecommendation) return;

    const task = currentRecommendation.recommendedTask;
    const estimatedMinutes = task.estimatedEffort || currentRecommendation.estimatedCompletionTime || 30;
    const urgency = task.urgency || 5;

    if (timerActive) {
      Alert.alert(
        'Detener Timer',
        '¿Quieres detener el timer actual?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Detener',
            style: 'destructive',
            onPress: stopTimer,
          },
        ]
      );
    } else {
      Alert.alert(
        '⏱️ Empezar Tarea',
        `Iniciar timer de ${estimatedMinutes} minutos para "${task.title}"?${urgency >= 8 ? '\\n\\n📵 Se activará el modo No Molestar' : ''}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Comenzar',
            onPress: () => startTimer(estimatedMinutes, urgency),
          },
        ]
      );
    }
  };

  const handleAcceptRecommendation = async () => {
    if (!currentRecommendation) return;

    // Stop timer if active
    if (timerActive) {
      stopTimer();
    }

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
          <Ionicons name="list-outline" size={24} color="#FFFFFF" />
          <ThemedText style={styles.statNumber}>{pendingTasks.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Pendientes</ThemedText>
        </LinearGradient>

        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
          <ThemedText style={styles.statNumber}>{completedToday.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Hoy</ThemedText>
        </LinearGradient>

        <LinearGradient
          colors={['#43e97b', '#38f9d7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Ionicons name={getEnergyIcon(currentEnergy)} size={24} color="#FFFFFF" />
          <ThemedText style={styles.statEnergyText}>{currentEnergy.toUpperCase()}</ThemedText>
          <ThemedText style={styles.statLabel}>Energía</ThemedText>
        </LinearGradient>
      </Animated.View>

      {/* Botón para generar plan del día */}
      <View style={styles.planButtonContainer}>
        <TouchableOpacity
          style={styles.planButton}
          onPress={async () => {
            console.log('🚀 BOTÓN GENERAR PLAN PRESIONADO');
            console.log(`📊 Tareas pendientes: ${pendingTasks.length}`);
            
            setShowDayPlan(true); // Mostrar ANTES para que el estado esté listo
            await generateDayPlan();
            
            console.log('✅ generateDayPlan() COMPLETADO');
            
            // Esperar un tick para que el estado se actualice
            setTimeout(() => {
              console.log('═══════════════════════════════════════════════════════');
              console.log('dayPlan recibido en componente:', JSON.stringify(dayPlan, null, 2));
              console.log('═══════════════════════════════════════════════════════');
              
              if (dayPlan) {
                console.log('📋 Estructura del plan en UI:');
                console.log('- planTitle:', (dayPlan as any).planTitle);
                console.log('- reasoning length:', dayPlan.reasoning?.length || 0);
                console.log('- detailedPlan existe:', !!dayPlan.detailedPlan);
                
                if (dayPlan.detailedPlan) {
                  console.log('  - timeBlocks:', (dayPlan as any).detailedPlan.timeBlocks?.length || 0);
                  console.log('  - breaks:', (dayPlan as any).detailedPlan.breaks?.length || 0);
                  console.log('  - productivityTips:', (dayPlan as any).detailedPlan.productivityTips?.length || 0);
                  
                  if ((dayPlan as any).detailedPlan.timeBlocks?.length > 0) {
                    console.log('  📍 Primer bloque de tiempo:');
                    console.log(JSON.stringify((dayPlan as any).detailedPlan.timeBlocks[0], null, 2));
                  }
                  
                  if ((dayPlan as any).detailedPlan.breaks?.length > 0) {
                    console.log('  ☕ Primer descanso:');
                    console.log(JSON.stringify((dayPlan as any).detailedPlan.breaks[0], null, 2));
                  }
                }
              } else {
                console.log('⚠️ dayPlan es null o undefined');
              }
            }, 100);
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
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.summaryGradient}
            >
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Ionicons name="list-outline" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.summaryLabel}>{dayPlan.totalTasks} tareas</ThemedText>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Ionicons name="time-outline" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.summaryLabel}>
                    {Math.floor(dayPlan.estimatedTotalTime / 60)}h {dayPlan.estimatedTotalTime % 60}min
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Razonamiento del plan - Más profesional */}
          <View style={styles.reasoningCard}>
            <View style={styles.reasoningIconWrapper}>
              <LinearGradient
                colors={['#fbbf24', '#f59e0b']}
                style={styles.reasoningIconGradient}
              >
                <Ionicons name="analytics" size={20} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <ThemedText style={styles.reasoningTitle}>Estrategia del Día</ThemedText>
            <ThemedText style={styles.dayPlanReasoning}>
              {dayPlan.reasoning}
            </ThemedText>
          </View>

          {/* Consejos de Productividad */}
          {(dayPlan as any)?.detailedPlan?.productivityTips?.length > 0 && (
            <View style={styles.productivitySection}>
              <View style={styles.productivityHeader}>
                <Ionicons name="rocket" size={22} color="#667eea" />
                <ThemedText style={styles.productivityTitle}>Consejos de Productividad</ThemedText>
              </View>
              {(dayPlan as any).detailedPlan.productivityTips.map((tip: string, index: number) => (
                <View key={index} style={styles.productivityTipCard}>
                  <View style={styles.tipIconContainer}>
                    <Ionicons 
                      name={tip.includes('CONCENTRACIÓN') || tip.includes('CONCENTRACION') ? 'radio-button-on' :
                            tip.includes('DESCANSO') ? 'bed-outline' :
                            tip.includes('OPTIMIZACIÓN') || tip.includes('OPTIMIZACION') ? 'flash-outline' :
                            tip.includes('ENFOQUE') ? 'eye-outline' : 'fitness-outline'}
                      size={20}
                      color={tip.includes('CONCENTRACIÓN') || tip.includes('CONCENTRACION') ? '#3b82f6' :
                            tip.includes('DESCANSO') ? '#8b5cf6' :
                            tip.includes('OPTIMIZACIÓN') || tip.includes('OPTIMIZACION') ? '#f59e0b' :
                            tip.includes('ENFOQUE') ? '#06b6d4' : '#10b981'}
                    />
                  </View>
                  <ThemedText style={styles.productivityTipText}>{tip}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Plan Detallado con Bloques de Tiempo */}
          {dayPlan.detailedPlan && (
            <View style={styles.detailedPlanContainer}>
              
              {/* Bloques de tiempo */}
              {(dayPlan as any)?.detailedPlan?.timeBlocks?.length > 0 && (
                <View style={styles.timeBlocksSection}>
                  <View style={styles.timeBlocksHeader}>
                    <Ionicons name="time" size={22} color="#667eea" />
                    <ThemedText style={styles.timeBlocksTitle}>Agenda del Día</ThemedText>
                  </View>
                  {(dayPlan as any).detailedPlan.timeBlocks.map((block: any, index: number) => (
                    <View key={index} style={styles.timeBlockItem}>
                      <View style={styles.timeBlockTimeWrapper}>
                        <ThemedText style={styles.timeBlockStartTime}>
                          {block.startTime || block.timeRange?.split(' - ')[0] || ''}
                        </ThemedText>
                        <View style={styles.timeBlockLine} />
                        <ThemedText style={styles.timeBlockEndTime}>
                          {block.endTime || block.timeRange?.split(' - ')[1] || ''}
                        </ThemedText>
                      </View>
                      <View style={styles.timeBlockContent}>
                        <View style={styles.timeBlockTaskHeader}>
                          <ThemedText style={styles.timeBlockTask}>
                            {block.taskTitle || block.task || block.focus || 'Tarea'}
                          </ThemedText>
                          {block.taskType && (
                            <View style={[styles.taskTypeBadge, { 
                              backgroundColor: block.taskType.includes('creativa') ? '#f0abfc' : 
                                             block.taskType.includes('física') ? '#86efac' :
                                             block.taskType.includes('administrativa') ? '#fde047' : '#93c5fd'
                            }]}>
                              <ThemedText style={styles.taskTypeText}>
                                {block.taskType.includes('creativa') ? '🎨 Creativa' :
                                 block.taskType.includes('física') ? '💪 Física' :
                                 block.taskType.includes('administrativa') ? '📋 Admin' : '🧠 Mental'}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <ThemedText style={styles.timeBlockDescription}>
                          {block.description || ''}
                        </ThemedText>
                        {block.whyNow && (
                          <View style={styles.whyNowContainer}>
                            <Ionicons name="bulb-outline" size={14} color="#f59e0b" />
                            <ThemedText style={styles.whyNowText}>{block.whyNow}</ThemedText>
                          </View>
                        )}
                        {block.tasks && block.tasks.length > 0 && (
                          <View style={styles.blockTasksList}>
                            {block.tasks.map((task: any, taskIndex: number) => (
                              <ThemedText key={taskIndex} style={styles.blockTaskItem}>
                                • {task.taskTitle || task}
                              </ThemedText>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Descansos programados */}
              {(dayPlan as any)?.detailedPlan?.breaks?.length > 0 && (
                <View style={styles.breaksSection}>
                  <View style={styles.breaksSectionHeader}>
                    <Ionicons name="cafe" size={22} color="#10b981" />
                    <ThemedText style={styles.breaksSectionTitle}>Descansos</ThemedText>
                  </View>
                  {(dayPlan as any).detailedPlan.breaks.map((breakItem: any, index: number) => (
                    <View key={index} style={styles.breakItemCard}>
                      <View style={styles.breakHeader}>
                        <View style={styles.breakTimeTag}>
                          <Ionicons name="alarm-outline" size={14} color="#10b981" />
                          <ThemedText style={styles.breakTimeText}>{breakItem.time}</ThemedText>
                          <ThemedText style={styles.breakDuration}>({breakItem.duration} min)</ThemedText>
                        </View>
                        {breakItem.type && (
                          <View style={[styles.breakTypeBadge, {
                            backgroundColor: breakItem.type === 'almuerzo' ? '#fef3c7' : '#dbeafe'
                          }]}>
                            <ThemedText style={styles.breakTypeText}>
                              {breakItem.type === 'almuerzo' ? '🍽️ Almuerzo' : 
                               breakItem.type === 'micro-break' ? '⚡ Micro' : '☕ Break'}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={styles.breakSuggestion}>
                        {breakItem.suggestion || breakItem.activity || 'Descanso recomendado'}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

            </View>
          )}

          {/* Mañana */}
          {dayPlan?.tasksByTimeSlot?.morning?.length > 0 && (
            <View style={styles.timeSlotCard}>
              <View style={styles.timeSlotHeader}>
                <Ionicons name="partly-sunny-outline" size={24} color="#667eea" />
                <ThemedText style={styles.timeSlotTitle}>
                  Mañana ({dayPlan?.tasksByTimeSlot?.morning?.length || 0} tareas)
                </ThemedText>
              </View>
              {dayPlan?.tasksByTimeSlot?.morning?.slice(0, 5).map((task, index) => (
                <View key={`morning-${task.id}`} style={styles.miniTaskCard}>
                  <View style={styles.miniTaskHeader}>
                    <View style={styles.miniTaskNumber}>
                      <ThemedText style={styles.miniTaskNumberText}>{index + 1}</ThemedText>
                    </View>
                    <View style={styles.miniTaskContent}>
                      <ThemedText style={styles.miniTaskTitle}>{task.title}</ThemedText>
                      <View style={styles.miniTaskMeta}>
                        <View style={styles.miniTaskMetaItem}>
                          <Ionicons name="time-outline" size={14} color="#667eea" />
                          <ThemedText style={styles.miniTaskMetaText}>
                            {task.estimatedEffort || 30}min
                          </ThemedText>
                        </View>
                        <View style={styles.miniTaskMetaItem}>
                          <Ionicons 
                            name={task.energyRequired === 'high' ? 'flash' : task.energyRequired === 'medium' ? 'fitness' : 'moon'} 
                            size={14} 
                            color="#f59e0b" 
                          />
                          <ThemedText style={styles.miniTaskMetaText}>
                            {task.energyRequired === 'high' ? 'Alta' : task.energyRequired === 'medium' ? 'Media' : 'Baja'}
                          </ThemedText>
                        </View>
                        {task.priority === 'urgent' && (
                          <View style={[styles.miniTaskMetaItem, styles.urgentBadge]}>
                            <ThemedText style={styles.urgentText}>URGENTE</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Tarde */}
          {dayPlan?.tasksByTimeSlot?.afternoon?.length > 0 && (
            <View style={styles.timeSlotCard}>
              <View style={styles.timeSlotHeader}>
                <Ionicons name="sunny-outline" size={24} color="#f97316" />
                <ThemedText style={styles.timeSlotTitle}>
                  Tarde ({dayPlan?.tasksByTimeSlot?.afternoon?.length || 0} tareas)
                </ThemedText>
              </View>
              {dayPlan?.tasksByTimeSlot?.afternoon?.slice(0, 5).map((task, index) => (
                <View key={`afternoon-${task.id}`} style={styles.miniTaskCard}>
                  <View style={styles.miniTaskHeader}>
                    <View style={styles.miniTaskNumber}>
                      <ThemedText style={styles.miniTaskNumberText}>{index + 1}</ThemedText>
                    </View>
                    <View style={styles.miniTaskContent}>
                      <ThemedText style={styles.miniTaskTitle}>{task.title}</ThemedText>
                      <View style={styles.miniTaskMeta}>
                        <View style={styles.miniTaskMetaItem}>
                          <Ionicons name="time-outline" size={14} color="#f97316" />
                          <ThemedText style={styles.miniTaskMetaText}>
                            {task.estimatedEffort || 30}min
                          </ThemedText>
                        </View>
                        <View style={styles.miniTaskMetaItem}>
                          <Ionicons 
                            name={task.energyRequired === 'high' ? 'flash' : task.energyRequired === 'medium' ? 'fitness' : 'moon'} 
                            size={14} 
                            color="#f97316" 
                          />
                          <ThemedText style={styles.miniTaskMetaText}>
                            {task.energyRequired === 'high' ? 'Alta' : task.energyRequired === 'medium' ? 'Media' : 'Baja'}
                          </ThemedText>
                        </View>
                        {task.priority === 'urgent' && (
                          <View style={[styles.miniTaskMetaItem, styles.urgentBadge]}>
                            <ThemedText style={styles.urgentText}>URGENTE</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Noche */}
          {dayPlan?.tasksByTimeSlot?.evening?.length > 0 && (
            <View style={styles.timeSlotCard}>
              <View style={styles.timeSlotHeader}>
                <Ionicons name="moon-outline" size={24} color="#8b5cf6" />
                <ThemedText style={styles.timeSlotTitle}>
                  Noche ({dayPlan?.tasksByTimeSlot?.evening?.length || 0} tareas)
                </ThemedText>
              </View>
              {dayPlan?.tasksByTimeSlot?.evening?.slice(0, 5).map((task, index) => (
                <View key={`evening-${task.id}`} style={styles.miniTaskCard}>
                  <View style={styles.miniTaskHeader}>
                    <View style={styles.miniTaskNumber}>
                      <ThemedText style={styles.miniTaskNumberText}>{index + 1}</ThemedText>
                    </View>
                    <View style={styles.miniTaskContent}>
                      <ThemedText style={styles.miniTaskTitle}>{task.title}</ThemedText>
                      <View style={styles.miniTaskMeta}>
                        <View style={styles.miniTaskMetaItem}>
                          <Ionicons name="time-outline" size={14} color="#8b5cf6" />
                          <ThemedText style={styles.miniTaskMetaText}>
                            {task.estimatedEffort || 30}min
                          </ThemedText>
                        </View>
                        <View style={styles.miniTaskMetaItem}>
                          <Ionicons 
                            name={task.energyRequired === 'high' ? 'flash' : task.energyRequired === 'medium' ? 'fitness' : 'moon'} 
                            size={14} 
                            color="#8b5cf6" 
                          />
                          <ThemedText style={styles.miniTaskMetaText}>
                            {task.energyRequired === 'high' ? 'Alta' : task.energyRequired === 'medium' ? 'Media' : 'Baja'}
                          </ThemedText>
                        </View>
                        {task.priority === 'urgent' && (
                          <View style={[styles.miniTaskMetaItem, styles.urgentBadge]}>
                            <ThemedText style={styles.urgentText}>URGENTE</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
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
              {currentRecommendation.contextualFactors?.length > 0 && (
                <View style={styles.factorsContainer}>
                  {currentRecommendation.contextualFactors?.slice(0, 3).map((factor, index) => (
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
                  onPress={handleStartTask}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={timerActive ? ['#10b981', '#059669'] : ['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryActionGradient}
                  >
                    <ThemedText style={styles.primaryActionText}>
                      {timerActive ? `⏱️ ${formatTime(timeRemaining)}` : '▶️ Empezar Ahora'}
                    </ThemedText>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={timerActive ? stopTimer : handleRefreshRecommendation}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.secondaryActionText}>
                    {timerActive ? '⏹️ Detener' : '🔄 Otra Sugerencia'}
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
              onPress={() => router.push('/(tabs)/explore')}
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
      {currentRecommendation && currentRecommendation.alternativeTasks?.length > 0 && (
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
    padding: 16,
    paddingTop: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
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
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  reasoningCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayPlanReasoning: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
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
  miniTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  miniTaskContent: {
    flex: 1,
  },
  miniTaskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  miniTaskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniTaskMetaText: {
    fontSize: 12,
    color: '#666',
  },
  urgentBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  urgentText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ef4444',
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
  // Estilos para el plan detallado
  detailedPlanContainer: {
    maxHeight: 500,
    marginTop: 16,
  },
  timeBlockCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  timeBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeBlockInfo: {
    marginLeft: 12,
    flex: 1,
  },
  timeBlockTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  timeBlockRange: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  timeBlockFocus: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  detailedTaskCard: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailedTaskHeader: {
    marginBottom: 10,
  },
  detailedTaskTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  taskTimeText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  detailedTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  taskDetails: {
    gap: 8,
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskDetailText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
  },
  tipText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
    fontStyle: 'italic',
  },
  breakText: {
    fontSize: 14,
    color: '#065f46',
    flex: 1,
  },
  breakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  breakTime: {
    alignItems: 'center',
    marginRight: 16,
  },
  breakContent: {
    flex: 1,
  },
  breakActivity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  breakReason: {
    fontSize: 13,
    color: '#6b7280',
  },
  tipsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  tipsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tipItemText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
    lineHeight: 20,
  },
  contingencySection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  contingencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contingencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  contingencyText: {
    fontSize: 14,
    color: '#6b46c1',
    lineHeight: 20,
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
  },
  // Nuevos estilos para diseño mejorado
  reasoningIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  reasoningIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productivitySection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productivityTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 10,
  },
  productivityTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  tipIconContainer: {
    marginRight: 10,
    marginTop: 1,
  },
  productivityTipText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
    flex: 1,
  },
  timeBlocksSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeBlocksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  timeBlocksTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 10,
  },
  timeBlockItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timeBlockTimeWrapper: {
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 4,
  },
  timeBlockStartTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  timeBlockLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  timeBlockEndTime: {
    fontSize: 14,
    color: '#9ca3af',
  },
  timeBlockContent: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  timeBlockTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  timeBlockTask: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  taskTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  taskTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1f2937',
  },
  timeBlockDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    marginBottom: 6,
  },
  whyNowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 6,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  whyNowText: {
    fontSize: 11,
    color: '#92400e',
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 14,
  },
  blockTasksList: {
    marginTop: 8,
  },
  blockTaskItem: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 4,
  },
  breaksSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  breaksSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  breaksSectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#047857',
    marginLeft: 10,
  },
  breakItemCard: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  breakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  breakTimeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
    marginLeft: 6,
  },
  breakDuration: {
    fontSize: 12,
    color: '#059669',
    marginLeft: 4,
  },
  breakTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  breakTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1f2937',
  },
  breakSuggestion: {
    fontSize: 12,
    color: '#065f46',
    lineHeight: 16,
  },
});
