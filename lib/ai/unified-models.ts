/**
 * UNIFIED MODELS - Combina modelos de Groq y OpenRouter
 * Separa quirúrgicamente los proveedores pero presenta una interfaz unificada
 */

import { chatModels as groqModels, type ChatModel } from './models';
import {
  textModels as openRouterTextModels,
  codeModels as openRouterCodeModels,
  multimodalModels as openRouterMultimodalModels,
  getTextCapableModels,
  omnicallDefaults as openRouterOmnicallDefaults,
  type OpenRouterModel,
} from './openrouter-models';

// Tipo unificado que combina ambos proveedores
export type UnifiedModel = {
  id: string;
  name: string;
  description: string;
  provider: 'groq' | 'openrouter';
  category: 'text' | 'code' | 'multimodal';
  supportsVision: boolean;
  supportsCode?: boolean;
  contextLength?: number;
};

// ========================================
// CONVERSIÓN: Groq Models → Unified Models
// ========================================
function groqToUnified(model: ChatModel): UnifiedModel {
  // Detectar si es modelo multimodal por el ID (Llama 4 Maverick y Scout tienen visión)
  const isMultimodal = model.id.includes('llama-4-maverick-17b-128e-instruct') ||
                       model.id.includes('llama-4-scout-17b-16e-instruct');

  return {
    id: model.id,
    name: model.name,
    description: model.description, // Ya incluye "/groq"
    provider: 'groq',
    category: isMultimodal ? 'multimodal' : 'text',
    supportsVision: isMultimodal,
    supportsCode: true, // Groq models son buenos para código también
  };
}

// ========================================
// CONVERSIÓN: OpenRouter Models → Unified Models
// ========================================
function openRouterToUnified(model: OpenRouterModel): UnifiedModel {
  return {
    id: model.id,
    name: model.name,
    description: model.description, // Ya incluye "/openrouter"
    provider: 'openrouter',
    category: model.category,
    supportsVision: model.supportsVision,
    supportsCode: model.category === 'code',
    contextLength: model.contextLength,
  };
}

// ========================================
// MODELOS UNIFICADOS POR CATEGORÍA
// ========================================

// Modelos Groq convertidos
const groqUnifiedModels: UnifiedModel[] = groqModels.map(groqToUnified);

// Modelos OpenRouter convertidos
const openRouterTextUnified: UnifiedModel[] = openRouterTextModels.map(openRouterToUnified);
const openRouterCodeUnified: UnifiedModel[] = openRouterCodeModels.map(openRouterToUnified);
const openRouterMultimodalUnified: UnifiedModel[] = openRouterMultimodalModels.map(openRouterToUnified);

// ========================================
// EXPORTS: Modelos unificados por contexto
// ========================================

// MULTIMODAL: Solo modelos con visión (Groq primero, luego OpenRouter)
export const unifiedMultimodalModels: UnifiedModel[] = [
  ...groqUnifiedModels.filter(m => m.supportsVision),  // Groq multimodal PRIMERO
  ...openRouterMultimodalUnified,                      // OpenRouter multimodal
];

// CODE: Solo modelos especializados en código (OpenRouter code)
export const unifiedCodeModels: UnifiedModel[] = [
  ...openRouterCodeUnified,
];

// TEXT: Modelos capaces de texto (Groq primero, luego OpenRouter)
export const unifiedTextModels: UnifiedModel[] = [
  ...groqUnifiedModels.filter(m => !m.supportsVision), // Groq text-only PRIMERO
  ...openRouterTextUnified,                            // OpenRouter text
  ...openRouterMultimodalUnified,                      // Multimodales también pueden hablar
];

// TODOS: Absolutamente todos los modelos
export const allUnifiedModels: UnifiedModel[] = [
  ...groqUnifiedModels,
  ...openRouterTextUnified,
  ...openRouterCodeUnified,
  ...openRouterMultimodalUnified,
];

// ========================================
// HELPER: Obtener modelos por contexto
// ========================================
export function getUnifiedModelsByContext(
  context: 'text' | 'code' | 'multimodal'
): UnifiedModel[] {
  switch (context) {
    case 'multimodal':
      return unifiedMultimodalModels;
    case 'code':
      return unifiedCodeModels;
    case 'text':
      return unifiedTextModels;
    default:
      return unifiedTextModels;
  }
}

// ========================================
// OMNICALL DEFAULTS - Top 3 por categoría
// ========================================
export const unifiedOmnicallDefaults = {
  text: [
    // Top Groq models (ultra-rápidos)
    "openai/gpt-oss-120b",                 // /groq - GPT-OSS 120B
    "groq/compound",                       // /groq - Groq Compound
    // Top OpenRouter text
    "qwen/qwen3-235b-a22b:free",           // /openrouter - Qwen3 235B
    "meta-llama/llama-3.3-70b-instruct:free", // /openrouter - Llama 3.3 70B
  ],
  code: [
    // OpenRouter code models (especializados)
    "qwen/qwen3-coder:free",               // Qwen3 Coder 480B
    "mistralai/devstral-small-2505:free",  // Devstral Small
    "qwen/qwen-2.5-coder-32b-instruct:free", // Qwen2.5 Coder 32B
  ],
  multimodal: [
    // Top Groq multimodal (ultra-rápidos con visión)
    "meta-llama/llama-4-maverick-17b-128e-instruct",    // /groq - Llama 4 Maverick
    // Top OpenRouter multimodal
    "qwen/qwen2.5-vl-72b-instruct:free",   // Qwen2.5 VL 72B
    "google/gemma-3-27b-it:free",          // Gemma 3 27B
  ],
};

// ========================================
// HELPER: Buscar modelo unificado por ID
// ========================================
export function findUnifiedModel(modelId: string): UnifiedModel | undefined {
  return allUnifiedModels.find(m => m.id === modelId);
}

// ========================================
// HELPER: Determinar proveedor por ID
// ========================================
export function getProviderFromModelId(modelId: string): 'groq' | 'openrouter' {
  const model = findUnifiedModel(modelId);
  return model?.provider || 'openrouter'; // Default to openrouter
}
