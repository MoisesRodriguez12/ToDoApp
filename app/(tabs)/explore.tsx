import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApp } from '@/contexts/AppContext';
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
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
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
  });

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS;
    if (filter === 'completed') return task.status === TaskStatus.COMPLETED;
    return true;
  });

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'El título de la tarea es obligatorio');
      return;
    }

    try {
      await addTask({
        ...newTask,
        status: TaskStatus.PENDING,
      });
      
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
      });
      
      setIsAddModalVisible(false);
      Alert.alert('✓ Tarea agregada', 'La tarea ha sido agregada exitosamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar la tarea');
    }
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
              onPress={() => handleToggleComplete(task)}
              onLongPress={() =>
                Alert.alert(
                  'Opciones',
                  task.title,
                  [
                    { text: 'Cancelar', style: 'cancel' },
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

            <TouchableOpacity style={styles.submitButton} onPress={handleAddTask}>
              <ThemedText style={styles.submitButtonText}>
                Crear Tarea
              </ThemedText>
            </TouchableOpacity>
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
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
