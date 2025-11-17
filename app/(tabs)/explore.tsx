import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApp } from '@/contexts/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import GeminiService from '@/services/geminiService';
import {
  Task,
  TaskStatus,
  TaskCategory,
  Priority,
  EnergyLevel,
} from '@/types';

export default function TasksScreen() {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    importTasksFromCalendar,
    syncTasksWithCalendar,
    preferences,
  } = useApp();

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isInferring, setIsInferring] = useState(false);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: TaskCategory.WORK,
    priority: Priority.MEDIUM,
    estimatedEffort: 60,
    energyRequired: EnergyLevel.MEDIUM,
    impact: 5,
    urgency: 5,
    personalAffinity: 5,
    dueDate: undefined as Date | undefined,
  });

  const [editTask, setEditTask] = useState({
    title: '',
    description: '',
    category: TaskCategory.WORK,
    priority: Priority.MEDIUM,
    estimatedEffort: 60,
    energyRequired: EnergyLevel.MEDIUM,
    impact: 5,
    urgency: 5,
    personalAffinity: 5,
    dueDate: undefined as Date | undefined,
  });

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS;
    if (filter === 'completed') return task.status === TaskStatus.COMPLETED;
    return true;
  });

  const inferTaskProperties = async (title: string, description: string, dueDate?: Date) => {
    try {
      setIsInferring(true);
      
      // Calcular días hasta vencimiento
      let dueDateInfo = 'Sin fecha límite';
      let isToday = false;
      let isTomorrow = false;
      let daysUntilDue = 999;
      
      if (dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        
        daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        isToday = daysUntilDue === 0;
        isTomorrow = daysUntilDue === 1;
        
        if (isToday) {
          dueDateInfo = '¡VENCE HOY!';
        } else if (isTomorrow) {
          dueDateInfo = 'Vence mañana';
        } else if (daysUntilDue < 0) {
          dueDateInfo = `Vencida hace ${Math.abs(daysUntilDue)} días`;
        } else if (daysUntilDue <= 7) {
          dueDateInfo = `Vence en ${daysUntilDue} días`;
        } else {
          dueDateInfo = `Vence en ${Math.floor(daysUntilDue / 7)} semanas`;
        }
      }
      
      const prompt = `Analiza esta tarea y devuelve un JSON con category (work/personal/learning/health/creative/administrative/social) y priority (low/medium/high/urgent):
      
Título: ${title}
Descripción: ${description || 'Sin descripción'}
**FECHA DE VENCIMIENTO: ${dueDateInfo}**

⚠️ REGLAS CRÍTICAS SOBRE PRIORIDAD:
- Si la tarea VENCE HOY o está vencida → SIEMPRE priority: "urgent"
- Si vence mañana → priority: "high" como mínimo
- Si vence en menos de 3 días → priority: "high" como mínimo
- Si vence en menos de 7 días → priority: "medium" como mínimo
- La fecha de vencimiento es MÁS importante que las palabras clave

Responde SOLO con JSON válido: {"category": "...", "priority": "..."}`;

      const response = await GeminiService.generateText(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const inferred = JSON.parse(jsonMatch[0]);
        
        // OVERRIDE: Si vence hoy, SIEMPRE es urgente
        if (isToday || daysUntilDue < 0) {
          inferred.priority = Priority.URGENT;
        } else if (isTomorrow && inferred.priority !== Priority.URGENT) {
          inferred.priority = Priority.HIGH;
        } else if (daysUntilDue <= 2 && inferred.priority === Priority.LOW) {
          inferred.priority = Priority.HIGH;
        }
        
        return {
          category: inferred.category as TaskCategory,
          priority: inferred.priority as Priority,
        };
      }
    } catch (error) {
      console.error('Error inferring task properties:', error);
    } finally {
      setIsInferring(false);
    }
    return null;
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'El título de la tarea es obligatorio');
      return;
    }

    try {
      // Inferir categoría y prioridad con IA (considerando fecha de vencimiento)
      const inferred = await inferTaskProperties(newTask.title, newTask.description, newTask.dueDate);
      
      const taskToAdd = {
        ...newTask,
        status: TaskStatus.PENDING,
        ...(inferred && { category: inferred.category, priority: inferred.priority }),
      };

      await addTask(taskToAdd);
      
      setNewTask({
        title: '',
        description: '',
        category: TaskCategory.WORK,
        priority: Priority.MEDIUM,
        estimatedEffort: 60,
        energyRequired: EnergyLevel.MEDIUM,
        impact: 5,
        urgency: 5,
        personalAffinity: 5,
        dueDate: undefined,
      });
      
      setIsAddModalVisible(false);
      Alert.alert('✓ Tarea agregada', 'La tarea ha sido agregada exitosamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar la tarea');
    }
  };

  const handleEditTask = async () => {
    if (!selectedTask || !editTask.title.trim()) {
      Alert.alert('Error', 'El título de la tarea es obligatorio');
      return;
    }

    try {
      await updateTask(selectedTask.id, editTask);
      setIsEditModalVisible(false);
      setSelectedTask(null);
      Alert.alert('✓ Tarea actualizada', 'Los cambios han sido guardados');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la tarea');
    }
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setEditTask({
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority,
      estimatedEffort: task.estimatedEffort,
      energyRequired: task.energyRequired,
      impact: task.impact,
      urgency: task.urgency,
      personalAffinity: task.personalAffinity,
      dueDate: task.dueDate,
    });
    setIsEditModalVisible(true);
  };

  const handleImportFromCalendar = async () => {
    try {
      await importTasksFromCalendar();
      Alert.alert('✓ Importado', 'Tareas importadas desde Google Calendar');
    } catch (error) {
      Alert.alert('Error', 'No se pudieron importar las tareas del calendario');
    }
  };

  const handleSync = async () => {
    try {
      await syncTasksWithCalendar();
      Alert.alert('✓ Sincronizado', 'Tareas sincronizadas con Google Calendar');
    } catch (error) {
      Alert.alert('Error', 'No se pudieron sincronizar las tareas');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    if (task.status === TaskStatus.COMPLETED) {
      await updateTask(task.id, { status: TaskStatus.PENDING, completedAt: undefined });
    } else {
      await completeTask(task.id);
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return '#EF4444';
      case Priority.HIGH:
        return '#F59E0B';
      case Priority.MEDIUM:
        return '#3B82F6';
      case Priority.LOW:
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getCategoryIcon = (category: TaskCategory) => {
    switch (category) {
      case TaskCategory.WORK:
        return '💼';
      case TaskCategory.PERSONAL:
        return '👤';
      case TaskCategory.LEARNING:
        return '📚';
      case TaskCategory.HEALTH:
        return '💪';
      case TaskCategory.CREATIVE:
        return '🎨';
      case TaskCategory.ADMINISTRATIVE:
        return '📋';
      case TaskCategory.SOCIAL:
        return '👥';
      default:
        return '📝';
    }
  };

  return (
    <View style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          📋 Mis Tareas
        </ThemedText>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleImportFromCalendar}
          >
            <ThemedText style={styles.iconButtonText}>📅</ThemedText>
          </TouchableOpacity>
          
          {preferences?.syncWithGoogleCalendar && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSync}
            >
              <ThemedText style={styles.iconButtonText}>🔄</ThemedText>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsAddModalVisible(true)}
          >
            <ThemedText style={styles.addButtonText}>+ Nueva</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <ThemedText style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todas ({tasks.length})
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <ThemedText style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pendientes ({tasks.filter(t => t.status === TaskStatus.PENDING).length})
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <ThemedText style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completadas ({tasks.filter(t => t.status === TaskStatus.COMPLETED).length})
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Lista de Tareas */}
      <ScrollView style={styles.tasksList}>
        {filteredTasks.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyIcon}>📝</ThemedText>
            <ThemedText style={styles.emptyText}>
              No hay tareas {filter !== 'all' && filter}
            </ThemedText>
          </ThemedView>
        ) : (
          filteredTasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskCard,
                task.status === TaskStatus.COMPLETED && styles.taskCardCompleted,
              ]}
              onPress={() => openEditModal(task)}
              onLongPress={() =>
                Alert.alert(
                  'Opciones',
                  task.title,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: task.status === TaskStatus.COMPLETED ? 'Marcar pendiente' : 'Completar',
                      onPress: () => handleToggleComplete(task),
                    },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: () => deleteTask(task.id),
                    },
                  ]
                )
              }
            >
              <View style={styles.taskHeader}>
                <View style={styles.taskTitleRow}>
                  <ThemedText style={styles.taskIcon}>
                    {getCategoryIcon(task.category)}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.taskTitle,
                      task.status === TaskStatus.COMPLETED && styles.taskTitleCompleted,
                    ]}
                  >
                    {task.title}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(task.priority) },
                  ]}
                >
                  <ThemedText style={styles.priorityText}>
                    {task.priority}
                  </ThemedText>
                </View>
              </View>

              {task.description && (
                <ThemedText style={styles.taskDescription}>
                  {task.description}
                </ThemedText>
              )}

              {task.dueDate && (
                <View style={styles.dueDateContainer}>
                  <Ionicons name="calendar-outline" size={14} color="#667eea" />
                  <ThemedText style={styles.dueDateText}>
                    Vence: {new Date(task.dueDate).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: new Date(task.dueDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    })}
                  </ThemedText>
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const due = new Date(task.dueDate);
                    due.setHours(0, 0, 0, 0);
                    const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (daysUntilDue === 0) {
                      return <ThemedText style={styles.dueDateBadgeToday}>¡HOY!</ThemedText>;
                    } else if (daysUntilDue === 1) {
                      return <ThemedText style={styles.dueDateBadgeTomorrow}>Mañana</ThemedText>;
                    } else if (daysUntilDue < 0) {
                      return <ThemedText style={styles.dueDateBadgeOverdue}>Vencida</ThemedText>;
                    } else if (daysUntilDue <= 3) {
                      return <ThemedText style={styles.dueDateBadgeUrgent}>{daysUntilDue}d</ThemedText>;
                    }
                    return null;
                  })()}
                </View>
              )}

              <View style={styles.taskFooter}>
                <View style={styles.taskMeta}>
                  <ThemedText style={styles.metaText}>
                    ⏱️ {task.estimatedEffort}min
                  </ThemedText>
                  <ThemedText style={styles.metaText}>
                    ⚡ {task.energyRequired}
                  </ThemedText>
                  <ThemedText style={styles.metaText}>
                    🎯 {task.impact}/10
                  </ThemedText>
                </View>
                {task.status === TaskStatus.COMPLETED && (
                  <ThemedText style={styles.completedBadge}>✓</ThemedText>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal Agregar Tarea */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Nueva Tarea</ThemedText>
            <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
              <ThemedText style={styles.closeButton}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <ThemedText style={styles.label}>Título *</ThemedText>
            <TextInput
              style={styles.input}
              value={newTask.title}
              onChangeText={text => setNewTask({ ...newTask, title: text })}
              placeholder="¿Qué necesitas hacer?"
              placeholderTextColor="#9CA3AF"
            />

            <ThemedText style={styles.label}>Descripción</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newTask.description}
              onChangeText={text => setNewTask({ ...newTask, description: text })}
              placeholder="Detalles adicionales..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <ThemedText style={styles.label}>Tiempo estimado (minutos)</ThemedText>
            <TextInput
              style={styles.input}
              value={newTask.estimatedEffort.toString()}
              onChangeText={text =>
                setNewTask({ ...newTask, estimatedEffort: parseInt(text) || 0 })
              }
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor="#9CA3AF"
            />

            <ThemedText style={styles.label}>📅 Fecha de vencimiento</ThemedText>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                // Aquí usaremos un selector de fecha simple
                const today = new Date();
                Alert.prompt(
                  'Fecha de vencimiento',
                  'Días desde hoy (0 = hoy, 1 = mañana, etc.)',
                  (text) => {
                    const days = parseInt(text) || 0;
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + days);
                    setNewTask({ ...newTask, dueDate });
                  },
                  'plain-text',
                  '0'
                );
              }}
            >
              <Ionicons name="calendar-outline" size={20} color="#667eea" />
              <ThemedText style={styles.dateButtonText}>
                {newTask.dueDate 
                  ? `${newTask.dueDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                  : 'Sin fecha límite (toca para agregar)'}
              </ThemedText>
              {newTask.dueDate && (
                <TouchableOpacity 
                  onPress={() => setNewTask({ ...newTask, dueDate: undefined })}
                  style={styles.clearDateButton}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleAddTask}
              disabled={isInferring}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
                <ThemedText style={styles.submitButtonText}>
                  {isInferring ? 'Analizando...' : 'Crear Tarea'}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Modal Editar Tarea */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Editar Tarea</ThemedText>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
              <Ionicons name="close" size={28} color="#667eea" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.label}>Título *</ThemedText>
            <TextInput
              style={styles.input}
              value={editTask.title}
              onChangeText={text => setEditTask({ ...editTask, title: text })}
              placeholder="Título de la tarea"
              placeholderTextColor="#9CA3AF"
            />

            <ThemedText style={styles.label}>Descripción</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editTask.description}
              onChangeText={text => setEditTask({ ...editTask, description: text })}
              placeholder="Detalles adicionales..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <ThemedText style={styles.label}>Categoría</ThemedText>
            <View style={styles.pickerContainer}>
              {Object.values(TaskCategory).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    editTask.category === cat && styles.categoryChipSelected
                  ]}
                  onPress={() => setEditTask({ ...editTask, category: cat })}
                >
                  <ThemedText style={[
                    styles.categoryChipText,
                    editTask.category === cat && styles.categoryChipTextSelected
                  ]}>
                    {cat}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText style={styles.label}>Prioridad</ThemedText>
            <View style={styles.pickerContainer}>
              {Object.values(Priority).map(pri => (
                <TouchableOpacity
                  key={pri}
                  style={[
                    styles.priorityChip,
                    editTask.priority === pri && styles.priorityChipSelected,
                    { borderColor: getPriorityColor(pri) }
                  ]}
                  onPress={() => setEditTask({ ...editTask, priority: pri })}
                >
                  <ThemedText style={[
                    styles.priorityChipText,
                    editTask.priority === pri && { color: getPriorityColor(pri) }
                  ]}>
                    {pri}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText style={styles.label}>Nivel de Energía</ThemedText>
            <View style={styles.pickerContainer}>
              {Object.values(EnergyLevel).map(energy => (
                <TouchableOpacity
                  key={energy}
                  style={[
                    styles.energyChip,
                    editTask.energyRequired === energy && styles.energyChipSelected
                  ]}
                  onPress={() => setEditTask({ ...editTask, energyRequired: energy })}
                >
                  <Ionicons 
                    name={energy === 'high' ? 'flash' : energy === 'medium' ? 'fitness' : 'moon'} 
                    size={20} 
                    color={editTask.energyRequired === energy ? '#667eea' : '#999'} 
                  />
                  <ThemedText style={[
                    styles.energyChipText,
                    editTask.energyRequired === energy && styles.energyChipTextSelected
                  ]}>
                    {energy}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText style={styles.label}>Tiempo estimado (minutos)</ThemedText>
            <TextInput
              style={styles.input}
              value={editTask.estimatedEffort.toString()}
              onChangeText={text =>
                setEditTask({ ...editTask, estimatedEffort: parseInt(text) || 60 })
              }
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor="#9CA3AF"
            />

            <ThemedText style={styles.label}>📅 Fecha de vencimiento</ThemedText>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                Alert.prompt(
                  'Fecha de vencimiento',
                  'Días desde hoy (0 = hoy, 1 = mañana, -1 = ayer, etc.)',
                  (text) => {
                    const days = parseInt(text) || 0;
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + days);
                    setEditTask({ ...editTask, dueDate });
                  },
                  'plain-text',
                  editTask.dueDate ? '0' : ''
                );
              }}
            >
              <Ionicons name="calendar-outline" size={20} color="#667eea" />
              <ThemedText style={styles.dateButtonText}>
                {editTask.dueDate 
                  ? `${new Date(editTask.dueDate).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })}`
                  : 'Sin fecha límite (toca para agregar)'}
              </ThemedText>
              {editTask.dueDate && (
                <TouchableOpacity 
                  onPress={() => setEditTask({ ...editTask, dueDate: undefined })}
                  style={styles.clearDateButton}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View style={styles.sliderContainer}>
              <ThemedText style={styles.label}>Impacto: {editTask.impact}/10</ThemedText>
              <View style={styles.sliderRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.sliderDot,
                      editTask.impact >= val && styles.sliderDotActive
                    ]}
                    onPress={() => setEditTask({ ...editTask, impact: val })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sliderContainer}>
              <ThemedText style={styles.label}>Urgencia: {editTask.urgency}/10</ThemedText>
              <View style={styles.sliderRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.sliderDot,
                      editTask.urgency >= val && styles.sliderDotActive
                    ]}
                    onPress={() => setEditTask({ ...editTask, urgency: val })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.submitButton, { flex: 1, marginRight: 8 }]} 
                onPress={() => setIsEditModalVisible(false)}
              >
                <View style={styles.cancelButton}>
                  <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.submitButton, { flex: 1, marginLeft: 8 }]} 
                onPress={handleEditTask}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Ionicons name="save-outline" size={24} color="#FFFFFF" />
                  <ThemedText style={styles.submitButtonText}>Guardar</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  iconButtonText: {
    fontSize: 20,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  tasksList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  taskCardCompleted: {
    opacity: 0.6,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  taskIcon: {
    fontSize: 20,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  taskDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.6,
  },
  completedBadge: {
    fontSize: 24,
    color: '#10B981',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  closeButton: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  categoryChipSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    textTransform: 'capitalize',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  priorityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 2,
  },
  priorityChipSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  priorityChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  energyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  energyChipSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderColor: '#667eea',
  },
  energyChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  energyChipTextSelected: {
    color: '#667eea',
  },
  sliderContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  sliderDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  sliderDotActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    gap: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  clearDateButton: {
    padding: 4,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  dueDateText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
  dueDateBadgeToday: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dueDateBadgeTomorrow: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dueDateBadgeOverdue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#991B1B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dueDateBadgeUrgent: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
