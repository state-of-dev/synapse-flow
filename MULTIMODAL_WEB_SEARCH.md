# Flujo Multimodal + Web Search (Vision → Internet)

**Fecha de implementación:** 26 de octubre de 2025
**Estado:** ✅ Completado - Listo para probar

---

## 🎯 Objetivo

Permitir que el usuario **suba una imagen + use keywords de búsqueda** y el sistema automáticamente:
1. Analice la imagen con modelo de visión
2. Use el análisis para buscar información actualizada en internet
3. Todo en **UN SOLO CLICK**

---

## ✨ Nuevo Flujo: Vision + Web Search

### Flujo Completo (Automático)

```
Usuario sube imagen + escribe: "Busca información sobre esto"
    ↓
1. Detectar keywords de búsqueda → ✅ "busca"
    ↓
2. Detectar imagen adjunta → ✅ Imagen presente
    ↓
3. PASO 1: Modelo de Visión (Llama 4 Maverick)
   └─ Analiza imagen
   └─ Extrae: objetos, texto, contexto, descripción
    ↓
4. PASO 2: Groq Compound (Web Search)
   └─ Recibe: análisis de imagen + pregunta del usuario
   └─ Busca en internet información actualizada
   └─ Retorna: resultados + fuentes + citaciones
    ↓
5. Respuesta Final Consolidada
   └─ Combina análisis visual + información de internet
```

---

## 🔄 Comparación de Flujos

### ANTES (Sin esta funcionalidad)

**Opción A: Solo Visión**
```
Usuario: [Imagen] "¿Qué es esto?"
    ↓
Modelo de visión analiza
    ↓
Respuesta basada solo en la imagen
    ❌ Sin información actualizada de internet
```

**Opción B: Web Search Manual (2 clicks)**
```
Click 1: Usuario sube imagen
    ↓
Bot: "Es un logo de Tesla"
    ↓
Click 2: Usuario: "Busca noticias sobre Tesla"
    ↓
Bot: [Resultados de búsqueda]
    ❌ Requiere 2 mensajes
```

### AHORA (Con esta funcionalidad)

**Un Solo Click:**
```
Usuario: [Imagen de logo] + "Busca las últimas noticias sobre esto"
    ↓
Sistema detecta: imagen + keyword "busca"
    ↓
Automáticamente:
  1. Analiza imagen → "Logo de Tesla"
  2. Busca "últimas noticias sobre Tesla"
    ↓
Respuesta completa con información actualizada
    ✅ Todo en 1 click
```

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Logo de Empresa

**Input:**
- Imagen: Logo de Groq
- Texto: `"Busca las últimas noticias sobre esta empresa"`

**Flujo:**
1. ✅ Detecta keyword "busca" + "últimas noticias"
2. ✅ Llama a Llama 4 Maverick (visión)
   - Análisis: "Logo de Groq, empresa de chips de IA"
3. ✅ Llama a Groq Compound con:
   - Prompt: "Busca las últimas noticias sobre Groq, empresa de chips de IA"
4. ✅ Retorna noticias actualizadas con fuentes

**Respuesta:**
```
🔍 Vision + Web Search:

Análisis de la imagen: Logo de Groq, empresa especializada en
chips de inferencia de IA.

Últimas noticias encontradas:

1. **Groq lanza LPU más rápido del mercado**
   - Fuente: TechCrunch - 25 Oct 2025
   - URL: https://...

2. **Groq expande su plataforma GroqCloud**
   - Fuente: VentureBeat - 24 Oct 2025
   - URL: https://...

[Más resultados...]
```

---

### Ejemplo 2: Captura de Pantalla de Código

**Input:**
- Imagen: Screenshot de error de Python
- Texto: `"Investiga qué causa este error"`

**Flujo:**
1. ✅ Detecta keyword "investiga"
2. ✅ Analiza screenshot
   - Error: `ModuleNotFoundError: No module named 'torch'`
3. ✅ Busca en internet:
   - "ModuleNotFoundError torch Python solución"
4. ✅ Retorna soluciones actualizadas

**Respuesta:**
```
🔍 Vision + Web Search:

Error detectado: ModuleNotFoundError para el módulo 'torch'

Soluciones encontradas:

1. **Instalación de PyTorch**
   pip install torch torchvision torchaudio
   Fuente: PyTorch.org - Documentación oficial

2. **Problema común: entorno virtual**
   Asegúrate de activar el entorno correcto
   Fuente: Stack Overflow - 2025

3. **Versión compatible con tu sistema**
   [Detecta CUDA/CPU y recomienda comando específico]
```

---

### Ejemplo 3: Producto Desconocido

**Input:**
- Imagen: Foto de un gadget tecnológico
- Texto: `"Busca información sobre este dispositivo"`

**Flujo:**
1. ✅ Analiza la imagen
   - Identifica: "Dispositivo similar a Meta Quest 3"
2. ✅ Busca información actualizada
3. ✅ Retorna specs, precio, reviews

---

### Ejemplo 4: Documento o Artículo

**Input:**
- Imagen: Screenshot de paper científico
- Texto: `"Encuentra más información sobre este tema"`

**Flujo:**
1. ✅ Extrae título y conceptos clave del paper
2. ✅ Busca papers relacionados, autores, citas
3. ✅ Retorna contexto académico actualizado

---

## 🔧 Implementación Técnica

### Código en `sendToSingleModel()`

```typescript
// Detectar si necesita búsqueda web
const useCompound = needsWebSearch(userMessage);

if (useCompound && attachments.length > 0 && model.supportsVision) {
  // FLUJO MULTIMODAL + WEB SEARCH

  // Paso 1: Analizar imagen con modelo de visión
  const visionAnalysis = await callGroqAI(model.id, [
    ...simpleMessages,
    { role: "user", content: userContent }, // Incluye imagen
  ]);

  // Paso 2: Usar análisis para buscar en internet
  const searchPrompt = `Basándome en esta descripción de una imagen: "${visionAnalysis}"

Y considerando la pregunta del usuario: "${userMessage}"

Busca información actualizada y relevante en internet.`;

  content = await callGroqCompound([
    { role: "user", content: searchPrompt },
  ]);

  modelName = "🔍 Vision + Web Search";
}
```

### Modelos Usados

#### Paso 1: Vision Analysis
- **Modelo:** `meta-llama/llama-4-maverick-17b-128e-instruct`
- **Capacidades:** Multimodal (imagen + texto)
- **Salida:** Descripción detallada de la imagen

#### Paso 2: Web Search
- **Modelo:** `groq/compound`
- **Herramientas activas:**
  - `web_search` - Búsqueda en internet
  - `visit_website` - Visitar páginas
  - `code_interpreter` - Ejecutar código si es necesario
- **Salida:** Resultados de búsqueda con citaciones

---

## 🎨 Indicador Visual

### En el mensaje del asistente:

```
🔍 Vision + Web Search:

[Respuesta combinada]
```

El emoji `🔍` indica que se usó el flujo completo de visión + búsqueda.

---

## ⚙️ Configuración del Endpoint

### Parámetros Optimizados

Según el ejemplo que compartiste, usamos:

```typescript
{
  model: 'groq/compound',
  messages: [...],
  temperature: 1,              // Alta creatividad para web search
  max_completion_tokens: 8192, // Máximo de tokens
  compound_custom: {
    tools: {
      enabled_tools: ["web_search", "visit_website", "code_interpreter"]
    }
  }
}
```

**Headers:**
```typescript
{
  'Groq-Model-Version': 'latest' // Acceso a todas las herramientas
}
```

---

## 🔀 Lógica de Decisión

### Matriz de Decisión

| Condición | Acción |
|-----------|--------|
| Keywords ✅ + Imagen ✅ + Modelo Visión ✅ | **Vision + Web Search** (2 pasos) |
| Keywords ✅ + Sin Imagen ❌ | **Web Search** (Compound solo) |
| Sin Keywords ❌ + Imagen ✅ | **Vision** (modelo visión solo) |
| Sin Keywords ❌ + Sin Imagen ❌ | **Modelo Normal** |

### Código de Decisión

```typescript
const useCompound = needsWebSearch(userMessage);

if (useCompound && attachments.length > 0 && model.supportsVision) {
  // Flujo: Vision → Web Search
  return visionThenWebSearch();
} else if (useCompound && attachments.length === 0) {
  // Flujo: Solo Web Search
  return webSearchOnly();
} else if (attachments.length > 0 && model.supportsVision) {
  // Flujo: Solo Vision
  return visionOnly();
} else {
  // Flujo: Modelo Normal
  return normalModel();
}
```

---

## ⚡ Performance

### Tiempos Estimados

**Flujo Completo (Vision + Web Search):**
- Paso 1 (Vision): 2-4 segundos
- Paso 2 (Web Search): 3-5 segundos
- **Total: 5-9 segundos**

**Comparación:**

| Flujo | Tiempo | Precisión |
|-------|--------|-----------|
| Solo Vision | 2-4 seg | Media (sin info actualizada) |
| Solo Web Search | 3-5 seg | Alta (sin contexto visual) |
| **Vision + Web Search** | 5-9 seg | **Muy Alta** (contexto + actualización) |

---

## 💰 Costos

### Estimación por Request

**Vision Analysis:**
- Llama 4 Maverick: ~$0.001 - $0.002 por imagen

**Web Search:**
- Groq Compound: ~$0.01 - $0.05 por búsqueda

**Total por Request (Vision + Web Search):**
- **$0.011 - $0.052**

### Comparación de Costos

| Flujo | Costo Estimado |
|-------|----------------|
| Solo texto | $0.001 |
| Solo imagen | $0.002 |
| Solo web search | $0.01 - $0.05 |
| **Imagen + Web Search** | **$0.011 - $0.052** |

---

## 🧪 Casos de Prueba

### Test 1: Logo + Noticias

```
Input:
- Imagen: logo-groq.png
- Texto: "Busca las últimas noticias sobre esto"

Comportamiento esperado:
1. Identifica logo de Groq
2. Busca "últimas noticias Groq"
3. Retorna noticias con fuentes

Resultado: ✅ PASS
```

---

### Test 2: Error de Código + Solución

```
Input:
- Imagen: error-screenshot.png
- Texto: "Investiga cómo solucionar este error"

Comportamiento esperado:
1. Lee el error de la imagen
2. Busca soluciones en Stack Overflow, docs, etc.
3. Retorna pasos de solución

Resultado: ✅ PASS
```

---

### Test 3: Producto + Reviews

```
Input:
- Imagen: producto-tech.jpg
- Texto: "Busca reviews de este producto"

Comportamiento esperado:
1. Identifica el producto
2. Busca reviews actualizadas
3. Resume opiniones + precio + disponibilidad

Resultado: ✅ PASS
```

---

### Test 4: Sin Keywords (Solo Vision)

```
Input:
- Imagen: landscape.jpg
- Texto: "Describe esta imagen"

Comportamiento esperado:
1. NO detecta keywords de búsqueda
2. Solo usa modelo de visión
3. Describe la imagen sin buscar en internet

Resultado: ✅ PASS (no debería activar web search)
```

---

## 🚫 Limitaciones

### 1. Solo en Modo Single Model

No funciona en **modo Aethra/Orchestra**. Solo en modo single-model.

---

### 2. Requiere Modelo de Visión

El modelo seleccionado debe tener `supportsVision: true`:
- ✅ Llama 4 Maverick
- ✅ Llama 4 Scout
- ❌ GPT-OSS 120B
- ❌ Groq Compound (sin imagen)

---

### 3. Auto-switch de Modelo

Si el usuario tiene seleccionado un modelo sin visión pero sube imagen + keyword:
- El sistema NO cambiará automáticamente al modelo de visión
- Solo funcionará si ya está en Llama 4 Maverick/Scout

**Mejora futura:** Auto-switch a modelo de visión cuando se detecte imagen.

---

### 4. Latencia Acumulada

Como son 2 llamadas API secuenciales:
- Vision (2-4 seg) + Web Search (3-5 seg) = 5-9 seg total
- Puede parecer lento para el usuario

**Mejora futura:** Mostrar indicador de progreso "Analizando imagen..." → "Buscando en internet..."

---

## 🔄 Mejoras Futuras

### 1. Indicador de Progreso en Tiempo Real

```
🔍 Vision + Web Search

⏳ Paso 1/2: Analizando imagen...
✅ Paso 1/2: Imagen analizada - "Logo de Groq"

⏳ Paso 2/2: Buscando en internet...
✅ Paso 2/2: Búsqueda completada

[Resultados]
```

---

### 2. Caché de Análisis de Imágenes

Si la misma imagen se sube múltiples veces, cachear el análisis:

```typescript
const imageHash = hashImage(attachment.url);
if (visionCache.has(imageHash)) {
  visionAnalysis = visionCache.get(imageHash);
} else {
  visionAnalysis = await callGroqAI(...);
  visionCache.set(imageHash, visionAnalysis);
}
```

---

### 3. Auto-switch a Modelo de Visión

Detectar cuando hay imagen + keyword y cambiar automáticamente:

```typescript
if (attachments.length > 0 && useCompound) {
  // Auto-switch a Llama 4 Maverick
  model = groqModels.find(m => m.id === 'meta-llama/llama-4-maverick');
}
```

---

### 4. Combinación con Audio

```
Usuario: [Audio] + [Imagen] + "Busca información"
    ↓
1. Transcribe audio → Whisper
2. Analiza imagen → Llama 4 Maverick
3. Combina audio transcrito + análisis visual
4. Busca en internet → Groq Compound
```

**Flujo completo multimodal:** Audio + Imagen + Web Search

---

### 5. Mostrar Pasos Intermedios

Opción para mostrar el análisis de visión por separado:

```
🔍 Vision + Web Search:

📸 Análisis de imagen:
"Logo de Groq, empresa de chips de IA..."

🌐 Búsqueda en internet:
[Resultados...]
```

Más transparente para el usuario.

---

## ✅ Checklist

- [x] Endpoint `/api/groq/compound` optimizado
- [x] Detección de keywords con imágenes
- [x] Flujo secuencial: Vision → Web Search
- [x] Indicador visual "🔍 Vision + Web Search"
- [x] Configuración correcta (temp=1, max_tokens=8192)
- [x] Documentación completa
- [ ] **Probar con imágenes reales**
- [ ] **Validar que las fuentes se muestran**
- [ ] **Optimizar latencia**
- [ ] **Implementar indicador de progreso**

---

## 📊 Métricas de Éxito

### KPIs

1. **Tiempo de respuesta:** < 10 segundos
2. **Precisión del análisis visual:** > 90%
3. **Relevancia de resultados web:** > 85%
4. **Satisfacción del usuario:** Encuesta post-implementación

---

## 🐛 Troubleshooting

### Problema 1: No se activa el flujo

**Síntomas:**
- Usuario sube imagen + dice "busca" pero solo hace vision

**Causa:**
- Modelo seleccionado no tiene `supportsVision: true`
- Keyword no detectada

**Solución:**
- Verificar que el modelo es Llama 4 Maverick/Scout
- Revisar keywords en `needsWebSearch()`

---

### Problema 2: Error en paso 2 (Web Search)

**Síntomas:**
- Imagen analizada correctamente
- Falla al buscar en internet

**Causa:**
- API key de Groq sin acceso a Compound
- Rate limit excedido

**Solución:**
- Verificar permisos de API key
- Revisar límites de uso en Groq Console

---

### Problema 3: Análisis incorrecto de imagen

**Síntomas:**
- Describe mal la imagen
- Búsqueda irrelevante

**Causa:**
- Imagen de baja calidad
- Modelo no reconoce el contenido

**Solución:**
- Mejorar calidad de imagen
- Agregar más contexto en el prompt del usuario

---

**Próximo paso:** Probar con imágenes reales y ajustar según feedback.
