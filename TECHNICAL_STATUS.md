# OneShot - Estado Técnico del Proyecto

**Versión:** Synapse Flow v1.0.0
**Última actualización:** 26 de octubre de 2025
**Commit actual:** `78d00e8 OneShot Synapse`

---

## 📋 Resumen Ejecutivo

OneShot es una aplicación de chat con IA de próxima generación que implementa un **sistema de orquestación dual**: permite interactuar con un solo modelo o enviar consultas a múltiples modelos en paralelo para obtener respuestas consolidadas mediante razonamiento avanzado.

**Stack tecnológico principal:**
- Next.js 15 (App Router)
- React 19 RC + TypeScript
- PostgreSQL (Neon) + Drizzle ORM
- Groq API + Cerebras AI + OpenRouter
- Vercel AI SDK
- Tailwind CSS + Radix UI

---

## 🏗️ Arquitectura del Sistema

### Modos de Operación

#### 1. **Modo Single Model**
- Usuario selecciona un modelo específico de Groq
- La consulta se envía directamente a ese modelo
- Respuesta única con razonamiento extraído (tags `<think>`)
- Soporte para visión multimodal (imágenes)

#### 2. **Modo Orchestra** (Send to All)
- **Consultas de texto**: Se envía a 4 modelos de texto en paralelo
  - GPT-OSS 120B
  - Groq Compound
  - Kimi K2
  - Qwen3
- **Consultas con imagen**: Se envía a 2 modelos de visión
  - Llama 4 Maverick
  - Llama 4 Scout
- Respuestas individuales + mega-resumen generado por Cerebras
- Consolidación mediante modelo de razonamiento

---

## 📂 Estructura del Proyecto

```
oneshot/
├── app/
│   ├── (chat)/
│   │   ├── page.tsx                    # Nueva conversación
│   │   ├── chat/[id]/page.tsx          # Conversación existente
│   │   ├── layout.tsx                  # Layout con sidebar
│   │   └── api/
│   │       ├── chat/
│   │       │   ├── route.ts            # Endpoint streaming (AI SDK)
│   │       │   ├── save/route.ts       # Persistencia a PostgreSQL
│   │       │   └── schema.ts           # Validación Zod
│   ├── api/
│   │   ├── groq/route.ts               # Proxy a Groq API
│   │   ├── cerebras/route.ts           # Proxy a Cerebras AI
│   │   └── openrouter/route.ts         # Proxy a OpenRouter
├── components/
│   ├── simple-orchestrator-chat.tsx    # Componente principal de chat
│   ├── multimodal-input.tsx            # Input con soporte de archivos
│   └── elements/
│       └── prompt-input.tsx            # UI components (textarea, toolbar, submit)
├── lib/
│   ├── ai/
│   │   ├── models.ts                   # 6 modelos de Groq hardcoded
│   │   ├── unified-models.ts           # Sistema unificado Groq + OpenRouter
│   │   ├── openrouter-models.ts        # Modelos de OpenRouter
│   │   ├── providers.ts                # AI SDK custom provider
│   │   └── prompts.ts                  # System prompts con artifacts
│   ├── db/
│   │   └── schema.ts                   # Schema Drizzle: User, Chat, Message, Vote
│   └── types.ts                        # TypeScript types
└── .env.local                          # Variables de entorno
```

---

## 🔑 Variables de Entorno

| Variable | Proveedor | Estado | Uso |
|----------|-----------|--------|-----|
| `GROQ_API_KEY` | Groq | ✅ Configurada | Autenticación API Groq |
| `OPENROUTER_API_KEY` | OpenRouter | ✅ Configurada | Autenticación OpenRouter |
| `CEREBRAS_API_KEY` | Cerebras | ⚠️ Opcional | Fallback con hardcoded default |
| `POSTGRES_URL` | Neon | ✅ Configurada | Conexión PostgreSQL |
| `AUTH_SECRET` | NextAuth | ✅ Configurada | Autenticación usuarios |
| `BLOB_READ_WRITE_TOKEN` | Vercel | ✅ Configurada | Almacenamiento de archivos |

---

## 🔄 Flujo de Datos

### Flujo Single Model

```
Usuario escribe mensaje
    ↓
SimpleOrchestratorChat.sendToSingleModel()
    ↓
Detección de imagen → Auto-switch a Llama 4 Maverick (vision)
    ↓
POST /api/groq
    ↓
Groq API (https://api.groq.com/openai/v1/chat/completions)
    ↓
Streaming response
    ↓
Extracción de <think> tags (razonamiento)
    ↓
Agregar mensaje a state (ChatMessage[])
    ↓
saveChatToDB() → POST /api/chat/save
    ↓
PostgreSQL (tabla messages_v2)
```

### Flujo Orchestra Mode

```
Usuario activa "Send to All"
    ↓
SimpleOrchestratorChat.sendToAllModels()
    ↓
Promise.all([
    callGroqAI(GPT-OSS),
    callGroqAI(Groq Compound),
    callGroqAI(Kimi K2),
    callGroqAI(Qwen3)
])
    ↓
Cada respuesta: **Model Name:** [reasoning] + text
    ↓
Concatenar todas las respuestas
    ↓
callCerebrasAI(userMessage + allResponses)
    ↓
POST /api/cerebras (llama3.3-70b con reasoning_effort: medium)
    ↓
Cerebras genera mega-resumen con campo reasoning
    ↓
Agregar 4 mensajes individuales + 1 mega-resumen a state
    ↓
saveChatToDB() → PostgreSQL
```

---

## 💾 Base de Datos

### Schema Principal

#### **Tabla: Chat**
```typescript
{
  id: uuid (PK)
  title: text
  userId: uuid (FK → users)
  visibility: 'public' | 'private'
  lastContext: jsonb // { usage: { promptTokens, completionTokens } }
  createdAt: timestamp
}
```

#### **Tabla: messages_v2**
```typescript
{
  id: uuid (PK)
  chatId: uuid (FK → chats)
  role: 'user' | 'assistant'
  parts: jsonb[] // Array de { type, text, mediaType, name, url }
  createdAt: timestamp
}
```

#### **Tipos de Parts**
- `text`: Contenido de texto plano
- `file`: Archivos adjuntos (imágenes, documentos)
- `reasoning`: Fragmentos de razonamiento extraídos de `<think>` tags

#### **Modo Sin Autenticación**
- Usuario fijo: `00000000-0000-0000-0000-000000000001`
- Todos los chats se asignan a este usuario por defecto

---

## 🤖 Modelos Integrados

### Groq Models (en SimpleOrchestratorChat)

**Modelos de Texto:**
1. `gpt-oss-120b` - GPT-OSS 120B
2. `groq-compound` - Groq Compound
3. `llama-4-maverick` - Llama 4 Maverick (también visión)
4. `llama-4-scout` - Llama 4 Scout (también visión)
5. `kimi-k2` - Kimi K2
6. `qwen3` - Qwen3

**Modelos de Visión:**
1. `llama-4-maverick` - Llama 4 Maverick
2. `llama-4-scout` - Llama 4 Scout

### Modelos en lib/ai/models.ts (6 modelos validados)
1. `deepseek-chat` - DeepSeek Chat (default)
2. `deepseek-reasoner` - DeepSeek Reasoner
3. `llama-3.3-70b-versatile` - Llama 3.3 70B
4. `llama-4-maverick` - Llama 4 Maverick
5. `mistral-small-latest` - Mistral Small
6. `qwen-2.5-7b-instruct` - Qwen 2.5 7B

### Cerebras (Consolidación)
- Modelo: `llama3.3-70b`
- Parámetros: `reasoning_effort: 'medium'`, `max_completion_tokens: 8000`
- Uso: Mega-resumen en modo Orchestra

---

## 🎨 Componentes Frontend

### `SimpleOrchestratorChat` (Principal)

**Estado:**
```typescript
messages: ChatMessage[]
input: string
loading: boolean
selectedGroqModel: { id: string, name: string, supportsVision: boolean }
sendToAll: boolean
attachments: { url: string, name: string, contentType: string }[]
```

**Funciones clave:**
- `sendToSingleModel()`: Envía a un solo modelo
- `sendToAllModels()`: Orquestación paralela
- `callGroqAI(model, messages)`: Llamada individual a Groq
- `callCerebrasAI(messages)`: Consolidación con Cerebras
- `saveChatToDB()`: Persistencia en PostgreSQL
- `extractReasoningFromResponse()`: Parseo de `<think>` tags

**Características:**
- Auto-navegación después del primer mensaje
- Persistencia de input en localStorage
- Revalidación de chat history con SWR
- Manejo de errores y rate limits

### `MultimodalInput`

**Props:**
```typescript
input: string
setInput: (value: string) => void
isLoading: boolean
handleSubmit: (e) => void
attachments: Attachment[]
setAttachments: (files: File[] | ((prev: Attachment[]) => Attachment[])) => void
modelSelect: ReactNode
```

**Funcionalidades:**
- Upload de imágenes (hasta 5MB cada una)
- Validación de tipos: image/png, image/jpeg, image/webp
- Preview de imágenes adjuntas
- Subida a Vercel Blob con progress tracking
- Textarea con auto-resize

---

## 🔧 Endpoints API

### POST `/api/groq`
**Descripción:** Proxy directo a Groq API
**Headers:** `Authorization: Bearer $GROQ_API_KEY`
**Body:**
```json
{
  "model": "llama-4-maverick",
  "messages": [
    { "role": "user", "content": "..." }
  ],
  "stream": true
}
```
**Response:** Server-Sent Events (SSE) stream

---

### POST `/api/cerebras`
**Descripción:** Proxy a Cerebras AI para razonamiento
**Headers:** `Authorization: Bearer $CEREBRAS_API_KEY`
**Body:**
```json
{
  "model": "llama3.3-70b",
  "messages": [...],
  "reasoning_effort": "medium",
  "max_completion_tokens": 8000
}
```
**Response:** JSON con campo `reasoning`

---

### POST `/api/chat/save`
**Descripción:** Guarda chat y mensajes en PostgreSQL
**Body:**
```json
{
  "chatId": "uuid",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "parts": [
        { "type": "text", "text": "..." },
        { "type": "file", "url": "...", "mediaType": "image/png" }
      ]
    }
  ]
}
```
**Response:** `{ success: true }`

---

### POST `/api/openrouter`
**Descripción:** Proxy a OpenRouter (no utilizado actualmente)
**Estado:** ⚠️ Definido pero no integrado en UI

---

## ✨ Características Destacadas

### 1. **Extracción de Razonamiento**
Los modelos pueden envolver su proceso de pensamiento en tags `<think>`:
```
<think>Primero debo analizar...</think>
La respuesta final es...
```
El componente extrae automáticamente el razonamiento y lo almacena como part de tipo `reasoning`.

### 2. **Auto-selección de Modelos de Visión**
Cuando se sube una imagen en modo single-model, automáticamente cambia a Llama 4 Maverick (modelo con capacidades de visión).

### 3. **Consolidación Inteligente**
En modo Orchestra, Cerebras recibe:
- Consulta original del usuario
- Respuestas de los 4 modelos con prefijos de nombre
- Genera un mega-resumen sintetizado con razonamiento avanzado

### 4. **Persistencia Flexible**
Estructura de `parts` permite almacenar:
- Múltiples fragmentos de texto
- Archivos con metadata (URL, tipo MIME, nombre)
- Razonamiento separado del texto final

### 5. **Manejo de Rate Limits**
Detecta respuestas de error de Groq y muestra mensajes amigables al usuario.

---

## 🚧 Limitaciones Conocidas

### 1. **Sin Rate Limiting Coordinado**
En modo Orchestra, se envían 4 requests simultáneos a Groq. Si hay rate limits por minuto, pueden fallar algunas solicitudes.

**Solución propuesta:** Implementar queue con retraso entre requests o manejar reintentos.

---

### 2. **Provider Vacío en AI SDK**
El archivo `lib/ai/providers.ts` define `myProvider` pero está vacío en producción. El endpoint `/api/chat` (AI SDK) no se utiliza realmente.

**Estado actual:** La orquestación usa llamadas HTTP directas a `/api/groq` y `/api/cerebras` en lugar del AI SDK.

---

### 3. **OpenRouter No Integrado**
Existe proxy en `/api/openrouter` y modelos definidos en `unified-models.ts`, pero no se usan en `SimpleOrchestratorChat`.

**Oportunidad:** Expandir la orquestación para incluir modelos de OpenRouter.

---

### 4. **Sin Autenticación Real**
Todos los chats se asignan al usuario fijo `00000000-0000-0000-0000-000000000001`.

**Estado:** NextAuth configurado pero no implementado en el flujo principal.

---

### 5. **No Hay Límite de Mensajes en Orchestra**
En modo Orchestra, se guardan todas las respuestas (4 individuales + 1 resumen = 5 mensajes por turno). Esto puede llenar rápidamente el contexto.

**Solución propuesta:** Limitar historial o implementar sliding window.

---

## 📊 Métricas y Monitoreo

### Guardado en `lastContext`
```json
{
  "usage": {
    "promptTokens": 1234,
    "completionTokens": 567
  }
}
```

**Estado actual:** Se define en schema pero no se popula activamente desde las respuestas de API.

---

## 🔐 Seguridad

### API Keys
- Almacenadas en variables de entorno
- No expuestas al cliente
- Proxy routes evitan CORS y exposure

### Upload de Archivos
- Validación de tipo MIME
- Límite de tamaño: 5MB por archivo
- Almacenamiento en Vercel Blob (aislado)

### Inyección SQL
- Protegido por Drizzle ORM con queries parametrizadas

---

## 🧪 Testing

**Estado actual:** ⚠️ No hay tests implementados

**Archivos de configuración:**
- Mock provider en `lib/ai/providers.ts` para entorno test
- No se encontraron archivos `.test.ts` o `.spec.ts`

---

## 📦 Dependencias Principales

```json
{
  "next": "15.0.3",
  "react": "19.0.0-rc",
  "ai": "^5.0.26",
  "drizzle-orm": "^0.38.3",
  "@vercel/blob": "^0.30.0",
  "next-auth": "5.0.0-beta.25",
  "zod": "^3.24.1",
  "tailwindcss": "^3.4.17",
  "@radix-ui/react-dialog": "^1.1.4"
}
```

---

## 🎯 Roadmap y Mejoras Sugeridas

### Alta Prioridad
1. ✅ **Integración de audio** (Whisper STT + TTS de Groq)
2. 🔄 **Rate limiting inteligente** en modo Orchestra
3. 🔄 **Autenticación real** con NextAuth
4. 🔄 **Sistema de créditos/tokens** para usuarios

### Media Prioridad
5. 🔄 **Integración OpenRouter** en UI
6. 🔄 **Tests unitarios y E2E**
7. 🔄 **Métricas de uso** (tracking de tokens)
8. 🔄 **Exportación de conversaciones** (PDF, Markdown)

### Baja Prioridad
9. 🔄 **Temas personalizables**
10. 🔄 **Búsqueda en historial**
11. 🔄 **Compartir conversaciones públicas**

---

## 🐛 Issues Conocidos

### 1. Dark Mode Toggle
**Commit:** `369673f dark mode fix`
**Estado:** Resuelto en commit reciente

### 2. Modo Aethra
**Commit:** `929f5e5 iniciar en modo aethra off`
**Descripción:** Modo especial que se desactiva por defecto
**Estado:** ⚠️ No documentado en código visible

---

## 📝 Notas de Desarrollo

### Convenciones de Código
- TypeScript estricto
- Componentes funcionales con hooks
- Server Components por defecto (Next.js 15)
- Client Components marcados con `'use client'`

### Estructura de Commits
```
78d00e8 OneShot Synapse
369673f dark mode fix
929f5e5 iniciar en modo aethra off
d755ac3 Synapse Flow v1.0.0
```

---

## 🌐 Deployment

**Plataforma:** Vercel (inferido por uso de Vercel Blob)
**Rama principal:** `master`
**Estado del repositorio:** Clean (sin cambios pendientes)

---

## 📞 Contacto y Soporte

**Proyecto:** OneShot - Synapse Flow
**Versión:** v1.0.0
**Última actualización:** Commit `78d00e8`

---

## Apéndice A: Ejemplo de Message Object

```json
{
  "id": "msg_123",
  "role": "assistant",
  "parts": [
    {
      "type": "reasoning",
      "text": "Primero debo analizar el contexto..."
    },
    {
      "type": "text",
      "text": "Basándome en mi análisis, la respuesta es..."
    }
  ]
}
```

## Apéndice B: Ejemplo de Orchestra Response

**User:** "¿Cuál es la capital de Francia?"

**Respuestas individuales:**
1. **GPT-OSS 120B:** La capital de Francia es París...
2. **Groq Compound:** París es la capital de Francia...
3. **Kimi K2:** La respuesta es París...
4. **Qwen3:** Francia → capital → París

**Mega-resumen (Cerebras):**
```json
{
  "reasoning": "Los 4 modelos coinciden unánimemente...",
  "text": "París es la capital de Francia. Todos los modelos consultados confirman esta información con alta confianza."
}
```

---

**Fin del documento técnico**