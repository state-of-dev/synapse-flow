# 🚀 OpenRouter - Inicio Rápido

## 🎯 ¿Qué se implementó?

Se agregó un **sistema completo de OpenRouter** con:
- **16 modelos gratuitos** organizados en 3 categorías
- **Modo Omnicall**: Envía a múltiples modelos simultáneamente
- **Modo Individual**: Prueba un modelo específico
- **3 contextos inteligentes**: Texto, Código, Imágenes

## 📁 Archivos Nuevos

```
app/
  api/openrouter/route.ts          # API proxy
  openrouter/page.tsx               # Página /openrouter

lib/ai/
  openrouter-models.ts              # 16 modelos configurados

components/
  openrouter-chat.tsx               # Componente principal
  multimodal-input.tsx              # ✏️ Actualizado (nuevo selector)
  chat-header.tsx                   # ✏️ Actualizado (tabs)

Documentación:
  openrouter.md                     # Referencia completa de API
  OPENROUTER_IMPLEMENTATION.md      # Detalles técnicos
  OPENROUTER_QUICKSTART.md          # Este archivo
```

## 🏃 Cómo Usar

### 1. Iniciar el servidor
```bash
npm run dev
```

### 2. Navegar a OpenRouter
Abre tu navegador en `http://localhost:3000` y verás dos tabs en el header:
- **Groq Models** (sistema actual, sin cambios)
- **OpenRouter** (nuevo sistema) ← Click aquí

### 3. Probar los modos

#### 🔤 Modo Texto (Default)
1. Escribe un mensaje: `"Explica qué es React"`
2. Deja **Omnicall ON** para ver 3 respuestas
3. O desactiva Omnicall y selecciona un modelo específico

#### 💻 Modo Código
1. Activa el switch **"Código"**
2. El dropdown cambia a modelos de código
3. Escribe: `"Escribe una función para ordenar un array"`
4. Omnicall te mostrará respuestas de 3 modelos de código

#### 🖼️ Modo Imágenes
1. Click en 📎 para adjuntar imagen
2. El dropdown cambia **automáticamente** a modelos con visión
3. Escribe: `"¿Qué hay en esta imagen?"`
4. Omnicall envía a 3 modelos multimodales

## ⚙️ Configuración (Opcional)

Si quieres usar tu propia API key:

```bash
# .env.local
OPENROUTER_API_KEY=tu-api-key-aqui
```

Si no la configuras, usa la key hardcodeada (limitada a rate limits públicos).

## 🎨 UI Explicada

```
┌─────────────────────────────────────────────────┐
│ [☰] [+ Nuevo Chat]        [Groq] [OpenRouter]  │  ← Tabs
├─────────────────────────────────────────────────┤
│                                                 │
│  Mensajes del chat aquí...                     │
│                                                 │
├─────────────────────────────────────────────────┤
│ [📎] [🖥️ Modelo ▼] [⚡ Código] [🔀 Omnicall] [➡️] │  ← Input
└─────────────────────────────────────────────────┘
```

### Elementos del Input:
- **📎**: Adjuntar imagen (cambia a modelos multimodales)
- **🖥️ Modelo**: Selector (deshabilitado si Omnicall está activo)
- **⚡ Código**: Switch para modo código (oculto si hay imagen)
- **🔀 Omnicall**: Switch para enviar a múltiples modelos
- **➡️**: Botón enviar

## 🧪 Tests Rápidos

### Test 1: Chat Simple
```
1. Ve a /openrouter
2. Omnicall ON
3. Escribe: "Hola, di hola en español"
4. ✅ Deberías ver 3 respuestas de modelos diferentes
```

### Test 2: Código
```
1. Activa switch "Código"
2. Omnicall ON
3. Escribe: "Función para sumar dos números en Python"
4. ✅ Deberías ver 3 respuestas de modelos de código
```

### Test 3: Imagen
```
1. Adjunta una imagen cualquiera
2. Omnicall ON
3. Escribe: "Describe esta imagen"
4. ✅ Deberías ver 3 respuestas de modelos multimodales
```

### Test 4: Modelo Individual
```
1. Desactiva Omnicall (switch OFF)
2. Selecciona "Qwen3 235B" del dropdown
3. Escribe un mensaje
4. ✅ Deberías ver solo 1 respuesta de ese modelo
```

## ⚠️ Rate Limits

Los modelos free pueden tener rate limits. Si ves:
```
⚠️ [Modelo X] Rate limit alcanzado - intenta de nuevo en unos segundos
```

**Solución:**
- Espera 10-30 segundos
- O usa modo Individual en lugar de Omnicall
- O configura tu propia API key en `.env.local`

## 🐛 Problemas Comunes

### Error: "OPENROUTER_API_KEY not configured"
**Solución:** Agrega la key al `.env.local` o usa la hardcodeada (ya incluida en el código).

### El dropdown no cambia cuando adjunto imagen
**Causa:** Puede ser un delay del upload.
**Solución:** Espera a que la imagen termine de subir (icono de carga).

### Omnicall muy lento
**Normal:** Está esperando 3 respuestas en paralelo. Puede tomar 10-30 segundos.

### Modelo no responde
**Posibles causas:**
1. Rate limit (espera unos segundos)
2. Modelo temporalmente no disponible
3. Intenta con otro modelo

## 📚 Referencias

- **Modelos disponibles:** Ver `openrouter.md`
- **Detalles técnicos:** Ver `OPENROUTER_IMPLEMENTATION.md`
- **Docs OpenRouter:** https://openrouter.ai/docs

## 🎯 Características Destacadas

### ✅ Totalmente Separado
- Groq y OpenRouter son **independientes**
- Navega entre tabs sin perder tu conversación

### ✅ Cambio Automático de Contexto
- Adjuntas imagen → Modelos multimodales
- Activas código → Modelos de código
- Sin configuración manual

### ✅ Razonamiento Visible
Algunos modelos como Qwen3 muestran su "pensamiento interno" en un bloque separado antes de la respuesta.

### ✅ Sin Pérdida de Datos
- Todo se guarda en la misma BD
- Historial compartido entre Groq y OpenRouter
- Sidebar funciona igual

## 🚀 Siguientes Pasos

1. **Prueba los 3 contextos** (texto, código, imagen)
2. **Compara respuestas** en modo Omnicall
3. **Encuentra tu modelo favorito** en modo Individual
4. **Revisa openrouter.md** para ver todos los modelos disponibles

---

**¿Listo?** Abre `http://localhost:3000` y click en el tab **"OpenRouter"** 🎉
