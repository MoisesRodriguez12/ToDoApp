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

      // Filtrar eventos que no deberían ser tareas
      const filteredEvents = events.filter(event => this.shouldImportAsTask(event));

      return filteredEvents.map(event => this.convertEventToTask(event));
    } catch (error) {
      console.error('Error importing calendar events:', error);
      throw error;
    }
  }

  /**
   * Determina si un evento debería importarse como tarea
   */
  private shouldImportAsTask(event: Calendar.Event): boolean {
    const title = (event.title || '').toLowerCase();
    const notes = (event.notes || '').toLowerCase();
    const combined = `${title} ${notes}`;

    // Filtrar días festivos y eventos automáticos
    const excludePatterns = [
      // Días festivos
      'christmas', 'navidad', 'año nuevo', 'new year', 'easter', 'pascua',
      'thanksgiving', 'independence day', 'día de la independencia', 
      'halloween', 'valentine', 'san valentín', 'mother\'s day', 'día de la madre',
      'father\'s day', 'día del padre', 'labor day', 'día del trabajo',
      
      // Cumpleaños automáticos
      'birthday', 'cumpleaños', 'aniversario', 'anniversary',
      
      // Eventos automáticos/recurrentes del sistema
      'holiday', 'feriado', 'festivo', 'day off', 'día libre',
      'vacation', 'vacaciones', 'break', 'descanso',
      
      // Eventos de todo el día que suelen ser informativos
      'reminder', 'recordatorio', 'notification', 'notificación'
    ];

    // Si contiene algún patrón excluido, no importar
    for (const pattern of excludePatterns) {
      if (combined.includes(pattern)) {
        console.log(`🚫 Skipping event: "${event.title}" (matched: ${pattern})`);
        return false;
      }
    }

    // Si es un evento de todo el día sin descripción específica, probablemente es festivo
    const isAllDay = this.isAllDayEvent(event);
    if (isAllDay && (!event.notes || event.notes.trim().length < 10)) {
      console.log(`🚫 Skipping all-day event without details: "${event.title}"`);
      return false;
    }

    // Si tiene menos de 3 caracteres, probablemente no es útil
    if (title.trim().length < 3) {
      console.log(`🚫 Skipping too short event: "${event.title}"`);
      return false;
    }

    console.log(`✅ Importing event: "${event.title}"`);
    return true;
  }

  /**
   * Determina si un evento es de todo el día
   */
  private isAllDayEvent(event: Calendar.Event): boolean {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    // Si dura 24 horas o más y empieza a medianoche, probablemente es todo el día
    return durationHours >= 24 && start.getHours() === 0 && start.getMinutes() === 0;
  }

  /**
   * Convierte un evento de calendario a una tarea
   */
  private convertEventToTask(event: Calendar.Event): Task {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);

    // Extraer más información del evento
    const title = event.title || 'Sin título';
    const description = event.notes || event.location || undefined;
    const category = this.inferCategory(title, description);
    const priority = this.inferPriority(title, description, startDate);

    return {
      id: event.id,
      title,
      description,
      category,
      priority,
      estimatedEffort: duration > 0 ? duration : 60,
      dueDate: startDate,
      createdAt: new Date(),
      status: TaskStatus.PENDING,
      energyRequired: this.inferEnergyLevel(duration),
      impact: this.inferImpact(title, description),
      urgency: this.calculateUrgency(startDate),
      personalAffinity: 5,
      googleCalendarEventId: event.id,
      tags: event.location ? [event.location] : undefined,
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

  private inferCategory(title: string, description?: string): TaskCategory {
    const lowerTitle = title.toLowerCase();
    const lowerDesc = (description || '').toLowerCase();
    const combined = `${lowerTitle} ${lowerDesc}`;
    
    if (combined.includes('meeting') || combined.includes('reunión') || combined.includes('trabajo') || combined.includes('work') || combined.includes('junta')) {
      return TaskCategory.WORK;
    }
    if (combined.includes('gym') || combined.includes('exercise') || combined.includes('deporte') || combined.includes('salud') || combined.includes('health')) {
      return TaskCategory.HEALTH;
    }
    if (combined.includes('learn') || combined.includes('study') || combined.includes('curso') || combined.includes('clase') || combined.includes('aprender')) {
      return TaskCategory.LEARNING;
    }
    if (combined.includes('creative') || combined.includes('design') || combined.includes('diseño') || combined.includes('arte') || combined.includes('crear')) {
      return TaskCategory.CREATIVE;
    }
    if (combined.includes('admin') || combined.includes('papeleo') || combined.includes('trámite') || combined.includes('documento')) {
      return TaskCategory.ADMINISTRATIVE;
    }
    if (combined.includes('social') || combined.includes('amigos') || combined.includes('familia') || combined.includes('fiesta')) {
      return TaskCategory.SOCIAL;
    }
    
    return TaskCategory.PERSONAL;
  }

  private inferPriority(title: string, description: string | undefined, dueDate: Date): Priority {
    const combined = `${title} ${description || ''}`.toLowerCase();
    const urgency = this.calculateUrgency(dueDate);
    
    // CRÍTICO: Verificar fecha de vencimiento PRIMERO
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Si vence HOY o está vencida -> SIEMPRE URGENTE
    if (daysUntilDue <= 0) {
      return Priority.URGENT;
    }
    
    // Si vence mañana -> ALTA como mínimo
    if (daysUntilDue === 1) {
      return Priority.HIGH;
    }
    
    // Si vence en 2-3 días -> MEDIA como mínimo (puede ser ALTA con palabras clave)
    if (daysUntilDue <= 3) {
      if (combined.includes('urgent') || combined.includes('urgente') || combined.includes('importante')) {
        return Priority.URGENT;
      }
      return Priority.HIGH;
    }
    
    // Palabras clave para prioridad (solo si no está cerca de vencer)
    if (combined.includes('urgent') || combined.includes('urgente') || combined.includes('asap')) {
      return Priority.URGENT;
    }
    if (combined.includes('high') || combined.includes('alta') || combined.includes('importante') || combined.includes('crítico')) {
      return Priority.HIGH;
    }
    if (combined.includes('low') || combined.includes('baja') || combined.includes('opcional')) {
      return Priority.LOW;
    }
    
    // Basado en urgencia de fecha (para fechas lejanas)
    if (urgency >= 8) return Priority.URGENT;
    if (urgency >= 6) return Priority.HIGH;
    if (urgency >= 4) return Priority.MEDIUM;
    return Priority.LOW;
  }

  private inferImpact(title: string, description?: string): number {
    const combined = `${title} ${description || ''}`.toLowerCase();
    
    // Palabras de alto impacto
    if (combined.includes('proyecto') || combined.includes('presentación') || combined.includes('entrega') || combined.includes('deadline')) {
      return 8;
    }
    if (combined.includes('importante') || combined.includes('critical') || combined.includes('key')) {
      return 7;
    }
    if (combined.includes('reunión') || combined.includes('meeting') || combined.includes('junta')) {
      return 6;
    }
    
    return 5; // Impacto medio por defecto
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
