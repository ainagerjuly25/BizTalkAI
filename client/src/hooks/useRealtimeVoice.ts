import { useEffect, useRef, useState, useCallback } from "react";

type ConnectionState = "idle" | "connecting" | "connected" | "error";
type ConversationState = "idle" | "listening" | "speaking";

interface UseRealtimeVoiceProps {
  company: string;
  enabled: boolean;
}

export function useRealtimeVoice({ company, enabled }: UseRealtimeVoiceProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [conversationState, setConversationState] = useState<ConversationState>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  const startMicrophone = useCallback(async () => {
    try {
      await initAudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;
      const audioContext = audioContextRef.current!;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(2048, 1, 1);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          const base64Audio = btoa(
            String.fromCharCode(...Array.from(new Uint8Array(pcm16.buffer)))
          );

          wsRef.current.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64Audio,
            })
          );
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      processorRef.current = processor;
    } catch (error) {
      console.error("Microphone error:", error);
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      
      setConnectionState("error");
      
      if (errMsg.includes("Permission denied") || errMsg.includes("NotAllowedError")) {
        setErrorMessage("Microphone access denied. Please allow microphone permissions and try again.");
      } else if (errMsg.includes("NotFoundError") || errMsg.includes("not found")) {
        setErrorMessage("No microphone found. Please connect a microphone and try again.");
      } else {
        setErrorMessage("Failed to access microphone. Please check your device settings.");
      }
      
      // Close WebSocket since we can't use voice without microphone
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }, [initAudioContext]);

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pcm16 = new Int16Array(bytes.buffer);
    audioQueueRef.current.push(pcm16);

    if (!isPlayingRef.current) {
      playNextChunk();
    }
  }, []);

  const playNextChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const pcm16 = audioQueueRef.current.shift()!;
    const audioContext = audioContextRef.current!;

    const audioBuffer = audioContext.createBuffer(1, pcm16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => playNextChunk();
    source.start();
  }, []);

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState("connecting");
    setErrorMessage("");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/realtime?company=${encodeURIComponent(company)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log("WebSocket connected, starting microphone...");
      setConnectionState("connected");
      try {
        await startMicrophone();
        console.log("Microphone started successfully");
      } catch (error) {
        console.error("Failed to start microphone:", error);
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "session.created":
            console.log("Session created:", message.session.id);
            break;

          case "input_audio_buffer.speech_started":
            setConversationState("listening");
            break;

          case "input_audio_buffer.speech_stopped":
            setConversationState("idle");
            // Commit the audio buffer and request a response
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({ type: "input_audio_buffer.commit" })
              );
              wsRef.current.send(
                JSON.stringify({
                  type: "response.create",
                  response: {
                    modalities: ["text", "audio"],
                  },
                })
              );
            }
            break;

          case "response.audio.delta":
            setConversationState("speaking");
            playAudioChunk(message.delta);
            break;

          case "response.audio.done":
            setConversationState("idle");
            break;

          case "response.audio_transcript.delta":
            setTranscript((prev) => prev + message.delta);
            break;

          case "response.audio_transcript.done":
            break;

          case "error":
            console.error("OpenAI error:", message.error);
            
            // Ignore empty buffer errors - they happen when VAD triggers but user hasn't spoken enough
            if (message.error?.code === "input_audio_buffer_commit_empty") {
              console.log("Ignoring empty buffer error - waiting for more audio");
              setConversationState("idle");
              break;
            }
            
            // Handle other errors
            setConnectionState("error");
            if (message.error?.message) {
              setErrorMessage(`AI service error: ${message.error.message}`);
            } else {
              setErrorMessage("An error occurred with the AI service. Please try again.");
            }
            break;
        }
      } catch (error) {
        console.error("Message parse error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionState("error");
      setErrorMessage("Connection failed. Please check your internet connection and try again.");
      cleanup();
      wsRef.current = null;
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      // Only reset to idle if there's no error
      setConnectionState((prev) => prev === "error" ? "error" : "idle");
      setConversationState("idle");
      cleanup();
      wsRef.current = null;
    };
  }, [company, startMicrophone, playAudioChunk, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState("idle");
    setConversationState("idle");
    setTranscript("");
    setErrorMessage("");
  }, [cleanup]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connectionState,
    conversationState,
    transcript,
    errorMessage,
    connect,
    disconnect,
  };
}
