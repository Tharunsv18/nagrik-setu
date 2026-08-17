import { CheckCircle2, X } from "lucide-react";
import { Button } from "./Button";

export function ToastHost({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:w-[420px]" role="status" aria-live="polite">
      <div className="flex items-start gap-3 rounded-lg border border-[#95d5a5] bg-white p-4 shadow-soft">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={20} />
        <p className="flex-1 text-sm font-medium leading-6">{message}</p>
        <Button variant="ghost" size="icon" onClick={onDismiss} aria-label="Dismiss notification" title="Dismiss">
          <X aria-hidden="true" size={18} />
        </Button>
      </div>
    </div>
  );
}
