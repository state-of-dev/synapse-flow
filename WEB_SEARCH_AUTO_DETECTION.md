# Auto-detección de Búsqueda Web con Groq Compound

**Fecha de implementación:** 26 de octubre de 2025
**Estado:** ✅ Completado - Listo para probar

---

## 🎯 Objetivo

Detectar automáticamente cuando el usuario necesita información de internet y usar Groq Compound con herramientas de búsqueda web integradas, mostrando resultados con citaciones y fuentes.

---

## ✨ Funcionalidad

### Detección Automática

El sistema detecta **keywords** en el mensaje del usuario y automáticamente cambia al modo **Groq Compound con Web Search**.

### Keywords que activan Web Search

#### En Español:
- `busca`, `buscar`, `búsqueda`
- `investiga`, `investigar`, `investigación`
- `encuentra`, `encontrar`
- `últimas noticias`, `noticias recientes`
- `información actualizada`, `datos recientes`
- `qué pasó`, `qué está pasando`
- `tendencias`, `trending`
- `actual`, `ahora`, `hoy`, `ayer`
- `visita`, `abre`, `ir a`, `navega`
- `página web`, `sitio web`
- `en internet`, `en la web`, `online`

#### En Inglés:
- `search`, `find`, `look up`
- `research`, `investigate`
- `latest`, `recent`, `current`
- `what's happening`, `what happened`
- `news`, `trending`
- `visit`, `open`, `go to`, `navigate`
- `website`, `web page`

---

## 🔄 Flujo de Funcionamiento

### Modo Normal (Sin Keywords)

```
Usuario: "¿Qué es la inteligencia artificial?"
    ↓
Detectar keywords → ❌ No encontradas
    ↓
Usar modelo seleccionado normalmente (ej: Groq Compound)
    ↓
Respuesta basada en conocimiento del modelo
```

### Modo Web Search (Con Keywords)

```
Usuario: "Busca las últimas noticias sobre IA"
    ↓
Detectar keywords → ✅ "busca", "últimas noticias"
    ↓
Usar Groq Compound con web_search + visit_website
    ↓
Sistema busca en internet automáticamente
    ↓
Respuesta con:
  - Información actualizada
  - Citaciones automáticas
  - Enlaces a fuentes
  - Resumen consolidado
```

---

## 📁 Archivos Modificados/Creados

### Archivos Nuevos

#### 1. `app/api/groq/compound/route.ts`

**Endpoint para Groq Compound con herramientas**

```typescript
POST /api/groq/compound
```

**Request Body:**
```json
{
  "model": "groq/compound",
  "messages": [
    { "role": "user", "content": "Busca información sobre..." }
  ],
  "tools": ["web_search", "visit_website", "code_interpreter"]
}
```

**Herramientas Habilitadas por Defecto:**
- `web_search` - Búsqueda en internet
- `visit_website` - Visitar páginas específicas
- `code_interpreter` - Ejecutar código Python

**Headers Especiales:**
```
Groq-Model-Version: latest
```
(Necesario para acceder a todas las herramientas)

---

### Archivos Modificados

#### 2. `components/simple-orchestrator-chat.tsx`

**Funciones Agregadas:**

##### a) `needsWebSearch(message: string): boolean`

Detecta si el mensaje contiene keywords que requieren búsqueda web.

```typescript
function needsWebSearch(message: string): boolean {
  const keywords = [
    'busca', 'buscar', 'investiga', 'últimas noticias',
    'search', 'find', 'latest', 'recent', ...
  ];

  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => lowerMessage.includes(keyword));
}
```

##### b) `callGroqCompound(messages, tools): Promise<string>`

Llama al endpoint de Groq Compound con las herramientas especificadas.

```typescript
async function callGroqCompound(
  messages: Array<{ role: string; content: string | Array<any> }>,
  tools: string[] = ['web_search', 'visit_website']
): Promise<string> {
  // Llama a /api/groq/compound
  // Retorna la respuesta del modelo con resultados de búsqueda
}
```

##### c) Modificación en `sendToSingleModel()`

Ahora detecta automáticamente si usar Compound:

```typescript
async function sendToSingleModel(model, messages, userMessage, attachments) {
  // ...

  // Detectar si necesita búsqueda web
  const useCompound = needsWebSearch(userMessage);

  let content: string;
  let modelName = model.name;

  if (useCompound && attachments.length === 0) {
    // Usar Groq Compound con web search
    content = await callGroqCompound([...simpleMessages, userMessage]);
    modelName = "🌐 Groq Compound (Web Search)";
  } else {
    // Usar modelo normal
    content = await callGroqAI(model.id, [...simpleMessages, userMessage]);
  }

  // ...
}
```

**⚠️ Nota:** Web search solo se activa si **NO hay imágenes** adjuntas.

---

## 🎨 UI/UX

### Indicador Visual

Cuando se activa web search, el nombre del modelo cambia a:

```
🌐 Groq Compound (Web Search)
```

Esto aparece en el mensaje de respuesta del asistente.

### Ejemplo de Conversación

**Usuario:**
```
Busca las últimas tendencias de IA generativa
```

**Asistente:**
```
🌐 Groq Compound (Web Search):

Basándome en mi búsqueda reciente, aquí están las últimas tendencias en IA generativa:

1. **Modelos Multimodales Avanzados**
   - GPT-4 Vision y Claude 3 están integrando capacidades de visión
   - Fuente: [TechCrunch - Oct 2025](https://...)

2. **IA Generativa en Video**
   - Sora de OpenAI genera videos realistas
   - Runway ML lanza Gen-3
   - Fuente: [The Verge - Oct 2025](https://...)

3. **Regulación y Ética**
   - EU AI Act entra en vigor
   - Debate sobre derechos de autor
   - Fuente: [Reuters - Oct 2025](https://...)

[Resumen consolidado de múltiples fuentes...]
```

---

## 🔧 Configuración Técnica

### Groq Compound System

**Modelo:**
- `groq/compound`

**Versión:**
- `latest` (para acceso a todas las herramientas)

**Herramientas Disponibles:**

| Tool | ID | Descripción |
|------|-----|-------------|
| Web Search | `web_search` | Búsqueda en tiempo real con citaciones |
| Visit Website | `visit_website` | Analiza contenido de URLs específicas |
| Code Interpreter | `code_interpreter` | Ejecuta código Python |
| Wolfram Alpha | `wolfram_alpha` | Cálculos matemáticos avanzados |
| Browser Automation | `browser_automation` | Interacción con sitios web |

**Herramientas Activas por Defecto:**
- `web_search`
- `visit_website`
- `code_interpreter`

---

## 🧪 Ejemplos de Uso

### Ejemplo 1: Búsqueda de Noticias

**Input:**
```
Busca las últimas noticias sobre Groq
```

**Comportamiento:**
1. ✅ Detecta "busca" y "últimas noticias"
2. ✅ Activa Groq Compound con `web_search`
3. ✅ Busca en internet
4. ✅ Retorna resultados con fuentes

---

### Ejemplo 2: Investigación de Tema

**Input:**
```
Investiga sobre los modelos de lenguaje más rápidos del 2025
```

**Comportamiento:**
1. ✅ Detecta "investiga"
2. ✅ Activa web search
3. ✅ Busca información actualizada
4. ✅ Compara datos de múltiples fuentes

---

### Ejemplo 3: Visitar Sitio Web

**Input:**
```
Visita la página de Groq y dime qué modelos ofrecen
```

**Comportamiento:**
1. ✅ Detecta "visita" y "página"
2. ✅ Activa `visit_website` tool
3. ✅ Navega a groq.com
4. ✅ Extrae información de modelos
5. ✅ Resume contenido

---

### Ejemplo 4: Sin Keywords (Modo Normal)

**Input:**
```
Explícame qué es un transformer en IA
```

**Comportamiento:**
1. ❌ No detecta keywords de búsqueda
2. ✅ Usa modelo seleccionado normalmente
3. ✅ Responde con conocimiento base

---

## 🚫 Limitaciones

### 1. No funciona con Imágenes

Si hay attachments (imágenes), **no se activa web search** automáticamente:

```typescript
if (useCompound && attachments.length === 0) {
  // Solo se activa si NO hay imágenes
}
```

**Razón:** Los modelos de visión no son compatibles con Compound tools.

---

### 2. Solo en Modo Single Model

La detección automática solo funciona en **modo single model**, NO en **modo Aethra/Orchestra**.

**Modo Orchestra:** Envía a múltiples modelos en paralelo sin herramientas.

---

### 3. Keywords pueden dar Falsos Positivos

Algunos mensajes pueden contener keywords sin necesitar búsqueda:

**Ejemplo de Falso Positivo:**
```
Usuario: "¿Cómo puedo buscar en un array en JavaScript?"
```

**Comportamiento:**
- Detecta "buscar" → Activa web search innecesariamente
- Puede ser confuso si el usuario solo quiere código

**Solución Futura:** Usar LLM para clasificar intención (más costoso pero preciso).

---

### 4. No Todos los Modelos Soportan Compound

Solo `groq/compound` y `groq/compound-mini` tienen herramientas integradas.

Si el usuario selecciona otro modelo y usa keywords, el sistema **forzará el uso de Compound** automáticamente.

---

## 💰 Costos

### Web Search

**Pricing:** Ver [Groq Pricing](https://groq.com/pricing)

**Estimado:**
- Búsqueda simple: ~$0.005 - $0.01 por consulta
- Búsqueda compleja: ~$0.02 - $0.05 por consulta

### Compound vs Modelos Normales

| Operación | Modelo Normal | Compound + Web Search |
|-----------|---------------|----------------------|
| Pregunta simple | $0.001 | $0.001 (no se activa) |
| "Busca noticias" | $0.001 | $0.01 - $0.05 |
| "Investiga tema" | $0.001 | $0.02 - $0.10 |

---

## 🔄 Mejoras Futuras

### 1. Clasificación con LLM

En vez de keywords, usar un modelo pequeño para clasificar intención:

```typescript
async function needsWebSearch(message: string): Promise<boolean> {
  const classification = await classifyIntent(message);
  return classification === 'web_search_required';
}
```

**Ventajas:**
- ✅ Más preciso
- ✅ Menos falsos positivos
- ❌ Más costoso (llamada adicional al LLM)

---

### 2. Toggle Manual de "Web Search"

Agregar un toggle en la UI:

```
[📎] [🎤] [CPU Modelo ▼] [🌐 Web Search] [Aethra] [Enviar ↑]
```

Usuario puede activar/desactivar manualmente.

---

### 3. Mostrar Fuentes como Cards

Renderizar las fuentes de manera más visual:

```markdown
📄 **Fuente 1:** TechCrunch
🔗 https://techcrunch.com/article
📅 26 Oct 2025

"OpenAI lanza GPT-5 con capacidades multimodales..."
```

---

### 4. Cacheo de Resultados

Guardar resultados de búsqueda para consultas similares:

```typescript
const cacheKey = hash(userMessage);
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

---

### 5. Integración con Modo Orchestra

Permitir que en modo Aethra también se use web search:

```typescript
if (sendToAll && needsWebSearch(userMessage)) {
  // Enviar a 3 modelos normales + 1 Compound con web search
}
```

---

## 📊 Métricas de Performance

### Tiempos Esperados

**Sin Web Search:**
- Respuesta: 1-2 segundos

**Con Web Search Activada:**
- Búsqueda web: 2-5 segundos
- Visitar sitio: 3-8 segundos
- Total: 3-8 segundos

**Factores que afectan:**
- Número de búsquedas realizadas
- Número de sitios visitados
- Complejidad de la consulta

---

## 🐛 Troubleshooting

### Problema 1: Web search no se activa

**Síntomas:**
- Usuario dice "busca X" pero usa modelo normal

**Causas:**
1. Keyword no está en la lista
2. Hay imágenes adjuntas (se desactiva automáticamente)
3. Modo Orchestra activado

**Solución:**
- Agregar keyword a la lista en `needsWebSearch()`
- Verificar que no hay attachments
- Cambiar a modo single model

---

### Problema 2: Respuesta sin fuentes

**Síntomas:**
- Web search activado pero no muestra enlaces

**Causa:**
- Groq Compound no siempre incluye citaciones explícitas
- Depende del prompt y del contenido encontrado

**Solución:**
- Modificar prompt en el endpoint de Compound para forzar citaciones:

```typescript
messages: [
  {
    role: 'system',
    content: 'Cuando busques información, SIEMPRE incluye las fuentes con formato [Nombre - URL]'
  },
  ...userMessages
]
```

---

### Problema 3: Errores de API

**Error:** `Invalid Compound response`

**Causas:**
1. `GROQ_API_KEY` no configurada
2. Rate limit excedido
3. Herramientas no disponibles en tu cuenta

**Solución:**
- Verificar `.env.local`
- Revisar limits en Groq Console
- Confirmar que tu API key tiene acceso a Compound

---

## ✅ Checklist de Implementación

- [x] Endpoint `/api/groq/compound` creado
- [x] Función `needsWebSearch()` implementada
- [x] Función `callGroqCompound()` implementada
- [x] Modificación en `sendToSingleModel()` para auto-detección
- [x] Keywords en español e inglés
- [x] Indicador visual "🌐 Groq Compound (Web Search)"
- [x] Documentación completa
- [ ] **Probar con queries reales**
- [ ] **Validar que las fuentes se muestran correctamente**
- [ ] **Ajustar keywords según uso real**
- [ ] **Optimizar costos**

---

## 📝 Notas de Desarrollo

### Cómo Agregar Más Keywords

Editar el array en `components/simple-orchestrator-chat.tsx`:

```typescript
function needsWebSearch(message: string): boolean {
  const keywords = [
    // Agregar aquí
    'nueva keyword',
    'otra keyword',
    // ...
  ];
}
```

### Cómo Cambiar Herramientas Activas

Editar en `app/api/groq/compound/route.ts`:

```typescript
const defaultTools = tools || [
  'web_search',
  'visit_website',
  'wolfram_alpha', // Agregar Wolfram Alpha
  'code_interpreter',
];
```

---

**Próximo paso:** Probar con consultas reales y ajustar keywords según el feedback del usuario.
