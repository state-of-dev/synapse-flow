# Modo Aethra: Flujo de 3 Pasos con Imágenes + Web Search

**Fecha de implementación:** 26 de octubre de 2025
**Estado:** ✅ Completado

---

## 🎯 Objetivo

Implementar un flujo avanzado de 3 pasos cuando el usuario activa **modo Aethra** + sube **imagen** + usa **keywords de búsqueda**:

1. **PASO 1:** Todos los modelos de visión analizan la imagen en paralelo
2. **PASO 2:** Se concatenan los análisis y todos los modelos de texto buscan en internet
3. **PASO 3:** Se concatenan todas las respuestas con web search y Cerebras genera mega-resumen

---

## 🔄 Flujos Completos

### **Modo Single + Imagen + Keywords** (2 mensajes)

```
Usuario: [Imagen] + "Busca información sobre esto"
Modo: Single model (ej: Llama 4 Maverick)
    ↓
PASO 1: Llama 4 Maverick analiza imagen
    → Mensaje 1: "Llama 4 Maverick (Vision Analysis): [descripción]"
    ↓
PASO 2: Groq Compound busca en internet usando el análisis
    → Mensaje 2: "Groq Compound (Web Search): [resultados con fuentes]"
```

**Total: 2 mensajes mostrados al usuario**

---

### **Modo Aethra + Imagen + Keywords** (3 pasos, 7+ mensajes)

```
Usuario: [Imagen] + "Busca las últimas noticias sobre esto"
Modo: Aethra activado
    ↓
PASO 1: Análisis de Visión (2 modelos en paralelo)
├─ Llama 4 Maverick analiza imagen
│   → Mensaje 1: "Llama 4 Maverick (Vision): [análisis 1]"
└─ Llama 4 Scout analiza imagen
    → Mensaje 2: "Llama 4 Scout (Vision): [análisis 2]"
    ↓
PASO 2: Web Search con análisis concatenado (4 modelos en paralelo)
├─ GPT-OSS 120B busca en internet con contexto de ambos análisis
│   → Mensaje 3: "GPT-OSS 120B (Web Search): [resultados con fuentes]"
├─ Groq Compound busca en internet
│   → Mensaje 4: "Groq Compound (Web Search): [resultados]"
├─ Kimi K2 busca en internet
│   → Mensaje 5: "Kimi K2 (Web Search): [resultados]"
└─ Qwen3 32B busca en internet
    → Mensaje 6: "Qwen3 32B (Web Search): [resultados]"
    ↓
PASO 3: Mega-Resumen con Cerebras
└─ Cerebras GPT-120B + reasoning high
    → Mensaje 7: "🧠 Mega-Resumen (Cerebras): [consolidación completa]"
```

**Total: 7 mensajes mostrados al usuario**
- 2 análisis de visión
- 4 búsquedas web
- 1 mega-resumen

---

### **Modo Aethra + Imagen SIN Keywords** (solo visión)

```
Usuario: [Imagen] + "Describe esta imagen"
Modo: Aethra activado
    ↓
Solo PASO 1: Modelos de visión analizan
├─ Llama 4 Maverick
└─ Llama 4 Scout
```

**Total: 2 mensajes** (sin web search ni Cerebras)

---

## 📊 Comparación de Modos

| Modo | Condiciones | Mensajes | Pasos |
|------|-------------|----------|-------|
| **Single Normal** | Solo texto | 1 | 1 |
| **Single + Web Search** | Texto + keywords | 1 | 1 |
| **Single + Vision** | Imagen sin keywords | 1 | 1 |
| **Single + Vision + Web** | Imagen + keywords | 2 | 2 |
| **Aethra Normal** | Solo texto | 5 (4 modelos + 1 Cerebras) | 2 |
| **Aethra + Vision** | Imagen sin keywords | 2 | 1 |
| **Aethra + Vision + Web** | Imagen + keywords | **7** (2 vision + 4 web + 1 Cerebras) | **3** |

---

## 🔧 Implementación Técnica

### Código del Flujo de 3 Pasos

```typescript
// En sendToAllModels()
if (attachments.length > 0) {
  const useCompound = needsWebSearch(userMessage);

  if (useCompound) {
    // FLUJO DE 3 PASOS
    const allMessages: ChatMessage[] = [];

    // ========== PASO 1: Vision Analysis ==========
    const visionPromises = visionModels.map(async (model) => {
      const content = await callGroqAI(model.id, [
        ...simpleMessages,
        { role: "user", content: contentPartsWithImage },
      ]);

      const { reasoning, text } = extractThinkTags(content);

      return {
        modelName: model.name,
        visionText: text,
        message: {
          id: generateUUID(),
          role: "assistant",
          parts: [
            reasoning && { type: "reasoning", text: reasoning },
            { type: "text", text: `**${model.name} (Vision):**\n${text}` }
          ],
        },
      };
    });

    const visionResults = await Promise.all(visionPromises);
    visionResults.forEach((r) => allMessages.push(r.message));

    // ========== PASO 2: Web Search ==========
    const concatenatedVision = visionResults
      .map((r) => `${r.modelName}: ${r.visionText}`)
      .join("\n\n");

    const webSearchPrompt = `Análisis de imagen:\n\n${concatenatedVision}\n\nPregunta: "${userMessage}"\n\nBusca información actualizada en internet.`;

    const webSearchPromises = textModels.map(async (model) => {
      const content = await callGroqCompound([
        { role: "user", content: webSearchPrompt },
      ]);

      return {
        modelName: model.name,
        response: text,
        message: { /* mensaje formateado */ },
      };
    });

    const webSearchResults = await Promise.all(webSearchPromises);
    webSearchResults.forEach((r) => allMessages.push(r.message));

    // ========== PASO 3: Cerebras Mega-Resumen ==========
    const allResponses = webSearchResults
      .map((r) => `${r.modelName}:\n${r.response}`)
      .join("\n\n---\n\n");

    const megaPrompt = `Pregunta: "${userMessage}"\n\nAnálisis de imagen:\n${concatenatedVision}\n\nRespuestas con web search:\n\n${allResponses}\n\nGenera mega-resumen consolidado.`;

    const cerebrasResult = await callCerebrasAI([
      { role: "user", content: megaPrompt },
    ]);

    allMessages.push({
      id: generateUUID(),
      role: "assistant",
      parts: [
        cerebrasResult.reasoning && { type: "reasoning", text: cerebrasResult.reasoning },
        { type: "text", text: `**🧠 Mega-Resumen (Cerebras):**\n${cerebrasResult.content}` }
      ],
    });

    return allMessages; // 7 mensajes totales
  }
}
```

---

## 🧠 Configuración de Cerebras

### Parámetros Optimizados para Mega-Resumen

```typescript
{
  model: "gpt-oss-120b",
  messages: [...],
  max_completion_tokens: 65_536,  // Máximo de tokens
  temperature: 1,
  top_p: 1,
  reasoning_effort: "high"         // Razonamiento profundo
}
```

### System Prompt de Cerebras

```typescript
{
  role: "system",
  content: `Eres un asistente experto en sintetizar y consolidar información.

Tu tarea es:
1. ANALIZAR profundamente cada respuesta
2. IDENTIFICAR patrones, similitudes y diferencias
3. INTEGRAR toda la información en un mega-resumen magistral
4. PROFUNDIZAR en cada punto relevante sin reducir cobertura
5. COMBINAR las mejores ideas en una respuesta coherente

IMPORTANTE: NO reduzcas ni simplifiques. El resumen debe ser
extenso, detallado y abarcar TODOS los puntos mencionados.`
}
```

---

## 🎨 Ejemplo Completo

### Input del Usuario

```
Modo: Aethra activado
Imagen: logo-tesla.png
Texto: "Busca las últimas noticias sobre esta empresa"
```

### Output del Sistema (7 mensajes)

#### PASO 1: Análisis de Visión

**Mensaje 1:**
```
Llama 4 Maverick (Vision):

La imagen muestra el logo de Tesla Inc., una empresa de vehículos
eléctricos y tecnología de energía limpia. El logo presenta una "T"
estilizada que representa tanto el nombre de la empresa como la
sección transversal de un motor eléctrico.
```

**Mensaje 2:**
```
Llama 4 Scout (Vision):

Logo corporativo de Tesla, reconocible por su diseño minimalista.
La empresa fue fundada en 2003 y es líder en movilidad eléctrica.
El logo fue diseñado para simbolizar innovación y sostenibilidad.
```

---

#### PASO 2: Búsqueda Web (con contexto de ambos análisis)

**Mensaje 3:**
```
GPT-OSS 120B (Web Search):

Basándome en el análisis de la imagen (logo de Tesla), aquí están
las últimas noticias:

1. **Tesla reporta ganancias récord en Q3 2025**
   - Fuente: Reuters - 25 Oct 2025
   - URL: https://reuters.com/...
   - Resumen: Tesla superó expectativas con $25B en ingresos...

2. **Nuevo Model Y actualizado presentado en China**
   - Fuente: Electrek - 24 Oct 2025
   - URL: https://electrek.co/...
   - Resumen: Tesla lanzó una versión mejorada del Model Y...

[Más noticias...]
```

**Mensaje 4:**
```
Groq Compound (Web Search):

[Resultados similares desde otra perspectiva]
```

**Mensaje 5:**
```
Kimi K2 (Web Search):

[Resultados adicionales con enfoque diferente]
```

**Mensaje 6:**
```
Qwen3 32B (Web Search):

[Más resultados y análisis]
```

---

#### PASO 3: Mega-Resumen Consolidado

**Mensaje 7:**
```
🧠 Mega-Resumen (Cerebras):

[Razonamiento visible del modelo]
Analizando las 4 fuentes de búsqueda web y los 2 análisis de visión,
identifico los siguientes temas principales:
1. Desempeño financiero excepcional
2. Innovaciones de producto
3. Expansión internacional
...

[Resumen final]
RESUMEN CONSOLIDADO DE ÚLTIMAS NOTICIAS SOBRE TESLA

1. DESEMPEÑO FINANCIERO
   Tesla ha reportado resultados extraordinarios en Q3 2025, superando
   todas las expectativas del mercado. Los ingresos alcanzaron $25B,
   un incremento del 35% YoY...

2. INNOVACIONES DE PRODUCTO
   El lanzamiento del Model Y actualizado en China marca un hito...

3. EXPANSIÓN GLOBAL
   Tesla continúa su agresiva expansión internacional...

[Análisis detallado de cada punto con datos de las 4 fuentes]

CONCLUSIÓN:
Tesla mantiene su posición de liderazgo en movilidad eléctrica,
con innovaciones continuas y crecimiento sostenido...
```

---

## ⏱️ Performance

### Tiempos Estimados (Modo Aethra con 3 Pasos)

| Paso | Operación | Tiempo |
|------|-----------|--------|
| 1 | Vision (2 modelos paralelos) | 3-5 seg |
| 2 | Web Search (4 modelos paralelos) | 5-8 seg |
| 3 | Cerebras mega-resumen | 4-7 seg |
| **TOTAL** | **3 pasos completos** | **12-20 seg** |

**Nota:** Los pasos 1 y 2 usan paralelización, lo que reduce el tiempo total.

---

## 💰 Costos Estimados

### Por Request Completo (Modo Aethra + Imagen + Keywords)

| Operación | Costo Unitario | Cantidad | Subtotal |
|-----------|----------------|----------|----------|
| Vision Analysis | $0.001 | 2 modelos | $0.002 |
| Web Search (Compound) | $0.01 - $0.05 | 4 modelos | $0.04 - $0.20 |
| Cerebras Mega-Resumen | $0.002 - $0.01 | 1 | $0.002 - $0.01 |
| **TOTAL** | | | **$0.044 - $0.212** |

**Comparación:**
- Modo Single normal: ~$0.001
- Modo Single + Vision + Web: ~$0.012 - $0.052
- **Modo Aethra completo: ~$0.044 - $0.212**

---

## 🚀 Ventajas del Flujo de 3 Pasos

### 1. **Análisis Visual Robusto**
- 2 modelos de visión diferentes
- Perspectivas complementarias
- Mayor precisión en identificación

### 2. **Búsqueda Web Exhaustiva**
- 4 fuentes de información
- Diferentes enfoques de búsqueda
- Validación cruzada de datos

### 3. **Consolidación Inteligente**
- Cerebras con reasoning high
- Síntesis de 6 fuentes (2 vision + 4 web)
- Resumen magistral y completo

### 4. **Transparencia Total**
- Usuario ve todos los pasos
- Puede verificar fuentes individuales
- Entiende el proceso de razonamiento

---

## 🔀 Matriz de Decisión

```typescript
function decidirFlujo(sendToAll, attachments, userMessage) {
  const hasImage = attachments.length > 0;
  const hasKeywords = needsWebSearch(userMessage);

  if (sendToAll && hasImage && hasKeywords) {
    return "FLUJO_3_PASOS"; // 7 mensajes
  }

  if (sendToAll && hasImage && !hasKeywords) {
    return "VISION_ONLY"; // 2 mensajes (solo modelos de visión)
  }

  if (sendToAll && !hasImage) {
    return "TEXT_ORCHESTRA"; // 5 mensajes (4 modelos + Cerebras)
  }

  if (!sendToAll && hasImage && hasKeywords) {
    return "VISION_THEN_WEB"; // 2 mensajes (vision + web search)
  }

  if (!sendToAll && hasKeywords) {
    return "WEB_SEARCH_ONLY"; // 1 mensaje (Compound)
  }

  if (!sendToAll && hasImage) {
    return "VISION_ONLY_SINGLE"; // 1 mensaje (Llama Maverick)
  }

  return "NORMAL"; // 1 mensaje (modelo seleccionado)
}
```

---

## ✅ Checklist de Implementación

- [x] Flujo de 3 pasos en `sendToAllModels()`
- [x] Concatenación de análisis de visión
- [x] Web search con contexto de visión
- [x] Mega-resumen con Cerebras (reasoning high)
- [x] Retornar array de 7 mensajes
- [x] Manejo de errores en cada paso
- [x] Modo single con 2 mensajes (vision + web)
- [x] Ajuste en componente principal para arrays
- [x] Documentación completa
- [ ] **Probar con imágenes reales**
- [ ] **Validar tiempos de respuesta**
- [ ] **Optimizar costos si es necesario**

---

## 🐛 Troubleshooting

### Problema 1: No se activan los 3 pasos

**Síntomas:**
- Usuario activa Aethra + sube imagen + dice "busca"
- Solo muestra análisis de visión (2 mensajes)

**Causa:**
- Keywords no detectadas correctamente

**Solución:**
- Verificar que el prompt contiene keywords en la lista
- Revisar console.log de `needsWebSearch()`

---

### Problema 2: Paso 2 falla (Web Search)

**Síntomas:**
- Paso 1 completo (2 mensajes de visión)
- Error en paso 2

**Causa:**
- Rate limit de Groq Compound
- API key sin acceso a tools

**Solución:**
- Revisar límites en Groq Console
- Verificar permisos de API key
- Implementar retry logic

---

### Problema 3: Cerebras no consolida bien

**Síntomas:**
- Paso 1 y 2 completados
- Mega-resumen muy corto o irrelevante

**Causa:**
- Prompt de Cerebras no optimizado
- Context window insuficiente

**Solución:**
- Ajustar system prompt de Cerebras
- Reducir tamaño de respuestas en paso 2 si es muy largo

---

## 🔄 Mejoras Futuras

### 1. Indicador de Progreso por Pasos

```
🔄 Paso 1/3: Analizando imagen con 2 modelos...
✅ Paso 1/3: Imagen analizada (2 resultados)

🔄 Paso 2/3: Buscando en internet con 4 modelos...
✅ Paso 2/3: Búsqueda completada (4 resultados)

🔄 Paso 3/3: Generando mega-resumen con Cerebras...
✅ Paso 3/3: Mega-resumen listo
```

### 2. Configuración de Herramientas por Modelo

Permitir que cada modelo de texto use diferentes tools:

```typescript
{
  "GPT-OSS 120B": ["web_search", "visit_website"],
  "Groq Compound": ["web_search", "code_interpreter"],
  "Kimi K2": ["web_search"],
  "Qwen3 32B": ["web_search", "wolfram_alpha"]
}
```

### 3. Cacheo de Análisis de Visión

Si la misma imagen se analiza múltiples veces en poco tiempo:

```typescript
const imageHash = hash(attachment.url);
if (visionCache.has(imageHash) && Date.now() - visionCache.get(imageHash).timestamp < 3600000) {
  visionResults = visionCache.get(imageHash).results;
} else {
  visionResults = await analyzeWithAllVisionModels();
  visionCache.set(imageHash, { results: visionResults, timestamp: Date.now() });
}
```

---

## 📊 Métricas de Éxito

### KPIs

1. **Tiempo total:** < 25 segundos
2. **Precisión del análisis visual:** > 90%
3. **Relevancia de web search:** > 85%
4. **Calidad del mega-resumen:** > 90% (evaluación manual)
5. **Tasa de error:** < 5%

---

**Próximo paso:** Probar con imágenes reales y ajustar según feedback del usuario.
