# Groq Models & Capabilities - Catálogo Completo

**Fecha:** 26 de octubre de 2025
**Fuente:** Groq Console Documentation & API

---

## 📊 Resumen Ejecutivo

Groq ofrece una plataforma completa de IA que incluye:
- **Modelos de Texto** (Text-to-Text)
- **Modelos de Visión** (Vision)
- **Speech-to-Text** (Whisper)
- **Text-to-Speech** (PlayAI TTS)
- **Sistemas Compound** (con herramientas integradas: búsqueda web, ejecución de código, Wolfram Alpha)

---

## 🎯 MODELOS DISPONIBLES

### 1. TEXT-TO-TEXT MODELS

#### Producción

| Modelo | ID | Velocidad | Contexto | Capacidades |
|--------|-----|-----------|----------|-------------|
| **GPT-OSS 120B** | `openai/gpt-oss-120b` | ~500 tps | 131,072 | Reasoning, Function Calling, Multilingual |
| **GPT-OSS 20B** | `openai/gpt-oss-20b` | ~1,000 tps | 131,072 | Reasoning, Function Calling, Multilingual |
| **Llama 3.3 70B** | `llama-3.3-70b-versatile` | 280 tps | 131,072 | Text generation, Multilingual |
| **Llama 3.1 8B** | `llama-3.1-8b-instant` | 560 tps | 131,072 | Fast text generation |
| **Llama Guard 4 12B** | `meta-llama/llama-guard-4-12b` | 1,200 tps | 131,072 | Content moderation, Safety |

#### Preview (Evaluación)

| Modelo | ID | Capacidades |
|--------|-----|-------------|
| **Llama 4 Scout** | `llama-4-scout` | Function Calling, Multilingual, Vision |
| **Kimi K2** | `kimi-k2` | Function Calling, Multilingual |
| **Qwen 3 32B** | `qwen3-32b` | Reasoning, Function Calling |

---

### 2. VISION MODELS (Multimodal)

| Modelo | ID | Capacidades | Estado |
|--------|-----|-------------|--------|
| **Llama 4 Maverick** | `llama-4-maverick` | Vision + Text, Multimodal | Preview |
| **Llama 4 Scout** | `llama-4-scout` | Vision + Text + Function Calling | Preview |

**Formatos soportados:** PNG, JPEG, WEBP (hasta 5MB)

---

### 3. SPEECH-TO-TEXT (Whisper)

#### Modelos Disponibles

| Modelo | ID | Velocidad | WER | Idiomas |
|--------|-----|-----------|-----|---------|
| **Whisper Large v3** | `whisper-large-v3` | 164x real-time | 10.3% | 99+ idiomas |
| **Whisper Large v3 Turbo** | `whisper-large-v3-turbo` | 299x real-time | 10.3% | 99+ idiomas |
| **Distil Whisper** | `distil-whisper-large-v3-en` | Más rápido | ~11% | Solo inglés |

#### Endpoint
```
POST https://api.groq.com/openai/v1/audio/transcriptions
POST https://api.groq.com/openai/v1/audio/translations
```

#### Parámetros

```typescript
{
  model: string;           // Required: "whisper-large-v3-turbo" | "whisper-large-v3"
  file?: File;             // Audio file object
  url?: string;            // Audio URL or Base64URL
  language?: string;       // Opcional: "es", "en", etc.
  prompt?: string;         // Context/spelling guidance
  temperature?: number;    // 0-1 (default: 0)
  response_format?: string; // "json" | "text" | "verbose_json"
  timestamp_granularities?: string[]; // ["word", "segment"]
}
```

#### Formatos de Audio Soportados
- **FLAC**
- **MP3**
- **MP4**
- **MPEG**
- **MPGA**
- **M4A**
- **OGG**
- **WAV**
- **WEBM**

#### Ejemplo de Request
```bash
curl https://api.groq.com/openai/v1/audio/transcriptions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -F model="whisper-large-v3-turbo" \
  -F file="@audio.mp3" \
  -F language="es" \
  -F response_format="json"
```

#### Ejemplo de Response
```json
{
  "text": "Hola, ¿cómo estás? Quiero saber sobre IA generativa.",
  "language": "es"
}
```

---

### 4. TEXT-TO-SPEECH (PlayAI TTS)

#### Modelos Disponibles

| Modelo | ID | Voces | Idiomas |
|--------|-----|-------|---------|
| **PlayAI Dialog (English)** | `playai-tts` | 19 voces | Inglés |
| **PlayAI Dialog (Arabic)** | `playai-tts-arabic` | 4 voces | Árabe |

#### Velocidad
- **140 caracteres/segundo** en Groq Silicon

#### Endpoint
```
POST https://api.groq.com/openai/v1/audio/speech
```

#### Parámetros

```typescript
{
  model: string;          // "playai-tts" | "playai-tts-arabic"
  input: string;          // Texto a convertir
  voice: string;          // Nombre de la voz
  response_format?: string; // "mp3" | "wav" | "flac" | "ogg" | "mulaw"
  speed?: number;         // Velocidad del audio
}
```

#### Voces Disponibles (Inglés - 19 total)

**Voces Femeninas:**
- `Arista-PlayAI`
- `Celeste-PlayAI`
- `Cheyenne-PlayAI`
- `Deedee-PlayAI`
- `Gail-PlayAI`
- `Indigo-PlayAI`
- `Mamaw-PlayAI`

**Voces Masculinas:**
- `Atlas-PlayAI`
- `Basil-PlayAI`
- `Briggs-PlayAI`
- `Calum-PlayAI`
- `Chip-PlayAI`
- `Cillian-PlayAI`
- `Fritz-PlayAI`
- `Mason-PlayAI`
- `Mikail-PlayAI`
- `Mitch-PlayAI`
- `Quinn-PlayAI`
- `Thunder-PlayAI`

#### Voces Disponibles (Árabe - 4 total)

- `Ahmad-PlayAI`
- `Amira-PlayAI`
- `Khalid-PlayAI`
- *(1 voz adicional no documentada)*

#### Ejemplo de Request
```bash
curl https://api.groq.com/openai/v1/audio/speech \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "playai-tts",
    "input": "Hello, this is a test of text to speech.",
    "voice": "Mason-PlayAI",
    "response_format": "mp3"
  }' \
  --output speech.mp3
```

#### Pricing
- **$50 / 1M caracteres**

---

### 5. COMPOUND SYSTEMS (Agentic AI)

Los sistemas Compound combinan modelos de lenguaje con herramientas integradas para realizar tareas complejas.

#### Modelos Compound

| Sistema | ID | Velocidad | Contexto | Descripción |
|---------|-----|-----------|----------|-------------|
| **Groq Compound** | `groq/compound` | ~450 tps | 131,072 | Sistema completo con todas las herramientas |
| **Groq Compound Mini** | `groq/compound-mini` | ~450 tps | 131,072 | Versión optimizada |

---

## 🛠️ BUILT-IN TOOLS (Herramientas Integradas)

Las herramientas integradas están disponibles automáticamente en los sistemas Compound.

### Herramientas Disponibles

| Herramienta | Identificador | Versión Compound | Descripción |
|-------------|---------------|------------------|-------------|
| **Web Search** | `web_search` | Todas | Búsqueda web en tiempo real con citaciones automáticas |
| **Visit Website** | `visit_website` | latest | Obtiene y analiza contenido de páginas web específicas |
| **Browser Automation** | `browser_automation` | latest | Interacción automatizada con páginas web |
| **Code Execution** | `code_interpreter` | Todas | Ejecuta código Python en entornos sandboxed seguros |
| **Wolfram Alpha** | `wolfram_alpha` | latest | Acceso a conocimiento computacional y cálculos matemáticos |

### Versiones de Compound

| Versión | Web Search | Code Execution | Visit Website | Browser Automation | Wolfram Alpha |
|---------|------------|----------------|---------------|-------------------|---------------|
| **latest** (>2025-07-23) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **2025-07-23** (Default) | ✅ | ✅ | ❌ | ❌ | ❌ |

### Configuración de Herramientas

#### Habilitar herramientas específicas

```typescript
{
  model: "groq/compound",
  messages: [...],
  compound_custom: {
    tools: {
      enabled_tools: ["web_search", "code_interpreter", "wolfram_alpha"]
    }
  }
}
```

#### Ejemplo: Solo búsqueda web

```javascript
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json',
    'Groq-Model-Version': 'latest'
  },
  body: JSON.stringify({
    model: 'groq/compound',
    messages: [
      { role: 'user', content: '¿Cuáles son las últimas noticias sobre IA?' }
    ],
    compound_custom: {
      tools: {
        enabled_tools: ['web_search']
      }
    }
  })
});
```

---

## 🚀 FLUJOS PROPUESTOS PARA ONESHOT

### Flujo 1: **Voice-to-Text Chat** (Implementación Inmediata)

**Usuario habla → Transcripción → Respuesta en texto**

```
Usuario presiona botón de micrófono
    ↓
Grabación de audio (MediaRecorder API)
    ↓
POST /api/groq/transcribe (Whisper Large v3 Turbo)
    ↓
Texto transcrito se inserta en el input
    ↓
Auto-submit al modelo seleccionado
    ↓
Respuesta de texto normal
```

**Ventajas:**
- ✅ Más rápido que escribir
- ✅ Accesibilidad para usuarios con dificultades de escritura
- ✅ Soporta 99+ idiomas
- ✅ Transcripción ultra-rápida (299x real-time)

**UI:**
- Botón de micrófono al lado del botón de enviar
- Animación de onda de audio mientras graba
- Indicador de transcripción en proceso
- Texto aparece en el input automáticamente

---

### Flujo 2: **Full Voice Conversation** (Fase 2)

**Usuario habla → Transcripción → Respuesta en audio**

```
Usuario presiona botón de micrófono
    ↓
Whisper Large v3 Turbo (STT)
    ↓
Modelo de texto (ej: Llama 4 Scout)
    ↓
PlayAI TTS (Text-to-Speech)
    ↓
Audio se reproduce automáticamente
```

**Ventajas:**
- ✅ Conversación completamente manos libres
- ✅ Experiencia similar a asistente de voz
- ✅ Ideal para multitarea

**UI:**
- Toggle para "Modo Voz" (Voice Mode)
- Selector de voz para TTS
- Botón de play/pause en mensajes del asistente
- Opción de descargar audio

---

### Flujo 3: **Compound + Web Search** (Agentic AI)

**Consulta con búsqueda web en tiempo real**

```
Usuario: "¿Cuáles son las últimas noticias sobre Groq?"
    ↓
groq/compound con web_search enabled
    ↓
Sistema busca en la web automáticamente
    ↓
Respuesta con citaciones y enlaces
```

**Ventajas:**
- ✅ Información actualizada en tiempo real
- ✅ Citaciones automáticas
- ✅ Sin necesidad de implementar búsqueda nosotros

**UI:**
- Toggle "Búsqueda Web" en el input
- Mostrar fuentes citadas en el mensaje
- Links clickeables a las fuentes

---

### Flujo 4: **Compound + Code Execution** (Code Interpreter)

**Ejecución de código Python en sandbox**

```
Usuario: "Calcula la raíz cuadrada de 12345 y grafica los primeros 10 números primos"
    ↓
groq/compound con code_interpreter
    ↓
Sistema ejecuta código Python automáticamente
    ↓
Respuesta con resultados y gráficas
```

**Ventajas:**
- ✅ Cálculos matemáticos precisos
- ✅ Generación de gráficas
- ✅ Análisis de datos

**UI:**
- Toggle "Code Execution"
- Mostrar código ejecutado en bloque expandible
- Mostrar resultados y gráficas inline

---

### Flujo 5: **Orchestra + Compound Hybrid**

**Modo Aethra con herramientas integradas**

```
Usuario: "Busca las últimas tendencias de IA y crea un gráfico comparativo"
    ↓
Modo Aethra (4 modelos) + Compound enabled
    ↓
Cada modelo puede usar web_search y code_interpreter
    ↓
Mega-resumen consolidado por Cerebras
```

**Ventajas:**
- ✅ Múltiples perspectivas con herramientas
- ✅ Resultados más completos
- ✅ Validación cruzada de información

---

### Flujo 6: **Multimodal + Voice** (Visión + Audio)

**Imagen + Audio → Análisis multimodal**

```
Usuario sube imagen + graba audio: "¿Qué ves en esta imagen?"
    ↓
Whisper Large v3 Turbo (transcripción)
    ↓
Llama 4 Maverick (vision model)
    ↓
Respuesta analiza imagen + contexto de audio
```

**Ventajas:**
- ✅ Interacción natural
- ✅ Análisis contextual completo
- ✅ UX superior

---

### Flujo 7: **Wolfram Alpha Integration**

**Consultas matemáticas y científicas avanzadas**

```
Usuario: "Calcula la integral de x^2 desde 0 hasta 10"
    ↓
groq/compound con wolfram_alpha
    ↓
Wolfram Alpha procesa el cálculo
    ↓
Respuesta con solución paso a paso
```

**Ventajas:**
- ✅ Cálculos matemáticos profesionales
- ✅ Datos científicos precisos
- ✅ Visualizaciones de Wolfram

---

## 📋 IMPLEMENTACIÓN RECOMENDADA (FASES)

### ✅ Fase 1: Voice Input (STT Only) - **IMPLEMENTAR AHORA**

**Tiempo estimado:** 2-3 horas

**Componentes:**
1. Endpoint `/api/groq/transcribe`
2. Botón de micrófono en toolbar
3. Hook `useAudioRecorder`
4. Auto-submit después de transcripción

**Archivos a modificar/crear:**
- ✅ `app/api/groq/transcribe/route.ts` (nuevo)
- ✅ `components/multimodal-input.tsx` (agregar botón)
- ✅ `hooks/use-audio-recorder.ts` (nuevo)
- ✅ `components/icons.tsx` (agregar MicrophoneIcon)

---

### 🔄 Fase 2: Full Voice Chat (STT + TTS)

**Tiempo estimado:** 3-4 horas

**Componentes adicionales:**
1. Endpoint `/api/groq/tts`
2. Toggle "Modo Voz"
3. Selector de voces
4. Audio player en mensajes

**Archivos a modificar/crear:**
- `app/api/groq/tts/route.ts` (nuevo)
- `components/message.tsx` (agregar audio player)
- `components/voice-selector.tsx` (nuevo)

---

### 🔄 Fase 3: Web Search Integration

**Tiempo estimado:** 2 horas

**Componentes:**
1. Toggle "Búsqueda Web" en UI
2. Modificar llamadas a Groq para usar `groq/compound`
3. Mostrar citaciones en mensajes

**Archivos a modificar:**
- `components/simple-orchestrator-chat.tsx`
- `components/message.tsx` (mostrar fuentes)

---

### 🔄 Fase 4: Code Execution

**Tiempo estimado:** 3 horas

**Componentes:**
1. Toggle "Code Execution"
2. Bloque expandible para código
3. Renderizado de resultados

**Archivos a modificar:**
- `components/simple-orchestrator-chat.tsx`
- `components/code-block.tsx` (nuevo)

---

## 💰 PRICING ESTIMADO

### Modelos de Texto
- **GPT-OSS 120B:** Variable según uso
- **Llama 3.3 70B:** Variable según uso

### Audio
- **Whisper (STT):** ~$0.006 por minuto de audio
- **PlayAI TTS:** $50 / 1M caracteres = $0.00005 por carácter

### Compound Tools
- **Web Search:** Ver [Groq Pricing](https://groq.com/pricing)
- **Code Execution:** Ver [Groq Pricing](https://groq.com/pricing)

### Ejemplo de Costo (Conversación típica)

**Escenario:** Usuario envía audio de 30 segundos, recibe respuesta de 200 palabras

```
STT (30 seg): ~$0.003
Modelo de texto: ~$0.001
Total: ~$0.004 por interacción
```

**Con TTS (respuesta hablada):**
```
STT: ~$0.003
Modelo: ~$0.001
TTS (200 palabras = ~1000 caracteres): ~$0.05
Total: ~$0.054 por interacción
```

---

## 🎯 PRIORIDAD DE IMPLEMENTACIÓN

### 🔥 MÁXIMA PRIORIDAD (Esta semana)
1. ✅ **Voice Input (STT)** - Botón de micrófono + Whisper
   - Mejora UX inmediata
   - Bajo costo
   - Fácil implementación

### 🔸 ALTA PRIORIDAD (Próxima semana)
2. **Web Search con Compound**
   - Feature diferenciador
   - Sin infraestructura adicional
   - Valor agregado alto

### 🔹 MEDIA PRIORIDAD (Mes 1)
3. **Full Voice Chat (STT + TTS)**
4. **Code Execution**

### ⬜ BAJA PRIORIDAD (Futuro)
5. **Wolfram Alpha**
6. **Browser Automation**

---

## 📝 NOTAS TÉCNICAS

### Limitaciones Conocidas

1. **Built-in Tools:**
   - ❌ No son HIPAA compliant
   - ❌ No disponibles en endpoints regionales/sovereign

2. **Whisper:**
   - Máximo tamaño de archivo: No documentado (probar límites)
   - Latencia: ~299x real-time (muy rápido)

3. **PlayAI TTS:**
   - Solo inglés y árabe por ahora
   - Otras lenguas "coming soon"

4. **Compound Systems:**
   - Requieren header `Groq-Model-Version: latest` para tools más nuevas
   - Costo adicional por uso de herramientas

---

## 🔗 RECURSOS

- **Groq Console:** https://console.groq.com
- **API Reference:** https://console.groq.com/docs/api-reference
- **Pricing:** https://groq.com/pricing
- **Playground:** https://console.groq.com/playground

---

**Fin del documento**