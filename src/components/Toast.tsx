import { CheckCircle2, XCircle } from "lucide-react";

export type ToastMessage = { id: number; type: "success" | "error"; text: string };

export function Toasts({ messages }: { messages: ToastMessage[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] grid w-[min(420px,calc(100vw-2rem))] gap-2">
      {messages.map((message) => (
        <div
          key={message.id}
          className="flex items-start gap-3 rounded-lg border border-line bg-white p-4 text-sm shadow-soft"
        >
          {message.type === "success" ? <CheckCircle2 className="text-green-600" size={20} /> : <XCircle className="text-red-600" size={20} />}
          <span>{message.text}</span>
        </div>
      ))}
    </div>
  );
}
