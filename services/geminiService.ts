import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Task,
  GeminiRecommendation,
  EnergyProfile,
  GeminiAnalysisRequest,
  EnergyLevel,
} from '../types';
import { ENV } from '../constants/env';

const GEMINI_API_KEY = ENV.GEMINI_API_KEY;

export class GeminiService {
  private static instance: GeminiService;
  private genAI: GoogleGenerativeAI;
  private model: any;

  private constructor() {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 20) {
      throw new Error('Gemini API key no configurada');
    }
    
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
      systemInstruction: {
        role: 'system',
        parts: [{ text: 'Responde directamente con el JSON solicitado. No uses razonamiento interno extenso.' }]
      },
    });
  }

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  // ==================== RECOMENDACIÓN DE TAREAS ====================
  
  async analyzeTasksAndRecommend(request: GeminiAnalysisRequest): Promise<GeminiRecommendation | null> {
    try {
      if (!request.tasks || request.tasks.length === 0) {
        return null;
      }

      const prompt = this.buildRecommendationPrompt(request);
      const response = await this.callGemini(prompt);
      const analysis = this.parseJSON(response);
      
      const recommendedTask = request.tasks.find(t => t.id === analysis.recommendedTaskId);
      if (!recommendedTask) {
        throw new Error(`Tarea no encontrada: ${analysis.recommendedTaskId}`);
      }

      const alternativeTasks = (analysis.alternativeTaskIds || [])
        .map((id: string) => request.tasks.find(t => t.id === id))
        .filter(Boolean) as Task[];

      return {
        recommendedTask,
        reasoning: analysis.reasoning || 'Recomendación generada',
        confidenceScore: analysis.confidenceScore || 0.5,
        alternativeTasks,
        contextualFactors: analysis.contextualFactors || [],
        estimatedCompletionTime: analysis.estimatedCompletionTime || recommendedTask.estimatedEffort || 30,
        energyAlignment: analysis.energyAlignment || 0.5,
        urgencyScore: analysis.urgencyScore || 0.5,
        impactScore: analysis.impactScore || 0.5,
        timestamp: new Date(),
      };

    } catch (error: any) {
      console.error('❌ Error en recomendación:', error.message);
      return null;
    }
  }

  private buildRecommendationPrompt(request: GeminiAnalysisRequest): string {
    const { tasks } = request;
    const currentEnergy = (request as any).currentEnergy || 'medium';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasksList = tasks
      .filter(task => task.status === 'pending')
      .map((task, index) => {
        const daysUntilDue = task.dueDate 
          ? Math.floor((task.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        let urgencyTag = '';
        if (daysUntilDue !== null) {
          if (daysUntilDue <= 0) urgencyTag = ' ⚠️ URGENTE';
          else if (daysUntilDue === 1) urgencyTag = ' ⏰ Mañana';
        }
        
        return `${index + 1}. "${task.title}"${urgencyTag}
   ID: ${task.id}
   Tiempo: ${task.estimatedEffort}min | Prioridad: ${task.priority}`;
      })
      .join('\n\n');

    return `Recomienda UNA tarea de esta lista.

${tasksList}

Contexto:
- Hora: ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
- Energía usuario: ${currentEnergy}

**IMPORTANTE**: Responde ÚNICAMENTE en ESPAÑOL. Todo el contenido debe estar en español.

Responde JSON puro (sin markdown):
{
  "recommendedTaskId": "ID_EXACTO_DE_LA_LISTA",
  "reasoning": "Por qué esta tarea ahora",
  "confidenceScore": 0.85,
  "contextualFactors": [
    {"factor": "Urgencia", "weight": 0.4, "description": "Razón"}
  ],
  "alternativeTaskIds": [],
  "estimatedCompletionTime": 60,
  "energyAlignment": 0.9,
  "urgencyScore": 1.0,
  "impactScore": 0.8
}`;
  }

  // ==================== PLAN DEL DÍA ====================
  
  async generateDetailedDayPlan(tasks: Task[], energyProfile?: EnergyProfile, retryCount: number = 0): Promise<any> {
    const MAX_RETRIES = 2;
    
    try {
      if (!tasks || tasks.length === 0) {
        return null;
      }

      const prompt = this.buildDayPlanPrompt(tasks);
      console.log('📤 PROMPT ENVIADO A GEMINI:');
      console.log('═══════════════════════════════════════════════════════');
      console.log(prompt.substring(0, 500) + '...');
      console.log('═══════════════════════════════════════════════════════');
      
      const response = await this.callGemini(prompt);
      
      console.log('📥 RESPUESTA COMPLETA DE GEMINI:');
      console.log('═══════════════════════════════════════════════════════');
      console.log(response);
      console.log('═══════════════════════════════════════════════════════');
      console.log('📏 Longitud de respuesta:', response.length, 'caracteres');
      
      // Detectar si la respuesta está truncada
      if (!response.trim().endsWith('}') && !response.trim().endsWith(']')) {
        console.error('⚠️ Respuesta truncada de Gemini - No termina con } o ]');
        console.error('Últimos 100 caracteres:', response.slice(-100));
        throw new Error('Respuesta incompleta de Gemini');
      }
      
      const plan = this.parseJSON(response);
      
      console.log('✅ PLAN PARSEADO:');
      console.log('═══════════════════════════════════════════════════════');
      console.log(JSON.stringify(plan, null, 2));
      console.log('═══════════════════════════════════════════════════════');
      
      if (plan?.detailedPlan?.timeBlocks) {
        console.log(`📊 Bloques de tiempo: ${plan.detailedPlan.timeBlocks.length}`);
        plan.detailedPlan.timeBlocks.forEach((block: any, i: number) => {
          console.log(`  ${i + 1}. ${block.startTime || '??'} - ${block.endTime || '??'}: ${block.taskTitle || block.task || '??'}`);
          console.log(`     Tipo: ${block.taskType || 'N/A'}`);
          console.log(`     WhyNow: ${block.whyNow || 'N/A'}`);
        });
      }
      
      if (plan?.detailedPlan?.breaks) {
        console.log(`☕ Descansos: ${plan.detailedPlan.breaks.length}`);
        plan.detailedPlan.breaks.forEach((breakItem: any, i: number) => {
          console.log(`  ${i + 1}. ${breakItem.time}: ${breakItem.duration}min - ${breakItem.type || 'break'}`);
        });
      }
      
      if (plan?.detailedPlan?.productivityTips) {
        console.log(`💡 Consejos: ${plan.detailedPlan.productivityTips.length}`);
      }
      
      return plan;

    } catch (error: any) {
      // Retry on truncation error
      if (error.message.includes('Respuesta incompleta') && retryCount < MAX_RETRIES) {
        console.warn(`🔄 Reintentando (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.generateDetailedDayPlan(tasks, energyProfile, retryCount + 1);
      }
      
      console.error('❌ Error generando plan:', error.message);
      console.error('Stack:', error.stack);
      return null;
    }
  }

  private buildDayPlanPrompt(tasks: Task[]): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasksList = tasks
      .filter(task => task.status === 'pending')
      .map((task, index) => {
        const daysUntilDue = task.dueDate 
          ? Math.floor((task.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        let urgency = 'normal';
        if (daysUntilDue !== null) {
          if (daysUntilDue <= 0) urgency = 'URGENTE';
          else if (daysUntilDue === 1) urgency = 'alta';
          else if (daysUntilDue <= 3) urgency = 'media';
        }
        
        const desc = task.description ? `\n   Descripción: ${task.description}` : '';
        return `${index + 1}. "${task.title}"${desc}
   [Duración: ${task.estimatedEffort}min | Prioridad: ${task.priority} | Urgencia: ${urgency} | Categoría: ${task.category} | Energía: ${task.energyRequired}]`;
      })
      .join('\n\n');

    const hora = new Date().getHours();
    const momento = hora < 12 ? 'mañana' : hora < 18 ? 'tarde' : 'noche';
    const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    return `Eres un experto en productividad y gestión del tiempo. Crea un PLAN DEL DÍA DETALLADO Y ÚTIL en ESPAÑOL.

═══════════════════════════════════════════════════════
📋 TAREAS PENDIENTES:
═══════════════════════════════════════════════════════
${tasksList}

⏰ CONTEXTO:
- Momento: ${momento}
- Hora actual: ${horaActual}
- Total tareas: ${tasks.filter(t => t.status === 'pending').length}

═══════════════════════════════════════════════════════
🎯 INSTRUCCIONES (SER CONCISO):
═══════════════════════════════════════════════════════

1️⃣ ORDEN: URGENTE primero, luego por energía
2️⃣ TIEMPOS: Desde ${horaActual} + buffer 20%
3️⃣ DESCRIPTION: MAX 2 líneas → Pasos + Técnica + Objetivo
4️⃣ TIPS: 3 consejos de 1 línea (Pomodoro, descansos, enfoque)

═══════════════════════════════════════════════════════
📝 FORMATO JSON (SIN MARKDOWN \`\`\`json):
═══════════════════════════════════════════════════════

{
  "planTitle": "Plan del Día",
  "reasoning": "Orden por urgencia. Descansos para mantener energía.",
  "detailedPlan": {
    "timeBlocks": [
      {
        "startTime": "${horaActual}",
        "endTime": "10:30",
        "taskTitle": "Nombre EXACTO de la tarea",
        "taskType": "mental-rutinaria",
        "description": "Pasos: 1) Revisar. 2) Ejecutar. 3) Validar. Técnica: Pomodoro. Objetivo: Completar tarea.",
        "whyNow": "Urgencia alta"
      }
    ],
    "breaks": [
      {
        "time": "10:25",
        "duration": 10,
        "type": "micro-break",
        "suggestion": "Caminar 3min + estirar + agua"
      }
    ],
    "productivityTips": [
      "🎯 Pomodoro 25+5: Timer + modo avión",
      "💤 Cada 60min: Estirar + respirar",
      "⚡ Enfoque: Celular lejos"
    ]
  }
}

⚠️ IMPORTANTE:
- Incluir TODAS las tareas en timeBlocks
- MAX: description 2 líneas, reasoning 2 líneas, tips 3 de 1 línea, whyNow 1 línea
- Responder SOLO JSON (sin \`\`\`json)`;
  }

  // ==================== UTILIDADES ====================
  
  private async callGemini(prompt: string): Promise<string> {
    try {
      console.log('🔄 Llamando a Gemini API...');
      const result = await this.model.generateContent(prompt);
      console.log('✅ Respuesta recibida de Gemini');
      console.log('📦 Result object:', JSON.stringify(result, null, 2));
      
      const response = result.response;
      console.log('📄 Response object:', JSON.stringify(response, null, 2));
      
      // Intentar extraer texto de diferentes formas
      let text = '';
      
      try {
        text = response.text();
      } catch (textError) {
        console.warn('⚠️ response.text() falló, intentando extracción manual');
        
        // Intentar extraer manualmente de candidates
        if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = response.candidates[0].content.parts[0].text;
        } else if (response.candidates?.[0]?.content?.parts) {
          // Concatenar todos los parts
          text = response.candidates[0].content.parts
            .map((part: any) => part.text || '')
            .join('');
        }
      }
      
      console.log('📝 Text extracted:', text?.substring(0, 200));
      
      if (!text || text.trim().length === 0) {
        console.error('❌ Gemini devolvió texto vacío');
        console.error('📊 Response completo:', JSON.stringify(response, null, 2));
        console.error('🔍 Candidates:', response.candidates?.[0]);
        console.error('🔍 Parts:', response.candidates?.[0]?.content?.parts);
        throw new Error('Gemini devolvió una respuesta vacía - posiblemente todos los tokens se usaron en thinking');
      }
      
      return text;
    } catch (error: any) {
      console.error('❌ Error en callGemini:', error);
      console.error('📋 Error message:', error.message);
      console.error('📋 Error stack:', error.stack);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  private parseJSON(text: string): any {
    try {
      let cleanText = text.trim();
      
      // Extraer de bloques markdown
      if (cleanText.includes('```')) {
        const match = /```(?:json)?\s*([\s\S]*?)```/i.exec(cleanText);
        if (match && match[1]) {
          cleanText = match[1].trim();
        }
      }
      
      // Limpiar antes y después del JSON
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleanText);
      return parsed;

    } catch (error) {
      // Si el JSON está truncado, intentar repararlo
      if (error instanceof SyntaxError && text.includes('{')) {
        console.error('⚠️ Respuesta truncada de Gemini');
        console.error('📄 Respuesta parcial:', text);
        throw new Error('Respuesta incompleta de Gemini - intenta de nuevo');
      }
      
      console.error('❌ Error parseando JSON:', error instanceof Error ? error.message : 'Unknown');
      console.error('📄 Respuesta:', text.substring(0, 500));
      throw error;
    }
  }

  async generateText(prompt: string): Promise<string> {
    try {
      return await this.callGemini(prompt);
    } catch (error: any) {
      console.error('❌ Error generando texto:', error.message);
      return 'Error al generar texto.';
    }
  }
}

export default GeminiService.getInstance();
