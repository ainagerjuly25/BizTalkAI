import { X, Mic, MicOff, Volume2, VolumeX, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useWebRTCVoice } from "@/hooks/useWebRTCVoice";

interface VoiceModalProps {
  company: string;
  isOpen: boolean;
  onClose: () => void;
}

const getCompanyContent = (company: string) => {
  const companyLower = company.toLowerCase();
  
  if (companyLower.includes("bakery")) {
    return {
      greeting: "Hello! Welcome to our bakery. How can I help you today?",
      info: [
        "Fresh bread baked daily from 6 AM",
        "Specialty pastries and custom cakes available",
        "Gluten-free options on request",
        "Catering services for events"
      ]
    };
  } else if (companyLower.includes("restaurant")) {
    return {
      greeting: "Good day! Thank you for calling. What can I do for you?",
      info: [
        "Open 11 AM - 10 PM daily",
        "Reservations recommended for weekends",
        "Traditional and contemporary cuisine",
        "Private dining rooms available"
      ]
    };
  } else if (companyLower.includes("clinic") || companyLower.includes("health")) {
    return {
      greeting: "Hello, you've reached our clinic. How may I assist you?",
      info: [
        "Walk-in appointments welcome",
        "Specialist consultations available",
        "Health check-up packages offered",
        "Emergency services 24/7"
      ]
    };
  } else if (companyLower.includes("hotel")) {
    return {
      greeting: "Welcome! Thank you for contacting us. How can I help?",
      info: [
        "Luxury accommodations with modern amenities",
        "Conference facilities for business events",
        "Fine dining restaurant on premises",
        "Spa and wellness center available"
      ]
    };
  } else if (companyLower.includes("bank")) {
    return {
      greeting: "Hello! You've reached our banking services. What can I help you with?",
      info: [
        "Personal and business banking solutions",
        "Investment and loan services",
        "24/7 online banking available",
        "Financial advisory services"
      ]
    };
  } else if (companyLower.includes("tech") || companyLower.includes("digital") || companyLower.includes("systems")) {
    return {
      greeting: "Hi there! Welcome to our tech solutions. How can I assist?",
      info: [
        "Custom software development",
        "Cloud infrastructure solutions",
        "IT consulting and support",
        "Digital transformation services"
      ]
    };
  } else if (companyLower.includes("industries") || companyLower.includes("solutions")) {
    return {
      greeting: "Hello! Thank you for reaching out. What can I do for you?",
      info: [
        "Industrial equipment and machinery",
        "Custom manufacturing solutions",
        "Quality control and testing",
        "Worldwide shipping available"
      ]
    };
  } else if (companyLower.includes("logistics") || companyLower.includes("travel")) {
    return {
      greeting: "Welcome! How can we help with your logistics needs today?",
      info: [
        "Domestic and international shipping",
        "Real-time package tracking",
        "Express delivery options",
        "Warehouse and distribution services"
      ]
    };
  } else if (companyLower.includes("foods")) {
    return {
      greeting: "Hello! Welcome to our food services. What can I help you with?",
      info: [
        "Premium quality food products",
        "Wholesale and retail distribution",
        "Fresh produce delivered daily",
        "Bulk order discounts available"
      ]
    };
  } else {
    return {
      greeting: "Hello! Thank you for calling. How may I assist you today?",
      info: [
        "Professional business services",
        "Customer-focused solutions",
        "Quality guaranteed",
        "Serving the community since years"
      ]
    };
  }
};

export default function VoiceModal({ company, isOpen, onClose }: VoiceModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const transcriptionEndRef = useRef<HTMLDivElement>(null);

  const { 
    state,
    startSession,
    stopSession,
    setAudioElement,
    addTranscriptionMessage
  } = useWebRTCVoice({
    company,
    enabled: isOpen,
  });

  // Simple log function for debugging
  const logActivity = (message: string) => {
    console.log(`[VoiceModal] ${message}`);
  };

  // Set up audio element for playback
  useEffect(() => {
    const audioElement = document.createElement('audio');
    audioElement.autoplay = true;
    audioElement.preload = 'auto';
    audioElement.controls = false;
    audioElement.style.display = 'none';
    
    // Add to DOM so it can play audio
    document.body.appendChild(audioElement);
    setAudioElement(audioElement);
    
    return () => {
      audioElement.pause();
      audioElement.srcObject = null;
      document.body.removeChild(audioElement);
    };
  }, [setAudioElement]);

  // Auto-start session when modal opens
  useEffect(() => {
    if (isOpen && state.connectionStatus === "idle") {
      startSession();
    }
  }, [isOpen, state.connectionStatus, startSession]);

  // Add demo messages when session is connected (only for testing)
  useEffect(() => {
    if (state.connectionStatus === "connected" && state.transcription.length === 0) {
      // Don't add automatic greeting - let the real transcription handle it
      logActivity("Session connected - ready for real-time transcription");
    }
  }, [state.connectionStatus, state.transcription.length, addTranscriptionMessage]);

  // Demo function to simulate user input
  const simulateUserInput = () => {
    const userMessages = [
      "Hi, I'd like to make a reservation",
      "What are your opening hours?",
      "Do you have vegetarian options?",
      "Can I get a table for 4 people?",
      "What's your address?"
    ];
    const randomMessage = userMessages[Math.floor(Math.random() * userMessages.length)];
    addTranscriptionMessage("You", randomMessage);
    
    // Simulate Efa response after a delay
    setTimeout(() => {
      const efaResponses = [
        "Of course! I'd be happy to help you with that reservation.",
        "We're open from 11 AM to 10 PM daily.",
        "Yes, we have several delicious vegetarian options on our menu.",
        "Absolutely! Let me check availability for 4 people.",
        "We're located at 123 Main Street, Dubai."
      ];
      const randomResponse = efaResponses[Math.floor(Math.random() * efaResponses.length)];
      addTranscriptionMessage("Efa", randomResponse);
    }, 1000);
  };


  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    transcriptionEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.transcription]);


  if (!isOpen) return null;

  const companyInitial = company.charAt(0).toUpperCase();
  const content = getCompanyContent(company);

  // Determine visual state based on connection state
  const visualState = state.connectionStatus === "connecting" 
    ? "connecting"
    : state.connectionStatus === "error"
    ? "error"
    : state.connectionStatus === "connected"
    ? "connected"
    : "idle";

  const handleHangup = () => {
    stopSession();
    onClose();
  };


  return (
    <div
      className="fixed inset-0 z-50 bg-background"
      style={{
        animation: "slideUp 300ms cubic-bezier(0.32, 0.72, 0, 1)",
      }}
      data-testid="modal-voice"
    >
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex-1">
            <h2 className="text-lg font-semibold" data-testid="text-company-name">{company}</h2>
            <p className="text-[13px] text-muted-foreground">Enterprise Friend Manager</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {state.connectionStatus === "connecting" && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
            <p className="text-sm text-center text-primary font-medium" data-testid="status-connecting">
              Connecting...
            </p>
          </div>
        )}

        {state.connectionStatus === "error" && (
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
            <p className="text-sm text-center text-destructive font-medium" data-testid="status-error">
              Connection lost. Please try again.
            </p>
          </div>
        )}

        {state.connectionStatus === "connected" && (
          <div className="px-4 py-2 bg-chart-2/10 border-b border-chart-2/20">
            <p className="text-sm text-center text-chart-2 font-medium" data-testid="status-ready">
              {isDemoMode ? "Demo Mode - Use buttons to simulate conversation" : "Connected - Start speaking!"} {state.latency && `(${state.latency}ms)`}
            </p>
          </div>
        )}

        {/* New Call Controls Layout */}
        <div className="flex items-center justify-center gap-8 py-8">
          {/* Large Green Phone Icon */}
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <Phone className="w-8 h-8 text-white" />
          </div>

          {/* Red End Call Button */}
          <Button
            variant="destructive"
            size="icon"
            className="w-16 h-16 rounded-full"
            onClick={handleHangup}
            data-testid="button-hangup"
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </Button>

          {/* Speaker Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12"
            onClick={() => setSpeakerOn(!speakerOn)}
            data-testid="button-speaker"
          >
            {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        </div>

        {/* Chat Transcript Section */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Chat transcript
            </h3>
            {/* Demo buttons for testing */}
            {process.env.NODE_ENV === 'development' && state.connectionStatus === "connected" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={simulateUserInput}
                  className="text-xs"
                >
                  🎯 Simulate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTranscriptionMessage("You", "Test user message")}
                  className="text-xs"
                >
                  👤 Test User
                </Button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {state.transcription.map((message, index) => (
              <div key={message.id} className="text-sm">
                <span className="font-medium text-foreground">
                  {message.speaker}:
                </span>
                <span 
                  className={`ml-2 ${
                    index === state.transcription.length - 1 && message.speaker === "You"
                      ? "text-red-500 underline decoration-red-500 decoration-wavy"
                      : "text-foreground"
                  }`}
                >
                  {message.text}
                </span>
              </div>
            ))}
            <div ref={transcriptionEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
