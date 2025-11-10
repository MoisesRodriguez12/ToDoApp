import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Task,
  EnergyProfile,
  UserPreferences,
  DecisionHistory,
  GeminiRecommendation,
  User,
  TaskStatus,
  EnergyLevel,
  TaskCategory,
  Priority,
  RuleType,
} from '../types';
import StorageService from '../services/storageService';
import GeminiService from '../services/geminiService';
import GoogleCalendarService from '../services/googleCalendarService';

export interface DayPlan {
  date: Date;
  totalTasks: number;
  estimatedTotalTime: number;
  tasksByTimeSlot: {
    morning: Task[];
    afternoon: Task[];
    evening: Task[];
  };
  reasoning: string;
}

interface AppContextType {
  // Estado
  user: User | null;
  tasks: Task[];
  energyProfile: EnergyProfile | null;
  preferences: UserPreferences | null;
  decisionHistory: DecisionHistory[];
  currentRecommendation: GeminiRecommendation | null;
  dayPlan: DayPlan | null;
  isLoading: boolean;

  // Funciones de usuario
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;

  // Funciones de tareas
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  importTasksFromCalendar: () => Promise<void>;
  syncTasksWithCalendar: () => Promise<void>;

  // Funciones de recomendación
  getRecommendation: () => Promise<void>;
  generateDayPlan: () => Promise<void>;
  recordDecision: (recommendedTaskId: string, chosenTaskId: string, wasCompleted: boolean) => Promise<void>;

  // Funciones de perfil
  updateEnergyProfile: (profile: Partial<EnergyProfile>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;

  // Funciones de utilidad
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [energyProfile, setEnergyProfile] = useState<EnergyProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [decisionHistory, setDecisionHistory] = useState<DecisionHistory[]>([]);
  const [currentRecommendation, setCurrentRecommendation] = useState<GeminiRecommendation | null>(null);
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos al iniciar
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [
        storedUser,
        storedTasks,
        storedProfile,
        storedPreferences,
        storedHistory,
      ] = await Promise.all([
        StorageService.getUser(),
        StorageService.getTasks(),
        StorageService.getEnergyProfile(),
        StorageService.getPreferences(),
        StorageService.getDecisionHistory(),
      ]);

      setUserState(storedUser);
      setTasks(storedTasks);
      setEnergyProfile(storedProfile || createDefaultEnergyProfile(storedUser?.id || 'default'));
      setPreferences(storedPreferences || createDefaultPreferences(storedUser?.id || 'default'));
      setDecisionHistory(storedHistory);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setUser = async (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      await StorageService.saveUser(newUser);
    } else {
      await StorageService.clearUser();
    }
  };

  const logout = async () => {
    await StorageService.clearUser();
    setUserState(null);
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const newTask: Task = {
        ...taskData,
        id: generateId(),
        createdAt: new Date(),
      };

      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      await StorageService.saveTasks(updatedTasks);

      // Sincronizar con calendario si está habilitado
      if (preferences?.syncWithGoogleCalendar) {
        const eventId = await GoogleCalendarService.exportTaskToCalendar(newTask);
        if (eventId) {
          newTask.googleCalendarEventId = eventId;
          await StorageService.updateTask(newTask.id, { googleCalendarEventId: eventId });
        }
      }
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const updatedTasks = tasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      setTasks(updatedTasks);
      await StorageService.saveTasks(updatedTasks);

      // Actualizar calendario si está habilitado
      const task = updatedTasks.find(t => t.id === taskId);
      if (task && preferences?.syncWithGoogleCalendar && task.googleCalendarEventId) {
        await GoogleCalendarService.updateCalendarEvent(task);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      setTasks(updatedTasks);
      await StorageService.saveTasks(updatedTasks);

      // Eliminar del calendario si existe
      if (task?.googleCalendarEventId) {
        await GoogleCalendarService.deleteCalendarEvent(task.googleCalendarEventId);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const completeTask = async (taskId: string) => {
    await updateTask(taskId, {
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
    });
  };

  const importTasksFromCalendar = async () => {
    try {
      setIsLoading(true);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Próximos 30 días

      const importedTasks = await GoogleCalendarService.importEventsAsTasks(startDate, endDate);
      
      // Filtrar tareas que ya existen
      const existingIds = new Set(tasks.map(t => t.googleCalendarEventId));
      const newTasks = importedTasks.filter(t => !existingIds.has(t.id));

      const updatedTasks = [...tasks, ...newTasks];
      setTasks(updatedTasks);
      await StorageService.saveTasks(updatedTasks);
    } catch (error) {
      console.error('Error importing tasks from calendar:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const syncTasksWithCalendar = async () => {
    try {
      setIsLoading(true);
      await GoogleCalendarService.syncTasksWithCalendar(tasks);
    } catch (error) {
      console.error('Error syncing tasks with calendar:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendation = async () => {
    try {
      if (!energyProfile) return;

      setIsLoading(true);
      const recommendation = await GeminiService.analyzeTasksAndRecommend({
        tasks,
        currentTime: new Date(),
        userProfile: energyProfile,
        recentHistory: decisionHistory.slice(-10),
      });

      setCurrentRecommendation(recommendation);
    } catch (error) {
      console.error('Error getting recommendation:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const generateDayPlan = async () => {
    try {
      if (!energyProfile) return;

      setIsLoading(true);
      const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
      
      // Organizar tareas por momento del día según energía y preferencias
      const morning: Task[] = [];
      const afternoon: Task[] = [];
      const evening: Task[] = [];
      
      let totalTime = 0;

      // Clasificar tareas inteligentemente
      pendingTasks.forEach(task => {
        const estimatedTime = task.estimatedEffort || 30;
        totalTime += estimatedTime;

        // Tareas de alta energía requerida -> Mañana
        if (task.energyRequired === EnergyLevel.HIGH) {
          morning.push(task);
        }
        // Tareas creativas o de aprendizaje -> Tarde
        else if (
          task.category === TaskCategory.CREATIVE ||
          task.category === TaskCategory.LEARNING
        ) {
          afternoon.push(task);
        }
        // Tareas personales o de baja energía -> Noche
        else if (
          task.energyRequired === EnergyLevel.LOW ||
          task.category === TaskCategory.PERSONAL
        ) {
          evening.push(task);
        }
        // Por defecto -> Tarde
        else {
          afternoon.push(task);
        }
      });

      // Ordenar por prioridad dentro de cada grupo
      const sortByPriority = (a: Task, b: Task) => {
        const priorityValues: Record<Priority, number> = { 
          [Priority.URGENT]: 4,
          [Priority.HIGH]: 3, 
          [Priority.MEDIUM]: 2, 
          [Priority.LOW]: 1 
        };
        return (priorityValues[b.priority] || 0) - (priorityValues[a.priority] || 0);
      };

      morning.sort(sortByPriority);
      afternoon.sort(sortByPriority);
      evening.sort(sortByPriority);

      const plan: DayPlan = {
        date: new Date(),
        totalTasks: pendingTasks.length,
        estimatedTotalTime: totalTime,
        tasksByTimeSlot: {
          morning,
          afternoon,
          evening,
        },
        reasoning: `Plan optimizado para hoy con ${pendingTasks.length} tareas (${Math.round(totalTime / 60)}h ${totalTime % 60}min estimados). Mañana: ${morning.length} tareas de alta energía. Tarde: ${afternoon.length} tareas creativas/trabajo. Noche: ${evening.length} tareas personales/ligeras.`,
      };

      setDayPlan(plan);
    } catch (error) {
      console.error('Error generating day plan:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const recordDecision = async (
    recommendedTaskId: string,
    chosenTaskId: string,
    wasCompleted: boolean
  ) => {
    try {
      const now = new Date();
      const decision: DecisionHistory = {
        id: generateId(),
        userId: user?.id || 'default',
        timestamp: now,
        recommendedTask: recommendedTaskId,
        actualTaskChosen: chosenTaskId,
        contextSnapshot: {
          hour: now.getHours(),
          dayOfWeek: now.getDay(),
          userEnergyLevel: getCurrentEnergyLevel(energyProfile, now.getHours()),
          pendingTasksCount: tasks.filter(t => t.status === TaskStatus.PENDING).length,
          recommendationScore: currentRecommendation?.confidenceScore || 0,
        },
        wasCompleted,
      };

      const updatedHistory = [...decisionHistory, decision];
      setDecisionHistory(updatedHistory);
      await StorageService.addDecision(decision);
    } catch (error) {
      console.error('Error recording decision:', error);
      throw error;
    }
  };

  const updateEnergyProfile = async (updates: Partial<EnergyProfile>) => {
    try {
      if (!energyProfile) return;

      const updated: EnergyProfile = {
        ...energyProfile,
        ...updates,
        updatedAt: new Date(),
      };

      setEnergyProfile(updated);
      await StorageService.saveEnergyProfile(updated);
    } catch (error) {
      console.error('Error updating energy profile:', error);
      throw error;
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      if (!preferences) return;

      const updated: UserPreferences = {
        ...preferences,
        ...updates,
      };

      setPreferences(updated);
      await StorageService.savePreferences(updated);
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  const refreshData = async () => {
    await loadInitialData();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        tasks,
        energyProfile,
        preferences,
        decisionHistory,
        currentRecommendation,
        dayPlan,
        isLoading,
        setUser,
        logout,
        addTask,
        updateTask,
        deleteTask,
        completeTask,
        importTasksFromCalendar,
        syncTasksWithCalendar,
        getRecommendation,
        generateDayPlan,
        recordDecision,
        updateEnergyProfile,
        updatePreferences,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createDefaultEnergyProfile(userId: string): EnergyProfile {
  // Perfil de energía por defecto (típico para mayoría de personas)
  const hourlyEnergyMap = Array.from({ length: 24 }, (_, hour) => {
    let energyLevel: EnergyLevel;
    
    if (hour >= 6 && hour < 9) energyLevel = EnergyLevel.MEDIUM; // Mañana temprano
    else if (hour >= 9 && hour < 12) energyLevel = EnergyLevel.HIGH; // Media mañana
    else if (hour >= 12 && hour < 14) energyLevel = EnergyLevel.MEDIUM; // Almuerzo
    else if (hour >= 14 && hour < 17) energyLevel = EnergyLevel.HIGH; // Tarde
    else if (hour >= 17 && hour < 20) energyLevel = EnergyLevel.MEDIUM; // Tarde-noche
    else if (hour >= 20 && hour < 22) energyLevel = EnergyLevel.LOW; // Noche
    else energyLevel = EnergyLevel.LOW; // Madrugada

    return { hour, energyLevel };
  });

  return {
    userId,
    hourlyEnergyMap,
    personalRules: [
      {
        id: generateId(),
        type: RuleType.NO_WORK_AFTER,
        description: 'No trabajar después de las 10 PM',
        condition: 'hour >= 22',
        action: 'no_work',
        active: true,
      },
    ],
    preferences: createDefaultPreferences(userId),
    updatedAt: new Date(),
  };
}

function createDefaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    categoryPreferences: [
      { category: TaskCategory.WORK, preferredTimeOfDay: 'morning', affinityScore: 7 },
      { category: TaskCategory.LEARNING, preferredTimeOfDay: 'afternoon', affinityScore: 8 },
      { category: TaskCategory.CREATIVE, preferredTimeOfDay: 'evening', affinityScore: 6 },
      { category: TaskCategory.HEALTH, preferredTimeOfDay: 'morning', affinityScore: 9 },
      { category: TaskCategory.PERSONAL, preferredTimeOfDay: 'evening', affinityScore: 7 },
    ],
    workingHours: { start: 9, end: 18 },
    breakDuration: 15,
    maxTasksPerDay: 10,
    notificationsEnabled: true,
    syncWithGoogleCalendar: false,
    learningMode: true,
  };
}

function getCurrentEnergyLevel(profile: EnergyProfile | null, hour: number): EnergyLevel {
  if (!profile) return EnergyLevel.MEDIUM;
  const entry = profile.hourlyEnergyMap.find(e => e.hour === hour);
  return entry?.energyLevel || EnergyLevel.MEDIUM;
}
