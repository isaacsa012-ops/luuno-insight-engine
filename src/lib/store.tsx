import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SEED_PROSPECTS, emptyAudit, emptyPipeline } from "./domain";
import type { ActivityEntry, Prospect } from "./types";

const STORAGE_KEY = "luuno.growth-engine.v1";

/**
 * Local persistence layer.
 *
 * Supabase-ready: every mutation below is a single-entity operation keyed by
 * prospect id, so each function maps 1:1 onto a `prospects` table row update.
 * Swapping this provider for server functions requires no component changes.
 */
interface StoreValue {
  prospects: Prospect[];
  activity: ActivityEntry[];
  hydrated: boolean;
  getProspect: (id: string) => Prospect | undefined;
  updateProspect: (id: string, patch: Partial<Prospect>) => void;
  createProspect: (input: NewProspectInput) => Prospect;
  deleteProspect: (id: string) => void;
  logActivity: (prospectId: string, label: string) => void;
  reset: () => void;
}

export interface NewProspectInput {
  company: string;
  owner: string;
  industry: string;
  website: string;
  email: string;
  opportunityValue: number;
}

const StoreContext = createContext<StoreValue | null>(null);

const nowId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const emptyResearch = () => ({
  businessSummary: "",
  customerJourney: "",
  strengths: "",
  weaknesses: "",
  bottlenecks: "",
  opportunities: "",
  recommendation: "",
});

function buildProspect(input: NewProspectInput): Prospect {
  const at = new Date().toISOString();
  return {
    id: nowId(),
    company: input.company,
    owner: input.owner,
    industry: input.industry,
    employees: 0,
    website: input.website,
    phone: "",
    email: input.email,
    techStack: [],
    opportunityValue: input.opportunityValue,
    status: "researching",
    priority: "medium",
    confidence: 25,
    whyNow: [],
    whyNowNarrative: "",
    research: emptyResearch(),
    audit: emptyAudit(),
    notes: "",
    attachments: [],
    timeline: [{ id: nowId(), at, kind: "system", label: "Prospect created" }],
    pipeline: emptyPipeline(),
    currentOps: [
      { id: "web", label: "Website" },
      { id: "phone", label: "Phone" },
      { id: "crm", label: "CRM" },
      { id: "email", label: "Email" },
    ],
    nextFollowUp: null,
    createdAt: at,
    closedMrr: 0,
    repliedAt: null,
    outreachAngle: "",
  };
}

interface Persisted {
  prospects: Prospect[];
  activity: ActivityEntry[];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [prospects, setProspects] = useState<Prospect[]>(SEED_PROSPECTS);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        if (Array.isArray(parsed.prospects) && parsed.prospects.length) {
          setProspects(parsed.prospects);
          setActivity(parsed.activity ?? []);
        }
      }
    } catch {
      /* corrupted local state falls back to seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ prospects, activity }));
    } catch {
      /* storage quota — non fatal */
    }
  }, [prospects, activity, hydrated]);

  const logActivity = useCallback((prospectId: string, label: string) => {
    setProspects((current) => {
      const company = current.find((p) => p.id === prospectId)?.company ?? "Unknown";
      setActivity((entries) =>
        [{ id: nowId(), at: new Date().toISOString(), prospectId, company, label }, ...entries].slice(0, 60),
      );
      return current;
    });
  }, []);

  const updateProspect = useCallback((id: string, patch: Partial<Prospect>) => {
    setProspects((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const createProspect = useCallback(
    (input: NewProspectInput) => {
      const prospect = buildProspect(input);
      setProspects((current) => [prospect, ...current]);
      setActivity((entries) =>
        [
          {
            id: nowId(),
            at: new Date().toISOString(),
            prospectId: prospect.id,
            company: prospect.company,
            label: "Prospect created",
          },
          ...entries,
        ].slice(0, 60),
      );
      return prospect;
    },
    [],
  );

  const deleteProspect = useCallback((id: string) => {
    setProspects((current) => current.filter((p) => p.id !== id));
  }, []);

  const reset = useCallback(() => {
    setProspects(SEED_PROSPECTS);
    setActivity([]);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      prospects,
      activity,
      hydrated,
      getProspect: (id: string) => prospects.find((p) => p.id === id),
      updateProspect,
      createProspect,
      deleteProspect,
      logActivity,
      reset,
    }),
    [prospects, activity, hydrated, updateProspect, createProspect, deleteProspect, logActivity, reset],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
