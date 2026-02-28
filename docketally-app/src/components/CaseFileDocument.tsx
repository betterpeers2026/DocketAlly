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
  type: "frequency" | "warning" | "people" | "gap" | "plan";
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
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
}

interface PlanGoal {
  id: string;
  plan_id: string;
  description: string;
  status: string;
  deadline: string | null;
  original_description: string | null;
  revised_date: string | null;
  revision_notes: string | null;
}

interface PlanCheckin {
  id: string;
  plan_id: string;
  checkin_date: string;
  summary: string;
  manager_feedback: string | null;
  private_notes: string | null;
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
        // A=0, B=1, ... Z=25, AA=26, AB=27, ...
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

  /* Group patterns by type for threshold logic */
  const patternGroups = new Map<string, DocketRecord[]>();
  for (const record of sortedRecords) {
    const et = record.event_type;
    if (et) {
      const arr = patternGroups.get(et) || [];
      arr.push(record);
      patternGroups.set(et, arr);
    }
  }

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
        <span style={{ fontSize: 13, color: "#44403C" }}>Confidential Case File</span>
      </div>
    </div>
  );

  const sectionHeading = (num: number, title: string) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#22C55E" }}>{num}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#292524", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</span>
      </div>
      <div style={{ width: 32, height: 3, background: "#22C55E", borderRadius: 2 }} />
    </div>
  );

  const pageFooter = (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#78716C", paddingTop: 20, borderTop: "1px solid #D6D3D1", marginTop: 40 }}>
      <span>Generated {genDate} at {genTime}</span>
      <span>DocketAlly Confidential</span>
    </div>
  );

  /* Build TOC items dynamically */
  const tocItems: { n: number; t: string }[] = [
    { n: 1, t: "Case Summary" },
    { n: 2, t: "Protected Rights and Legal Context" },
    { n: 3, t: `Timeline of Events (${records.length} records)` },
    { n: 4, t: `Evidence Index (${linkedDocs.length} files)` },
    { n: 5, t: `Pattern Analysis (${patterns.length + contradictions.length} patterns)` },
  ];
  if (plans.length > 0) tocItems.push({ n: 6, t: "Plan and Progression" });
  if (caseData?.impact_statement) tocItems.push({ n: 7, t: "Impact Statement" });
  tocItems.push({ n: 8, t: "Open Questions and Next Documentation Targets" });

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "#292524", lineHeight: 1.6 }}>
      {/* ============================================================ */}
      {/*  COVER PAGE                                                    */}
      {/* ============================================================ */}
      <div style={{ padding: 56, minHeight: 700 }}>
        <div style={{ height: 4, background: "#22C55E", marginBottom: 40 }} />
        <div style={{ marginBottom: 80 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: "#292524" }}>Docket</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: "#22C55E" }}>Ally</span>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <div style={{ width: 24, height: 3, background: "#22C55E", borderRadius: 2 }} />
            <div style={{ width: 24, height: 3, background: "#22C55E", borderRadius: 2 }} />
          </div>
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 48, fontWeight: 900, color: "#292524", lineHeight: 1.1, marginBottom: 12 }}>{caseName}</h1>
        <div style={{ width: 40, height: 3, background: "#22C55E", borderRadius: 2, marginBottom: 16 }} />
        <p style={{ fontSize: 18, color: "#292524", marginBottom: protectedClasses.length > 0 ? 8 : 60 }}>{pdfSubtitle}</p>
        {protectedClasses.length > 0 && (
          <p style={{ fontSize: 14, color: "#57534E", marginBottom: 60 }}>Protected Classes: {protectedClasses.join(", ")}</p>
        )}
        <div style={{ maxWidth: 500 }}>
          {[
            { l: "Employer", v: caseData?.employer || "-" },
            { l: "Role", v: caseData?.role || "-" },
            { l: "Employment start", v: caseData?.start_date ? formatDate(caseData.start_date) : "-" },
            { l: "Employment end", v: caseData?.employment_end_date ? formatDate(caseData.employment_end_date) : "Current" },
            { l: "Documentation period", v: firstDate && lastDate ? `${formatDate(firstDate)} to ${formatDate(lastDate)}` : "-" },
            { l: "Records", v: records.length > 0 ? `${records.length} entr${records.length !== 1 ? "ies" : "y"} over ${daySpan} days` : "-" },
            { l: "Patterns identified", v: String(patterns.length + contradictions.length) },
            { l: "Evidence files", v: `${linkedDocs.length} file${linkedDocs.length !== 1 ? "s" : ""} referenced` },
            { l: "Case status", v: caseData?.case_status || "Active" },
          ].map((row) => (
            <div key={row.l} style={{ display: "flex", padding: "14px 0", borderBottom: "1px solid #F5F5F4" }}>
              <div style={{ width: 180, fontSize: 13, color: "#292524", flexShrink: 0 }}>{row.l}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{row.v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 80 }}>
          <div style={{ height: 1, background: "#FECACA", opacity: 0.5, marginBottom: 16 }} />
          <p style={{ fontSize: 11, color: "#292524", lineHeight: 1.6 }}>
            This document was generated by DocketAlly. It contains user-created records and is not legal advice.<br />
            DocketAlly provides documentation and risk awareness tools. Consult an employment attorney for legal guidance.
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  TABLE OF CONTENTS                                             */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 800, marginBottom: 32 }}>Contents</h2>
        {tocItems.map((item) => (
          <div key={item.n} style={{ display: "flex", alignItems: "center", padding: "16px 0", borderBottom: "1px solid #F5F5F4" }}>
            <span style={{ width: 48, fontSize: 16, fontWeight: 700, color: "#22C55E" }}>{item.n}</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{item.t}</span>
          </div>
        ))}
        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 1: CASE SUMMARY                                       */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(1, "CASE SUMMARY")}
        <div className="da-doc-summary-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {[
            { l: "Employer", v: caseData?.employer || "-" },
            { l: "Role", v: caseData?.role || "-" },
            { l: "Start Date", v: caseData?.start_date ? formatDate(caseData.start_date) : "-" },
            { l: "End Date", v: caseData?.employment_end_date ? formatDate(caseData.employment_end_date) : "Current" },
            { l: "Department", v: caseData?.department || "-" },
            { l: "Location", v: caseData?.location || "-" },
            { l: "Key People", v: caseData?.key_people || "-" },
            { l: "Case Status", v: caseData?.case_status || "Active" },
          ].map((item, i) => (
            <div key={item.l} style={{ padding: "16px 0", borderBottom: "1px solid #F5F5F4", paddingRight: i % 2 === 0 ? 24 : 0 }}>
              <div style={dLabel}>{item.l}</div>
              <div style={{ fontSize: 15 }}>{item.v}</div>
            </div>
          ))}
        </div>

        {/* Brief Summary */}
        {caseData?.description && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Situation</h3>
            <p style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{caseData.description}</p>
          </div>
        )}

        {/* Case Theory Box */}
        {(caseData?.case_theory_protected_activity || caseData?.case_theory_employer_response || caseData?.case_theory_connection || caseData?.case_theory_outcome) && (
          <div style={{ marginTop: 32, padding: 24, borderRadius: 10, border: "1px solid #BBF7D0", background: "#F0FDF4" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, color: "#15803D", marginBottom: 16 }}>Case Theory</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { l: "Protected Activity", v: caseData.case_theory_protected_activity },
                { l: "Employer Response", v: caseData.case_theory_employer_response },
                { l: "Connection", v: caseData.case_theory_connection },
                { l: "Outcome", v: caseData.case_theory_outcome },
              ].filter((item) => item.v).map((item) => (
                <div key={item.l}>
                  <div style={{ ...dLabel, color: "#15803D", marginBottom: 6 }}>{item.l}</div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "#292524", whiteSpace: "pre-wrap" }}>{item.v}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 2: PROTECTED RIGHTS AND LEGAL CONTEXT                 */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(2, "PROTECTED RIGHTS AND LEGAL CONTEXT")}
        <p style={{ fontSize: 13, color: "#57534E", lineHeight: 1.6, marginBottom: 24 }}>
          The following legal frameworks may be relevant based on the case type{caseTypes.length > 1 ? "s" : ""} and protected classes identified.
          This section provides general reference information about common documentation elements and records that are typically relevant.
        </p>

        {/* Legal context cards */}
        {resolveLegalCards(caseTypes, protectedClasses).map((card, idx) => (
          <div key={idx} style={{ marginBottom: 24, padding: 24, borderRadius: 10, border: "1px solid #E7E5E4", background: "#FAFAF9", pageBreakInside: "avoid" }}>
            <h4 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 700, color: "#292524", marginBottom: 10, lineHeight: 1.3 }}>
              {card.title}
            </h4>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#57534E", marginBottom: 16 }}>
              {card.description}
            </p>

            {/* Common documentation elements */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...dLabel, color: "#57534E", marginBottom: 8 }}>Common Documentation Elements</div>
              <ul style={{ margin: 0, paddingLeft: 20, listStyleType: "disc" }}>
                {card.documentation.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.7, color: "#44403C", marginBottom: 2 }}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Source citation */}
            <div style={{ fontSize: 11, color: "#78716C", fontFamily: "var(--font-mono)", paddingTop: 10, borderTop: "1px solid #E7E5E4" }}>
              Source: {card.source}
            </div>
          </div>
        ))}

        {/* Amber disclaimer */}
        <div style={{ marginTop: 28, padding: 20, borderRadius: 10, border: "1px solid #FCD34D", background: "#FFFBEB", pageBreakInside: "avoid" }}>
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
        {sectionHeading(3, "TIMELINE OF EVENTS")}
        <p style={{ fontSize: 13, color: "#57534E", lineHeight: 1.6, marginBottom: 24 }}>
          All records in chronological order. Each record is assigned a sequential ID for cross-referencing.
        </p>

        {sortedRecords.map((record) => {
          const rId = recordIdMap.get(record.id) || "";
          const docsForRecord = linkedDocsMap[record.id] || [];
          const isEscalation = WARNING_TYPES.has(record.entry_type);
          const isStarred = starredIds.has(record.id);
          const isAdverseAction = record.event_type === "adverse_action";
          const isProtectedActivity = record.event_type === "protected_activity";

          return (
            <div
              key={record.id}
              style={{
                borderLeft: `3px solid ${isAdverseAction ? "#EF4444" : isProtectedActivity ? "#A855F7" : "#22C55E"}`,
                paddingLeft: 24,
                marginBottom: 28,
                pageBreakInside: "avoid",
              }}
            >
              {/* Record ID + Date */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
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

              {/* Entry type + Event type + Tags */}
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>{record.entry_type}</span>
                {record.event_type && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: isProtectedActivity ? "1px solid #D8B4FE" : isAdverseAction ? "1px solid #FECACA" : "1px solid #E7E5E4",
                      background: isProtectedActivity ? "#FAF5FF" : isAdverseAction ? "#FEF2F2" : "#FAFAF9",
                      color: isProtectedActivity ? "#7E22CE" : isAdverseAction ? "#DC2626" : "#78716C",
                    }}
                  >
                    {EVENT_TYPE_LABELS[record.event_type] || record.event_type}
                  </span>
                )}
                {record.people && <span style={{ fontSize: 13, color: "#57534E" }}>{record.people}</span>}
                {isEscalation && <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>[Escalation]</span>}
              </div>

              {/* Narrative */}
              <div style={dLabel}>WHAT HAPPENED</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{renderMarkdown(record.narrative)}</div>

              {/* Employer Stated Reason */}
              {record.employer_stated_reason && (
                <>
                  <div style={{ ...dLabel, color: "#DC2626" }}>EMPLOYER STATED REASON</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{renderMarkdown(record.employer_stated_reason)}</div>
                </>
              )}

              {/* My Response */}
              {record.my_response && (
                <>
                  <div style={{ ...dLabel, color: "#22C55E" }}>MY RESPONSE</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{renderMarkdown(record.my_response)}</div>
                </>
              )}

              {/* Facts */}
              {record.facts && (
                <>
                  <div style={dLabel}>ADDITIONAL CONTEXT</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{renderMarkdown(record.facts)}</div>
                </>
              )}

              {/* Follow-up */}
              {record.follow_up && (
                <>
                  <div style={{ ...dLabel, color: "#22C55E" }}>NEXT STEPS</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{renderMarkdown(record.follow_up)}</div>
                </>
              )}

              {/* Exhibit chips */}
              {docsForRecord.length > 0 && (
                <>
                  <div style={dLabel}>EXHIBITS</div>
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
                </>
              )}
            </div>
          );
        })}

        {pageFooter}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 4: EVIDENCE INDEX                                     */}
      {/* ============================================================ */}
      {linkedDocs.length > 0 && (
        <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
          {runningHeader}
          {sectionHeading(4, "EVIDENCE INDEX")}
          <p style={{ fontSize: 13, color: "#57534E", lineHeight: 1.6, marginBottom: 24 }}>
            All files referenced in the timeline, with exhibit labels matching Section 3.
          </p>

          <div className="da-doc-attach-row" style={{ display: "grid", gridTemplateColumns: "60px 1fr 160px 160px", borderBottom: "2px solid #292524", padding: "10px 0" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Exhibit</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>File</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Record</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Record Type</span>
          </div>
          {linkedDocs.map((doc) => {
            const record = sortedRecords.find((r) => r.id === doc.linked_record_id);
            const letter = exhibitLetterMap.get(doc.id) || "?";
            const rId = record ? recordIdMap.get(record.id) || "-" : "-";
            return (
              <div key={doc.id} className="da-doc-attach-row" style={{ display: "grid", gridTemplateColumns: "60px 1fr 160px 160px", borderBottom: "1px solid #F5F5F4", padding: "10px 0", pageBreakInside: "avoid" }}>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#22C55E" }}>Ex. {letter}</span>
                <span style={{ fontSize: 13, color: "#292524", fontWeight: 600 }}>{doc.file_name}</span>
                <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#57534E" }}>{rId}{record ? ` \u00b7 ${formatDate(record.date)}` : ""}</span>
                <span style={{ fontSize: 13 }}>{record ? record.entry_type : "-"}</span>
              </div>
            );
          })}

          {pageFooter}
        </div>
      )}

      {/* ============================================================ */}
      {/*  SECTION 5: PATTERN ANALYSIS                                   */}
      {/* ============================================================ */}
      {(patterns.length > 0 || contradictions.length > 0) && (
        <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
          {runningHeader}
          {sectionHeading(5, "PATTERN ANALYSIS")}
          <p style={{ fontSize: 13, color: "#57534E", lineHeight: 1.6, marginBottom: 24 }}>
            Patterns are recurring themes identified across multiple records.
            Items marked "Confirmed" appear in 3 or more records. Items marked "Signal" appear in fewer than 3 records.
          </p>

          {patterns.map((pattern, idx) => {
            // Determine if pattern is "Confirmed" (3+) or "Signal" (<3)
            // Use heuristic: frequency patterns have count in detail, others default to Signal
            const countMatch = pattern.detail.match(/(\d+)\s+record/i);
            const count = countMatch ? parseInt(countMatch[1], 10) : 0;
            const isConfirmed = count >= 3;
            const threshold = isConfirmed ? "Confirmed" : "Signal";

            return (
              <div key={`p-${idx}`} style={{ borderLeft: "3px solid #22C55E", paddingLeft: 24, marginBottom: 24, pageBreakInside: "avoid" }}>
                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700 }}>{pattern.label}</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: isConfirmed ? "#F0FDF4" : "#FFF7ED",
                    border: isConfirmed ? "1px solid #BBF7D0" : "1px solid #FED7AA",
                    color: isConfirmed ? "#15803D" : "#C2410C",
                  }}>
                    {threshold}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#22C55E" }}>[{pattern.type === "plan" ? "Plan Pattern" : "Notable Pattern"}]</span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7 }}>{pattern.detail}</p>
              </div>
            );
          })}

          {contradictions.map((c, idx) => (
            <div key={`c-${idx}`} style={{ borderLeft: "3px solid #F59E0B", paddingLeft: 24, marginBottom: 24, pageBreakInside: "avoid" }}>
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700 }}>
                  {c.type === "performance" ? "Contradictory Performance Signals" : c.type === "shifting" ? "Shifting Expectations" : c.type === "exclusion" ? "Post-Complaint Changes" : "Plan Contradiction"}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B" }}>[Potential Contradiction]</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7 }}>{c.detail}</p>
            </div>
          ))}

          {pageFooter}
        </div>
      )}

      {/* ============================================================ */}
      {/*  SECTION 6: PLAN AND PROGRESSION                               */}
      {/* ============================================================ */}
      {plans.length > 0 && (
        <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
          {runningHeader}
          {sectionHeading(6, "PLAN AND PROGRESSION")}
          <p style={{ fontSize: 13, color: "#57534E", lineHeight: 1.6, marginBottom: 24 }}>
            Active and completed plans, including goals, revisions, and check-in history.
          </p>

          {plans.map((plan) => {
            const goals = planGoals.filter((g) => g.plan_id === plan.id);
            const checkins = planCheckins.filter((c) => c.plan_id === plan.id).sort(
              (a, b) => new Date(a.checkin_date + "T00:00:00").getTime() - new Date(b.checkin_date + "T00:00:00").getTime()
            );
            const totalDays = plan.end_date ? daysBetween(plan.start_date, plan.end_date) : 0;
            const elapsed = daysBetween(plan.start_date, new Date().toISOString().split("T")[0]);
            const progressPct = totalDays > 0 ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 0;
            const revisedGoals = goals.filter((g) => g.revised_date || g.original_description);

            return (
              <div key={plan.id} style={{ marginBottom: 36, padding: 24, borderRadius: 10, border: "1px solid #E7E5E4", background: "#FAFAF9", pageBreakInside: "avoid" }}>
                {/* Plan header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <h4 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, color: "#292524", margin: 0 }}>{plan.name}</h4>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "3px 10px",
                    borderRadius: 5,
                    background: plan.status === "completed" ? "#F0FDF4" : plan.status === "active" ? "#EFF6FF" : "#FFF7ED",
                    border: plan.status === "completed" ? "1px solid #BBF7D0" : plan.status === "active" ? "1px solid #BFDBFE" : "1px solid #FED7AA",
                    color: plan.status === "completed" ? "#15803D" : plan.status === "active" ? "#1D4ED8" : "#C2410C",
                  }}>
                    {plan.status}
                  </span>
                </div>

                {/* Date range + progress */}
                <div style={{ fontSize: 13, color: "#57534E", marginBottom: 12 }}>
                  {formatDate(plan.start_date)}
                  {plan.end_date && ` to ${formatDate(plan.end_date)}`}
                  {totalDays > 0 && ` \u00b7 ${totalDays} days`}
                </div>
                {totalDays > 0 && (
                  <div style={{ height: 6, background: "#E7E5E4", borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progressPct}%`, background: "#22C55E", borderRadius: 3 }} />
                  </div>
                )}

                {/* Goals */}
                {goals.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ ...dLabel, marginBottom: 10 }}>Goals ({goals.length})</div>
                    {goals.map((goal) => {
                      const isRevised = !!(goal.revised_date || goal.original_description);
                      return (
                        <div key={goal.id} style={{ padding: "10px 0", borderBottom: "1px solid #F5F5F4" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: "var(--font-mono)",
                              padding: "1px 6px",
                              borderRadius: 3,
                              background: goal.status === "completed" ? "#F0FDF4" : goal.status === "missed" ? "#FEF2F2" : "#F5F5F4",
                              border: goal.status === "completed" ? "1px solid #BBF7D0" : goal.status === "missed" ? "1px solid #FECACA" : "1px solid #E7E5E4",
                              color: goal.status === "completed" ? "#15803D" : goal.status === "missed" ? "#DC2626" : "#57534E",
                              textTransform: "uppercase",
                            }}>
                              {goal.status}
                            </span>
                            {isRevised && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#D97706", fontFamily: "var(--font-mono)" }}>REVISED</span>
                            )}
                            {goal.deadline && (
                              <span style={{ fontSize: 11, color: "#78716C", fontFamily: "var(--font-mono)" }}>Due {formatDate(goal.deadline)}</span>
                            )}
                          </div>
                          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#292524" }}>{goal.description}</p>
                          {goal.original_description && (
                            <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 6, background: "#FFF7ED", border: "1px solid #FED7AA" }}>
                              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#C2410C", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Original Goal</div>
                              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#57534E" }}>{goal.original_description}</p>
                              {goal.revision_notes && (
                                <p style={{ fontSize: 12, color: "#78716C", marginTop: 4 }}>Revision notes: {goal.revision_notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Revision summary */}
                {revisedGoals.length > 0 && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FFF7ED", border: "1px solid #FED7AA", marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#C2410C" }}>
                      {revisedGoals.length} goal{revisedGoals.length !== 1 ? "s" : ""} revised during this plan
                    </span>
                  </div>
                )}

                {/* Check-ins */}
                {checkins.length > 0 && (
                  <div>
                    <div style={{ ...dLabel, marginBottom: 10 }}>Check-ins ({checkins.length})</div>
                    {checkins.map((checkin) => (
                      <div key={checkin.id} style={{ padding: "10px 0", borderBottom: "1px solid #F5F5F4" }}>
                        <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600, color: "#22C55E", marginBottom: 4 }}>
                          {formatDate(checkin.checkin_date)}
                        </div>
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#292524" }}>{checkin.summary}</p>
                        {checkin.manager_feedback && (
                          <p style={{ fontSize: 13, color: "#57534E", marginTop: 4 }}>Manager feedback: {checkin.manager_feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {pageFooter}
        </div>
      )}

      {/* ============================================================ */}
      {/*  SECTION 7: IMPACT STATEMENT                                   */}
      {/* ============================================================ */}
      {caseData?.impact_statement && (
        <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
          {runningHeader}
          {sectionHeading(7, "IMPACT STATEMENT")}
          <p style={{ fontSize: 13, color: "#57534E", lineHeight: 1.6, marginBottom: 24 }}>
            A personal account of how the situation has affected your career, wellbeing, and professional life.
          </p>
          <div style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {renderMarkdown(caseData.impact_statement)}
          </div>
          {pageFooter}
        </div>
      )}

      {/* ============================================================ */}
      {/*  SECTION 8: OPEN QUESTIONS AND NEXT TARGETS                    */}
      {/* ============================================================ */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(8, "OPEN QUESTIONS AND NEXT DOCUMENTATION TARGETS")}

        {caseData?.open_questions ? (
          <div style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 32 }}>
            {renderMarkdown(caseData.open_questions)}
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "#78716C", fontStyle: "italic", marginBottom: 32 }}>
            No open questions have been added yet. Use the Case Info tab to add questions or documentation targets.
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
