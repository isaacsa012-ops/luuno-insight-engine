import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

const FIELDS = [
  { key: "company", label: "Company", placeholder: "Northline Mechanical", required: true },
  { key: "owner", label: "Owner", placeholder: "Dale Whitcombe", required: false },
  { key: "industry", label: "Industry", placeholder: "Commercial HVAC", required: false },
  { key: "website", label: "Website", placeholder: "northlinemech.com", required: false },
  { key: "email", label: "Email", placeholder: "dale@northlinemech.com", required: false },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function QuickCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createProspect } = useStore();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    company: "",
    owner: "",
    industry: "",
    website: "",
    email: "",
  });
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.company.trim()) return;
    const prospect = createProspect({
      company: values.company.trim(),
      owner: values.owner.trim(),
      industry: values.industry.trim() || "Unclassified",
      website: values.website.trim(),
      email: values.email.trim(),
      opportunityValue: Number(value.replace(/[^0-9]/g, "")) || 0,
    });
    setValues({ company: "", owner: "", industry: "", website: "", email: "" });
    setValue("");
    onOpenChange(false);
    toast.success(`${prospect.company} added to research queue`);
    void navigate({ to: "/prospects/$prospectId", params: { prospectId: prospect.id } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[10px] border-border bg-surface sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-medium">New prospect</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="label-caps">{f.label}</span>
              <input
                autoFocus={f.key === "company"}
                required={f.required}
                value={values[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="mt-1.5 w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-subtle focus:border-border-strong"
              />
            </label>
          ))}
          <label className="block">
            <span className="label-caps">Estimated Opportunity Value</span>
            <input
              value={value}
              inputMode="numeric"
              placeholder="48000"
              onChange={(e) => setValue(e.target.value)}
              className="mt-1.5 w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] tabular-nums text-foreground outline-none transition-colors placeholder:text-subtle focus:border-border-strong"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-[8px] border border-border px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-[8px] bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create prospect
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
