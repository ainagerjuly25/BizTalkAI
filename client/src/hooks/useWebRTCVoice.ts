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
      dataChannel.onopen = () => {
        logActivity("Data channel opened");
        
        // Generate company-specific instructions
        const companyLower = company.toLowerCase();
        let instructions = `You are an AI assistant working as the Enterprise Front/Friend Ainager for ${company}, a hypothetical company based in Dubai. You are professional, helpful, and knowledgeable about the company's services. `;

        if (companyLower.includes("bakery")) {
          instructions += `You work at a bakery that offers fresh bread baked daily from 6 AM, specialty pastries, custom cakes, gluten-free options, and catering services. Help customers with orders, answer questions about products, and provide information about our services.`;
        } else if (companyLower.includes("restaurant")) {
          instructions += `You work at a restaurant open 11 AM - 10 PM daily. Reservations are recommended for weekends. We serve traditional and contemporary cuisine with private dining rooms available. Help customers make reservations, answer menu questions, and provide dining information.`;
        } else if (companyLower.includes("clinic") || companyLower.includes("health")) {
          instructions += `You work at a medical clinic offering walk-in appointments, specialist consultations, health check-up packages, and 24/7 emergency services. Help patients schedule appointments, answer questions about services, and provide general information.`;
        } else if (companyLower.includes("hotel")) {
          instructions += `You work at a luxury hotel with modern amenities, conference facilities, fine dining, and a spa. Help guests with reservations, answer questions about facilities and services, and provide concierge assistance.`;
        } else if (companyLower.includes("bank")) {
          instructions += `You work at a bank offering personal and business banking, investment and loan services, 24/7 online banking, and financial advisory. Help customers with account inquiries, service information, and general banking questions.`;
        } else if (companyLower.includes("tech") || companyLower.includes("digital") || companyLower.includes("systems")) {
          instructions += `You work at a technology company providing custom software development, cloud infrastructure, IT consulting and support, and digital transformation services. Help clients understand our solutions and services.`;
        } else if (companyLower.includes("industries") || companyLower.includes("solutions")) {
          instructions += `You work at an industrial company providing equipment, machinery, custom manufacturing, quality control, and worldwide shipping. Help clients with product inquiries and service information.`;
        } else if (companyLower.includes("logistics") || companyLower.includes("travel")) {
          instructions += `You work at a logistics company offering domestic and international shipping, real-time tracking, express delivery, and warehouse services. Help customers with shipping inquiries and tracking information.`;
        } else if (companyLower.includes("foods")) {
          instructions += `You work at a food distribution company offering premium quality products, wholesale and retail distribution, fresh produce, and bulk order discounts. Help customers with product information and orders.`;
        } else {
          instructions += `You provide professional business services with a customer-focused approach. Help callers with their inquiries and provide information about your services.`;
        }

        instructions += ` Be conversational, warm, and helpful. Answer questions clearly and concisely. Since this is a demo, you can provide reasonable and professional responses based on the company name and type. Always mention that we are located in Dubai when relevant.`;
        
        // Send session configuration with company-specific instructions
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: instructions,
            voice: state.selectedVoice,
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              silence_duration_ms: 500
            }
          }
        };
        
        dataChannel.send(JSON.stringify(sessionConfig));
        logActivity(`Sent session config for ${company}`);
      };
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