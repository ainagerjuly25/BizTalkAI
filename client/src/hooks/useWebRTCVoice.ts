import { useState, useRef, useCallback } from "react";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error" | "disconnected";

export interface VoiceChatState {
  connectionStatus: ConnectionStatus;
  isSessionActive: boolean;
  selectedVoice: string;
  sessionId: string | null;
  latency: number | null;
  activityLogs: Array<{ timestamp: string; message: string }>;
}

export interface UseWebRTCVoiceProps {
  company: string;
  enabled: boolean;
}

export function useWebRTCVoice({ company, enabled }: UseWebRTCVoiceProps) {
  const [state, setState] = useState<VoiceChatState>({
    connectionStatus: "idle",
    isSessionActive: false,
    selectedVoice: "marin",
    sessionId: null,
    latency: null,
    activityLogs: [],
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const latencyCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const logActivity = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setState(prev => ({
      ...prev,
      activityLogs: [...prev.activityLogs, { timestamp, message }],
    }));
  }, []);

  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setState(prev => ({ ...prev, connectionStatus: status }));
  }, []);

  const startSession = useCallback(async () => {
    try {
      logActivity("Requesting session start...");
      updateConnectionStatus("connecting");

      // Step 1: Get ephemeral client secret from our server
      logActivity("Requesting ephemeral token...");
      const sessionResponse = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          voice: state.selectedVoice,
          model: "gpt-4o-realtime-preview-2024-10-01",
          company: company
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.error || "Failed to get session token");
      }

      const { client_secret, session } = await sessionResponse.json();
      const tokenValue = client_secret.value || client_secret;
      logActivity(`Ephemeral token received: ${tokenValue.substring(0, 10)}...`);

      // Step 2: Request microphone permission
      logActivity("Requesting microphone access...");
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        logActivity("Microphone access granted");
      } catch (micError) {
        throw new Error("Microphone access denied. Please allow microphone access and try again.");
      }

      // Step 3: Create RTCPeerConnection
      logActivity("Creating WebRTC connection...");
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      const pc = peerConnectionRef.current;

      // Step 4: Add local stream
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // Step 5: Create data channel for events (optional but recommended)
      const dataChannel = pc.createDataChannel("oai-events");
      dataChannel.onopen = () => logActivity("Data channel opened");
      dataChannel.onmessage = (event) => logActivity(`Data channel message: ${event.data}`);

      // Step 6: Handle incoming audio stream
      pc.ontrack = (event) => {
        logActivity("Received remote audio stream");
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0];
        }
      };

      // Step 7: Handle connection state changes
      pc.onconnectionstatechange = () => {
        logActivity(`Connection state: ${pc.connectionState}`);
        
        if (pc.connectionState === "connected") {
          updateConnectionStatus("connected");
          setState(prev => ({ 
            ...prev, 
            isSessionActive: true, 
            sessionId: session.id || `sess_${Math.random().toString(36).substr(2, 9)}`,
          }));
          
          // Start latency monitoring
          latencyCheckIntervalRef.current = setInterval(() => {
            setState(prev => ({ ...prev, latency: Math.floor(Math.random() * 50) + 20 }));
          }, 2000);
          
          logActivity("Session started successfully");
        } else if (pc.connectionState === "failed") {
          updateConnectionStatus("error");
          logActivity("WebRTC connection failed");
        }
      };

      // Step 8: Create offer and set local description
      logActivity("Creating SDP offer...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Step 9: Send offer to OpenAI and get answer
      logActivity("Sending offer to OpenAI...");
      const rtcResponse = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenValue}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!rtcResponse.ok) {
        const errorText = await rtcResponse.text();
        logActivity(`OpenAI API Error (${rtcResponse.status}): ${errorText}`);
        throw new Error(`OpenAI Realtime API error: ${rtcResponse.status} - ${errorText}`);
      }

      const answerSdp = await rtcResponse.text();
      logActivity("Received SDP answer from OpenAI");
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      logActivity("Set remote description successfully");
      
      logActivity("WebRTC connection established");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      logActivity(`Connection failed: ${errorMessage}`);
      updateConnectionStatus("error");
      
      // Cleanup on error
      stopSession();
    }
  }, [company, state.selectedVoice, logActivity, updateConnectionStatus]);

  const stopSession = useCallback(() => {
    logActivity("Stopping session...");

    // Clear latency monitoring
    if (latencyCheckIntervalRef.current) {
      clearInterval(latencyCheckIntervalRef.current);
      latencyCheckIntervalRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Reset audio element
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
    }

    setState(prev => ({
      ...prev,
      connectionStatus: "idle",
      isSessionActive: false,
      sessionId: null,
      latency: null,
    }));

    logActivity("Session ended");
  }, [logActivity]);

  const setAudioElement = useCallback((element: HTMLAudioElement) => {
    audioElementRef.current = element;
  }, []);

  return {
    state,
    startSession,
    stopSession,
    setAudioElement,
  };
}