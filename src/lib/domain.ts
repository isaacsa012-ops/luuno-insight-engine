import type {
  ResearchSection,
  Audit,
  AuditSectionKey,
  PipelineStepKey,
  Priority,
  Prospect,
  ProspectStatus,
} from "./types";

export const STATUS_LABEL: Record<ProspectStatus, string> = {
  researching: "Researching",
  audit_ready: "Audit Ready",
  video_pending: "Video Pending",
  outreach_sent: "Outreach Sent",
  follow_up: "Follow Up",
  call_booked: "Call Booked",
  proposal: "Proposal",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const STATUS_ORDER: ProspectStatus[] = [
  "researching",
  "audit_ready",
  "video_pending",
  "outreach_sent",
  "follow_up",
  "call_booked",
  "proposal",
  "closed_won",
  "closed_lost",
];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const AUDIT_SECTIONS: { key: AuditSectionKey; label: string; brief: string }[] = [
  { key: "visibility", label: "Visibility", brief: "Discoverability across search, maps and referral surfaces." },
  { key: "lead_capture", label: "Lead Capture", brief: "How inbound intent is converted into structured records." },
  { key: "customer_journey", label: "Customer Journey", brief: "The path from first contact to delivered outcome." },
  { key: "sales_process", label: "Sales Process", brief: "Qualification, quoting and decision cadence." },
  { key: "communication", label: "Communication", brief: "Response times, channels and message consistency." },
  { key: "automation", label: "Automation", brief: "Work currently performed manually that should not be." },
  { key: "operations", label: "Operations", brief: "Scheduling, dispatch, fulfilment and handoffs." },
  { key: "reporting", label: "Reporting", brief: "Visibility into pipeline, capacity and revenue." },
  { key: "customer_experience", label: "Customer Experience", brief: "Perceived quality across the entire relationship." },
];

export const PIPELINE_STEPS: { key: PipelineStepKey; label: string }[] = [
  { key: "research", label: "Research" },
  { key: "audit", label: "Audit" },
  { key: "video_recorded", label: "Video Recorded" },
  { key: "email_ready", label: "Email Ready" },
  { key: "pdf_attached", label: "PDF Attached" },
  { key: "email_sent", label: "Email Sent" },
  { key: "follow_up", label: "Follow Up" },
  { key: "discovery_call", label: "Discovery Call" },
  { key: "proposal", label: "Proposal" },
  { key: "client", label: "Client" },
];

export const WHY_NOW_SIGNALS = [
  "Hiring",
  "Expanding",
  "Growing rapidly",
  "Poor customer experience",
  "Slow response time",
  "Recently raised funding",
  "Opening locations",
  "High review volume",
  "Recent leadership change",
];

export const emptyAudit = (): Audit =>
  AUDIT_SECTIONS.reduce((acc, s) => {
    acc[s.key] = { observation: "", evidence: "", opportunity: "", recommendation: "", score: 0 };
    return acc;
  }, {} as Audit);

export const emptyPipeline = (): Record<PipelineStepKey, boolean> =>
  PIPELINE_STEPS.reduce(
    (acc, s) => {
      acc[s.key] = false;
      return acc;
    },
    {} as Record<PipelineStepKey, boolean>,
  );

const audit = (rows: [AuditSectionKey, string, string, string, string, number][]): Audit => {
  const base = emptyAudit();
  for (const [key, observation, evidence, opportunity, recommendation, score] of rows) {
    base[key] = { observation, evidence, opportunity, recommendation, score };
  }
  return base;
};

const days = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

type RawSeed = Omit<Prospect, "research" | "pipeline" | "linkedin"> & { linkedin?: string } & {
  research: Partial<Prospect["research"]>;
  pipeline: Partial<Record<PipelineStepKey, boolean>>;
};

const RAW_SEEDS: RawSeed[] = [
  {
    id: "p-northline",
    company: "Northline Mechanical",
    owner: "Dale Whitcombe",
    industry: "Commercial HVAC",
    employees: 48,
    website: "northlinemech.com",
    phone: "+1 (312) 555-0148",
    email: "dale@northlinemech.com",
    techStack: ["ServiceTitan", "QuickBooks", "Gmail", "Excel", "Answering service"],
    opportunityValue: 96000,
    status: "audit_ready",
    priority: "critical",
    confidence: 82,
    whyNow: ["Hiring", "Expanding", "Slow response time"],
    whyNowNarrative:
      "Northline posted six field technician roles in the last 45 days and opened a second depot in Milwaukee. Headcount is being used to absorb coordination load that software should be handling. Inbound calls outside business hours route to an answering service with no structured capture, so growth is compounding the leak rather than closing it.",
    research: {
      businessSummary:
        "Family-owned commercial HVAC contractor operating across Illinois and southern Wisconsin. Roughly 70% recurring maintenance contracts, 30% emergency and retrofit work. Revenue estimated at $11-14M with strong technician retention and a reputation for reliability on industrial sites.",
      customerJourney:
        "Facility managers call or email a shared inbox. A coordinator manually creates the job in ServiceTitan, checks technician availability in a whiteboard schedule, then calls back with a window. Post-service reporting is a PDF emailed manually, often two to four days late.",
      strengths:
        "Deep technical credibility, long-tenured technicians, strong contract renewal rate, established relationships with three large property management groups.",
      weaknesses:
        "No after-hours capture. Quoting depends on one estimator. No visibility into job margin until invoicing. Renewal reminders are manual and inconsistent.",
      bottlenecks:
        "1. Dispatch coordination is a single human bottleneck between 6am and 9am.\n2. Estimator backlog delays quotes by 4-6 business days.\n3. Service reports are compiled by hand from technician notes.",
      opportunities:
        "Automated intake and triage for after-hours calls. Quote assembly from historical job data. Automated service report generation at job close. Contract renewal sequencing.",
      recommendation:
        "Deploy an intelligence layer in front of ServiceTitan that captures every inbound signal, triages urgency, drafts quotes from historical equivalents, and generates service reports at job close. Target a 4-day reduction in quote turnaround and full after-hours capture within 60 days.",
    },
    audit: audit([
      ["visibility", "Ranks below three competitors for commercial emergency terms in Chicago metro.", "Search position 7-11 for eight priority terms; no service-area landing pages.", "Capturing emergency intent is the highest-margin inbound channel.", "Build service-area pages and structured data for each depot; instrument call tracking per source.", 54],
      ["lead_capture", "After-hours calls reach a generic answering service with no structured record.", "Answering service logs show 61 messages last month; only 34 appear in ServiceTitan.", "44% of after-hours intent is disappearing before it becomes a job.", "Automated intake that captures, classifies and writes directly into ServiceTitan with urgency scoring.", 38],
      ["customer_journey", "Facility managers receive no status updates between booking and arrival.", "Three of five reference calls cited lack of ETA visibility as the top irritant.", "Proactive status reduces inbound status calls and improves renewal sentiment.", "Automated arrival windows, technician-en-route notifications and post-job summary.", 47],
      ["sales_process", "Quoting is bottlenecked on a single estimator.", "Average quote turnaround measured at 5.4 business days across 22 sampled jobs.", "Faster quotes correlate directly with win rate in emergency and retrofit work.", "Draft quotes automatically from historical job equivalents; estimator reviews rather than builds.", 41],
      ["communication", "Shared inbox with no ownership or SLA.", "Median first response 7h 20m; 12% of threads unanswered after 48h.", "Response time is the single strongest predictor of contract award in this segment.", "Route, assign and draft first responses automatically with a 15-minute SLA.", 44],
      ["automation", "Core coordination work is manual across three disconnected tools.", "Coordinators spend an estimated 14 hours per week on data re-entry.", "Recovering coordinator capacity avoids two planned admin hires.", "Bidirectional sync between intake, ServiceTitan and QuickBooks with exception-only human review.", 33],
      ["operations", "Dispatch is scheduled on a physical whiteboard transcribed each morning.", "Observed 40-minute daily transcription window with recurring double-bookings.", "Digitised dispatch removes a daily single point of failure.", "Capacity-aware scheduling that respects certification, geography and contract priority.", 45],
      ["reporting", "No live view of pipeline, technician utilisation or job margin.", "Monthly reporting is assembled in Excel three weeks in arrears.", "Operating decisions are being made on stale data.", "Live operational dashboard with utilisation, margin and renewal exposure.", 36],
      ["customer_experience", "Service quality is high but the surrounding experience is inconsistent.", "4.3 average rating with recurring themes around communication rather than workmanship.", "Experience consistency protects the premium positioning the technical work earns.", "Standardise the communication layer end to end so experience matches craft.", 58],
    ]),
    notes:
      "Dale is engineering-minded and skeptical of software vendors. Lead with the dispatch bottleneck and the after-hours capture gap — both are measurable. Avoid the word 'AI' entirely in the first call.",
    attachments: [
      { id: "a1", name: "northline-audit-v2.pdf", kind: "pdf", size: "2.4 MB", addedAt: days(-3) },
      { id: "a2", name: "walkthrough-loom.mp4", kind: "video", size: "48 MB", addedAt: days(-2) },
      { id: "a3", name: "call-2026-07-24.m4a", kind: "recording", size: "11 MB", addedAt: days(-6) },
    ],
    timeline: [
      { id: "t1", at: days(-14), kind: "system", label: "Prospect created", detail: "Sourced from commercial HVAC hiring signal scan." },
      { id: "t2", at: days(-9), kind: "note", label: "Research completed", detail: "Bottleneck map validated against three reference calls." },
      { id: "t3", at: days(-6), kind: "call", label: "Discovery call held", detail: "42 minutes. Dale confirmed dispatch bottleneck." },
      { id: "t4", at: days(-3), kind: "status", label: "Status moved to Audit Ready" },
    ],
    pipeline: { ...emptyPipeline(), research: true, audit: true, video_recorded: true },
    currentOps: [
      { id: "web", label: "Website", sublabel: "Static, no capture" },
      { id: "phone", label: "Phone", sublabel: "Answering service" },
      { id: "crm", label: "ServiceTitan", sublabel: "Manual entry" },
      { id: "sched", label: "Scheduling", sublabel: "Whiteboard" },
      { id: "email", label: "Shared Inbox", sublabel: "No SLA" },
      { id: "team", label: "Coordinators", sublabel: "3 FTE" },
    ],
    nextFollowUp: days(1),
    createdAt: days(-14),
    closedMrr: 0,
    repliedAt: days(-7),
    outreachAngle: "Dispatch bottleneck teardown",
  },
  {
    id: "p-harborlane",
    company: "Harborlane Dental Group",
    owner: "Dr. Priya Raman",
    industry: "Multi-site Dental",
    employees: 62,
    website: "harborlanedental.com",
    phone: "+1 (617) 555-0193",
    email: "priya@harborlanedental.com",
    techStack: ["Dentrix", "Weave", "Mailchimp", "Google Workspace"],
    opportunityValue: 72000,
    status: "call_booked",
    priority: "high",
    confidence: 74,
    whyNow: ["Opening locations", "High review volume", "Recent leadership change"],
    whyNowNarrative:
      "Harborlane is opening its fifth clinic in Q4 and has just appointed a first-time Operations Director. Review volume has doubled year over year, which means front-desk load is scaling linearly with sites. This is the exact moment the coordination model breaks.",
    research: {
      businessSummary:
        "Four-location dental group in greater Boston with a fifth site under fit-out. Mix of general dentistry and higher-margin cosmetic work. Strong brand and patient loyalty; operations are run per-site rather than centrally.",
      customerJourney:
        "New patients arrive via search or referral, call the site directly, and are booked by the front desk. Recall reminders are sent by Weave. Treatment plan follow-up is inconsistent and site-dependent.",
      strengths: "Strong clinical reputation, high recall adherence, healthy cosmetic mix, motivated new Ops Director.",
      weaknesses: "No central intake. Treatment plan follow-up varies by site. No cross-site capacity balancing. Reporting is per-location.",
      bottlenecks:
        "1. Front desk answers phones while checking patients in — calls are missed at peak.\n2. Unaccepted treatment plans are not systematically pursued.\n3. No visibility into which site has open chair time.",
      opportunities:
        "Centralised intake with cross-site routing. Automated treatment plan follow-up sequencing. Unified capacity view across sites.",
      recommendation:
        "Centralise intake ahead of the fifth site opening and instrument treatment plan follow-up. Recovered unaccepted treatment alone is projected to exceed the engagement cost within one quarter.",
    },
    audit: audit([
      ["visibility", "Site-level pages compete with each other for the same terms.", "Two locations rank for identical cosmetic queries; cannibalised impressions.", "Consolidated authority would lift all five sites.", "Restructure into a hub-and-spoke location architecture.", 61],
      ["lead_capture", "Peak-hour calls are abandoned at the front desk.", "Weave logs show 18% missed call rate between 8-10am.", "Missed new-patient calls are the highest-value loss in the model.", "Central intake with overflow routing and callback guarantee.", 42],
      ["customer_journey", "Handoff between consultation and treatment scheduling is manual.", "Observed 9-day median gap between plan presentation and booking.", "Compressing that gap directly increases acceptance.", "Automated same-day plan follow-up with booking link.", 49],
      ["sales_process", "Unaccepted treatment plans are not systematically revisited.", "Dentrix shows $310k of unaccepted plans older than 90 days.", "A structured recovery sequence converts a meaningful share.", "Staged follow-up cadence with financing options surfaced automatically.", 39],
      ["communication", "Patient messaging tone and cadence vary by site.", "Audit of four sites found four different recall templates.", "Consistency is a brand asset at multi-site scale.", "Central template library with per-site personalisation tokens.", 55],
      ["automation", "Recall and reactivation run, but nothing else does.", "Only two of nine identified sequences are automated.", "Most retention value is in the seven that are not.", "Build reactivation, plan follow-up and referral sequences.", 46],
      ["operations", "Chair utilisation is managed per site with no balancing.", "Site 2 at 91% utilisation while site 4 sits at 63%.", "Balancing demand across sites adds capacity without adding cost.", "Cross-site availability surfaced at the point of booking.", 44],
      ["reporting", "Ops Director inherits no consolidated reporting.", "Board pack is manually assembled from four exports.", "New leadership needs instrumentation on day one.", "Unified group dashboard with per-site drill-down.", 35],
      ["customer_experience", "Clinical experience is excellent; administrative experience lags.", "Reviews praise clinicians, criticise phone accessibility.", "Fixing access converts sentiment into referral volume.", "Guaranteed response layer across phone, web and SMS.", 63],
    ]),
    notes: "Priya wants a board-ready artefact. Deliver the audit as a formal PDF. Ops Director is the real champion.",
    attachments: [{ id: "a4", name: "harborlane-audit-draft.pdf", kind: "pdf", size: "1.8 MB", addedAt: days(-4) }],
    timeline: [
      { id: "t5", at: days(-21), kind: "system", label: "Prospect created" },
      { id: "t6", at: days(-11), kind: "outreach", label: "Audit sent", detail: "Opened 6 times in 48 hours." },
      { id: "t7", at: days(-4), kind: "call", label: "Discovery call booked", detail: "Scheduled with Priya and Ops Director." },
    ],
    pipeline: {
      ...emptyPipeline(),
      research: true,
      audit: true,
      video_recorded: true,
      pdf_attached: true,
      email_sent: true,
      follow_up: true,
    },
    currentOps: [
      { id: "web", label: "Website", sublabel: "Per-site pages" },
      { id: "phone", label: "Front Desk", sublabel: "18% missed" },
      { id: "crm", label: "Dentrix", sublabel: "Per-site instance" },
      { id: "sched", label: "Scheduling", sublabel: "Site-local" },
      { id: "email", label: "Mailchimp", sublabel: "Recall only" },
      { id: "support", label: "Weave", sublabel: "SMS reminders" },
    ],
    nextFollowUp: days(2),
    createdAt: days(-21),
    closedMrr: 0,
    repliedAt: days(-9),
    outreachAngle: "Fifth-site readiness review",
  },
  {
    id: "p-castellan",
    company: "Castellan Logistics",
    owner: "Marcus Oyelaran",
    industry: "Regional Freight",
    employees: 130,
    website: "castellanlogistics.com",
    phone: "+1 (404) 555-0177",
    email: "marcus@castellanlogistics.com",
    techStack: ["Samsara", "NetSuite", "Outlook", "Custom TMS"],
    opportunityValue: 180000,
    status: "closed_won",
    priority: "high",
    confidence: 91,
    whyNow: ["Recently raised funding", "Growing rapidly"],
    whyNowNarrative:
      "Castellan closed a $14M growth round in May with a mandate to double lanes without doubling back-office headcount. The custom TMS is capable but every exception is resolved by a human reading email.",
    research: {
      businessSummary:
        "Regional LTL and dedicated freight operator across the southeast. 130 employees, 84 tractors, custom-built TMS with a competent internal engineering team.",
      customerJourney:
        "Shippers email or call for capacity. Ops quotes manually, books the lane, and communicates exceptions by phone. Proof of delivery is uploaded by drivers and reconciled by billing.",
      strengths: "Strong engineering culture, owned TMS, funded growth mandate, excellent on-time performance.",
      weaknesses: "Exception handling is entirely human. Quoting is tribal knowledge. Billing reconciliation lags 9 days.",
      bottlenecks: "1. Exception triage in Outlook.\n2. Manual rate quoting.\n3. POD reconciliation delay.",
      opportunities: "Exception classification and routing. Rate recommendation from historical lane data. Automated POD matching.",
      recommendation:
        "Insert an intelligence layer between inbound communication and the existing TMS. Engineering team retains ownership; Luuno supplies the routing and classification substrate.",
    },
    audit: audit([
      ["visibility", "Brand invisible outside existing shipper relationships.", "No organic presence for target lane queries.", "Inbound capacity requests reduce broker dependency.", "Lane-level content and shipper landing surfaces.", 48],
      ["lead_capture", "Capacity requests arrive in three inboxes with no queue.", "Sampled 240 emails; 31 required a second follow-up to be actioned.", "Unqueued demand becomes lost capacity.", "Unified intake queue with SLA and automated acknowledgement.", 43],
      ["customer_journey", "Shippers chase status rather than receive it.", "Inbound status calls average 46 per day.", "Proactive status removes a full support load.", "Automated milestone notifications from Samsara telemetry.", 52],
      ["sales_process", "Rate quoting depends on two senior ops leads.", "Quote latency 3.1 hours median, 11 hours at p90.", "Latency loses lanes to faster brokers.", "Rate recommendation engine trained on historical lane margin.", 47],
      ["communication", "Exception communication is ad hoc and undocumented.", "No structured record of exception cause across 90 days.", "Undocumented exceptions cannot be engineered away.", "Structured exception taxonomy with automated classification.", 40],
      ["automation", "Strong systems, thin connective tissue.", "TMS is capable but fed manually at three points.", "The gap is integration, not capability.", "Event-driven integration layer across TMS, telematics and finance.", 44],
      ["operations", "Dispatch performs well; exceptions degrade it.", "On-time 94% baseline, 71% on exception days.", "Exception handling is the operational ceiling.", "Automated exception routing with escalation policy.", 58],
      ["reporting", "Lane-level margin visible only after billing close.", "9-day reconciliation lag.", "Margin decisions are made blind for nine days.", "Live lane margin with accrual-based estimates.", 41],
      ["customer_experience", "Reliable operator, opaque communicator.", "Shipper interviews cite silence during exceptions.", "Communication is the differentiator at equal service levels.", "Guaranteed proactive exception communication.", 56],
    ]),
    notes: "Signed 12-month engagement at $15k/mo. Kickoff completed. Reference candidate for freight vertical.",
    attachments: [
      { id: "a5", name: "castellan-audit-final.pdf", kind: "pdf", size: "3.1 MB", addedAt: days(-30) },
      { id: "a6", name: "signed-proposal.pdf", kind: "pdf", size: "820 KB", addedAt: days(-18) },
    ],
    timeline: [
      { id: "t8", at: days(-58), kind: "system", label: "Prospect created" },
      { id: "t9", at: days(-30), kind: "outreach", label: "Audit delivered" },
      { id: "t10", at: days(-18), kind: "status", label: "Closed won", detail: "$15,000 MRR, 12-month term." },
    ],
    pipeline: PIPELINE_STEPS.reduce(
      (acc, s) => {
        acc[s.key] = true;
        return acc;
      },
      {} as Record<PipelineStepKey, boolean>,
    ),
    currentOps: [
      { id: "web", label: "Website", sublabel: "Brochure" },
      { id: "phone", label: "Ops Line", sublabel: "3 inboxes" },
      { id: "crm", label: "Custom TMS", sublabel: "Manual feed" },
      { id: "sched", label: "Dispatch", sublabel: "Samsara" },
      { id: "email", label: "Outlook", sublabel: "Exception triage" },
      { id: "support", label: "Billing", sublabel: "NetSuite" },
    ],
    nextFollowUp: null,
    createdAt: days(-58),
    closedMrr: 15000,
    repliedAt: days(-44),
    outreachAngle: "Exception handling teardown",
  },
  {
    id: "p-verdant",
    company: "Verdant Landscape Co.",
    owner: "Sofia Marchetti",
    industry: "Commercial Grounds",
    employees: 27,
    website: "verdantgrounds.com",
    phone: "+1 (503) 555-0121",
    email: "sofia@verdantgrounds.com",
    techStack: ["Jobber", "Squarespace", "Gmail"],
    opportunityValue: 42000,
    status: "researching",
    priority: "medium",
    confidence: 46,
    whyNow: ["Growing rapidly", "Hiring"],
    whyNowNarrative:
      "Verdant added eleven commercial contracts in six months and is hiring two crew leads. Jobber is being used as a scheduler only; contract renewals and upsell are tracked in a spreadsheet.",
    research: {
      businessSummary:
        "Commercial grounds maintenance operator in the Portland metro. Contract-heavy revenue with seasonal enhancement work as the margin driver.",
      customerJourney:
        "Property managers request bids by email. Sofia walks the site, prices manually, and sends a PDF. Renewals happen by memory.",
      strengths: "Excellent crew retention, strong property manager relationships, high renewal rate.",
      weaknesses: "Bidding is entirely manual. Enhancement upsell is unsystematic. No renewal calendar.",
      bottlenecks: "1. Owner is the only estimator.\n2. Enhancement opportunities are noticed but not logged.\n3. Renewal timing is undocumented.",
      opportunities: "Bid templating from historical site data. Crew-logged enhancement opportunities. Renewal calendar with automated outreach.",
      recommendation: "Start with renewal instrumentation and enhancement capture — fastest revenue recovery with least operational change.",
    },
    audit: emptyAudit(),
    notes: "Early stage. Need to validate enhancement revenue share before committing to an audit.",
    attachments: [],
    timeline: [{ id: "t11", at: days(-4), kind: "system", label: "Prospect created" }],
    pipeline: { ...emptyPipeline(), research: true },
    currentOps: [
      { id: "web", label: "Website", sublabel: "Squarespace" },
      { id: "phone", label: "Mobile", sublabel: "Owner direct" },
      { id: "crm", label: "Jobber", sublabel: "Scheduling only" },
      { id: "email", label: "Gmail", sublabel: "Bid delivery" },
      { id: "team", label: "Crew Leads", sublabel: "4 FTE" },
    ],
    nextFollowUp: days(4),
    createdAt: days(-4),
    closedMrr: 0,
    repliedAt: null,
    outreachAngle: "Renewal calendar gap",
  },
  {
    id: "p-arclight",
    company: "Arclight Legal",
    owner: "Tomas Berger",
    industry: "Boutique Litigation",
    employees: 34,
    website: "arclightlegal.com",
    phone: "+1 (212) 555-0166",
    email: "tberger@arclightlegal.com",
    techStack: ["Clio", "Outlook", "DocuSign", "Ruby Receptionists"],
    opportunityValue: 88000,
    status: "video_pending",
    priority: "high",
    confidence: 68,
    whyNow: ["Recent leadership change", "Poor customer experience"],
    whyNowNarrative:
      "A new managing partner took over in June with an explicit mandate to fix intake. Client satisfaction scores dropped two consecutive quarters, driven entirely by responsiveness rather than case outcomes.",
    research: {
      businessSummary:
        "Boutique litigation firm in Manhattan specialising in commercial disputes. High realisation rates, strong outcomes, weak intake and client communication discipline.",
      customerJourney:
        "Referrals call the main line, are screened by an outsourced receptionist, then wait for a partner callback that averages two days.",
      strengths: "Outstanding case outcomes, premium positioning, strong referral network.",
      weaknesses: "Two-day intake latency. No conflict-check automation. Matter status updates are partner-dependent.",
      bottlenecks: "1. Partner callback latency.\n2. Manual conflict checks.\n3. No client-facing matter status.",
      opportunities: "Structured intake with conflict pre-screening. Automated matter status digests. Referral source attribution.",
      recommendation: "Instrument intake first — every day of latency measurably reduces referral conversion in this segment.",
    },
    audit: audit([
      ["visibility", "Referral-driven with no owned demand channel.", "97% of matters originate from four referral sources.", "Concentration is a structural risk.", "Build an owned channel for commercial dispute intent.", 51],
      ["lead_capture", "Outsourced receptionist captures name and number only.", "No matter type, urgency or conflict data captured at intake.", "Partners triage blind, so triage is slow.", "Structured intake capturing matter type, urgency and counterparties.", 37],
      ["customer_journey", "Clients receive no status between milestones.", "Satisfaction survey cites communication in 8 of 11 detractor responses.", "Status cadence is cheaper than any other satisfaction lever.", "Automated matter status digest on a fixed cadence.", 43],
      ["sales_process", "Engagement letters take 6 days from first call.", "Sampled 14 matters; median 6.2 days to signature.", "Latency loses matters to faster firms.", "Templated engagement generation triggered at intake approval.", 45],
      ["communication", "Partner email is the only channel.", "No shared visibility into client correspondence.", "Single-channel dependency creates bus-factor risk.", "Shared matter inbox with partner-level ownership.", 42],
      ["automation", "Clio underused; workflows run in Outlook.", "Only intake and billing modules active.", "Existing licence already covers most of the gap.", "Activate Clio workflows and layer routing on top.", 48],
      ["operations", "Conflict checks are manual across two systems.", "Average 40 minutes per new matter.", "Automated pre-screening returns partner hours.", "Automated conflict pre-check at intake.", 46],
      ["reporting", "No visibility into referral source performance.", "Attribution not recorded at intake.", "Cannot invest in what is not measured.", "Source attribution captured and reported monthly.", 33],
      ["customer_experience", "Outcomes excellent, experience inconsistent.", "NPS declined from 61 to 44 over two quarters.", "Experience decline precedes referral decline.", "Fixed communication cadence across the matter lifecycle.", 50],
    ]),
    notes: "Tomas responds well to precision and brevity. Send the audit before the video, not after.",
    attachments: [{ id: "a7", name: "arclight-intake-analysis.pdf", kind: "pdf", size: "1.2 MB", addedAt: days(-5) }],
    timeline: [
      { id: "t12", at: days(-16), kind: "system", label: "Prospect created" },
      { id: "t13", at: days(-5), kind: "note", label: "Audit drafted" },
    ],
    pipeline: { ...emptyPipeline(), research: true, audit: true },
    currentOps: [
      { id: "web", label: "Website", sublabel: "No capture" },
      { id: "phone", label: "Reception", sublabel: "Outsourced" },
      { id: "crm", label: "Clio", sublabel: "Partial use" },
      { id: "email", label: "Outlook", sublabel: "Partner-owned" },
      { id: "support", label: "DocuSign", sublabel: "Manual send" },
    ],
    nextFollowUp: days(0),
    createdAt: days(-16),
    closedMrr: 0,
    repliedAt: days(-10),
    outreachAngle: "Intake latency analysis",
  },
  {
    id: "p-meridian",
    company: "Meridian Fitness Collective",
    owner: "Ayana Cole",
    industry: "Multi-site Fitness",
    employees: 88,
    website: "meridiancollective.fit",
    phone: "+1 (720) 555-0134",
    email: "ayana@meridiancollective.fit",
    techStack: ["Mindbody", "Klaviyo", "Slack", "Shopify"],
    opportunityValue: 54000,
    status: "follow_up",
    priority: "medium",
    confidence: 57,
    whyNow: ["High review volume", "Opening locations", "Growing rapidly"],
    whyNowNarrative:
      "Meridian is opening two studios this quarter while member churn has crept from 4.1% to 6.3% monthly. Growth and leakage are happening simultaneously, which is the most expensive combination.",
    research: {
      businessSummary: "Boutique fitness group with six studios across Denver and Boulder. Membership plus retail and workshop revenue.",
      customerJourney: "Prospects book a trial online, attend, then receive a generic email sequence. Conversion to membership is handled at the front desk.",
      strengths: "Strong community brand, high trial volume, engaged instructor base.",
      weaknesses: "Trial-to-member conversion is unowned. Churn signals ignored. Retail and membership data siloed.",
      bottlenecks: "1. Trial follow-up depends on whoever is at the desk.\n2. No churn early-warning.\n3. Two studios have no dedicated manager.",
      opportunities: "Owned trial conversion sequence. Attendance-based churn prediction. Unified member value view.",
      recommendation: "Attack churn before adding studios. A 2-point churn reduction outperforms a new site opening in year one.",
    },
    audit: emptyAudit(),
    notes: "Ayana went quiet after the audit. Third follow-up should lead with the churn number, not the audit.",
    attachments: [],
    timeline: [
      { id: "t14", at: days(-33), kind: "system", label: "Prospect created" },
      { id: "t15", at: days(-19), kind: "outreach", label: "Audit sent" },
      { id: "t16", at: days(-8), kind: "outreach", label: "Follow up 2 sent" },
    ],
    pipeline: { ...emptyPipeline(), research: true, audit: true, video_recorded: true, pdf_attached: true, email_sent: true },
    currentOps: [
      { id: "web", label: "Website", sublabel: "Trial booking" },
      { id: "phone", label: "Front Desk", sublabel: "Per studio" },
      { id: "crm", label: "Mindbody", sublabel: "Bookings" },
      { id: "email", label: "Klaviyo", sublabel: "Generic flows" },
      { id: "support", label: "Shopify", sublabel: "Retail siloed" },
    ],
    nextFollowUp: days(1),
    createdAt: days(-33),
    closedMrr: 0,
    repliedAt: null,
    outreachAngle: "Churn early-warning brief",
  },
];

export const emptyResearch = (): ResearchSection => ({
  businessSummary: "",
  customerJourney: "",
  currentTechnology: "",
  strengths: "",
  weaknesses: "",
  bottlenecks: "",
  opportunities: "",
  decisionMaker: "",
  recommendation: "",
});

/**
 * Fills in any fields added after a record was created (seed data or a
 * previously persisted local record) so every prospect is fully shaped.
 */
export function normalizeProspect(raw: Partial<RawSeed> & { id: string }): Prospect {
  const research = { ...emptyResearch(), ...(raw.research ?? {}) };
  if (!research.currentTechnology) research.currentTechnology = (raw.techStack ?? []).join(", ");
  if (!research.decisionMaker && raw.owner) {
    research.decisionMaker = [raw.owner, raw.email, raw.phone].filter(Boolean).join(" · ");
  }
  return {
    id: raw.id,
    company: raw.company ?? "Untitled company",
    owner: raw.owner ?? "",
    industry: raw.industry ?? "",
    employees: raw.employees ?? 0,
    website: raw.website ?? "",
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    linkedin: raw.linkedin ?? "",
    techStack: raw.techStack ?? [],
    opportunityValue: raw.opportunityValue ?? 0,
    status: raw.status ?? "researching",
    priority: raw.priority ?? "medium",
    confidence: raw.confidence ?? 0,
    whyNow: raw.whyNow ?? [],
    whyNowNarrative: raw.whyNowNarrative ?? "",
    research,
    audit: { ...emptyAudit(), ...(raw.audit ?? {}) },
    notes: raw.notes ?? "",
    attachments: raw.attachments ?? [],
    timeline: raw.timeline ?? [],
    pipeline: { ...emptyPipeline(), ...(raw.pipeline ?? {}) },
    currentOps: raw.currentOps ?? [],
    nextFollowUp: raw.nextFollowUp ?? null,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    closedMrr: raw.closedMrr ?? 0,
    repliedAt: raw.repliedAt ?? null,
    outreachAngle: raw.outreachAngle ?? "",
  };
}

export const SEED_PROSPECTS: Prospect[] = RAW_SEEDS.map(normalizeProspect);
