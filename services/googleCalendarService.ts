import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Task, TaskCategory, Priority, TaskStatus, EnergyLevel, GoogleCalendarEvent } from '../types';

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private calendarId: string | null = null;

  private constructor() {}

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * Solicita permisos de calendario
   */
  async requestCalendarPermissions(): Promise<boolean> {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  }

  /**
   * Obtiene el calendario por defecto o crea uno para la app
   */
  async getOrCreateAppCalendar(): Promise<string | null> {
    try {
      if (this.calendarId) return this.calendarId;

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      
      // Buscar calendario existente de la app
      const appCalendar = calendars.find(cal => cal.title === 'ToDoApp Tasks');
      
      if (appCalendar) {
        this.calendarId = appCalendar.id;
        return appCalendar.id;
      }

      // Crear nuevo calendario si no existe
      if (Platform.OS === 'ios') {
        const defaultCalendar = calendars.find(cal => cal.allowsModifications);
        if (defaultCalendar) {
          this.calendarId = defaultCalendar.id;
          return defaultCalendar.id;
        }
      } else {
        // Android - crear calendario
        const newCalendarId = await Calendar.createCalendarAsync({
          title: 'ToDoApp Tasks',
          color: '#3B82F6',
          entityType: Calendar.EntityTypes.EVENT,
          sourceId: calendars[0]?.source?.id,
          source: calendars[0]?.source,
          name: 'ToDoApp Tasks',
          ownerAccount: 'personal',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
        this.calendarId = newCalendarId;
        return newCalendarId;
      }

      return null;
    } catch (error) {
      console.error('Error getting/creating calendar:', error);
      return null;
    }
  }

  /**
   * Importa eventos de Google Calendar como tareas
   */
  async importEventsAsTasks(startDate: Date, endDate: Date): Promise<Task[]> {
    try {
      const hasPermission = await this.requestCalendarPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permission denied');
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const events = await Calendar.getEventsAsync(
        calendars.map(cal => cal.id),
        startDate,
        endDate
      );

      return events.map(event => this.convertEventToTask(event));
    } catch (error) {
      console.error('Error importing calendar events:', error);
      throw error;
    }
  }

  /**
   * Convierte un evento de calendario a una tarea
   */
  private convertEventToTask(event: Calendar.Event): Task {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);

    return {
      id: event.id,
      title: event.title || 'Sin título',
      description: event.notes || undefined,
      category: this.inferCategory(event.title || ''),
      priority: Priority.MEDIUM,
      estimatedEffort: duration,
      dueDate: startDate,
      createdAt: new Date(),
      status: TaskStatus.PENDING,
      energyRequired: this.inferEnergyLevel(duration),
      impact: 5,
      urgency: this.calculateUrgency(startDate),
      personalAffinity: 5,
      googleCalendarEventId: event.id,
    };
  }

  /**
   * Exporta una tarea como evento de calendario
   */
  async exportTaskToCalendar(task: Task): Promise<string | null> {
    try {
      const hasPermission = await this.requestCalendarPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permission denied');
      }

      const calendarId = await this.getOrCreateAppCalendar();
      if (!calendarId) {
        throw new Error('No calendar available');
      }

      const startDate = task.dueDate || new Date();
      const endDate = new Date(startDate.getTime() + task.estimatedEffort * 60000);

      const eventId = await Calendar.createEventAsync(calendarId, {
        title: task.title,
        notes: task.description,
        startDate,
        endDate,
        timeZone: 'UTC',
        alarms: [
          { relativeOffset: -30 }, // 30 minutos antes
          { relativeOffset: -1440 }, // 1 día antes
        ],
      });

      return eventId;
    } catch (error) {
      console.error('Error exporting task to calendar:', error);
      return null;
    }
  }

  /**
   * Actualiza un evento existente en el calendario
   */
  async updateCalendarEvent(task: Task): Promise<boolean> {
    try {
      if (!task.googleCalendarEventId) return false;

      const hasPermission = await this.requestCalendarPermissions();
      if (!hasPermission) return false;

      const startDate = task.dueDate || new Date();
      const endDate = new Date(startDate.getTime() + task.estimatedEffort * 60000);

      await Calendar.updateEventAsync(task.googleCalendarEventId, {
        title: task.title,
        notes: task.description,
        startDate,
        endDate,
      });

      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return false;
    }
  }

  /**
   * Elimina un evento del calendario
   */
  async deleteCalendarEvent(eventId: string): Promise<boolean> {
    try {
      const hasPermission = await this.requestCalendarPermissions();
      if (!hasPermission) return false;

      await Calendar.deleteEventAsync(eventId);
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }

  /**
   * Sincroniza tareas con el calendario
   */
  async syncTasksWithCalendar(tasks: Task[]): Promise<void> {
    try {
      for (const task of tasks) {
        if (task.googleCalendarEventId) {
          // Actualizar evento existente
          await this.updateCalendarEvent(task);
        } else if (task.status !== TaskStatus.COMPLETED) {
          // Crear nuevo evento
          const eventId = await this.exportTaskToCalendar(task);
          if (eventId) {
            task.googleCalendarEventId = eventId;
          }
        }
      }
    } catch (error) {
      console.error('Error syncing tasks with calendar:', error);
      throw error;
    }
  }

  // ============================================
  // MÉTODOS DE UTILIDAD
  // ============================================

  private inferCategory(title: string): TaskCategory {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('meeting') || lowerTitle.includes('reunión')) {
      return TaskCategory.WORK;
    }
    if (lowerTitle.includes('gym') || lowerTitle.includes('exercise') || lowerTitle.includes('deporte')) {
      return TaskCategory.HEALTH;
    }
    if (lowerTitle.includes('learn') || lowerTitle.includes('study') || lowerTitle.includes('curso')) {
      return TaskCategory.LEARNING;
    }
    if (lowerTitle.includes('creative') || lowerTitle.includes('design') || lowerTitle.includes('diseño')) {
      return TaskCategory.CREATIVE;
    }
    
    return TaskCategory.PERSONAL;
  }

  private inferEnergyLevel(durationMinutes: number): EnergyLevel {
    if (durationMinutes <= 30) return EnergyLevel.LOW;
    if (durationMinutes <= 90) return EnergyLevel.MEDIUM;
    return EnergyLevel.HIGH;
  }

  private calculateUrgency(dueDate: Date): number {
    const now = new Date();
    const diffDays = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 10; // Vencida
    if (diffDays === 0) return 9; // Hoy
    if (diffDays === 1) return 8; // Mañana
    if (diffDays <= 3) return 7;
    if (diffDays <= 7) return 5;
    return 3;
  }

  /**
   * Obtiene eventos futuros del calendario
   */
  async getFutureEvents(daysAhead: number = 7): Promise<GoogleCalendarEvent[]> {
    try {
      const hasPermission = await this.requestCalendarPermissions();
      if (!hasPermission) return [];

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const events = await Calendar.getEventsAsync(
        calendars.map(cal => cal.id),
        startDate,
        endDate
      );

      return events.map(event => ({
        id: event.id,
        summary: event.title || '',
        description: event.notes || undefined,
        start: new Date(event.startDate),
        end: new Date(event.endDate),
        status: event.status || 'confirmed',
        location: event.location || undefined,
      }));
    } catch (error) {
      console.error('Error getting future events:', error);
      return [];
    }
  }
}

export default GoogleCalendarService.getInstance();
