// ============================================
// TIPOS PRINCIPALES DEL SISTEMA
// ============================================

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: Priority;
  estimatedEffort: number; // minutos
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
  status: TaskStatus;
  energyRequired: EnergyLevel;
  impact: number; // 1-10
  urgency: number; // 1-10
  personalAffinity: number; // 1-10
  googleCalendarEventId?: string;
  tags?: string[];
}

export enum TaskCategory {
  WORK = 'work',
  PERSONAL = 'personal',
  LEARNING = 'learning',
  HEALTH = 'health',
  CREATIVE = 'creative',
  ADMINISTRATIVE = 'administrative',
  SOCIAL = 'social',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  POSTPONED = 'postponed',
  CANCELLED = 'cancelled',
}

export enum EnergyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// ============================================
// PERFIL DE ENERGÍA DEL USUARIO
// ============================================

export interface EnergyProfile {
  userId: string;
  hourlyEnergyMap: HourlyEnergy[]; // Energía por hora del día
  personalRules: PersonalRule[];
  preferences: UserPreferences;
  updatedAt: Date;
}

export interface HourlyEnergy {
  hour: number; // 0-23
  energyLevel: EnergyLevel;
  dayOfWeek?: number; // 0-6 (opcional para diferentes días)
}

export interface PersonalRule {
  id: string;
  type: RuleType;
  description: string;
  condition: string; // ej: "hour >= 22"
  action: string; // ej: "no_work"
  active: boolean;
}

export enum RuleType {
  TIME_BLOCK = 'time_block', // Bloques de tiempo
  NO_WORK_AFTER = 'no_work_after', // No trabajar después de X hora
  MANDATORY_BREAK = 'mandatory_break', // Descansos obligatorios
  CATEGORY_RESTRICTION = 'category_restriction', // Restricción por categoría
  ENERGY_MINIMUM = 'energy_minimum', // Energía mínima requerida
}

// ============================================
// PREFERENCIAS DEL USUARIO
// ============================================

export interface UserPreferences {
  userId: string;
  categoryPreferences: CategoryPreference[];
  workingHours: {
    start: number; // hora de inicio (0-23)
    end: number; // hora de fin (0-23)
  };
  breakDuration: number; // minutos
  maxTasksPerDay: number;
  notificationsEnabled: boolean;
  syncWithGoogleCalendar: boolean;
  learningMode: boolean; // Si el sistema debe aprender de las decisiones
}

export interface CategoryPreference {
  category: TaskCategory;
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  affinityScore: number; // 1-10
}

// ============================================
// HISTORIAL DE DECISIONES
// ============================================

export interface DecisionHistory {
  id: string;
  userId: string;
  timestamp: Date;
  recommendedTask: string; // ID de la tarea
  actualTaskChosen: string; // ID de la tarea que eligió
  reasonForChange?: string;
  contextSnapshot: DecisionContext;
  wasCompleted: boolean;
  completionTime?: number; // minutos que tomó completar
  userFeedback?: UserFeedback;
}

export interface DecisionContext {
  hour: number;
  dayOfWeek: number;
  userEnergyLevel: EnergyLevel;
  pendingTasksCount: number;
  recommendationScore: number;
}

export interface UserFeedback {
  rating: number; // 1-5
  comment?: string;
  wasHelpful: boolean;
}

// ============================================
// RECOMENDACIÓN DE GEMINI
// ============================================

export interface GeminiRecommendation {
  recommendedTask: Task;
  reasoning: string;
  confidenceScore: number; // 0-1
  alternativeTasks: Task[];
  contextualFactors: ContextualFactor[];
  estimatedCompletionTime: number; // minutos
  energyAlignment: number; // qué tan bien se alinea con la energía actual (0-1)
  urgencyScore: number; // 0-1
  impactScore: number; // 0-1
  timestamp: Date;
}

export interface ContextualFactor {
  factor: string;
  weight: number;
  description: string;
}

// ============================================
// USUARIO Y AUTENTICACIÓN
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

// ============================================
// RESPUESTA DE LA API DE GEMINI
// ============================================

export interface GeminiAnalysisRequest {
  tasks: Task[];
  currentTime: Date;
  userProfile: EnergyProfile;
  recentHistory: DecisionHistory[];
}

export interface GeminiAnalysisResponse {
  recommendation: GeminiRecommendation;
  timestamp: Date;
  modelVersion: string;
}

// ============================================
// ESTADÍSTICAS Y MÉTRICAS
// ============================================

export interface ProductivityStats {
  userId: string;
  period: 'day' | 'week' | 'month';
  tasksCompleted: number;
  tasksPostponed: number;
  averageCompletionTime: number;
  categoryBreakdown: {
    category: TaskCategory;
    count: number;
    averageTime: number;
  }[];
  peakProductivityHours: number[];
  recommendationAccuracy: number; // % de veces que siguió la recomendación
}

// ============================================
// EVENTOS DE GOOGLE CALENDAR
// ============================================

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  status: string;
  location?: string;
  colorId?: string;
}
