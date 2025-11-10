import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Task,
  EnergyProfile,
  DecisionHistory,
  UserPreferences,
  User,
  ProductivityStats,
} from '../types';

// Claves de almacenamiento
const STORAGE_KEYS = {
  TASKS: '@todoapp_tasks',
  USER: '@todoapp_user',
  ENERGY_PROFILE: '@todoapp_energy_profile',
  PREFERENCES: '@todoapp_preferences',
  DECISION_HISTORY: '@todoapp_decision_history',
  STATS: '@todoapp_stats',
};

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // ============================================
  // TAREAS
  // ============================================

  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
      throw error;
    }
  }

  async getTasks(): Promise<Task[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      if (!data) return [];
      
      const tasks = JSON.parse(data);
      // Convertir strings de fecha a objetos Date
      return tasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
      }));
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  async addTask(task: Task): Promise<void> {
    try {
      const tasks = await this.getTasks();
      tasks.push(task);
      await this.saveTasks(tasks);
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      const tasks = await this.getTasks();
      const index = tasks.findIndex(t => t.id === taskId);
      
      if (index === -1) {
        throw new Error('Task not found');
      }

      tasks[index] = { ...tasks[index], ...updates };
      await this.saveTasks(tasks);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      const tasks = await this.getTasks();
      const filtered = tasks.filter(t => t.id !== taskId);
      await this.saveTasks(filtered);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // ============================================
  // USUARIO
  // ============================================

  async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  async getUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (!data) return null;
      
      const user = JSON.parse(data);
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        lastLoginAt: new Date(user.lastLoginAt),
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch (error) {
      console.error('Error clearing user:', error);
      throw error;
    }
  }

  // ============================================
  // PERFIL DE ENERGÍA
  // ============================================

  async saveEnergyProfile(profile: EnergyProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ENERGY_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving energy profile:', error);
      throw error;
    }
  }

  async getEnergyProfile(): Promise<EnergyProfile | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ENERGY_PROFILE);
      if (!data) return null;
      
      const profile = JSON.parse(data);
      return {
        ...profile,
        updatedAt: new Date(profile.updatedAt),
      };
    } catch (error) {
      console.error('Error getting energy profile:', error);
      return null;
    }
  }

  // ============================================
  // PREFERENCIAS
  // ============================================

  async savePreferences(preferences: UserPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  }

  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting preferences:', error);
      return null;
    }
  }

  // ============================================
  // HISTORIAL DE DECISIONES
  // ============================================

  async saveDecisionHistory(history: DecisionHistory[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DECISION_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving decision history:', error);
      throw error;
    }
  }

  async getDecisionHistory(): Promise<DecisionHistory[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DECISION_HISTORY);
      if (!data) return [];
      
      const history = JSON.parse(data);
      return history.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    } catch (error) {
      console.error('Error getting decision history:', error);
      return [];
    }
  }

  async addDecision(decision: DecisionHistory): Promise<void> {
    try {
      const history = await this.getDecisionHistory();
      history.push(decision);
      
      // Mantener solo los últimos 100 registros
      const trimmed = history.slice(-100);
      await this.saveDecisionHistory(trimmed);
    } catch (error) {
      console.error('Error adding decision:', error);
      throw error;
    }
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  async saveStats(stats: ProductivityStats): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving stats:', error);
      throw error;
    }
  }

  async getStats(): Promise<ProductivityStats | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TASKS,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.ENERGY_PROFILE,
        STORAGE_KEYS.PREFERENCES,
        STORAGE_KEYS.DECISION_HISTORY,
        STORAGE_KEYS.STATS,
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  async exportAllData(): Promise<string> {
    try {
      const [tasks, user, profile, preferences, history, stats] = await Promise.all([
        this.getTasks(),
        this.getUser(),
        this.getEnergyProfile(),
        this.getPreferences(),
        this.getDecisionHistory(),
        this.getStats(),
      ]);

      return JSON.stringify({
        tasks,
        user,
        profile,
        preferences,
        history,
        stats,
        exportedAt: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importAllData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.tasks) await this.saveTasks(data.tasks);
      if (data.user) await this.saveUser(data.user);
      if (data.profile) await this.saveEnergyProfile(data.profile);
      if (data.preferences) await this.savePreferences(data.preferences);
      if (data.history) await this.saveDecisionHistory(data.history);
      if (data.stats) await this.saveStats(data.stats);
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
}

export default StorageService.getInstance();
