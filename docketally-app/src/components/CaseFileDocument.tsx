"use client";

import React from "react";
import { renderMarkdown } from "@/lib/renderMarkdown";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CaseData {
  id: string;
  name: string;
  case_type: string;
  case_types: string[];
  status: string;
  employee_name: string | null;
  description: string | null;
  start_date: string | null;
  employment_end_date: string | null;
  employer: string | null;
  role: string | null;
  department: string | null;
  location: string | null;
  key_people: string | null;
  protected_classes: string[];
  impact_statement: string | null;
  case_theory_protected_activity: string | null;
  case_theory_employer_response: string | null;
  case_theory_connection: string | null;
  case_theory_outcome: string | null;
  case_status: string | null;
  open_questions: string | null;
}

interface DocketRecord {
  id: string;
  title: string;
  entry_type: string;
  event_type: string | null;
  date: string;
  time: string | null;
  narrative: string;
  people: string | null;
  facts: string | null;
  follow_up: string | null;
  employer_stated_reason: string | null;
  my_response: string | null;
}

interface VaultDocument {
  id: string;
  file_name: string;
  category: string;
  linked_record_id: string | null;
  created_at: string;
}

interface DetectedPattern {
  type: "frequency" | "event_types" | "people" | "gap" | "plan" | "escalation";
  label: string;
  detail: string;
}

interface Contradiction {
  type: "performance" | "shifting" | "exclusion" | "plan";
  detail: string;
}

interface Plan {
  id: string;
  name: string;
  plan_type?: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  plan_initiator?: string | null;
  employer_stated_reason?: string | null;
  stated_consequences?: string | null;
}

interface PlanGoal {
  id: string;
  plan_id: string;
  title?: string;
  description: string;
  success_criteria?: string | null;
  status: string;
  deadline: string | null;
  original_description: string | null;
  revised_date: string | null;
  revision_notes: string | null;
  dispute_reason?: string | null;
  original_goal_snapshot?: { title: string; description: string | null; success_criteria: string | null; deadline: string | null; frozen_at: string } | null;
  modified_at?: string | null;
}

interface PlanCheckin {
  id: string;
  plan_id: string;
  checkin_date: string;
  summary: string;
  manager_feedback: string | null;
  private_notes: string | null;
  expectations_changed?: boolean;
  expectation_change_detail?: string | null;
}

export interface CaseFileDocumentProps {
  records: DocketRecord[];
  vaultDocs: VaultDocument[];
  patterns: DetectedPattern[];
  contradictions: Contradiction[];
  linkedDocsMap: Record<string, VaultDocument[]>;
  caseData: CaseData | null;
  starredIds: Set<string>;
  keyDates: DocketRecord[];
  plans: Plan[];
  planGoals: PlanGoal[];
  planCheckins: PlanCheckin[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WARNING_TYPES = new Set(["PIP Conversation", "HR Interaction", "Incident"]);

const EVENT_TYPE_LABELS: Record<string, string> = {
  internal_report: "Internal Report",
  policy_concern: "Policy Concern",
  escalation: "Escalation",
  response: "Response",
  adverse_action: "Adverse Action",
  evidence_created: "Evidence Created",
  protected_activity: "Protected Activity",
};

const EVENT_TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  internal_report: { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" },
  policy_concern: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  escalation: { bg: "#FFFBEB", text: "#D97706", border: "#FCD34D" },
  response: { bg: "#F5F5F4", text: "#57534E", border: "#D6D3D1" },
  adverse_action: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  evidence_created: { bg: "#F0FDFA", text: "#0D9488", border: "#99F6E4" },
  protected_activity: { bg: "#FAF5FF", text: "#7E22CE", border: "#D8B4FE" },
};

const STATUS_CHIP_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Active documentation": { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  "Preparing for counsel": { bg: "#FFFBEB", text: "#D97706", border: "#FCD34D" },
  "Filed with EEOC": { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  "Referred to attorney": { bg: "#FAF5FF", text: "#7E22CE", border: "#D8B4FE" },
  "Resolved": { bg: "#F5F5F4", text: "#57534E", border: "#D6D3D1" },
};

interface LegalContextCard {
  title: string;
  description: string;
  source: string;
  documentation: string[];
}

/**
 * Resolves which legal context cards to show based on case_types + protected_classes.
 * Some combinations produce a specific card (e.g. Discrimination + Race),
 * while standalone case types produce their own card.
 */
function resolveLegalCards(caseTypes: string[], protectedClasses: string[]): LegalContextCard[] {
  const cards: LegalContextCard[] = [];
  const usedTypes = new Set<string>();

  // Discrimination + specific protected class combos
  if (caseTypes.includes("Discrimination")) {
    usedTypes.add("Discrimination");

    if (protectedClasses.includes("Race") || protectedClasses.includes("Color")) {
      cards.push({
        title: "Title VII of the Civil Rights Act of 1964 (Race/Color)",
        description: "Title VII prohibits employers with 15 or more employees from discriminating in employment based on race, color, religion, sex, and national origin. Race discrimination involves treating someone unfavorably because of their race or because of personal characteristics associated with race, such as hair texture, skin color, or certain facial features. Title VII prohibits race and color discrimination in every aspect of employment, including hiring, firing, pay, job assignments, promotions, training, and any other term or condition of employment.",
        source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
        documentation: [
          "Records of adverse employment actions and their timing",
          "Performance evaluations before and after protected activity",
          "How similarly situated employees outside the protected class were treated",
          "Communications about job performance or workplace concerns",
          "Any policies or practices that disproportionately affect a particular racial group",
        ],
      });
    }

    if (protectedClasses.includes("Sex") || protectedClasses.includes("Gender") || protectedClasses.includes("Sexual Orientation") || protectedClasses.includes("Gender Identity") || protectedClasses.includes("Pregnancy")) {
      cards.push({
        title: "Title VII of the Civil Rights Act of 1964 (Sex)",
        description: "Title VII makes it illegal to discriminate against a person on the basis of sex, including pregnancy, sexual orientation, and transgender status. This covers the full spectrum of employment decisions, including recruitment, hiring, promotion, compensation, and termination. It is also unlawful to harass a person because of that person's sex.",
        source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
        documentation: [
          "Records of differential treatment compared to employees of a different sex",
          "Communications reflecting sex-based assumptions or stereotypes",
          "Timeline of employment actions",
          "Performance history",
          "Evidence of policies applied inconsistently based on sex",
        ],
      });
    }

    if (protectedClasses.includes("Age")) {
      cards.push({
        title: "Age Discrimination in Employment Act of 1967 (ADEA)",
        description: "The ADEA protects people who are 40 or older from discrimination because of age. The law applies to employers with 20 or more employees and covers hiring, firing, pay, job assignments, promotions, training, and other terms and conditions of employment.",
        source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
        documentation: [
          "Records of age-related comments or assumptions",
          "Comparison of treatment with younger employees in similar roles",
          "Timeline of employment actions",
          "Performance evaluations",
          "Evidence of patterns in hiring or termination by age",
        ],
      });
    }

    if (protectedClasses.includes("Disability")) {
      cards.push({
        title: "Title I of the Americans with Disabilities Act of 1990 (ADA)",
        description: "The ADA makes it illegal to discriminate against a person with a disability in private companies and state and local governments. The law requires employers to provide reasonable accommodations to qualified employees or applicants with disabilities, unless doing so would cause undue hardship.",
        source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
        documentation: [
          "Records of accommodation requests and employer responses",
          "Medical documentation if relevant",
          "Communications about the disability or accommodation process",
          "Timeline of employment actions after disclosure or request",
          "Evidence of how employees without disabilities were treated in similar situations",
        ],
      });
    }

    if (protectedClasses.includes("Religion")) {
      cards.push({
        title: "Title VII of the Civil Rights Act of 1964 (Religion)",
        description: "Title VII prohibits employment discrimination based on religion. This includes treating someone unfavorably because of their religious beliefs, requiring employees to participate or not participate in religious activities, and failing to reasonably accommodate sincerely held religious beliefs unless doing so would cause undue hardship.",
        source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
        documentation: [
          "Records of accommodation requests and employer responses",
          "Communications about religious practices or observances",
          "Timeline of any changes in treatment",
          "Evidence of how similar requests from other employees were handled",
        ],
      });
    }

    if (protectedClasses.includes("National Origin")) {
      cards.push({
        title: "Title VII of the Civil Rights Act of 1964 (National Origin)",
        description: "Title VII prohibits discrimination based on national origin, which includes treating someone unfavorably because they are from a particular country or part of the world, because of their ethnicity or accent, or because they appear to be of a certain ethnic background.",
        source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
        documentation: [
          "Records of comments or actions related to national origin, accent, or ethnicity",
          "Comparison of treatment with employees of different national origins",
          "English-only policies or language-related requirements",
          "Timeline of employment actions",
        ],
      });
    }

    // Fallback: Discrimination selected but no matching protected class combo produced a card
    if (cards.length === 0) {
      cards.push({
        title: "Title VII of the Civil Rights Act of 1964",
        description: "Title VII prohibits employers with 15 or more employees from discriminating in employment based on race, color, religion, sex, and national origin. The law covers hiring, firing, pay, job assignments, promotions, training, and any other term or condition of employment.",
        source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
        documentation: [
          "Records of adverse employment actions and their timing",
          "Performance evaluations before and after protected activity",
          "How similarly situated employees were treated",
          "Communications about job performance or workplace concerns",
        ],
      });
    }
  }

  // Standalone case type cards
  for (const ct of caseTypes) {
    if (usedTypes.has(ct)) continue;
    usedTypes.add(ct);
    const card = STANDALONE_LEGAL_CARDS[ct];
    if (card) cards.push(card);
  }

  return cards;
}

const STANDALONE_LEGAL_CARDS: Record<string, LegalContextCard> = {
  "Wrongful Termination": {
    title: "Wrongful Termination Protections",
    description: "Wrongful termination may occur when an employee is fired in violation of federal, state, or local anti-discrimination laws, in breach of an employment agreement, or in retaliation for exercising a legal right. Multiple federal statutes enforced by the EEOC protect employees from discriminatory discharge.",
    source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
    documentation: [
      "Timeline of events leading to termination",
      "Performance evaluations and disciplinary actions",
      "Whether stated reasons for termination were consistent over time",
      "Communications about job performance before and after protected activity",
      "Employment agreements or handbook provisions",
    ],
  },
  Harassment: {
    title: "Harassment / Hostile Work Environment",
    description: "Harassment is unwelcome conduct based on race, color, religion, sex, national origin, age, disability, or genetic information. Harassment becomes unlawful when enduring the offensive conduct becomes a condition of continued employment, or the conduct is severe or pervasive enough to create a work environment that a reasonable person would consider intimidating, hostile, or abusive.",
    source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
    documentation: [
      "Records of specific incidents with dates, times, and witnesses",
      "Reports made to employer or HR",
      "Employer response to complaints",
      "Evidence of whether conduct was ongoing or escalating",
      "Records of how the conduct affected work performance or conditions",
    ],
  },
  Retaliation: {
    title: "Anti-Retaliation Protections",
    description: "All of the laws enforced by the EEOC prohibit retaliation. It is illegal for an employer to retaliate against someone who files a charge of discrimination, participates in a discrimination investigation or proceeding, or opposes discrimination. Retaliation includes any adverse action that might deter a reasonable person from engaging in protected activity.",
    source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
    documentation: [
      "Records of the protected activity (complaint, report, or participation)",
      "Timeline of employer actions after the protected activity",
      "Comparison of treatment before and after",
      "Communications suggesting awareness of the protected activity",
      "Evidence of any stated reasons for adverse actions",
    ],
  },
  Whistleblower: {
    title: "Whistleblower Protections",
    description: "Federal and state whistleblower statutes protect employees who report illegal activity, safety violations, or other workplace misconduct. Protections apply to both internal reports and reports to government agencies. Multiple federal laws prohibit retaliation against employees who raise concerns about unlawful practices.",
    source: "U.S. Equal Employment Opportunity Commission and Department of Labor",
    documentation: [
      "Records of what was reported and to whom",
      "Evidence that the employer was aware of the report",
      "Timeline of any changes in treatment after reporting",
      "Comparison of treatment before and after protected activity",
      "Written communications about the reported concerns",
    ],
  },
  "PIP Dispute": {
    title: "Performance Improvement Plan Documentation",
    description: "While performance improvement plans are a standard management tool, they can also be used as a pretext for discrimination or retaliation. When a PIP follows protected activity such as a discrimination complaint or accommodation request, the timing and circumstances may be relevant to an employment claim.",
    source: "General employment law context",
    documentation: [
      "Records of performance evaluations before and after the PIP",
      "Whether the PIP criteria are specific and measurable",
      "Timeline of events leading to the PIP",
      "Evidence of how other employees with similar performance were treated",
      "Any changes to PIP goals or deadlines",
    ],
  },
  "Hostile Work Environment": {
    title: "Hostile Work Environment Standards",
    description: "A hostile work environment exists when unwelcome conduct based on a protected characteristic is severe or pervasive enough to create a work environment that a reasonable person would consider intimidating, hostile, or abusive. The employer may be liable if it knew or should have known about the harassment and failed to take prompt corrective action.",
    source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
    documentation: [
      "Records of specific incidents with dates and details",
      "Evidence that the conduct was based on a protected characteristic",
      "Reports made to employer and employer response",
      "Whether the conduct was ongoing or escalating",
      "Impact on work performance or conditions",
    ],
  },
  "Wage & Hour": {
    title: "Fair Labor Standards Act (FLSA) and Equal Pay",
    description: "The Equal Pay Act of 1963 makes it illegal to pay different wages to men and women if they perform equal work in the same workplace. The FLSA establishes minimum wage, overtime pay, and other labor standards. State laws may provide additional wage and hour protections.",
    source: "U.S. Equal Employment Opportunity Commission and Department of Labor",
    documentation: [
      "Pay records and comparisons with similarly situated employees",
      "Job descriptions and actual duties performed",
      "Records of hours worked and overtime",
      "Communications about compensation decisions",
      "Evidence of pay policies and how they are applied",
    ],
  },
  "Wage and Hour": {
    title: "Fair Labor Standards Act (FLSA) and Equal Pay",
    description: "The Equal Pay Act of 1963 makes it illegal to pay different wages to men and women if they perform equal work in the same workplace. The FLSA establishes minimum wage, overtime pay, and other labor standards. State laws may provide additional wage and hour protections.",
    source: "U.S. Equal Employment Opportunity Commission and Department of Labor",
    documentation: [
      "Pay records and comparisons with similarly situated employees",
      "Job descriptions and actual duties performed",
      "Records of hours worked and overtime",
      "Communications about compensation decisions",
      "Evidence of pay policies and how they are applied",
    ],
  },
  "ADA / Accommodation": {
    title: "ADA Reasonable Accommodation",
    description: "The ADA requires employers to provide reasonable accommodations to qualified employees or applicants with disabilities, unless doing so would cause undue hardship. A reasonable accommodation is any change in the work environment or in the way things are customarily done that enables a person with a disability to enjoy equal employment opportunities.",
    source: "U.S. Equal Employment Opportunity Commission (eeoc.gov)",
    documentation: [
      "Records of accommodation requests and employer responses",
      "The interactive process communications",
      "Medical documentation if relevant",
      "Timeline of events after the request",
      "Evidence of how similar requests were handled for other employees",
    ],
  },
  "FMLA Violation": {
    title: "Family and Medical Leave Act (FMLA)",
    description: "The FMLA entitles eligible employees of covered employers to take unpaid, job-protected leave for specified family and medical reasons. It is unlawful for an employer to interfere with, restrain, or deny the exercise of any right provided under FMLA, or to retaliate against an employee for exercising FMLA rights.",
    source: "U.S. Department of Labor",
    documentation: [
      "Records of leave requests and employer responses",
      "Communications about leave eligibility",
      "Timeline of employment actions before and after leave",
      "Evidence of how other employees' leave requests were handled",
      "Documentation of any changes to position or responsibilities after return",
    ],
  },
  "FMLA / Leave": {
    title: "Family and Medical Leave Act (FMLA)",
    description: "The FMLA entitles eligible employees of covered employers to take unpaid, job-protected leave for specified family and medical reasons. It is unlawful for an employer to interfere with, restrain, or deny the exercise of any right provided under FMLA, or to retaliate against an employee for exercising FMLA rights.",
    source: "U.S. Department of Labor",
    documentation: [
      "Records of leave requests and employer responses",
      "Communications about leave eligibility",
      "Timeline of employment actions before and after leave",
      "Evidence of how other employees' leave requests were handled",
      "Documentation of any changes to position or responsibilities after return",
    ],
  },
  General: {
    title: "General Workplace Documentation",
    description: "Thorough workplace documentation can be relevant to multiple legal theories. Maintaining accurate, contemporaneous records of workplace events, communications, and decisions supports any future evaluation of employment rights.",
    source: "General employment law context",
    documentation: [
      "Records of workplace events with dates, times, and participants",
      "Communications about job performance and responsibilities",
      "Evidence of workplace policies and how they are applied",
      "Timeline of significant employment decisions",
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveTypes(c: { case_types?: string[]; case_type?: string } | null): string[] {
  if (!c) return ["General"];
  if (c.case_types && c.case_types.length > 0) return c.case_types;
  if (c.case_type) return [c.case_type];
  return ["General"];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000
  );
}

/** Returns positive days or null if dates are inverted */
function safeDaysBetween(a: string, b: string): number | null {
  const d = daysBetween(a, b);
  return d >= 0 ? d : null;
}

/** Assign sequential R-001, R-002 IDs to records sorted by date */
function assignRecordIds(records: DocketRecord[]): Map<string, string> {
  const sorted = [...records].sort(
    (a, b) => new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime()
  );
  const map = new Map<string, string>();
  sorted.forEach((r, i) => {
    map.set(r.id, `R-${String(i + 1).padStart(3, "0")}`);
  });
  return map;
}

/** Assign global exhibit letters A, B, C... to all linked vault docs across records */
function assignExhibitLetters(
  records: DocketRecord[],
  linkedDocsMap: Record<string, VaultDocument[]>
): Map<string, string> {
  const sorted = [...records].sort(
    (a, b) => new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime()
  );
  const map = new Map<string, string>();
  let idx = 0;
  for (const record of sorted) {
    const docs = linkedDocsMap[record.id] || [];
    for (const doc of docs) {
      if (!map.has(doc.id)) {
        let label = "";
        let n = idx;
        do {
          label = String.fromCharCode(65 + (n % 26)) + label;
          n = Math.floor(n / 26) - 1;
        } while (n >= 0);
        map.set(doc.id, label);
        idx++;
      }
    }
  }
  return map;
}

/** Truncate text to N sentences. Returns truncated text and whether truncation occurred. */
function truncateToSentences(text: string, max: number): { text: string; truncated: boolean } {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return { text, truncated: false };
  if (sentences.length <= max) return { text, truncated: false };
  return { text: sentences.slice(0, max).join(" ").trim(), truncated: true };
}

/** Get up to 2-character initials from a name */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Parse comma-separated people string into array of trimmed names */
function parsePeopleList(peopleStr: string | null): string[] {
  if (!peopleStr) return [];
  return peopleStr
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Find record IDs that may support a given pattern (best-effort heuristic) */
function findSupportingRecordIds(
  pattern: DetectedPattern,
  records: DocketRecord[],
  recordIdMap: Map<string, string>
): string[] {
  const ids = new Set<string>();

  switch (pattern.type) {
    case "people": {
      const namePart = pattern.label.split(/[-:,]/)[0].trim().toLowerCase();
      if (namePart) {
        for (const r of records) {
          if (r.people && r.people.toLowerCase().includes(namePart)) {
            const rid = recordIdMap.get(r.id);
            if (rid) ids.add(rid);
          }
        }
      }
      break;
    }
    case "event_types": {
      // All records contribute to the event types breakdown
      for (const r of records) {
        const rid = recordIdMap.get(r.id);
        if (rid) ids.add(rid);
      }
      break;
    }
    case "frequency": {
      const text = (pattern.label + " " + pattern.detail).toLowerCase();
      for (const r of records) {
        if (text.includes(r.entry_type.toLowerCase())) {
          const rid = recordIdMap.get(r.id);
          if (rid) ids.add(rid);
        }
      }
      break;
    }
    default:
      break;
  }

  return Array.from(ids);
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const dLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
  color: "#292524",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 4,
};

const subsectionLabel: React.CSSProperties = {
  ...dLabel,
  marginTop: 16,
  marginBottom: 6,
};

const purposeStatement: React.CSSProperties = {
  fontSize: 13,
  fontStyle: "italic",
  color: "#78716C",
  lineHeight: 1.6,
  marginBottom: 24,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CaseFileDocument({
  records,
  vaultDocs,
  patterns,
  contradictions,
  linkedDocsMap,
  caseData,
  starredIds,
  keyDates,
  plans,
  planGoals,
  planCheckins,
}: CaseFileDocumentProps) {
  /* Computed values */
  const today = new Date();
  const genDate = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const genTime = today.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime()
  );
  const sortedDates = sortedRecords.map((r) => r.date);
  const firstDate = sortedDates.length > 0 ? sortedDates[0] : null;
  const lastDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
  const daySpan = firstDate && lastDate ? daysBetween(firstDate, lastDate) : 0;

  const recordIdMap = assignRecordIds(records);
  const exhibitLetterMap = assignExhibitLetters(records, linkedDocsMap);

  const linkedDocs = vaultDocs.filter((d) => d.linked_record_id);

  const caseName = caseData?.name || "Case File";
  const caseTypes = resolveTypes(caseData);
  const nonGeneralTypes = caseTypes.filter((t) => t.toLowerCase() !== "general");
  const pdfSubtitle = nonGeneralTypes.length > 0 ? `${nonGeneralTypes.join(" \u00b7 ")} Case File` : "Case File";
  const protectedClasses = caseData?.protected_classes ?? [];

  /* Unique people across all records */
  const allPeopleSet = new Set<string>();
  sortedRecords.forEach((r) => {
    if (r.people) parsePeopleList(r.people).forEach((n) => allPeopleSet.add(n));
  });
  const uniquePeopleCount = allPeopleSet.size;

  /* Key people with record involvement */
  const keyPeopleList = parsePeopleList(caseData?.key_people ?? null);
  const peopleRecordMap: Record<string, string[]> = {};
  for (const person of keyPeopleList) {
    const pLower = person.toLowerCase();
    const involved: string[] = [];
    for (const r of sortedRecords) {
      if (r.people && r.people.toLowerCase().includes(pLower)) {
        const rid = recordIdMap.get(r.id);
        if (rid) involved.push(rid);
      }
    }
    peopleRecordMap[person] = involved;
  }

  /* Pattern classification: Confirmed (3+) vs Signal (<3) */
  const classifiedPatterns = patterns.map((p) => {
    const countMatch = p.detail.match(/(\d+)\s+record/i);
    const count = countMatch ? parseInt(countMatch[1], 10) : 0;
    const isConfirmed = count >= 3;
    return { ...p, count, isConfirmed };
  });
  const confirmedCount = classifiedPatterns.filter((p) => p.isConfirmed).length;
  const signalCount = classifiedPatterns.filter((p) => !p.isConfirmed).length;

  /* Executive summary computed values */
  const coreSummary = caseData?.description ? truncateToSentences(caseData.description, 3) : null;
  const caseStatus = caseData?.case_status || "Active documentation";
  const statusChipStyle = STATUS_CHIP_STYLES[caseStatus] || { bg: "#F5F5F4", text: "#57534E", border: "#D6D3D1" };

  /* ---------------------------------------------------------------- */
  /*  Reusable pieces                                                  */
  /* ---------------------------------------------------------------- */

  const runningHeader = (
    <div style={{ marginBottom: 28 }}>
      <div style={{ height: 4, background: "#22C55E", marginBottom: 12 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #D6D3D1" }}>
        <div>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 800, color: "#292524" }}>Docket</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 800, color: "#22C55E" }}>Ally</span>
        </div>
        <span style={{ fontSize: 13, color: "#44403C" }}>Confidential - Prepared for Attorney Review</span>
      </div>
    </div>
  );

  const sectionHeading = (num: number, title: string) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: "#A8A29E", fontFamily: "var(--font-serif)" }}>{num}</span>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#292524", fontFamily: "var(--font-serif)" }}>{title}</span>
      </div>
      <div style={{ width: 32, height: 3, background: "#22C55E", borderRadius: 2 }} />
    </div>
  );

  const pageFooter = (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#78716C", paddingTop: 20, borderTop: "1px solid #D6D3D1", marginTop: 40 }}>
      <span>Generated {genDate} at {genTime}</span>
      <span>Confidential - Prepared for Attorney Review</span>
    </div>
  );

  /** Render a person avatar pill (black circle with green initials + name) */
  const personPill = (name: string, idx: number) => (
    <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px 2px 2px", borderRadius: 20, background: "#F5F5F4", border: "1px solid #E7E5E4", fontSize: 12 }}>
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#1c1917", color: "#22C55E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
        {getInitials(name)}
      </span>
      <span style={{ fontWeight: 500 }}>{name}</span>
    </span>
  );

  /* Build TOC items (all sections always listed) */
  const tocItems: { n: string; t: string; indent?: boolean }[] = [
    { n: "", t: "Executive Summary" },
    { n: "1", t: "Case Summary" },
    { n: "2", t: "Protected Rights and Legal Context" },
    { n: "3", t: `Timeline of Events (${records.length} record${records.length !== 1 ? "s" : ""})` },
    { n: "", t: "Chronology Table", indent: true },
    { n: "4", t: `Evidence Index (${records.length} record${records.length !== 1 ? "s" : ""}, ${linkedDocs.length} file${linkedDocs.length !== 1 ? "s" : ""})` },
    { n: "5", t: `Pattern Analysis (${confirmedCount} confirmed, ${signalCount} signal${signalCount !== 1 ? "s" : ""})` },
    { n: "6", t: "Plan and Progression" },
    { n: "7", t: "Impact Statement" },
    { n: "8", t: "Open Questions and Next Documentation Targets" },
  ];

  /* Has any case theory content */
  const hasCaseTheory = !!(caseData?.case_theory_protected_activity || caseData?.case_theory_employer_response || caseData?.case_theory_connection || caseData?.case_theory_outcome);

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "#292524", lineHeight: 1.6 }}>
      {/* ============================================================ */}
      {/*  COVER PAGE                                                    */}
      {/* ============================================================ */}
      <div style={{ padding: 56 }}>
        <div style={{ height: 4, background: "#22C55E", marginBottom: 40 }} />
        <div style={{ marginBottom: 48 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: "#292524" }}>Docket</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: "#22C55E" }}>Ally</span>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <div style={{ width: 24, height: 3, background: "#22C55E", borderRadius: 2 }} />
            <div style={{ width: 24, height: 3, background: "#22C55E", borderRadius: 2 }} />
          </div>
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 48, fontWeight: 900, color: "#292524", lineHeight: 1.1, marginBottom: 12, textDecoration: "none" }}>{caseName}</h1>
        <div style={{ width: 40, height: 3, background: "#22C55E", borderRadius: 2, marginBottom: 16 }} />
        <p style={{ fontSize: 18, color: "#292524", marginBottom: 8 }}>{pdfSubtitle}</p>

        {/* Status chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: protectedClasses.length > 0 ? 8 : 32 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            padding: "5px 14px",
            borderRadius: 6,
            background: statusChipStyle.bg,
            color: statusChipStyle.text,
            border: `1px solid ${statusChipStyle.border}`,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}>
            {caseStatus}
          </span>
        </div>

        {protectedClasses.length > 0 && (
          <p style={{ fontSize: 14, color: "#57534E", marginBottom: 32 }}>Protected Classes: {protectedClasses.join(", ")}</p>
        )}

        <div style={{ maxWidth: 500 }}>
          {/* Employee name row */}
          <div style={{ display: "flex", padding: "12px 0", borderBottom: "1px solid #F5F5F4" }}>
            <div style={{ width: 180, fontSize: 13, color: "#292524", flexShrink: 0 }}>Employee</div>
            {caseData?.employee_name ? (
              <div style={{ fontSize: 15, fontWeight: 600 }}>{caseData.employee_name}</div>
            ) : (
              <div style={{ fontSize: 15, fontWeight: 400, color: "#A8A29E", fontStyle: "italic" }}>[Name not provided]</div>
            )}
          </div>
          {[
            { l: "Employer", v: caseData?.employer || "-" },
            { l: "Role", v: caseData?.role || "-" },
            { l: "Employment period", v: caseData?.start_date ? `${formatDate(caseData.start_date)} to ${caseData?.employment_end_date ? formatDate(caseData.employment_end_date) : "present"}` : "-" },
            ...(records.length >= 2 && firstDate && lastDate && daySpan > 0 ? [{ l: "Documentation coverage", v: `${formatDate(firstDate)} to ${formatDate(lastDate)} (${daySpan} days)` }] : []),
            { l: "Records", v: records.length > 0 ? `${records.length} entr${records.length !== 1 ? "ies" : "y"} over ${daySpan} days` : "-" },
            { l: "Patterns identified", v: patterns.length > 0 || contradictions.length > 0 ? `${confirmedCount} confirmed, ${signalCount} signal${signalCount !== 1 ? "s" : ""}` : "None identified" },
            { l: "Evidence files", v: linkedDocs.length > 0 ? `${linkedDocs.length} file${linkedDocs.length !== 1 ? "s" : ""} referenced` : "None linked" },
          ].map((row) => (
            <div key={row.l} style={{ display: "flex", padding: "12px 0", borderBottom: "1px solid #F5F5F4" }}>
              <div style={{ width: 180, fontSize: 13, color: "#292524", flexShrink: 0 }}>{row.l}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{row.v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40 }}>
          <div style={{ height: 1, background: "#FECACA", opacity: 0.5, marginBottom: 12 }} />
          <p style={{ fontSize: 11, color: "#292524", lineHeight: 1.6 }}>
            This document was generated by DocketAlly. It contains user-created records and is not legal advice.<br />
            DocketAlly provides documentation and risk awareness tools. Consult an employment attorney for legal guidance.
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  EXECUTIVE SUMMARY                                             */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Executive Summary</h2>
        <p style={purposeStatement}>A brief overview of the documented workplace situation.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* CORE ISSUE */}
          <div>
            <div style={dLabel}>Core Issue</div>
            {coreSummary ? (
              <p style={{ fontSize: 15, lineHeight: 1.7 }}>
                {coreSummary.text}
                {coreSummary.truncated && <span style={{ color: "#78716C", fontStyle: "italic" }}> Full details in Section 1.</span>}
              </p>
            ) : (
              <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic" }}>No case description provided. See Section 1, Case Summary.</p>
            )}
          </div>

          {/* PROTECTED ACTIVITY */}
          <div>
            <div style={dLabel}>Protected Activity</div>
            {caseData?.case_theory_protected_activity ? (
              <p style={{ fontSize: 15, lineHeight: 1.7 }}>{caseData.case_theory_protected_activity}</p>
            ) : (
              <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic" }}>No protected activity documented to date.</p>
            )}
          </div>

          {/* ALLEGED ADVERSE ACTION */}
          <div>
            <div style={dLabel}>Alleged Adverse Action</div>
            {caseData?.case_theory_employer_response ? (
              <p style={{ fontSize: 15, lineHeight: 1.7 }}>{caseData.case_theory_employer_response}</p>
            ) : (
              <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic" }}>No adverse employment action documented to date.</p>
            )}
          </div>

          {/* CURRENT STATUS */}
          <div>
            <div style={dLabel}>Current Status</div>
            <p style={{ fontSize: 15, lineHeight: 1.7 }}>{caseStatus}</p>
          </div>

          {/* DOCUMENTATION SCOPE */}
          <div>
            <div style={dLabel}>Documentation Scope</div>
            <p style={{ fontSize: 15, lineHeight: 1.7 }}>
              {records.length} record{records.length !== 1 ? "s" : ""} over {daySpan} day{daySpan !== 1 ? "s" : ""}, {linkedDocs.length} exhibit{linkedDocs.length !== 1 ? "s" : ""}, {patterns.length + contradictions.length} pattern{patterns.length + contradictions.length !== 1 ? "s" : ""} identified ({confirmedCount} confirmed, {signalCount} signal{signalCount !== 1 ? "s" : ""})
            </p>
          </div>
        </div>

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  TABLE OF CONTENTS                                             */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 800, marginBottom: 32 }}>Contents</h2>
        {tocItems.map((item, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #F5F5F4", paddingLeft: item.indent ? 48 : 0 }}>
            <span style={{ width: item.n ? 48 : 0, fontSize: 16, fontWeight: 700, color: "#22C55E", flexShrink: 0 }}>{item.n}</span>
            <span style={{ fontSize: 15, fontWeight: item.indent ? 500 : 600, color: item.indent ? "#57534E" : "#292524" }}>{item.t}</span>
          </div>
        ))}
        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 1: CASE SUMMARY                                       */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(1, "Case Summary")}

        {/* 2-column metadata grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {[
            { l: "Employer", v: caseData?.employer || "-" },
            { l: "Role", v: caseData?.role || "-" },
            { l: "Employment Start", v: caseData?.start_date ? formatDate(caseData.start_date) : "-" },
            { l: "Employment End", v: caseData?.employment_end_date ? formatDate(caseData.employment_end_date) : "Current" },
            { l: "Department", v: caseData?.department || "-" },
            { l: "Location", v: caseData?.location || "-" },
          ].map((item, i) => (
            <div key={item.l} style={{ padding: "14px 0", borderBottom: "1px solid #F5F5F4", paddingRight: i % 2 === 0 ? 24 : 0 }}>
              <div style={dLabel}>{item.l}</div>
              <div style={{ fontSize: 15 }}>{item.v}</div>
            </div>
          ))}
        </div>

        {/* Key People - structured list */}
        <div style={{ marginTop: 28 }}>
          <div style={dLabel}>Key People</div>
          {keyPeopleList.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: keyPeopleList.length > 4 ? "1fr 1fr" : "1fr", gap: 0, marginTop: 8 }}>
              {keyPeopleList.map((person, i) => {
                const involvedIds = peopleRecordMap[person] || [];
                return (
                  <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #F5F5F4", paddingRight: i % 2 === 0 && keyPeopleList.length > 4 ? 24 : 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{person}</span>
                    {involvedIds.length > 0 && (
                      <span style={{ fontSize: 12, color: "#78716C", fontFamily: "var(--font-mono)", marginLeft: 8 }}>
                        Involved in {involvedIds.join(", ")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic", marginTop: 4 }}>No key individuals identified for this case.</p>
          )}
        </div>

        {/*
          GUIDANCE: The Situation block should maintain a neutral documentary tone.
          When adding guidance prompts in the future, encourage:
          - Paragraph 1: objective facts (who, what, when, where)
          - Paragraph 2: what changed
          - Paragraph 3: why it raises concern
        */}
        {caseData?.description && (
          <div style={{ marginTop: 28, padding: 20, borderRadius: 8, background: "#FAFAF9", border: "1px solid #E7E5E4" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Situation</h3>
            <p style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{caseData.description}</p>
          </div>
        )}

        {/* Case Theory Box - always visible */}
        <div style={{ marginTop: 28, padding: 24, borderRadius: 10, border: "2px solid #22C55E", background: "#fff" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, color: "#15803D", marginBottom: 16 }}>Case Theory</h3>
          {hasCaseTheory ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { l: "Protected Activity", v: caseData?.case_theory_protected_activity },
                { l: "Employer Response", v: caseData?.case_theory_employer_response },
                { l: "Connection", v: caseData?.case_theory_connection },
                { l: "Outcome", v: caseData?.case_theory_outcome },
              ].map((item) => (
                <div key={item.l}>
                  <div style={{ ...dLabel, color: "#15803D", marginBottom: 6 }}>{item.l}</div>
                  {item.v ? (
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: "#292524", whiteSpace: "pre-wrap" }}>{item.v}</p>
                  ) : (
                    <p style={{ fontSize: 13, color: "#A8A29E", fontStyle: "italic" }}>Not yet documented.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic" }}>
              Case theory not yet documented as of {genDate}.
            </p>
          )}
        </div>

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 2: PROTECTED RIGHTS AND LEGAL CONTEXT                 */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(2, "Protected Rights and Legal Context")}
        <p style={purposeStatement}>
          The following legal frameworks may be relevant based on the case types and protected classes identified. This section provides general reference information about common documentation elements.
        </p>

        {/* Legal context cards - green left border, white bg */}
        {resolveLegalCards(caseTypes, protectedClasses).map((card, idx) => (
          <div key={idx} style={{ marginBottom: 16, padding: "20px 20px 20px 20px", borderRadius: 8, border: "1px solid #E7E5E4", borderLeft: "3px solid #22C55E", background: "#fff", pageBreakInside: "avoid" }}>
            <h4 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 700, color: "#292524", marginBottom: 8, lineHeight: 1.3 }}>
              {card.title}
            </h4>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#57534E", marginBottom: 14 }}>
              {card.description}
            </p>

            <div style={{ marginBottom: 10 }}>
              <div style={{ ...dLabel, color: "#57534E", marginBottom: 6 }}>Common Documentation Elements</div>
              <ul style={{ margin: 0, paddingLeft: 20, listStyleType: "disc" }}>
                {card.documentation.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.7, color: "#44403C", marginBottom: 2 }}>{item}</li>
                ))}
              </ul>
            </div>

            <div style={{ fontSize: 11, color: "#78716C", fontFamily: "var(--font-mono)", paddingTop: 8, borderTop: "1px solid #E7E5E4" }}>
              Source: {card.source}
            </div>
          </div>
        ))}

        {/* Amber disclaimer */}
        <div style={{ marginTop: 20, padding: 20, borderRadius: 10, border: "1px solid #FCD34D", background: "#FFFBEB", pageBreakInside: "avoid" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p style={{ fontSize: 12, lineHeight: 1.7, color: "#92400E", margin: 0 }}>
              This section provides general legal context based on the case types and protected classes selected by the user.
              It is not legal advice and does not constitute an attorney-client relationship.
              Definitions are sourced from the U.S. Equal Employment Opportunity Commission (eeoc.gov) and related federal agencies.
              Laws and their application vary by jurisdiction.
              An employment attorney can evaluate the specific facts of your situation.
            </p>
          </div>
        </div>

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 3: TIMELINE OF EVENTS                                 */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(3, "Timeline of Events")}
        <p style={purposeStatement}>
          All documented records in chronological order. Each record is assigned a sequential ID for cross-referencing throughout this document.
        </p>

        {sortedRecords.length === 0 ? (
          <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic" }}>
            No records have been documented for this case.
          </p>
        ) : (
          sortedRecords.map((record) => {
            const rId = recordIdMap.get(record.id) || "";
            const docsForRecord = linkedDocsMap[record.id] || [];
            const isStarred = starredIds.has(record.id);
            const etStyle = record.event_type ? EVENT_TYPE_STYLES[record.event_type] : null;
            const borderColor = record.event_type === "adverse_action" ? "#EF4444"
              : record.event_type === "protected_activity" ? "#A855F7"
              : record.event_type === "escalation" ? "#F59E0B"
              : "#22C55E";
            const people = parsePeopleList(record.people);

            return (
              <div
                key={record.id}
                style={{
                  borderLeft: `3px solid ${borderColor}`,
                  paddingLeft: 24,
                  marginBottom: 32,
                  pageBreakInside: "avoid",
                }}
              >
                {/* Record ID + Date */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#22C55E", background: "#F0FDF4", padding: "2px 8px", borderRadius: 4, border: "1px solid #BBF7D0" }}>
                    {rId}
                  </span>
                  <span style={{ fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 700, color: "#22C55E" }}>
                    {formatLongDate(record.date)}
                    {record.time && ` \u00b7 ${formatTime(record.time)}`}
                  </span>
                  {isStarred && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#D97706", fontFamily: "var(--font-mono)" }}>KEY DATE</span>
                  )}
                </div>

                {/* Entry type + Event type badge */}
                <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>{record.entry_type}</span>
                  {record.event_type && etStyle && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: `1px solid ${etStyle.border}`,
                      background: etStyle.bg,
                      color: etStyle.text,
                    }}>
                      {EVENT_TYPE_LABELS[record.event_type] || record.event_type}
                    </span>
                  )}
                  {WARNING_TYPES.has(record.entry_type) && (
                    <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>[Escalation]</span>
                  )}
                </div>

                {/* WHAT HAPPENED */}
                <div style={{ ...dLabel, marginBottom: 6 }}>What Happened</div>
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>{renderMarkdown(record.narrative)}</div>

                {/* WHO WAS PRESENT */}
                {people.length > 0 && (
                  <>
                    <div style={subsectionLabel}>Who Was Present</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {people.map((name, i) => personPill(name, i))}
                    </div>
                  </>
                )}

                {/* WHAT WAS SAID OR DECIDED */}
                {record.facts && (
                  <>
                    <div style={subsectionLabel}>What Was Said or Decided</div>
                    <div style={{ fontSize: 14, lineHeight: 1.7 }}>{renderMarkdown(record.facts)}</div>
                  </>
                )}

                {/* EMPLOYER STATED REASON - only for adverse_action with content */}
                {record.event_type === "adverse_action" && record.employer_stated_reason && (
                  <>
                    <div style={{ ...subsectionLabel, color: "#DC2626" }}>Employer Stated Reason</div>
                    <div style={{ fontSize: 14, lineHeight: 1.7 }}>{renderMarkdown(record.employer_stated_reason)}</div>
                  </>
                )}

                {/* MY RESPONSE - only when employer_stated_reason is also shown */}
                {record.event_type === "adverse_action" && record.employer_stated_reason && record.my_response && (
                  <>
                    <div style={{ ...subsectionLabel, color: "#22C55E" }}>My Response</div>
                    <div style={{ fontSize: 14, lineHeight: 1.7 }}>{renderMarkdown(record.my_response)}</div>
                  </>
                )}

                {/* WHY IT MATTERS */}
                {record.follow_up && (
                  <>
                    <div style={subsectionLabel}>Why It Matters</div>
                    <div style={{ fontSize: 14, lineHeight: 1.7 }}>{renderMarkdown(record.follow_up)}</div>
                  </>
                )}

                {/* EVIDENCE LINKED - always shown */}
                <div style={subsectionLabel}>Evidence Linked</div>
                {docsForRecord.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {docsForRecord.map((doc) => {
                      const letter = exhibitLetterMap.get(doc.id) || "?";
                      return (
                        <span
                          key={doc.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: "#F0FDF4",
                            border: "1px solid #BBF7D0",
                            fontSize: 12,
                            fontFamily: "var(--font-mono)",
                            fontWeight: 600,
                            color: "#15803D",
                          }}
                        >
                          <span style={{ fontWeight: 800 }}>Ex. {letter}</span>
                          <span style={{ color: "#57534E", fontWeight: 500, fontFamily: "var(--font-sans)" }}>{doc.file_name}</span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#A8A29E", fontStyle: "italic", margin: 0 }}>No files linked to this record.</p>
                )}
              </div>
            );
          })
        )}

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  CHRONOLOGY TABLE                                              */}
      {/* ============================================================ */}
      {sortedRecords.length > 0 && (
        <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
          {runningHeader}
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Chronology Table</h2>
          <p style={purposeStatement}>A condensed reference table of all documented events.</p>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "90px 60px 110px 110px 1fr 80px", borderBottom: "2px solid #292524", padding: "6px 0" }}>
            {["Date", "ID", "Type", "Event Tag", "Key Individuals", "Exhibits"].map((h) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "#57534E" }}>{h}</span>
            ))}
          </div>

          {/* Table rows */}
          {sortedRecords.map((record) => {
            const rId = recordIdMap.get(record.id) || "";
            const docsForRecord = linkedDocsMap[record.id] || [];
            const exhibitLabels = docsForRecord.map((d) => `Ex. ${exhibitLetterMap.get(d.id) || "?"}`).join(", ");
            const people = parsePeopleList(record.people);
            const etLabel = record.event_type ? (EVENT_TYPE_LABELS[record.event_type] || "") : "";

            return (
              <div key={record.id} style={{ display: "grid", gridTemplateColumns: "90px 60px 110px 110px 1fr 80px", borderBottom: "1px solid #F5F5F4", padding: "6px 0", pageBreakInside: "avoid" }}>
                <span style={{ fontSize: 12, color: "#292524" }}>{formatDate(record.date)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#22C55E" }}>{rId}</span>
                <span style={{ fontSize: 12 }}>{record.entry_type}</span>
                <span style={{ fontSize: 12, color: "#57534E" }}>{etLabel || "-"}</span>
                <span style={{ fontSize: 12, color: "#57534E" }}>{people.length > 0 ? people.join(", ") : "-"}</span>
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#15803D" }}>{exhibitLabels || "None"}</span>
              </div>
            );
          })}

          {pageFooter}
        </div>
      )}

      {/* ============================================================ */}
      {/*  SECTION 4: EVIDENCE INDEX                                     */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(4, "Evidence Index")}
        <p style={purposeStatement}>
          All documentation referenced in this case file. Internal records are listed automatically. Uploaded files are assigned exhibit letters.
        </p>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "70px 120px 1fr 130px", borderBottom: "2px solid #292524", padding: "10px 0" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Reference</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Type</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Description</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Date</span>
        </div>

        {/* Auto-generated record entries */}
        {sortedRecords.map((record) => {
          const rId = recordIdMap.get(record.id) || "";
          const narrativeSnippet = record.narrative.length > 60 ? record.narrative.slice(0, 60) + "..." : record.narrative;
          return (
            <div key={`rec-${record.id}`} style={{ display: "grid", gridTemplateColumns: "70px 120px 1fr 130px", borderBottom: "1px solid #F5F5F4", padding: "8px 0", pageBreakInside: "avoid" }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#22C55E" }}>{rId}</span>
              <span style={{ fontSize: 13, color: "#57534E" }}>Internal Record</span>
              <span style={{ fontSize: 13, color: "#292524" }}>{record.entry_type} - {narrativeSnippet}</span>
              <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#57534E" }}>{formatDate(record.date)}</span>
            </div>
          );
        })}

        {/* Uploaded file entries with exhibit letters */}
        {linkedDocs.map((doc) => {
          const record = sortedRecords.find((r) => r.id === doc.linked_record_id);
          const letter = exhibitLetterMap.get(doc.id) || "?";
          return (
            <div key={`doc-${doc.id}`} style={{ display: "grid", gridTemplateColumns: "70px 120px 1fr 130px", borderBottom: "1px solid #F5F5F4", padding: "8px 0", pageBreakInside: "avoid" }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#15803D" }}>Ex. {letter}</span>
              <span style={{ fontSize: 13, color: "#57534E" }}>Uploaded File</span>
              <span style={{ fontSize: 13, color: "#292524", fontWeight: 600 }}>{doc.file_name}{record ? ` (${recordIdMap.get(record.id) || ""})` : ""}</span>
              <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#57534E" }}>{record ? formatDate(record.date) : formatDate(doc.created_at.split("T")[0])}</span>
            </div>
          );
        })}

        {/* Empty state only when no records at all */}
        {sortedRecords.length === 0 && (
          <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic", marginTop: 16 }}>
            No records documented in this case file as of {genDate}.
          </p>
        )}

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 5: PATTERN ANALYSIS                                   */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(5, "Pattern Analysis")}
        <p style={purposeStatement}>
          Recurring themes identified across the documented records. Patterns supported by 3 or more records are marked Confirmed. Patterns with fewer supporting records are marked Signal.
        </p>

        {(patterns.length > 0 || contradictions.length > 0) ? (
          <>
            {/* Computed intro */}
            <p style={{ fontSize: 14, color: "#57534E", lineHeight: 1.7, marginBottom: 24 }}>
              Over the documentation coverage of {daySpan} day{daySpan !== 1 ? "s" : ""}, {records.length} record{records.length !== 1 ? "s were" : " was"} documented involving {uniquePeopleCount} individual{uniquePeopleCount !== 1 ? "s" : ""}.
            </p>

            {classifiedPatterns.map((pattern, idx) => {
              const supportingIds = findSupportingRecordIds(pattern, sortedRecords, recordIdMap);

              return (
                <div key={`p-${idx}`} style={{ padding: 20, borderRadius: 8, background: "#FAFAF9", border: "1px solid #E7E5E4", marginBottom: 16, pageBreakInside: "avoid" }}>
                  <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700 }}>{pattern.label}</span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      padding: "3px 10px",
                      borderRadius: 5,
                      background: pattern.isConfirmed ? "#FEF2F2" : "#FFFBEB",
                      border: pattern.isConfirmed ? "1px solid #FECACA" : "1px solid #FCD34D",
                      color: pattern.isConfirmed ? "#DC2626" : "#D97706",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}>
                      {pattern.isConfirmed ? "Confirmed" : "Signal"}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>{pattern.detail}</p>
                  {supportingIds.length > 0 ? (
                    <p style={{ fontSize: 12, color: "#78716C", fontFamily: "var(--font-mono)", margin: 0 }}>
                      Supported by: {supportingIds.join(", ")}
                      {!pattern.isConfirmed && ` (${supportingIds.length} of 3 records needed to confirm)`}
                    </p>
                  ) : (
                    <p style={{ fontSize: 12, color: "#A8A29E", fontStyle: "italic", margin: 0 }}>See timeline for supporting details.</p>
                  )}
                </div>
              );
            })}

            {contradictions.map((c, idx) => {
              const title = c.type === "performance" ? "Contradictory Performance Signals"
                : c.type === "shifting" ? "Shifting Expectations"
                : c.type === "exclusion" ? "Post-Complaint Changes"
                : "Plan Contradiction";

              return (
                <div key={`c-${idx}`} style={{ padding: 20, borderRadius: 8, background: "#FAFAF9", border: "1px solid #E7E5E4", borderLeft: "3px solid #F59E0B", marginBottom: 16, pageBreakInside: "avoid" }}>
                  <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700 }}>{title}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#D97706", fontFamily: "var(--font-mono)" }}>Potential Contradiction</span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>{c.detail}</p>
                  {c.type === "plan" && plans.length > 0 && (
                    <p style={{ fontSize: 12, color: "#78716C", fontFamily: "var(--font-mono)", margin: 0 }}>
                      See Section 6, Plan and Progression for related details.
                      {plans.length === 1 && ` Related plan: ${plans[0].name}`}
                    </p>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic" }}>
            No recurring patterns have been identified based on the current records. Patterns emerge as more records are documented.
          </p>
        )}

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 6: PLAN AND PROGRESSION                               */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(6, "Plan and Progression")}
        <p style={purposeStatement}>
          Active and completed plans, including goals, milestone tracking, revision history, and check-in notes.
        </p>

        {plans.length > 0 ? (
          plans.map((plan) => {
            const goals = planGoals.filter((g) => g.plan_id === plan.id);
            const checkins = planCheckins.filter((c) => c.plan_id === plan.id).sort(
              (a, b) => new Date(a.checkin_date + "T00:00:00").getTime() - new Date(b.checkin_date + "T00:00:00").getTime()
            );
            const totalDays = plan.end_date ? safeDaysBetween(plan.start_date, plan.end_date) : null;
            const elapsed = safeDaysBetween(plan.start_date, new Date().toISOString().split("T")[0]);
            const progressPct = totalDays && totalDays > 0 && elapsed !== null ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 0;
            const dateRangeInvalid = plan.end_date && safeDaysBetween(plan.start_date, plan.end_date) === null;
            const revisedGoals = goals.filter((g) => g.revised_date || g.original_description);

            const planTypeLabels: Record<string, string> = {
              development: "Development Plan",
              role_transition: "Role Transition",
              accommodation: "Reasonable Accommodation",
              return_to_work: "Return-to-Work",
              coaching: "Coaching Plan",
              pip: "Performance Improvement Plan",
              corrective: "Corrective Action",
              probation: "Probationary Period",
              retaliation: "Retaliation Monitoring",
              leave: "Leave of Absence",
              other: "Other",
            };
            const planTypeDisplay = plan.plan_type ? (planTypeLabels[plan.plan_type] || plan.plan_type.replace(/_/g, " ")) : "Plan";

            const initiatorLabels: Record<string, string> = {
              manager: "Manager",
              hr: "HR / Human Resources",
              employee: "Employee (self-initiated)",
              mutual: "Mutual agreement",
            };

            return (
              <div key={plan.id} style={{ marginBottom: 36, padding: 24, borderRadius: 10, border: "1px solid #E7E5E4", background: "#fff", pageBreakInside: "avoid" }}>

                {/* Plan Header Block */}
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: "#292524", marginBottom: 8 }}>{plan.name}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em",
                    padding: "3px 10px", borderRadius: 5, background: "#F5F5F4", border: "1px solid #E7E5E4", color: "#57534E",
                  }}>
                    {planTypeDisplay}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em",
                    padding: "3px 10px", borderRadius: 5,
                    background: plan.status === "completed" ? "#DCFCE7" : plan.status === "active" ? "#F0FDF4" : "#F5F5F4",
                    border: plan.status === "completed" ? "1px solid #86EFAC" : plan.status === "active" ? "1px solid #BBF7D0" : "1px solid #D6D3D1",
                    color: plan.status === "completed" ? "#15803D" : plan.status === "active" ? "#16A34A" : "#78716C",
                  }}>
                    {plan.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#57534E", fontFamily: "var(--font-serif)", lineHeight: 1.6, marginBottom: 4 }}>
                  {formatDate(plan.start_date)} to {plan.end_date ? formatDate(plan.end_date) : "Present"}
                  {!dateRangeInvalid && totalDays !== null && totalDays > 0 && ` \u00b7 ${totalDays} days`}
                  {dateRangeInvalid && (
                    <span style={{ color: "#D97706", fontWeight: 600, marginLeft: 6 }}>Date range needs review</span>
                  )}
                </div>
                {plan.plan_initiator && (
                  <div style={{ fontSize: 13, color: "#57534E", fontFamily: "var(--font-serif)", lineHeight: 1.6, marginBottom: 4 }}>
                    Initiated by: {initiatorLabels[plan.plan_initiator] || plan.plan_initiator}
                  </div>
                )}

                {/* Progress bar */}
                {totalDays !== null && totalDays > 0 && !dateRangeInvalid && (
                  <div style={{ height: 6, background: "#E7E5E4", borderRadius: 3, marginTop: 12, marginBottom: 20, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progressPct}%`, background: "#22C55E", borderRadius: 3 }} />
                  </div>
                )}

                {/* Employer's Stated Reason */}
                {plan.employer_stated_reason && (
                  <div style={{ marginBottom: 16, marginTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "#78716C", marginBottom: 6 }}>
                      Employer&apos;s Stated Reason
                    </div>
                    <div style={{ paddingLeft: 14, borderLeft: "3px solid #D6D3D1" }}>
                      <p style={{ fontSize: 13, fontFamily: "var(--font-serif)", lineHeight: 1.7, color: "#292524", margin: 0, fontStyle: "italic" }}>
                        {plan.employer_stated_reason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Stated Consequences */}
                {plan.stated_consequences && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "#DC2626", marginBottom: 6 }}>
                      Stated Consequences If Goals Are Not Met
                    </div>
                    <div style={{ paddingLeft: 14, borderLeft: "3px solid #FECACA" }}>
                      <p style={{ fontSize: 13, fontFamily: "var(--font-serif)", lineHeight: 1.7, color: "#292524", margin: 0, fontStyle: "italic" }}>
                        {plan.stated_consequences}
                      </p>
                    </div>
                  </div>
                )}

                {/* Goals */}
                {goals.length > 0 && (
                  <div style={{ marginBottom: 16, marginTop: 20 }}>
                    <div style={{ ...dLabel, marginBottom: 10 }}>Goals ({goals.length})</div>
                    {goals.map((goal) => {
                      const isRevised = !!(goal.revised_date || goal.original_description);
                      const goalTitle = goal.title || goal.description;
                      return (
                        <div key={goal.id} style={{ padding: "14px 16px", marginBottom: 10, borderRadius: 8, border: "1px solid #E7E5E4", background: "#fff", pageBreakInside: "avoid" }}>
                          {/* Goal header */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", padding: "1px 6px", borderRadius: 3, textTransform: "uppercase",
                              background: goal.status === "completed" || goal.status === "met" ? "#F0FDF4" : goal.status === "missed" || goal.status === "not_met" ? "#FEF2F2" : goal.status === "disputed" ? "#FEF2F2" : goal.status === "modified" ? "#FFFBEB" : goal.status === "in_progress" ? "#EFF6FF" : "#F5F5F4",
                              border: goal.status === "completed" || goal.status === "met" ? "1px solid #BBF7D0" : goal.status === "missed" || goal.status === "not_met" ? "1px solid #FECACA" : goal.status === "disputed" ? "1px solid #FECACA" : goal.status === "modified" ? "1px solid #FDE68A" : goal.status === "in_progress" ? "1px solid #BFDBFE" : "1px solid #E7E5E4",
                              color: goal.status === "completed" || goal.status === "met" ? "#15803D" : goal.status === "missed" || goal.status === "not_met" ? "#DC2626" : goal.status === "disputed" ? "#EF4444" : goal.status === "modified" ? "#B45309" : goal.status === "in_progress" ? "#3B82F6" : "#57534E",
                            }}>
                              {goal.status.replace(/_/g, " ")}
                            </span>
                            {isRevised && (
                              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "1px 6px", borderRadius: 3, color: "#D97706", background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                                Revised
                              </span>
                            )}
                            {goal.deadline && (
                              <span style={{ fontSize: 11, color: "#78716C", fontFamily: "var(--font-mono)" }}>Due {formatDate(goal.deadline)}</span>
                            )}
                          </div>

                          {/* Goal title */}
                          <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6, color: "#292524", fontFamily: "var(--font-serif)", marginBottom: 4 }}>{goalTitle}</p>

                          {/* Goal description (if different from title) */}
                          {goal.description && goal.description !== goalTitle && (
                            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#57534E", fontFamily: "var(--font-serif)", marginBottom: 4 }}>{goal.description}</p>
                          )}

                          {/* Success criteria */}
                          {goal.success_criteria && (
                            <div style={{ marginTop: 6, marginBottom: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em", color: "#78716C", marginBottom: 4 }}>Success Criteria</div>
                              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#57534E", fontFamily: "var(--font-serif)", margin: 0 }}>{goal.success_criteria}</p>
                            </div>
                          )}

                          {/* Disputed reason */}
                          {goal.status === "disputed" && goal.dispute_reason && (
                            <div style={{ padding: "10px 14px", borderRadius: 6, background: "#FEF2F2", border: "1px solid #FECACA", marginTop: 8, marginBottom: 4 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em", color: "#DC2626", marginBottom: 4 }}>Employee Dispute Note</div>
                              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#292524", fontFamily: "var(--font-serif)", margin: 0 }}>{goal.dispute_reason}</p>
                            </div>
                          )}

                          {/* Modified goal snapshot */}
                          {goal.status === "modified" && goal.original_goal_snapshot && (
                            <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #E7E5E4", borderLeft: "3px solid #F59E0B", marginTop: 8, marginBottom: 4 }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                                <div style={{ padding: "10px 14px", background: "#FEF2F2", borderRight: "1px solid #E7E5E4" }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Original</div>
                                  <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6, color: "#292524", fontFamily: "var(--font-serif)", margin: 0 }}>{goal.original_goal_snapshot.title}</p>
                                  {goal.original_goal_snapshot.description && (
                                    <p style={{ fontSize: 12, lineHeight: 1.5, color: "#57534E", fontFamily: "var(--font-serif)", margin: "4px 0 0" }}>{goal.original_goal_snapshot.description}</p>
                                  )}
                                  {goal.original_goal_snapshot.success_criteria && (
                                    <p style={{ fontSize: 11, color: "#78716C", fontFamily: "var(--font-mono)", margin: "4px 0 0" }}>Criteria: {goal.original_goal_snapshot.success_criteria}</p>
                                  )}
                                </div>
                                <div style={{ padding: "10px 14px", background: "#FFFBEB" }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#B45309", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                                    Revised {goal.modified_at ? formatDate(goal.modified_at) : ""}
                                  </div>
                                  <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6, color: "#292524", fontFamily: "var(--font-serif)", margin: 0 }}>{goalTitle}</p>
                                  {goal.description && goal.description !== goalTitle && (
                                    <p style={{ fontSize: 12, lineHeight: 1.5, color: "#57534E", fontFamily: "var(--font-serif)", margin: "4px 0 0" }}>{goal.description}</p>
                                  )}
                                  {goal.success_criteria && (
                                    <p style={{ fontSize: 11, color: "#78716C", fontFamily: "var(--font-mono)", margin: "4px 0 0" }}>Criteria: {goal.success_criteria}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Revision block */}
                          {isRevised && goal.original_description && (
                            <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #E7E5E4", borderLeft: "3px solid #22C55E", marginTop: 8, marginBottom: 4 }}>
                              {/* Revision header */}
                              <div style={{ padding: "8px 14px", background: "#fff", borderBottom: "1px solid #E7E5E4", display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em", color: "#16A34A" }}>
                                  Revision
                                </span>
                                {goal.revised_date && (
                                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#78716C" }}>
                                    {formatDate(goal.revised_date)}
                                  </span>
                                )}
                              </div>

                              <div style={{ padding: "12px 14px 14px", background: "#fff" }}>
                                {/* Revision note */}
                                {goal.revision_notes && (
                                  <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 12px", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#44403C" }}>
                                    &ldquo;{goal.revision_notes}&rdquo;
                                  </p>
                                )}

                                {/* Before / After comparison */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                  <div style={{ padding: "10px 14px", borderRadius: 6, background: "#FEF2F2", border: "1px solid #FECACA" }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Before</div>
                                    <p style={{ fontSize: 13, lineHeight: 1.6, color: "#57534E", fontFamily: "var(--font-serif)", margin: 0 }}>{goal.original_description}</p>
                                  </div>
                                  <div style={{ padding: "10px 14px", borderRadius: 6, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>After</div>
                                    <p style={{ fontSize: 13, lineHeight: 1.6, color: "#292524", fontFamily: "var(--font-serif)", margin: 0 }}>{goal.description}</p>
                                  </div>
                                </div>

                                {/* Identical text note */}
                                {goal.original_description === goal.description && (
                                  <p style={{ fontSize: 11, color: "#A8A29E", fontFamily: "var(--font-serif)", fontStyle: "italic", marginTop: 8, marginBottom: 0, lineHeight: 1.5, background: "none" }}>
                                    No text changes detected. Revision may reflect updated deadlines, criteria, or expectations.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Revision provenance note */}
                          {isRevised && (
                            <p style={{ fontSize: 10, color: "#A8A29E", fontFamily: "var(--font-mono)", marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
                              Goal revisions are documented automatically when flagged by the user. Original text is preserved for comparison.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Revision summary */}
                {revisedGoals.length > 0 && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fff", border: "1px solid #E7E5E4", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16A34A", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A" }}>
                      {revisedGoals.length} goal{revisedGoals.length !== 1 ? "s" : ""} revised during this plan
                    </span>
                  </div>
                )}

                {/* Check-ins */}
                {checkins.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ ...dLabel, marginBottom: 10 }}>Check-ins ({checkins.length})</div>
                    {checkins.map((checkin) => (
                      <div key={checkin.id} style={{ padding: "12px 0", borderBottom: "1px solid #F5F5F4", pageBreakInside: "avoid" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600, color: "#22C55E" }}>
                            {formatDate(checkin.checkin_date)}
                          </span>
                          {checkin.expectations_changed && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", padding: "1px 6px", borderRadius: 3, textTransform: "uppercase",
                              color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A",
                            }}>
                              Expectations Changed
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#292524", fontFamily: "var(--font-serif)" }}>{checkin.summary}</p>
                        {checkin.manager_feedback && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em", color: "#78716C", marginBottom: 2 }}>Manager Feedback</div>
                            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#57534E", fontFamily: "var(--font-serif)", margin: 0 }}>{checkin.manager_feedback}</p>
                          </div>
                        )}
                        {checkin.expectations_changed && checkin.expectation_change_detail && (
                          <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 6, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "#B45309", marginBottom: 4 }}>Expectation Change Noted</div>
                            <p style={{ fontSize: 13, lineHeight: 1.7, color: "#292524", fontFamily: "var(--font-serif)", margin: 0 }}>{checkin.expectation_change_detail}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic" }}>
            No plans have been created for this case. Plans can be added from the Plans page to track goals and milestones.
          </p>
        )}

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 7: IMPACT STATEMENT                                   */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(7, "Impact Statement")}
        <p style={purposeStatement}>
          In the person's own words, how these events have affected their work and wellbeing.
        </p>

        {caseData?.impact_statement ? (
          <div style={{ padding: 24, borderRadius: 10, background: "#FAFAF9", border: "1px solid #E7E5E4" }}>
            <div style={{ fontSize: 15, lineHeight: 1.8, fontStyle: "italic", whiteSpace: "pre-wrap" }}>
              {renderMarkdown(caseData.impact_statement)}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic" }}>
            No impact statement documented as of {genDate}.
          </p>
        )}

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 8: OPEN QUESTIONS AND NEXT TARGETS                    */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(8, "Open Questions and Next Documentation Targets")}
        <p style={purposeStatement}>
          Forward-looking documentation priorities and unresolved questions.
        </p>

        {caseData?.open_questions ? (
          <div style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 32 }}>
            {renderMarkdown(caseData.open_questions)}
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic", marginBottom: 32 }}>
            No additional documentation targets identified as of {genDate}.
          </p>
        )}

        {/* Key Dates section */}
        {keyDates.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Key Dates</h3>
            {keyDates.map((record) => {
              const rId = recordIdMap.get(record.id) || "";
              return (
                <div key={record.id} style={{ display: "flex", padding: "12px 0", borderBottom: "1px solid #F5F5F4", gap: 16, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#22C55E", background: "#F0FDF4", padding: "2px 6px", borderRadius: 3, border: "1px solid #BBF7D0" }}>{rId}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#22C55E", whiteSpace: "nowrap", minWidth: 180 }}>
                    {formatLongDate(record.date)}
                    {record.time && ` \u00b7 ${formatTime(record.time)}`}
                  </span>
                  <span style={{ fontSize: 14 }}>{record.title}</span>
                </div>
              );
            })}
          </div>
        )}

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  END DISCLAIMER                                                */}
      {/* ============================================================ */}
      <div style={{ padding: "24px 56px 40px", borderTop: "1px solid #D6D3D1" }}>
        <p style={{ fontSize: 11, color: "#292524", lineHeight: 1.6 }}>
          End of case file. This document was generated by DocketAlly from user-created records. It is not legal advice.
          DocketAlly provides documentation and risk awareness tools. Consult a qualified employment attorney for legal guidance specific to your situation.
        </p>
      </div>
    </div>
  );
}
