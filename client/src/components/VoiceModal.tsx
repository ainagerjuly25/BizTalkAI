import { X, Mic, MicOff, Volume2, VolumeX, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceVisualizer from "./VoiceVisualizer";
import { useState } from "react";

interface VoiceModalProps {
  company: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceModal({ company, isOpen, onClose }: VoiceModalProps) {
  const [state, setState] = useState<"idle" | "connecting" | "listening" | "speaking" | "error">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  if (!isOpen) return null;

  const companyInitial = company.charAt(0).toUpperCase();

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

        <VoiceVisualizer state={state} companyInitial={companyInitial} />

        <div className="flex items-center justify-center gap-6 px-4 py-8 pb-safe">
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
      </div>
    </div>
  );
}
