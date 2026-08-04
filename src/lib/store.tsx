import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SEED_PROSPECTS, emptyPipeline, normalizeProspect } from "./domain";
import { DEFAULT_EMAIL_TEMPLATE } from "./research";
import { supabase, supabaseEnabled } from "./supabase";
import type { ActivityEntry, Prospect, TimelineEvent, WorkspaceSettings } from "./types";

const STORAGE_KEY = "luuno.growth-engine.v2";

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  weeklyOutreachGoal: 10,
  weekStart: "monday",
  senderName: "Isaac",
  senderCompany: "Luuno",
  bookingUrl: "https://app.flozy.com/#/bookings/invite-hdywym240m4rlihr5",
  websiteUrl: "https://www.luuno.ai",
  emailTemplate: DEFAULT_EMAIL_TEMPLATE,
};

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
  settings: WorkspaceSettings;
  hydrated: boolean;
  getProspect: (id: string) => Prospect | undefined;
  updateProspect: (id: string, patch: Partial<Prospect>) => void;
  createProspect: (input: NewProspectInput) => Prospect;
  deleteProspect: (id: string) => void;
  logActivity: (prospectId: string, label: string) => void;
  addTimelineEvent: (prospectId: string, event: Omit<TimelineEvent, "id" | "at">) => void;
  updateSettings: (patch: Partial<WorkspaceSettings>) => void;
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

function buildProspect(input: NewProspectInput): Prospect {
  const at = new Date().toISOString();
  return normalizeProspect({
    id: nowId(),
    company: input.company,
    owner: input.owner,
    industry: input.industry,
    website: input.website,
    email: input.email,
    opportunityValue: input.opportunityValue,
    status: "researching",
    timeline: [{ id: nowId(), at, kind: "system", label: "Prospect created" }],
    pipeline: emptyPipeline(),
    currentOps: [
      { id: "web", label: "Website" },
      { id: "phone", label: "Phone" },
      { id: "crm", label: "CRM" },
      { id: "email", label: "Email" },
    ],
    createdAt: at,
    research: {},
  });
}

interface Persisted {
  prospects: Prospect[];
  activity: ActivityEntry[];
  settings?: WorkspaceSettings;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [prospects, setProspects] = useState<Prospect[]>(SEED_PROSPECTS);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // Tracks the JSON last written to Supabase per prospect id, so pushes only
  // touch rows that actually changed. null until the first remote load.
  const syncedRef = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    if (supabaseEnabled && supabase) {
      let cancelled = false;
      (async () => {
        const [{ data: rows }, { data: acts }, { data: cfg }] = await Promise.all([
          supabase.from("prospects").select("id, data").order("updated_at", { ascending: false }),
          supabase.from("activity").select("*").order("at", { ascending: false }).limit(60),
          supabase.from("workspace_settings").select("data").eq("id", 1).maybeSingle(),
        ]);
        if (cancelled) return;
        const synced = new Map<string, string>();
        const remote = (rows ?? []).map((r) => {
          const p = normalizeProspect(r.data as Partial<Prospect> & { id: string });
          synced.set(p.id, JSON.stringify(p));
          return p;
        });
        syncedRef.current = synced;
        // Shared DB is the source of truth. An empty DB starts empty — the
        // demo seed companies never sync to the team workspace.
        setProspects(remote);
        setActivity(
          (acts ?? []).map((a) => ({
            id: a.id as string,
            at: a.at as string,
            prospectId: a.prospect_id as string,
            company: a.company as string,
            label: a.label as string,
          })),
        );
        if (cfg?.data) setSettings({ ...DEFAULT_SETTINGS, ...(cfg.data as WorkspaceSettings) });
        setHydrated(true);
      })().catch(() => setHydrated(true));
      return () => {
        cancelled = true;
      };
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        if (Array.isArray(parsed.prospects) && parsed.prospects.length) {
          setProspects(parsed.prospects.map((p) => normalizeProspect(p)));
          setActivity(parsed.activity ?? []);
        }
        if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
      }
    } catch {
      /* corrupted local state falls back to seed */
    }
    setHydrated(true);
  }, []);

  // Push prospect changes to Supabase, debounced. Only rows whose serialized
  // form changed are written; rows that disappeared locally are deleted.
  useEffect(() => {
    if (!supabaseEnabled || !supabase || !hydrated || !syncedRef.current) return;
    const timer = setTimeout(async () => {
      const synced = syncedRef.current!;
      const seen = new Set<string>();
      const upserts: { id: string; company: string; data: Prospect }[] = [];
      for (const p of prospects) {
        seen.add(p.id);
        const json = JSON.stringify(p);
        if (synced.get(p.id) !== json) {
          upserts.push({ id: p.id, company: p.company, data: p });
          synced.set(p.id, json);
        }
      }
      const removed = [...synced.keys()].filter((id) => !seen.has(id));
      for (const id of removed) synced.delete(id);
      if (upserts.length) await supabase!.from("prospects").upsert(upserts);
      if (removed.length) await supabase!.from("prospects").delete().in("id", removed);
    }, 700);
    return () => clearTimeout(timer);
  }, [prospects, hydrated]);

  useEffect(() => {
    if (!supabaseEnabled || !supabase || !hydrated || !syncedRef.current) return;
    const latest = activity[0];
    if (!latest) return;
    supabase
      .from("activity")
      .upsert({
        id: latest.id,
        at: latest.at,
        prospect_id: latest.prospectId,
        company: latest.company,
        label: latest.label,
      })
      .then(undefined, () => undefined);
  }, [activity, hydrated]);

  useEffect(() => {
    if (!supabaseEnabled || !supabase || !hydrated || !syncedRef.current) return;
    const timer = setTimeout(() => {
      supabase!
        .from("workspace_settings")
        .upsert({ id: 1, data: settings })
        .then(undefined, () => undefined);
    }, 700);
    return () => clearTimeout(timer);
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated || supabaseEnabled) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ prospects, activity, settings }));
    } catch {
      /* storage quota — non fatal */
    }
  }, [prospects, activity, settings, hydrated]);

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

  const addTimelineEvent = useCallback(
    (prospectId: string, event: Omit<TimelineEvent, "id" | "at">) => {
      const entry: TimelineEvent = { id: nowId(), at: new Date().toISOString(), ...event };
      setProspects((current) =>
        current.map((p) => (p.id === prospectId ? { ...p, timeline: [entry, ...p.timeline] } : p)),
      );
    },
    [],
  );

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

  const updateSettings = useCallback((patch: Partial<WorkspaceSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setProspects(SEED_PROSPECTS);
    setActivity([]);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      prospects,
      activity,
      settings,
      hydrated,
      getProspect: (id: string) => prospects.find((p) => p.id === id),
      updateProspect,
      createProspect,
      deleteProspect,
      logActivity,
      addTimelineEvent,
      updateSettings,
      reset,
    }),
    [
      prospects,
      activity,
      settings,
      hydrated,
      updateProspect,
      createProspect,
      deleteProspect,
      logActivity,
      addTimelineEvent,
      updateSettings,
      reset,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
