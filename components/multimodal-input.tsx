"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { Trigger } from "@radix-ui/react-select";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type SetStateAction,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { SelectItem } from "@/components/ui/select";
import { chatModels } from "@/lib/ai/models";
import { myProvider } from "@/lib/ai/providers";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { Context } from "./elements/context";
import { Switch } from "@/components/ui/switch";
import {
  PromptInput,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "./elements/prompt-input";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  CpuIcon,
  MicrophoneIcon,
  PaperclipIcon,
  StopIcon,
} from "./icons";
import { PreviewAttachment } from "./preview-attachment";
// import { SuggestedActions } from "./suggested-actions";
import { Button } from "./ui/button";
import type { VisibilityType } from "./visibility-selector";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  usage,
  sendToAll,
  setSendToAll,
  selectedGroqModel,
  setSelectedGroqModel,
  groqModels,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  usage?: AppUsage;
  sendToAll?: boolean;
  setSendToAll?: (value: boolean) => void;
  selectedGroqModel?: any;
  setSelectedGroqModel?: (model: any) => void;
  groqModels?: any[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const {
    recordingState,
    startRecording,
    stopRecording,
    transcribeAudio,
    cancelRecording,
    isRecording,
    isTranscribing,
  } = useAudioRecorder();

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [adjustHeight]);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, []);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustHeight, localStorageInput, setInput]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, "", `/chat/${chatId}`);

    sendMessage({
      role: "user",
      parts: [
        ...attachments.map((attachment) => ({
          type: "file" as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: "text",
          text: input,
        },
      ],
    });

    setAttachments([]);
    setLocalStorageInput("");
    resetHeight();
    setInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    resetHeight,
  ]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (_error) {
      toast.error("Failed to upload file, please try again!");
    }
  }, []);

  const _modelResolver = useMemo(() => {
    // Skip model resolution for Groq models
    if (groqModels && groqModels.length > 0) {
      return null;
    }
    return myProvider.languageModel(selectedModelId);
  }, [selectedModelId, groqModels]);

  const contextProps = useMemo(
    () => ({
      usage,
    }),
    [usage]
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  const handleMicrophoneClick = useCallback(async () => {
    if (isRecording) {
      // Detener grabación y transcribir
      try {
        const audioBlob = await stopRecording();
        const transcription = await transcribeAudio(audioBlob);

        // Insertar texto en el input (sin auto-submit)
        setInput(transcription);

        // Enfocar el textarea
        if (width && width > 768) {
          textareaRef.current?.focus();
        }
      } catch (error) {
        console.error('Error al transcribir:', error);
      }
    } else {
      // Iniciar grabación
      startRecording();
    }
  }, [isRecording, stopRecording, transcribeAudio, setInput, startRecording, width]);

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      {/* {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
            sendMessage={sendMessage}
          /> */}  

      <input
        className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />

      <PromptInput
        className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50"
        onSubmit={(event) => {
          event.preventDefault();
          if (status !== "ready") {
            toast.error("Please wait for the model to finish its response!");
          } else {
            submitForm();
          }
        }}
      >
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            className="flex flex-row items-end gap-2 overflow-x-scroll"
            data-testid="attachments-preview"
          >
            {attachments.map((attachment) => (
              <PreviewAttachment
                attachment={attachment}
                key={attachment.url}
                onRemove={() => {
                  setAttachments((currentAttachments) =>
                    currentAttachments.filter((a) => a.url !== attachment.url)
                  );
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              />
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                attachment={{
                  url: "",
                  name: filename,
                  contentType: "",
                }}
                isUploading={true}
                key={filename}
              />
            ))}
          </div>
        )}
        <div className="flex flex-row items-start gap-1 sm:gap-2">
          <PromptInputTextarea
            autoFocus
            className="grow resize-none border-0! border-none! bg-transparent p-2 text-sm outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
            data-testid="multimodal-input"
            disableAutoResize={true}
            maxHeight={200}
            minHeight={44}
            onChange={handleInput}
            placeholder="Envía un mensaje..."
            ref={textareaRef}
            rows={1}
            value={input}
          />
        </div>
        <PromptInputToolbar className="!border-top-0 border-t-0! p-0 shadow-none dark:border-0 dark:border-transparent!">
          <PromptInputTools className="gap-0 sm:gap-0.5">
            <AttachmentsButton
              fileInputRef={fileInputRef}
              selectedModelId={selectedModelId}
              sendToAll={sendToAll}
              status={status}
            />
            {groqModels && setSelectedGroqModel && selectedGroqModel ? (
              <>
                <GroqModelSelector
                  attachments={attachments}
                  groqModels={groqModels}
                  selectedGroqModel={selectedGroqModel}
                  sendToAll={sendToAll || false}
                  setSelectedGroqModel={setSelectedGroqModel}
                />
                {setSendToAll !== undefined && (
                  <div className="flex items-center gap-1.5 px-2">
                    <Switch
                      checked={sendToAll || false}
                      onCheckedChange={(checked: boolean) => {
                        setSendToAll(checked);
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Aethra</span>
                  </div>
                )}
              </>
            ) : (
              <ModelSelectorCompact
                onModelChange={onModelChange}
                selectedModelId={selectedModelId}
              />
            )}
          </PromptInputTools>

          <div className="flex items-center gap-1">
            <MicrophoneButton
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              onClick={handleMicrophoneClick}
              status={status}
            />
            {status === "submitted" ? (
              <StopButton setMessages={setMessages} stop={stop} />
            ) : (
              <PromptInputSubmit
                className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                disabled={!input.trim() || uploadQueue.length > 0}
                status={status}
              >
                <ArrowUpIcon size={14} />
              </PromptInputSubmit>
            )}
          </div>
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }
    if (prevProps.sendToAll !== nextProps.sendToAll) {
      return false;
    }
    if (prevProps.selectedGroqModel !== nextProps.selectedGroqModel) {
      return false;
    }

    return true;
  }
);

function PureAttachmentsButton({
  fileInputRef,
  status,
  selectedModelId,
  sendToAll,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>["status"];
  selectedModelId: string;
  sendToAll?: boolean;
}) {
  const isReasoningModel = selectedModelId === "chat-model-reasoning";
  // Solo deshabilitar si el status no está listo o es un modelo de razonamiento
  // Si sendToAll está activo, solo enviará a modelos con vision
  const isDisabled = status !== "ready" || isReasoningModel;

  return (
    <Button
      className={`aspect-square h-8 rounded-lg p-1 transition-colors ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'
      }`}
      data-testid="attachments-button"
      disabled={isDisabled}
      onClick={(event) => {
        event.preventDefault();
        if (!isDisabled) {
          fileInputRef.current?.click();
        }
      }}
      variant="ghost"
    >
      <PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureModelSelectorCompact({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  const [optimisticModelId, setOptimisticModelId] = useState(selectedModelId);

  useEffect(() => {
    setOptimisticModelId(selectedModelId);
  }, [selectedModelId]);

  const selectedModel = chatModels.find(
    (model) => model.id === optimisticModelId
  );

  return (
    <PromptInputModelSelect
      onValueChange={(modelName) => {
        const model = chatModels.find((m) => m.name === modelName);
        if (model) {
          setOptimisticModelId(model.id);
          onModelChange?.(model.id);
          startTransition(() => {
            saveChatModelAsCookie(model.id);
          });
        }
      }}
      value={selectedModel?.name}
    >
      <Trigger
        className="flex h-8 items-center gap-2 rounded-lg border-0 bg-background px-2 text-foreground shadow-none transition-colors hover:bg-accent focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        type="button"
      >
        <CpuIcon size={16} />
        <span className="hidden font-medium text-xs sm:block">
          {selectedModel?.name}
        </span>
        <ChevronDownIcon size={16} />
      </Trigger>
      <PromptInputModelSelectContent className="min-w-[260px] p-0">
        <div className="flex flex-col gap-px">
          {chatModels.map((model) => (
            <SelectItem key={model.id} value={model.name}>
              <div className="truncate font-medium text-xs">{model.name}</div>
              <div className="mt-px truncate text-[10px] text-muted-foreground leading-tight">
                {model.description}
              </div>
            </SelectItem>
          ))}
        </div>
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  );
}

const ModelSelectorCompact = memo(PureModelSelectorCompact);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  return (
    <Button
      className="size-7 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureGroqModelSelector({
  selectedGroqModel,
  setSelectedGroqModel,
  groqModels,
  sendToAll,
  attachments,
}: {
  selectedGroqModel: any;
  setSelectedGroqModel: (model: any) => void;
  groqModels: any[];
  sendToAll: boolean;
  attachments: Attachment[];
}) {
  // En modo individual (NO Omnicall):
  // - Con imágenes: SOLO modelos de visión (Llama)
  // - Sin imágenes: SOLO modelos de texto (sin Llama)
  // En modo Omnicall: selector deshabilitado, no importa
  const availableModels = !sendToAll
    ? attachments.length > 0
      ? groqModels.filter((m) => m.supportsVision) // Con imágenes: solo Llama
      : groqModels.filter((m) => !m.supportsVision) // Sin imágenes: sin Llama
    : groqModels; // Omnicall: todos (pero el selector está deshabilitado)

  return (
    <PromptInputModelSelect
      onValueChange={(modelName) => {
        const model = availableModels.find((m) => m.name === modelName);
        if (model) {
          setSelectedGroqModel(model);
        }
      }}
      value={selectedGroqModel?.name}
    >
      <Trigger
        className={`flex h-8 items-center gap-1 rounded-lg border-0 bg-background px-2 shadow-none transition-colors focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
          sendToAll
            ? 'text-muted-foreground opacity-50 cursor-not-allowed'
            : 'text-foreground hover:bg-accent'
        }`}
        disabled={sendToAll}
        type="button"
      >
        <div className="flex-shrink-0">
          <CpuIcon size={14} />
        </div>
        <span className="font-medium text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-none">
          {selectedGroqModel?.name || "Modelo"}
        </span>
        <div className="flex-shrink-0">
          <ChevronDownIcon size={14} />
        </div>
      </Trigger>
      <PromptInputModelSelectContent className="min-w-[260px] p-0">
        <div className="flex flex-col gap-px">
          {availableModels.map((model) => (
            <SelectItem key={model.id} value={model.name}>
              <div className="truncate font-medium text-xs">{model.name}</div>
              <div className="mt-px truncate text-[10px] text-muted-foreground leading-tight">
                {model.id}
              </div>
            </SelectItem>
          ))}
        </div>
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  );
}

const GroqModelSelector = memo(PureGroqModelSelector);

function PureMicrophoneButton({
  isRecording,
  isTranscribing,
  onClick,
  status,
}: {
  isRecording: boolean;
  isTranscribing: boolean;
  onClick: () => void;
  status: UseChatHelpers<ChatMessage>["status"];
}) {
  const isDisabled = status !== "ready" && !isRecording;

  return (
    <Button
      className={`size-8 rounded-full transition-colors duration-200 ${
        isRecording
          ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
          : isTranscribing
          ? 'bg-muted text-muted-foreground cursor-wait'
          : isDisabled
          ? 'bg-muted text-muted-foreground cursor-not-allowed'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
      data-testid="microphone-button"
      disabled={isDisabled && !isRecording}
      onClick={(event) => {
        event.preventDefault();
        if (!isDisabled || isRecording) {
          onClick();
        }
      }}
      type="button"
      variant="ghost"
    >
      <MicrophoneIcon size={14} />
    </Button>
  );
}

const MicrophoneButton = memo(PureMicrophoneButton);
