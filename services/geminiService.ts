import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Task,
  GeminiRecommendation,
  EnergyProfile,
  DecisionHistory,
  GeminiAnalysisRequest,
  ContextualFactor,
  EnergyLevel,
} from '../types';
import { ENV } from '../constants/env';

// Configuración de la API
const GEMINI_API_KEY = ENV.GEMINI_API_KEY;

export class GeminiService {
  private static instance: GeminiService;
  private genAI: GoogleGenerativeAI;
  private model: any;

  private constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Analiza tareas y devuelve una recomendación inteligente
   */
  async analyzeTasksAndRecommend(
    request: GeminiAnalysisRequest
  ): Promise<GeminiRecommendation | null> {
    try {
      const prompt = this.buildAnalysisPrompt(request);
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parsear respuesta JSON
      const analysis = this.parseGeminiResponse(text);
      
      if (!analysis) {
        throw new Error('Failed to parse Gemini response');
      }

      return this.buildRecommendation(analysis, request.tasks);
    } catch (error) {
      console.error('Error analyzing tasks with Gemini:', error);
      return null;
    }
  }

  /**
   * Construye el prompt para Gemini
   */
  private buildAnalysisPrompt(request: GeminiAnalysisRequest): string {
    const { tasks, currentTime, userProfile, recentHistory } = request;

    const currentHour = currentTime.getHours();
    const currentEnergy = this.getCurrentEnergyLevel(userProfile, currentHour);
    
    const activeRules = userProfile.personalRules
      .filter(rule => rule.active)
      .map(rule => `- ${rule.description}`)
      .join('\n');

    const tasksList = tasks
      .filter(task => task.status === 'pending' || task.status === 'in_progress')
      .map((task, index) => {
        const daysUntilDue = task.dueDate 
          ? Math.floor((task.dueDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        return `${index + 1}. **${task.title}**
   - ID: ${task.id}
   - Categoría: ${task.category}
   - Esfuerzo estimado: ${task.estimatedEffort} minutos
   - Energía requerida: ${task.energyRequired}
   - Impacto: ${task.impact}/10
   - Urgencia: ${task.urgency}/10
   - Afinidad personal: ${task.personalAffinity}/10
   - Fecha límite: ${task.dueDate ? task.dueDate.toLocaleDateString() : 'No especificada'}
   - Días hasta vencimiento: ${daysUntilDue !== null ? daysUntilDue : 'N/A'}
   - Descripción: ${task.description || 'Sin descripción'}`;
      })
      .join('\n\n');

    const historyInsights = this.generateHistoryInsights(recentHistory);

    const prompt = `Eres un asistente de productividad impulsado por IA. Tu objetivo es analizar las tareas del usuario y recomendar cuál debería hacer AHORA mismo, considerando múltiples factores.

## CONTEXTO ACTUAL

**Hora actual:** ${currentTime.toLocaleString('es-ES')}
**Día de la semana:** ${this.getDayName(currentTime.getDay())}
**Nivel de energía del usuario:** ${currentEnergy}

## PERFIL DE ENERGÍA DEL USUARIO

${this.formatEnergyProfile(userProfile)}

## REGLAS PERSONALES ACTIVAS

${activeRules || 'Sin reglas personales configuradas'}

## TAREAS PENDIENTES

${tasksList}

## HISTORIAL RECIENTE DE DECISIONES

${historyInsights}

## TU TAREA

Analiza todas las tareas pendientes y recomienda UNA tarea específica que el usuario debería hacer AHORA. Considera:

1. **Nivel de energía actual**: La tarea debe coincidir con la energía disponible del usuario
2. **Urgencia**: Prioriza tareas próximas a vencer
3. **Impacto**: Tareas con mayor impacto son más importantes
4. **Afinidad personal**: El usuario prefiere ciertas tareas
5. **Esfuerzo estimado**: ¿Tiene tiempo suficiente ahora?
6. **Reglas personales**: SIEMPRE respeta las reglas del usuario
7. **Patrones históricos**: Aprende de decisiones pasadas

## FORMATO DE RESPUESTA

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones adicionales):

\`\`\`json
{
  "recommendedTaskId": "ID de la tarea recomendada",
  "reasoning": "Explicación detallada de por qué esta tarea es la mejor opción ahora (mínimo 100 palabras)",
  "confidenceScore": 0.85,
  "contextualFactors": [
    {
      "factor": "Energía actual",
      "weight": 0.3,
      "description": "Tu energía está en nivel alto, ideal para tareas complejas"
    },
    {
      "factor": "Urgencia",
      "weight": 0.25,
      "description": "Esta tarea vence en 2 días"
    }
  ],
  "alternativeTaskIds": ["id1", "id2", "id3"],
  "estimatedCompletionTime": 60,
  "energyAlignment": 0.9,
  "urgencyScore": 0.7,
  "impactScore": 0.8
}
\`\`\`

IMPORTANTE: 
- NO incluyas ningún texto fuera del JSON
- Asegúrate de que el JSON sea válido
- Los IDs deben corresponder a tareas existentes
- El reasoning debe ser específico y personalizado`;

    return prompt;
  }

  /**
   * Parsea la respuesta de Gemini
   */
  private parseGeminiResponse(text: string): any {
    try {
      // Limpiar respuesta (eliminar markdown si existe)
      let cleanText = text.trim();
      
      // Eliminar bloques de código markdown
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Encontrar el objeto JSON
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', text);
        return null;
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      console.error('Raw response:', text);
      return null;
    }
  }

  /**
   * Construye la recomendación final
   */
  private buildRecommendation(
    analysis: any,
    tasks: Task[]
  ): GeminiRecommendation | null {
    const recommendedTask = tasks.find(t => t.id === analysis.recommendedTaskId);
    
    if (!recommendedTask) {
      console.error('Recommended task not found:', analysis.recommendedTaskId);
      return null;
    }

    const alternativeTasks = analysis.alternativeTaskIds
      .map((id: string) => tasks.find(t => t.id === id))
      .filter((t: Task | undefined) => t !== undefined) as Task[];

    return {
      recommendedTask,
      reasoning: analysis.reasoning,
      confidenceScore: analysis.confidenceScore || 0.5,
      alternativeTasks,
      contextualFactors: analysis.contextualFactors || [],
      estimatedCompletionTime: analysis.estimatedCompletionTime || recommendedTask.estimatedEffort,
      energyAlignment: analysis.energyAlignment || 0.5,
      urgencyScore: analysis.urgencyScore || 0.5,
      impactScore: analysis.impactScore || 0.5,
      timestamp: new Date(),
    };
  }

  /**
   * Genera insights del historial
   */
  private generateHistoryInsights(history: DecisionHistory[]): string {
    if (history.length === 0) {
      return 'No hay historial de decisiones previas.';
    }

    const recentDecisions = history.slice(-5);
    const insights = recentDecisions.map((decision, index) => {
      const followedRecommendation = decision.recommendedTask === decision.actualTaskChosen;
      const completed = decision.wasCompleted ? 'Completada' : 'No completada';
      
      return `${index + 1}. ${decision.timestamp.toLocaleDateString()} - ${followedRecommendation ? 'Siguió' : 'No siguió'} recomendación - ${completed}`;
    });

    const followRate = recentDecisions.filter(d => d.recommendedTask === d.actualTaskChosen).length / recentDecisions.length;
    const completionRate = recentDecisions.filter(d => d.wasCompleted).length / recentDecisions.length;

    return `${insights.join('\n')}

**Métricas:**
- Tasa de seguimiento: ${(followRate * 100).toFixed(0)}%
- Tasa de completado: ${(completionRate * 100).toFixed(0)}%`;
  }

  /**
   * Formatea el perfil de energía
   */
  private formatEnergyProfile(profile: EnergyProfile): string {
    const energyByTime = profile.hourlyEnergyMap
      .sort((a, b) => a.hour - b.hour)
      .map(entry => `${entry.hour}:00 - ${this.getEnergyEmoji(entry.energyLevel)} ${entry.energyLevel}`)
      .join('\n');

    return energyByTime;
  }

  /**
   * Obtiene el nivel de energía actual
   */
  private getCurrentEnergyLevel(profile: EnergyProfile, hour: number): EnergyLevel {
    const energyEntry = profile.hourlyEnergyMap.find(e => e.hour === hour);
    return energyEntry?.energyLevel || EnergyLevel.MEDIUM;
  }

  /**
   * Obtiene emoji de energía
   */
  private getEnergyEmoji(level: EnergyLevel): string {
    switch (level) {
      case EnergyLevel.HIGH:
        return '⚡';
      case EnergyLevel.MEDIUM:
        return '💪';
      case EnergyLevel.LOW:
        return '😴';
      default:
        return '💪';
    }
  }

  /**
   * Obtiene el nombre del día
   */
  private getDayName(dayIndex: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayIndex];
  }

  /**
   * Genera un resumen de productividad
   */
  async generateProductivityInsights(
    tasks: Task[],
    history: DecisionHistory[]
  ): Promise<string> {
    try {
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const prompt = `Analiza los siguientes datos de productividad y genera un resumen con insights accionables:

**Tareas completadas:** ${completedTasks.length}
**Tareas pendientes:** ${tasks.filter(t => t.status === 'pending').length}
**Historial de decisiones:** ${history.length}

Proporciona:
1. Patrones de productividad detectados
2. Momentos del día más productivos
3. Categorías de tareas más completadas
4. Recomendaciones para mejorar

Responde en español, de forma clara y concisa (máximo 200 palabras).`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating insights:', error);
      return 'No se pudieron generar insights en este momento.';
    }
  }
}

export default GeminiService.getInstance();
