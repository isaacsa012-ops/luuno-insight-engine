export type ProspectStatus =
  | "researching"
  | "audit_ready"
  | "video_pending"
  | "outreach_sent"
  | "follow_up"
  | "call_booked"
  | "proposal"
  | "closed_won"
  | "closed_lost";

export type Priority = "low" | "medium" | "high" | "critical";

export interface ResearchSection {
  businessSummary: string;
  customerJourney: string;
  currentTechnology: string;
  strengths: string;
  weaknesses: string;
  bottlenecks: string;
  opportunities: string;
  decisionMaker: string;
  recommendation: string;
}

export interface AuditItem {
  observation: string;
  evidence: string;
  opportunity: string;
  recommendation: string;
  score: number;
}

export type AuditSectionKey =
  | "visibility"
  | "lead_capture"
  | "customer_journey"
  | "sales_process"
  | "communication"
  | "automation"
  | "operations"
  | "reporting"
  | "customer_experience";

export type Audit = Record<AuditSectionKey, AuditItem>;

export interface TimelineEvent {
  id: string;
  at: string;
  kind: "system" | "note" | "outreach" | "call" | "status";
  label: string;
  detail?: string;
}

export interface Attachment {
  id: string;
  name: string;
  kind: "pdf" | "video" | "note" | "recording" | "file";
  size: string;
  addedAt: string;
}

export type PipelineStepKey =
  | "research"
  | "audit"
  | "video_recorded"
  | "email_ready"
  | "pdf_attached"
  | "email_sent"
  | "follow_up"
  | "discovery_call"
  | "proposal"
  | "client";

export type Tier = "A" | "B" | "C" | "D";

export interface WorkspaceSettings {
  weeklyOutreachGoal: number;
  weekStart: string;
  senderName: string;
  senderCompany: string;
  bookingUrl: string;
  websiteUrl: string;
  /** Outreach email body template. Tokens: {{firstName}} {{owner}} {{company}} {{industryClause}} {{bottleneck}} {{whyNow}} {{bookingUrl}} {{website}} {{senderName}} {{senderCompany}} */
  emailTemplate: string;
}

export interface OpsNode {
  id: string;
  label: string;
  sublabel?: string;
}

export interface Prospect {
  id: string;
  company: string;
  owner: string;
  industry: string;
  employees: number;
  website: string;
  location?: string;

  phone: string;
  email: string;
  linkedin: string;
  techStack: string[];
  opportunityValue: number;
  status: ProspectStatus;
  priority: Priority;
  confidence: number;
  whyNow: string[];
  whyNowNarrative: string;
  research: ResearchSection;
  audit: Audit;
  notes: string;
  attachments: Attachment[];
  timeline: TimelineEvent[];
  pipeline: Record<PipelineStepKey, boolean>;
  currentOps: OpsNode[];
  nextFollowUp: string | null;
  createdAt: string;
  closedMrr: number;
  repliedAt: string | null;
  outreachAngle: string;
}

export interface ActivityEntry {
  id: string;
  at: string;
  prospectId: string;
  company: string;
  label: string;
}
