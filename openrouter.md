# OpenRouter - Modelos Gratuitos Disponibles

API Key: `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`

Base URL: `https://openrouter.ai/api/v1/chat/completions`

## 📋 Formato General de Request

```json
{
  "model": "modelo-id:free",
  "messages": [
    {
      "role": "user",
      "content": "Tu mensaje aquí"
    }
  ]
}
```

## 📋 Headers Requeridos

```bash
Authorization: Bearer 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
Content-Type: application/json
```

---

## ✅ MODELOS VERIFICADOS Y FUNCIONANDO

### 1. **Llama 3.3 70B Instruct** (Recomendado)
**ID:** `meta-llama/llama-3.3-70b-instruct:free`
**Proveedor:** Venice
**Capacidades:** text→text
**Contexto:** Variable

**Ejemplo curl:**
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer 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" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/llama-3.3-70b-instruct:free",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

**Respuesta esperada:**
```json
{
  "id": "gen-1760289548-8KcmmY9O363dgXf4T40a",
  "provider": "Venice",
  "model": "meta-llama/llama-3.3-70b-instruct:free",
  "object": "chat.completion",
  "created": 1760289549,
  "choices": [
    {
      "logprobs": null,
      "finish_reason": "stop",
      "native_finish_reason": "stop",
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello. Is there something I can help you with...",
        "refusal": null,
        "reasoning": null
      }
    }
  ],
  "usage": {
    "prompt_tokens": 691,
    "completion_tokens": 21,
    "total_tokens": 712
  }
}
```

---

### 2. **Qwen3 235B A22B** (Modelo más grande - Mejor calidad)
**ID:** `qwen/qwen3-235b-a22b:free`
**Proveedor:** Venice
**Capacidades:** text→text (235B parámetros!)
**Contexto:** Variable

**Ejemplo curl:**
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer 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" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen/qwen3-235b-a22b:free",
    "messages": [
      {"role": "user", "content": "Hola"}
    ]
  }'
```

**Respuesta esperada:**
```json
{
  "id": "gen-1760289579-p93b2TOewa64sDYz5yTa",
  "provider": "Venice",
  "model": "qwen/qwen3-235b-a22b:free",
  "object": "chat.completion",
  "created": 1760289580,
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "¡Hola! ¿En qué puedo ayudarte hoy?"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 766,
    "completion_tokens": 217,
    "total_tokens": 983
  }
}
```

**Nota:** Este modelo incluye un tag `<think>` con razonamiento interno.

---

### 3. **Qwen2.5 VL 72B Instruct** (Multimodal - Entiende imágenes)
**ID:** `qwen/qwen2.5-vl-72b-instruct:free`
**Proveedor:** Alibaba
**Capacidades:** text+image→text (soporta imágenes y video)
**Contexto:** Variable

**Ejemplo curl (solo texto):**
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer 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" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen/qwen2.5-vl-72b-instruct:free",
    "messages": [
      {"role": "user", "content": "Hi"}
    ]
  }'
```

**Ejemplo con imagen:**
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer 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" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen/qwen2.5-vl-72b-instruct:free",
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "What is in this image?"},
          {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}
        ]
      }
    ]
  }'
```

**Respuesta esperada:**
```json
{
  "id": "gen-1760289557-612WhdlqrHQssbQME5xX",
  "provider": "Alibaba",
  "model": "qwen/qwen2.5-vl-72b-instruct:free",
  "object": "chat.completion",
  "created": 1760289557,
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 9,
    "total_tokens": 17
  }
}
```

---

### 4. **Qwen3 Coder** (Especializado en código)
**ID:** `qwen/qwen3-coder:free`
**Proveedor:** Chutes
**Capacidades:** text→text (480B parámetros - optimizado para código)
**Contexto:** Variable

**Ejemplo curl:**
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer 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" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen/qwen3-coder:free",
    "messages": [
      {"role": "user", "content": "Write hello world in Python"}
    ]
  }'
```

**Respuesta esperada:**
```json
{
  "id": "gen-1760289601-MlfortzgHSKsVO9oSjFA",
  "provider": "Chutes",
  "model": "qwen/qwen3-coder:free",
  "object": "chat.completion",
  "created": 1760289601,
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Here's the classic \"Hello, World!\" program in Python:\n\n```python\nprint(\"Hello, World!\")\n```"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 13,
    "completion_tokens": 76,
    "total_tokens": 89
  }
}
```

---

### 5. **Gemma 3 27B** (Multimodal)
**ID:** `google/gemma-3-27b-it:free`
**Proveedor:** Chutes
**Capacidades:** text+image→text
**Contexto:** Variable

**Ejemplo curl:**
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer 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" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-3-27b-it:free",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

**Respuesta esperada:**
```json
{
  "id": "gen-1760289628-F7XCg7yIKt1ZhEIX5yf1",
  "provider": "Chutes",
  "model": "google/gemma-3-27b-it:free",
  "object": "chat.completion",
  "created": 1760289628,
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "\nHello there! 👋 \n\nIt's nice to \"meet\" you. I'm Gemma..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 183,
    "total_tokens": 193
  }
}
```

---

## 📝 LISTA COMPLETA DE MODELOS FREE (No todos verificados)

### Chat General (Text)
- `meta-llama/llama-3.3-70b-instruct:free` ✅ VERIFICADO
- `meta-llama/llama-3.3-8b-instruct:free`
- `meta-llama/llama-3.2-3b-instruct:free`
- `qwen/qwen3-235b-a22b:free` ✅ VERIFICADO
- `qwen/qwen3-30b-a3b:free`
- `qwen/qwen3-14b:free`
- `qwen/qwen3-8b:free`
- `qwen/qwen3-4b:free`
- `qwen/qwen-2.5-72b-instruct:free`
- `deepseek/deepseek-chat-v3.1:free` (requiere config de privacy)
- `deepseek/deepseek-r1:free` (puede estar rate-limited)
- `deepseek/deepseek-r1-0528:free`
- `deepseek/deepseek-r1-0528-qwen3-8b:free`
- `deepseek/deepseek-r1-distill-llama-70b:free`
- `deepseek/deepseek-chat-v3-0324:free`
- `google/gemini-2.0-flash-exp:free` (puede estar rate-limited)
- `z-ai/glm-4.5-air:free`
- `alibaba/tongyi-deepresearch-30b-a3b:free`
- `meituan/longcat-flash-chat:free`
- `nvidia/nemotron-nano-9b-v2:free`
- `openai/gpt-oss-20b:free`
- `moonshotai/kimi-k2:free`
- `moonshotai/kimi-dev-72b:free`
- `microsoft/mai-ds-r1:free`
- `tngtech/deepseek-r1t2-chimera:free`
- `tngtech/deepseek-r1t-chimera:free`
- `shisa-ai/shisa-v2-llama3.3-70b:free`
- `arliai/qwq-32b-arliai-rpr-v1:free`
- `nousresearch/deephermes-3-llama-3-8b-preview:free`

### Código (Code)
- `qwen/qwen3-coder:free` ✅ VERIFICADO (480B)
- `qwen/qwen-2.5-coder-32b-instruct:free`
- `mistralai/devstral-small-2505:free` (puede estar rate-limited)
- `agentica-org/deepcoder-14b-preview:free`

### Multimodal (Text + Image)
- `qwen/qwen2.5-vl-72b-instruct:free` ✅ VERIFICADO
- `qwen/qwen2.5-vl-32b-instruct:free`
- `google/gemma-3-27b-it:free` ✅ VERIFICADO
- `google/gemma-3-12b-it:free`
- `google/gemma-3-4b-it:free`
- `mistralai/mistral-small-3.2-24b-instruct:free` (puede estar rate-limited)
- `mistralai/mistral-small-3.1-24b-instruct:free`
- `mistralai/mistral-small-24b-instruct-2501:free`
- `meta-llama/llama-4-maverick:free`
- `meta-llama/llama-4-scout:free`

### Especializados
- `google/gemma-3n-e2b-it:free` (Nano 2B)
- `google/gemma-3n-e4b-it:free` (Nano 4B)
- `tencent/hunyuan-a13b-instruct:free`
- `cognitivecomputations/dolphin-mistral-24b-venice-edition:free` (Uncensored)
- `cognitivecomputations/dolphin3.0-mistral-24b:free`

---

## 🔧 Ejemplo de Integración en JavaScript/Node.js

```javascript
async function callOpenRouter(model, message) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer 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',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: message }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// Uso
const result = await callOpenRouter(
  'meta-llama/llama-3.3-70b-instruct:free',
  'Hola, ¿cómo estás?'
);
console.log(result);
```

---

## 🔧 Ejemplo de Integración en Python

```python
import requests
import json

def call_openrouter(model, message):
    url = 'https://openrouter.ai/api/v1/chat/completions'
    headers = {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
    }
    data = {
        'model': model,
        'messages': [
            {'role': 'user', 'content': message}
        ]
    }

    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    return result['choices'][0]['message']['content']

# Uso
result = call_openrouter(
    'meta-llama/llama-3.3-70b-instruct:free',
    'Hola, ¿cómo estás?'
)
print(result)
```

---

## ⚠️ Consideraciones Importantes

### Rate Limiting
- Los modelos gratuitos pueden tener rate limits temporales
- Si un modelo está rate-limited, intenta con otro de la lista
- Algunos modelos requieren configuración de privacy en: https://openrouter.ai/settings/privacy

### Configuración de Privacy (si aparece error 404)
Si recibes un error como:
```json
{
  "error": {
    "message": "No endpoints found matching your data policy (Free model publication)",
    "code": 404
  }
}
```

Debes configurar tu política de privacidad en:
https://openrouter.ai/settings/privacy

### Modelos con Rate Limit Temporal
Estos pueden funcionar pero a veces están sobrecargados:
- `google/gemini-2.0-flash-exp:free`
- `mistralai/mistral-small-3.2-24b-instruct:free`
- `deepseek/deepseek-r1:free`

**Solución:** Espera unos minutos o usa modelos alternativos

---

## 🎯 Recomendaciones de Uso

### Para Chat General
1. **Primera opción:** `qwen/qwen3-235b-a22b:free` (235B - mejor calidad)
2. **Segunda opción:** `meta-llama/llama-3.3-70b-instruct:free` (estable)
3. **Tercera opción:** `qwen/qwen3-30b-a3b:free`

### Para Código
1. **Primera opción:** `qwen/qwen3-coder:free` (480B - especializado)
2. **Segunda opción:** `qwen/qwen-2.5-coder-32b-instruct:free`

### Para Imágenes (Análisis)
1. **Primera opción:** `qwen/qwen2.5-vl-72b-instruct:free` (mejor)
2. **Segunda opción:** `google/gemma-3-27b-it:free`

### Estrategia de Fallback
Implementa un sistema de fallback que pruebe múltiples modelos:

```javascript
const models = [
  'qwen/qwen3-235b-a22b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-30b-a3b:free'
];

async function callWithFallback(message) {
  for (const model of models) {
    try {
      const result = await callOpenRouter(model, message);
      return result;
    } catch (error) {
      console.log(`${model} failed, trying next...`);
      continue;
    }
  }
  throw new Error('All models failed');
}
```

---

## 📊 Comparación de Modelos Verificados

| Modelo | Tamaño | Velocidad | Calidad | Multimodal | Mejor Para |
|--------|--------|-----------|---------|------------|------------|
| qwen/qwen3-235b-a22b:free | 235B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | Chat general, razonamiento complejo |
| meta-llama/llama-3.3-70b-instruct:free | 70B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ | Chat general estable |
| qwen/qwen2.5-vl-72b-instruct:free | 72B | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | Análisis de imágenes/video |
| qwen/qwen3-coder:free | 480B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | Programación |
| google/gemma-3-27b-it:free | 27B | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ | Chat + imágenes |

---

## 🔗 Enlaces Útiles

- **Dashboard:** https://openrouter.ai/
- **Documentación:** https://openrouter.ai/docs
- **Settings:** https://openrouter.ai/settings
- **Privacy:** https://openrouter.ai/settings/privacy
- **Modelos:** https://openrouter.ai/models

---

**Última actualización:** 2025-10-12
