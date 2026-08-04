import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Pencil } from "lucide-react";

interface EditableTextProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  rows?: number;
}

/** Inline edit-in-place field. Commits on blur or Cmd/Ctrl+Enter. */
export function EditableText({
  value,
  onChange,
  placeholder = "Not documented",
  multiline = false,
  className,
  rows = 5,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "group -mx-2 flex w-[calc(100%+1rem)] items-start gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-surface-raised",
          className,
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 text-[13px] leading-relaxed",
            value ? "text-muted-foreground" : "text-subtle italic",
          )}
        >
          {value ? <BulletAware text={value} /> : placeholder}
        </span>
        <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }

  const shared =
    "w-full rounded-[8px] border border-border-strong bg-background px-2.5 py-2 text-[13px] leading-relaxed text-foreground outline-none focus:border-subtle";

  return (
    <div className="-mx-2">
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          rows={rows}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
          }}
          className={cn(shared, "resize-y")}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
            if (e.key === "Enter") commit();
          }}
          className={shared}
        />
      )}
      <div className="mt-1 flex items-center gap-1 px-0.5 text-[11px] text-subtle">
        <Check className="h-3 w-3" />
        {multiline ? "⌘↵ to save · Esc to cancel" : "↵ to save · Esc to cancel"}
      </div>
    </div>
  );
}

export function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
      <p className="label-caps pt-1.5">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}


/**
 * Read-mode renderer: lines beginning with "-", "*" or a number become a
 * proper bullet list; everything else stays as prose. Editing is untouched —
 * the raw text keeps its markers so the parse/edit round-trip is lossless.
 */
function BulletAware({ text }: { text: string }) {
  const lines = text.split("\n");
  const bulletish = lines.filter((l) => /^\s*([-*\u2022]|\d+[.)])\s+/.test(l)).length;
  if (bulletish < 2) return <span className="whitespace-pre-wrap">{text}</span>;
  return (
    <span className="block space-y-1.5">
      {lines
        .filter((l) => l.trim())
        .map((l, i) => {
          const m = l.match(/^\s*(?:[-*\u2022]|\d+[.)])\s+(.*)$/);
          return m ? (
            <span key={i} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-border-strong" />
              <span className="min-w-0">{m[1]}</span>
            </span>
          ) : (
            <span key={i} className="block">{l}</span>
          );
        })}
    </span>
  );
}
