# Voice Input Implementation - Speech-to-Text con Groq Whisper

**Fecha de implementación:** 26 de octubre de 2025
**Estado:** ✅ Completado - Listo para probar

---

## 🎯 Objetivo

Permitir a los usuarios enviar prompts de audio que se transcriben automáticamente a texto usando Whisper de Groq, sin necesidad de escribir.

---

## 🚀 Funcionalidad Implementada

### Flujo de Usuario

```
1. Usuario presiona botón de micrófono 🎤
   ↓
2. Botón cambia a rojo pulsante (grabando...)
   ↓
3. Usuario habla al micrófono
   ↓
4. Usuario presiona botón nuevamente para detener
   ↓
5. Muestra estado "Transcribiendo..."
   ↓
6. Texto transcrito aparece en el input
   ↓
7. Usuario puede EDITAR el texto si lo necesita
   ↓
8. Usuario presiona enviar manualmente
```

### Características Clave

✅ **No auto-submit** - El texto se inserta en el input pero NO se envía automáticamente
✅ **Editable** - El usuario puede modificar la transcripción antes de enviar
✅ **Estados visuales** - El botón cambia de apariencia según el estado:
  - 🎤 Gris: Listo para grabar
  - 🔴 Rojo pulsante: Grabando
  - ⏳ Opaco: Transcribiendo
✅ **Soporte multiidioma** - Whisper soporta 99+ idiomas (configurado en español por defecto)
✅ **Rápido** - Whisper Large v3 Turbo (299x más rápido que tiempo real)

---

## 📁 Archivos Creados/Modificados

### Archivos Nuevos

#### 1. `app/api/groq/transcribe/route.ts`
**Endpoint de transcripción**

```typescript
POST /api/groq/transcribe
```

**Request:**
- FormData con archivo de audio (webm format)

**Response:**
```json
{
  "text": "Texto transcrito del audio",
  "language": "es"
}
```

**Características:**
- Usa modelo `whisper-large-v3-turbo`
- Idioma por defecto: español
- Formato de respuesta: JSON
- Manejo de errores con mensajes descriptivos

---

#### 2. `hooks/use-audio-recorder.ts`
**Hook custom para grabación de audio**

**API del hook:**
```typescript
const {
  recordingState,      // 'idle' | 'recording' | 'transcribing'
  startRecording,      // () => Promise<void>
  stopRecording,       // () => Promise<Blob>
  transcribeAudio,     // (blob: Blob) => Promise<string>
  cancelRecording,     // () => void
  isRecording,         // boolean
  isTranscribing,      // boolean
} = useAudioRecorder();
```

**Funcionalidades:**
- Usa `MediaRecorder` API del navegador
- Solicita permisos de micrófono
- Graba en formato `audio/webm`
- Detiene todos los tracks al finalizar (libera micrófono)
- Maneja errores con toasts informativos

---

### Archivos Modificados

#### 3. `components/icons.tsx`
**Agregado:** `MicrophoneIcon`

```typescript
export const MicrophoneIcon = ({ size = 16 }: { size?: number }) => (...)
```

Icono SVG estilo Feather Icons, consistente con el resto del proyecto.

---

#### 4. `components/multimodal-input.tsx`
**Cambios realizados:**

**a) Imports agregados:**
```typescript
import { MicrophoneIcon } from "./icons";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
```

**b) Hook agregado en el componente:**
```typescript
const {
  recordingState,
  startRecording,
  stopRecording,
  transcribeAudio,
  isRecording,
  isTranscribing,
} = useAudioRecorder();
```

**c) Handler de click del micrófono:**
```typescript
const handleMicrophoneClick = useCallback(async () => {
  if (isRecording) {
    // Detener y transcribir
    const audioBlob = await stopRecording();
    const transcription = await transcribeAudio(audioBlob);
    setInput(transcription); // Insertar en input (SIN auto-submit)
    textareaRef.current?.focus();
  } else {
    // Iniciar grabación
    startRecording();
  }
}, [isRecording, stopRecording, transcribeAudio, setInput, startRecording, width]);
```

**d) Componente MicrophoneButton:**
```typescript
function PureMicrophoneButton({
  isRecording,
  isTranscribing,
  onClick,
  status,
}) {
  // Botón con estados visuales:
  // - Rojo pulsante cuando graba
  // - Opaco cuando transcribe
  // - Normal cuando está listo
}
```

**e) Botón agregado en el toolbar:**
```typescript
<PromptInputTools className="gap-0 sm:gap-0.5">
  <AttachmentsButton ... />
  <MicrophoneButton
    isRecording={isRecording}
    isTranscribing={isTranscribing}
    onClick={handleMicrophoneClick}
    status={status}
  />
  {/* Resto de botones */}
</PromptInputTools>
```

---

## 🎨 UI/UX

### Posición del Botón

```
┌──────────────────────────────────────────────────┐
│  Envía un mensaje...                             │
│                                                   │
│  [📎] [🎤] [CPU Modelo ▼] [Aethra] [Enviar ↑]    │
└──────────────────────────────────────────────────┘
```

El botón de micrófono está ubicado entre:
- **Izquierda:** Botón de attachments (📎)
- **Derecha:** Selector de modelo (CPU)

### Estados Visuales

#### Estado: Idle (Listo)
```css
background: transparent
color: currentColor
hover: bg-accent
```
🎤 Icono gris normal

#### Estado: Recording (Grabando)
```css
background: bg-red-500
color: text-white
hover: bg-red-600
animation: animate-pulse
```
🔴 Botón rojo pulsante

#### Estado: Transcribing (Procesando)
```css
opacity: 50%
cursor: cursor-wait
```
⏳ Botón opaco, no clickeable

---

## 🔧 Configuración Técnica

### Groq Whisper API

**Endpoint:**
```
https://api.groq.com/openai/v1/audio/transcriptions
```

**Modelo usado:**
- `whisper-large-v3-turbo`

**Parámetros:**
- `language`: `'es'` (español por defecto)
- `response_format`: `'json'`

**Límites:**
- Tamaño máximo de archivo: No especificado (probar)
- Formatos soportados: FLAC, MP3, MP4, MPEG, MPGA, M4A, OGG, WAV, WEBM

**Performance:**
- Velocidad: 299x real-time
- WER (Word Error Rate): 10.3%

**Costo:**
- Aproximadamente $0.006 por minuto de audio

---

## 🧪 Cómo Probar

### Prueba Básica

1. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

2. **Abrir la aplicación** en el navegador

3. **Localizar el botón de micrófono** (🎤) en el input

4. **Hacer click en el botón:**
   - El navegador pedirá permisos de micrófono (aceptar)
   - El botón se vuelve rojo pulsante
   - Hablar al micrófono

5. **Hacer click nuevamente para detener:**
   - El botón se vuelve opaco (transcribiendo...)
   - Esperar ~1-2 segundos

6. **Verificar:**
   - El texto transcrito aparece en el input
   - El input tiene el foco
   - Se puede editar el texto
   - El botón de enviar está habilitado

7. **Editar (opcional):**
   - Modificar el texto transcrito
   - Corregir errores

8. **Enviar:**
   - Hacer click en el botón de enviar (↑)
   - El mensaje se envía al modelo

---

### Pruebas Avanzadas

#### 1. Prueba de idiomas
**Español:**
```
"Hola, ¿cómo estás? Quiero saber sobre inteligencia artificial."
```

**Inglés:**
```
"Hello, how are you? Tell me about AI."
```

#### 2. Prueba de errores

**Sin permisos de micrófono:**
- Denegar permisos → Debe mostrar toast de error

**Cancelar grabación:**
- Presionar botón mientras graba
- Cerrar pestaña mientras graba
- Debe liberar el micrófono correctamente

#### 3. Prueba de UX

**Envío bloqueado durante transcripción:**
- Mientras transcribe, el botón de enviar debe estar deshabilitado

**Multiples grabaciones:**
- Grabar, transcribir, editar texto
- Grabar de nuevo → debe agregar al texto existente o reemplazar?
  - ⚠️ **Actualmente:** Reemplaza todo el input

---

## 🐛 Posibles Problemas y Soluciones

### Problema 1: "No se pudo acceder al micrófono"

**Causas:**
- Permisos denegados
- Micrófono en uso por otra aplicación
- HTTPS requerido (MediaRecorder solo funciona en contextos seguros)

**Solución:**
- Verificar permisos del navegador
- Cerrar otras apps que usen el micrófono
- Asegurar que estás en `localhost` o HTTPS

---

### Problema 2: "Error al transcribir el audio"

**Causas:**
- API key de Groq no configurada
- Formato de audio no soportado
- Archivo muy grande

**Solución:**
- Verificar `GROQ_API_KEY` en `.env.local`
- Revisar logs del servidor para detalles
- Probar con grabaciones más cortas (<1 minuto)

---

### Problema 3: Audio no se detiene

**Causa:**
- Error en el evento `onstop` del MediaRecorder

**Solución:**
- Revisar consola del navegador
- Verificar que `mediaRecorder.stop()` se llama correctamente
- Comprobar que los tracks se detienen: `track.stop()`

---

### Problema 4: Transcripción incorrecta

**Causas:**
- Audio de baja calidad
- Ruido de fondo
- Idioma incorrecto detectado
- Acento fuerte

**Solución:**
- Hablar más claro y despacio
- Reducir ruido de fondo
- Cambiar parámetro `language` en el endpoint si es necesario
- Usar micrófono de mejor calidad

---

## 🔄 Mejoras Futuras (Fase 2+)

### 1. Selector de idioma
Permitir al usuario elegir el idioma de transcripción:
```typescript
<select>
  <option value="es">Español</option>
  <option value="en">English</option>
  <option value="fr">Français</option>
</select>
```

### 2. Visualización de onda de audio
Mostrar waveform mientras graba:
```
🎤 ▁▂▃▅▇▅▃▂▁ Grabando...
```

### 3. Indicador de tiempo
```
🔴 0:05 / 1:00
```

### 4. Modo de adición vs. reemplazo
Toggle para decidir si la nueva grabación:
- Reemplaza el texto existente
- Se agrega al final

### 5. Historial de grabaciones
Guardar últimas 5 grabaciones localmente para poder reutilizarlas.

### 6. Atajos de teclado
- `Ctrl/Cmd + Shift + R` - Iniciar/detener grabación

### 7. Text-to-Speech (respuesta en audio)
Ver `GROQ_MODELS_CAPABILITIES.md` para implementación de TTS.

---

## 📊 Métricas de Performance

### Tiempos Esperados

**Grabación:**
- Inicio: ~100-300ms (permisos de micrófono)
- Grabación: Ilimitado (hasta que el usuario detenga)

**Transcripción:**
- Audio de 10 segundos: ~1-2 segundos
- Audio de 30 segundos: ~2-3 segundos
- Audio de 1 minuto: ~3-5 segundos

**Total (end-to-end para 30 seg):**
- Usuario habla: 30 segundos
- Transcripción: 2-3 segundos
- **Total: ~32-33 segundos**

---

## 🔐 Seguridad y Privacidad

### Datos de Audio

✅ **El audio NO se almacena en el servidor**
- Se envía directamente a Groq API
- Se transcribe y se descarta
- Solo el texto se guarda en la base de datos

✅ **HTTPS requerido en producción**
- MediaRecorder API solo funciona en contextos seguros
- En desarrollo: `localhost` es considerado seguro

✅ **Permisos del usuario**
- Se solicitan permisos explícitos
- El usuario puede denegar en cualquier momento
- Se liberan los recursos del micrófono al terminar

### API Key

⚠️ **NUNCA exponer `GROQ_API_KEY` al cliente**
- Se mantiene solo en el servidor (endpoint `/api/groq/transcribe`)
- El cliente solo envía el audio
- La autenticación se hace server-side

---

## 📚 Documentación de Referencia

- **Groq Whisper API:** https://console.groq.com/docs/speech-to-text
- **MediaRecorder API:** https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- **Whisper Models:** Ver `GROQ_MODELS_CAPABILITIES.md`

---

## ✅ Checklist de Implementación

- [x] Endpoint `/api/groq/transcribe` creado
- [x] Hook `useAudioRecorder` implementado
- [x] Icono `MicrophoneIcon` agregado
- [x] Botón de micrófono en UI
- [x] Estados visuales (idle, recording, transcribing)
- [x] Inserción de texto en input (sin auto-submit)
- [x] Manejo de errores con toasts
- [x] Liberación de recursos del micrófono
- [x] Documentación completa
- [ ] **Pruebas en navegador**
- [ ] **Pruebas de permisos**
- [ ] **Pruebas de errores**
- [ ] **Ajustes de UX según feedback**

---

**Próximo paso:** Probar la funcionalidad en el navegador y ajustar según sea necesario.
