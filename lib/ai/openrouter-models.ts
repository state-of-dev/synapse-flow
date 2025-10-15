export type OpenRouterModel = {
  id: string;
  name: string;
  description: string;
  category: 'text' | 'code' | 'multimodal';
  supportsVision: boolean;
  supportsVideo?: boolean;
  contextLength?: number;
};

// Modelos de texto - Para chat general
export const textModels: OpenRouterModel[] = [
  {
    id: "qwen/qwen3-235b-a22b:free",
    name: "Qwen3 235B",
    description: "qwen/qwen3-235b-a22b:free",
    category: "text",
    supportsVision: false,
    contextLength: 131072,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B (OR)",
    description: "meta-llama/llama-3.3-70b-instruct:free",
    category: "text",
    supportsVision: false,
    contextLength: 128000,
  },
  {
    id: "qwen/qwen3-30b-a3b:free",
    name: "Qwen3 30B",
    description: "qwen/qwen3-30b-a3b:free",
    category: "text",
    supportsVision: false,
    contextLength: 32768,
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash",
    description: "google/gemini-2.0-flash-exp:free",
    category: "text",
    supportsVision: false,
    contextLength: 1048576,
  },
];

// Modelos de código - Especializados en programación
export const codeModels: OpenRouterModel[] = [
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder 480B",
    description: "qwen/qwen3-coder:free",
    category: "code",
    supportsVision: false,
    contextLength: 131072,
  },
  {
    id: "mistralai/devstral-small-2505:free",
    name: "Devstral Small",
    description: "mistralai/devstral-small-2505:free",
    category: "code",
    supportsVision: false,
    contextLength: 32768,
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    name: "Qwen2.5 Coder 32B",
    description: "qwen/qwen-2.5-coder-32b-instruct:free",
    category: "code",
    supportsVision: false,
    contextLength: 128000,
  },
];

// Modelos multimodales - Soportan imágenes y/o video
export const multimodalModels: OpenRouterModel[] = [
  {
    id: "qwen/qwen2.5-vl-72b-instruct:free",
    name: "Qwen2.5 VL 72B",
    description: "qwen/qwen2.5-vl-72b-instruct:free",
    category: "multimodal",
    supportsVision: true,
    supportsVideo: true,
    contextLength: 262144,
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    description: "google/gemma-3-27b-it:free",
    category: "multimodal",
    supportsVision: true,
    contextLength: 8192,
  },
  {
    id: "meta-llama/llama-4-maverick:free",
    name: "Llama 4 Maverick (OR)",
    description: "meta-llama/llama-4-maverick:free",
    category: "multimodal",
    supportsVision: true,
    contextLength: 128000,
  },
  {
    id: "qwen/qwen2.5-vl-32b-instruct:free",
    name: "Qwen2.5 VL 32B",
    description: "qwen/qwen2.5-vl-32b-instruct:free",
    category: "multimodal",
    supportsVision: true,
    supportsVideo: true,
    contextLength: 262144,
  },
  {
    id: "meta-llama/llama-4-scout:free",
    name: "Llama 4 Scout (OR)",
    description: "meta-llama/llama-4-scout:free",
    category: "multimodal",
    supportsVision: true,
    contextLength: 128000,
  },
  {
    id: "google/gemma-3-12b-it:free",
    name: "Gemma 3 12B",
    description: "google/gemma-3-12b-it:free",
    category: "multimodal",
    supportsVision: true,
    contextLength: 8192,
  },
];

// Todos los modelos juntos
export const allOpenRouterModels: OpenRouterModel[] = [
  ...textModels,
  ...codeModels,
  ...multimodalModels,
];

// Helper function para obtener modelos text-capable (texto + multimodal)
export function getTextCapableModels(): OpenRouterModel[] {
  return [...textModels, ...multimodalModels];
}

// Helper function para obtener modelos por contexto
export function getModelsByContext(
  context: 'text' | 'code' | 'multimodal'
): OpenRouterModel[] {
  switch (context) {
    case 'text':
      return getTextCapableModels(); // Incluye text + multimodal
    case 'code':
      return codeModels;
    case 'multimodal':
      return multimodalModels;
    default:
      return getTextCapableModels();
  }
}

// Modelos top para Omnicall por categoría
export const omnicallDefaults = {
  text: [
    "qwen/qwen3-235b-a22b:free",           // Qwen3 235B - El más potente
    "meta-llama/llama-3.3-70b-instruct:free", // Llama 3.3 70B - Estable
    "qwen/qwen3-30b-a3b:free",             // Qwen3 30B - Balance
  ],
  code: [
    "qwen/qwen3-coder:free",               // Qwen3 Coder 480B - El mejor
    "mistralai/devstral-small-2505:free",  // Devstral Small - Rápido
    "qwen/qwen-2.5-coder-32b-instruct:free", // Qwen2.5 Coder 32B - Balance
  ],
  multimodal: [
    "qwen/qwen2.5-vl-72b-instruct:free",   // Qwen2.5 VL 72B - Top multimodal
    "google/gemma-3-27b-it:free",          // Gemma 3 27B - Google vision
    "meta-llama/llama-4-maverick:free",    // Llama 4 Maverick - Meta
  ],
};
