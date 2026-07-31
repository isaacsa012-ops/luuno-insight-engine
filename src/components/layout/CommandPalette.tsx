import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_ITEMS } from "./SidebarNav";
import { useStore } from "@/lib/store";
import { AUDIT_SECTIONS, STATUS_LABEL } from "@/lib/domain";

export function CommandPalette({
  open,
  onOpenChange,
  onQuickCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuickCreate: () => void;
}) {
  const navigate = useNavigate();
  const { prospects } = useStore();

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search prospects, sections and actions…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Prospects">
          {prospects.map((p) => (
            <CommandItem
              key={p.id}
              value={[
                p.company,
                p.industry,
                p.owner,
                STATUS_LABEL[p.status],
                p.notes,
                p.outreachAngle,
                ...p.whyNow,
                ...Object.values(p.research),
                ...AUDIT_SECTIONS.flatMap((s) => [
                  p.audit[s.key].observation,
                  p.audit[s.key].recommendation,
                ]),
              ].join(" ")}
              onSelect={() => {
                onOpenChange(false);
                void navigate({ to: "/prospects/$prospectId", params: { prospectId: p.id } });
              }}
            >
              <span className="truncate">{p.company}</span>
              <span className="ml-auto text-[11px] text-subtle">{STATUS_LABEL[p.status]}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.to} value={item.label} onSelect={() => go(item.to)}>
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="new prospect create"
            onSelect={() => {
              onOpenChange(false);
              onQuickCreate();
            }}
          >
            Create prospect
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
