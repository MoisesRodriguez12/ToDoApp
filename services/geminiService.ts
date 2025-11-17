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

const GEMINI_API_KEY = ENV.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiService {
  private static instance: GeminiService;
  private genAI: GoogleGenerativeAI;
  private model: any;

  private constructor() {
    console.log('🔑 Initializing Gemini with gemini-2.5-flash...');
    console.log('API Key length:', GEMINI_API_KEY?.length || 0);
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 20) {
      console.error('❌ GEMINI_API_KEY is missing or invalid');
      throw new Error('Gemini API key no configurada correctamente');
    }
    
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });
    console.log('✅ Gemini service initialized successfully');
  }

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  async analyzeTasksAndRecommend(request: GeminiAnalysisRequest): Promise<GeminiRecommendation | null> {
    try {
      console.log('🤖 Starting task analysis with Gemini...');

      if (!request.tasks || request.tasks.length === 0) {
        console.log('📭 No tasks to analyze');
        return null;
      }

      const prompt = this.buildAnalysisPrompt(request);
      console.log('📤 Sending prompt to Gemini...');
      
      const text = await this.callGeminiWithRetry(prompt);
      console.log('📝 Raw Gemini response:', text);
      
      const analysis = this.parseGeminiResponse(text);
      if (!analysis) {
        console.log('❌ Failed to parse response, returning default');
        return this.createDefaultRecommendation(request.tasks);
      }
      
      const recommendation = this.buildRecommendation(analysis, request.tasks);
      if (!recommendation) {
        console.log('❌ Failed to build recommendation, returning default');
        return this.createDefaultRecommendation(request.tasks);
      }
      
      console.log('✅ Analysis completed successfully');
      return recommendation;

    } catch (error: any) {
      console.error('❌ Error analyzing tasks with Gemini:', error);
      return this.createDefaultRecommendation(request.tasks || []);
    }
  }

  private async callGeminiWithRetry(prompt: string, retries: number = 2): Promise<string> {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Attempt ${i + 1}/${retries}`);
        
        try {
          const result = await this.model.generateContent(prompt);
          const text = result.response.text();
          console.log('✅ SDK response received');
          return text;
        } catch (sdkError: any) {
          console.log('⚠️ SDK failed, trying direct REST API...');
          
          const response = await fetch(
            `${API_URL}/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.7,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 2048,
                }
              })
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ REST API error:', response.status, errorData);
            throw new Error(`API Error ${response.status}`);
          }

          const data = await response.json();
          console.log('✅ REST API response received');
          
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!content) throw new Error('No text content in API response');
          
          return content;
        }
      } catch (error: any) {
        console.error(`❌ Attempt ${i + 1} failed:`, error.message);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('All retry attempts failed');
  }

  private parseGeminiResponse(text: string): any {
    console.log('🔍 Parsing Gemini response...');
    
    try {
      let cleanText = text.trim();
      
      // Buscar JSON en bloques de código
      const codeBlockMatch = cleanText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        console.log('📋 Found JSON in code block');
        return JSON.parse(codeBlockMatch[1].trim());
      }

      // Buscar JSON directo
      const directJsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (directJsonMatch) {
        console.log('📋 Found direct JSON');
        return JSON.parse(directJsonMatch[0].trim());
      }

      // Buscar manualmente
      let braceCount = 0;
      let startIndex = -1;
      let endIndex = -1;

      for (let i = 0; i < cleanText.length; i++) {
        if (cleanText[i] === '{') {
          if (startIndex === -1) startIndex = i;
          braceCount++;
        } else if (cleanText[i] === '}') {
          braceCount--;
          if (braceCount === 0 && startIndex !== -1) {
            endIndex = i + 1;
            break;
          }
        }
      }

      if (startIndex !== -1 && endIndex !== -1) {
        const jsonStr = cleanText.substring(startIndex, endIndex);
        console.log('📋 Found JSON with manual parsing');
        return JSON.parse(jsonStr);
      }

      console.error('❌ No valid JSON found in response');
      return null;

    } catch (error) {
      console.error('❌ JSON parse error:', error);
      console.log('📝 Text that failed to parse:', text);
      return null;
    }
  }

  private buildAnalysisPrompt(request: GeminiAnalysisRequest): string {
    const { tasks } = request;
    const currentEnergy = (request as any).currentEnergy || 'medium';
    const currentTime = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasksList = tasks
      .filter(task => task.status === 'pending')
      .map((task, index) => {
        const daysUntilDue = task.dueDate 
          ? Math.floor((task.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        let dueDateWarning = '';
        if (daysUntilDue !== null) {
          if (daysUntilDue === 0) dueDateWarning = ' ⚠️ **¡VENCE HOY!**';
          else if (daysUntilDue < 0) dueDateWarning = ` ⚠️ **¡VENCIDA hace ${Math.abs(daysUntilDue)} días!**`;
          else if (daysUntilDue === 1) dueDateWarning = ' ⚠️ **Vence mañana**';
        }
        
        return `${index + 1}. **${task.title}**${dueDateWarning}
   - ID: ${task.id}
   - Categoría: ${task.category}
   - Prioridad: ${task.priority}
   - Tiempo: ${task.estimatedEffort} min
   - Energía: ${task.energyRequired}
   - Fecha: ${task.dueDate ? task.dueDate.toLocaleDateString() : 'Sin fecha'}`;
      })
      .join('\n\n');

    return `Eres un asistente de productividad. Analiza estas tareas y recomienda UNA.

CONTEXTO:
- Hora: ${currentTime.toLocaleString('es-ES')}
- Energía: ${currentEnergy}

TAREAS:
${tasksList}

REGLAS:
1. Si hay tareas que vencen HOY, SIEMPRE recomienda una de esas primero
2. Considera el nivel de energía actual
3. Prioriza urgencia e impacto

Responde SOLO con este JSON (sin texto adicional):

{
  "recommendedTaskId": "ID_DE_LA_TAREA",
  "reasoning": "Explicación de por qué esta tarea AHORA (máximo 100 palabras)",
  "confidenceScore": 0.85,
  "contextualFactors": [
    {
      "factor": "Urgencia",
      "weight": 0.4,
      "description": "Razón específica"
    }
  ],
  "alternativeTaskIds": ["id1", "id2"],
  "estimatedCompletionTime": 60,
  "energyAlignment": 0.9,
  "urgencyScore": 1.0,
  "impactScore": 0.8
}`;
  }

  private buildRecommendation(analysis: any, tasks: Task[]): GeminiRecommendation | null {
    try {
      const recommendedTask = tasks.find(t => t.id === analysis.recommendedTaskId);
      
      if (!recommendedTask) {
        console.error('❌ Recommended task not found:', analysis.recommendedTaskId);
        return null;
      }

      const alternativeTasks = (analysis.alternativeTaskIds || [])
        .map((id: string) => tasks.find(t => t.id === id))
        .filter((t: Task | undefined) => t !== undefined) as Task[];

      return {
        recommendedTask,
        reasoning: analysis.reasoning || 'Recomendación generada por IA',
        confidenceScore: analysis.confidenceScore || 0.5,
        alternativeTasks,
        contextualFactors: analysis.contextualFactors || [],
        estimatedCompletionTime: analysis.estimatedCompletionTime || recommendedTask.estimatedEffort || 30,
        energyAlignment: analysis.energyAlignment || 0.5,
        urgencyScore: analysis.urgencyScore || 0.5,
        impactScore: analysis.impactScore || 0.5,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Error building recommendation:', error);
      return null;
    }
  }

  private createDefaultRecommendation(tasks: Task[]): GeminiRecommendation {
    if (tasks.length === 0) {
      return {
        recommendedTask: {
          id: 'no-task',
          title: 'No hay tareas pendientes',
          description: 'Agrega nuevas tareas para obtener recomendaciones',
          category: 'personal' as any,
          priority: 'low' as any,
          status: 'pending' as any,
          estimatedEffort: 0,
          energyRequired: EnergyLevel.LOW,
          impact: 1,
          urgency: 1,
          personalAffinity: 1,
          createdAt: new Date(),
        },
        reasoning: 'No hay tareas pendientes. Agrega nuevas tareas para obtener recomendaciones.',
        confidenceScore: 0,
        alternativeTasks: [],
        contextualFactors: [],
        estimatedCompletionTime: 0,
        energyAlignment: 0,
        urgencyScore: 0,
        impactScore: 0,
        timestamp: new Date(),
      };
    }

    const fallbackTask = tasks[0];
    return {
      recommendedTask: fallbackTask,
      reasoning: `Recomendación automática: "${fallbackTask.title}" es una tarea disponible.`,
      confidenceScore: 0.5,
      alternativeTasks: tasks.slice(1, 3),
      contextualFactors: [{ factor: 'Fallback', weight: 1.0, description: 'IA no disponible' }],
      estimatedCompletionTime: fallbackTask.estimatedEffort || 30,
      energyAlignment: 0.5,
      urgencyScore: 0.5,
      impactScore: 0.5,
      timestamp: new Date(),
    };
  }

  async generateText(prompt: string): Promise<string> {
    try {
      console.log('📝 Generating text with Gemini...');
      return await this.callGeminiWithRetry(prompt);
    } catch (error: any) {
      console.error('❌ Error generating text:', error);
      return 'Error al generar texto con IA.';
    }
  }
}

export default GeminiService.getInstance();
