import { X, Mic, MicOff, Volume2, VolumeX, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceVisualizer from "./VoiceVisualizer";
import { useState } from "react";

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
  const [state, setState] = useState<"idle" | "connecting" | "listening" | "speaking" | "error">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  if (!isOpen) return null;

  const companyInitial = company.charAt(0).toUpperCase();
  const content = getCompanyContent(company);

  const handleHangup = () => {
    setState("idle");
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
            <p className="text-[13px] text-muted-foreground">AI Assistant</p>
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

        {state === "connecting" && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
            <p className="text-sm text-center text-primary font-medium" data-testid="status-connecting">
              Connecting...
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
            <p className="text-sm text-center text-destructive font-medium" data-testid="status-error">
              Connection lost
            </p>
          </div>
        )}

        <div className="flex items-center justify-center py-8">
          <div
            className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
              state === "connecting" ? "border-primary bg-primary/10" :
              state === "listening" ? "border-primary bg-primary/20" :
              state === "speaking" ? "border-chart-2 bg-chart-2/20" :
              state === "error" ? "border-destructive bg-destructive/20" :
              "border-border bg-muted/30"
            }`}
            data-testid="visualizer-voice"
          >
            <div className="text-5xl font-bold text-foreground/60">
              {companyInitial}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 px-4 pb-6">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12"
            onClick={() => setIsMuted(!isMuted)}
            data-testid="button-mute"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="w-16 h-16 rounded-full"
            onClick={handleHangup}
            data-testid="button-hangup"
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </Button>

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

        <div className="flex-1 overflow-y-auto px-4 pb-6" data-testid="content-conversation">
          <div className="bg-muted/30 rounded-2xl p-4 mb-4">
            <p className="text-[15px] font-medium text-foreground/90">
              {content.greeting}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Info
            </h3>
            {content.info.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 bg-card/50 rounded-xl p-3 border border-border/50"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                <p className="text-[15px] text-foreground/80 flex-1">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
