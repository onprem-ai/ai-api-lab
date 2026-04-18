import { useRef } from 'react';

interface SystemPromptInputProps {
  value: string;
  onChange: (value: string) => void;
}

/** Shared system prompt textarea used across LLM pages */
export function SystemPromptInput({ value, onChange }: SystemPromptInputProps) {
  return (
    <div className="mb-4">
      <h2 className="text-xs font-semibold mb-1 text-subtle">System Prompt</h2>
      <textarea
        className="w-full h-12 p-2 border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        placeholder="Enter system prompt (optional)..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface UserPromptInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional ref for keyboard shortcut support */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
}

/** Shared user prompt textarea used across LLM pages */
export function UserPromptInput({ value, onChange, textareaRef, placeholder }: UserPromptInputProps) {
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef ?? fallbackRef;

  return (
    <div className="mb-4">
      <h2 className="text-xs font-semibold mb-1 text-subtle">User Prompt</h2>
      <textarea
        ref={ref}
        className="w-full h-36 p-2 border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        placeholder={placeholder ?? "Paste or type your text here..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface MaxTokensInputProps {
  value: number;
  onChange: (value: number) => void;
}

/** Shared max tokens number input used across LLM pages */
export function MaxTokensInput({ value, onChange }: MaxTokensInputProps) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground text-subtle">
        Max Tokens
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 p-2 border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
