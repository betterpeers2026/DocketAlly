"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = "articles" | "tickets" | "how";

interface Article {
  title: string;
  description: string;
  readTime: string;
  content: string;
}

interface ArticleSection {
  label: string;
  articles: Article[];
}

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  from_type: string;
  message_text: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Help Articles Data                                                 */
/* ------------------------------------------------------------------ */

const ARTICLE_SECTIONS: ArticleSection[] = [
  {
    label: "Getting Started",
    articles: [
      {
        title: "Your first record",
        description: "How to document a workplace event in under 2 minutes.",
        readTime: "2 min",
        content: `Open the Record tab and click "New Record." Choose the entry type that best fits what happened, whether it was a meeting, an email, an incident, or something else. Write a short, factual summary of the event. Include the date, who was involved, and what was said or decided. Avoid opinions or emotional language — the goal is a record that reads like a professional summary.\n\nYou do not need to write a lot. A few sentences per field is enough. The most important thing is that you create the record while the details are still fresh. If you wait days or weeks, you will lose specifics that matter.\n\nOnce saved, your record is added to your timeline and becomes part of your case file. You can edit it later if you need to add context, but the created date is preserved. Consistency matters more than length.`,
      },
      {
        title: "Choosing the right entry type",
        description: "When to use 1:1 Meeting vs. Incident vs. Written Communication.",
        readTime: "3 min",
        content: `Entry types help organize your records and make patterns easier to identify. Use "1:1 Meeting" for regular check-ins with your manager or skip-level conversations. Use "Written Communication" when you want to document an email, Slack message, or letter — particularly follow-ups where you are putting something in writing after a verbal conversation.\n\n"PIP Conversation" is for anything directly related to a performance improvement plan — receiving it, discussing it, or being told about consequences. "HR Interaction" covers any communication with human resources, whether you initiated it or they did. "Incident" is for specific events that feel notable: being excluded from a meeting, a confrontation, or a policy being applied inconsistently.\n\n"Positive Evidence" is often overlooked but critically important. If you receive praise, a strong review, or recognition, document it. This creates a record of good performance that may become important later. "Self-Documentation" is your own perspective — use it when you want to note something that does not fit neatly into another category. When in doubt, choose "Other" and describe it clearly.`,
      },
      {
        title: "What to write and what to skip",
        description: "Keep it factual, specific, and useful.",
        readTime: "3 min",
        content: `Good documentation reads like a factual account, not a personal journal. Write what happened, when, where, and who was present. Include direct quotes when you can remember them. Note any commitments made or decisions reached. If there are follow-up items, capture those too.\n\nSkip emotional reactions, personal opinions about someone's character, and speculation about motives. Instead of writing "My manager was being unfair," write "My manager assigned me three additional projects on Friday afternoon with Monday deadlines, despite knowing I had a scheduled day off." The second version is specific, factual, and much more useful.\n\nThe people field is important — always list who was present or involved by name. This creates a record of witnesses and participants that becomes valuable if you ever need to reference these events formally. Keep your records professional enough that you would be comfortable with an attorney, HR representative, or judge reading them.`,
      },
    ],
  },
  {
    label: "Building Your Case",
    articles: [
      {
        title: "How Case builds from your records",
        description: "Your case isn't something you create. It emerges from documentation over time.",
        readTime: "3 min",
        content: `The Case tab does not require you to build anything from scratch. It reads from your records and organizes them into a structured timeline. As you add entries over days and weeks, the timeline fills in and patterns start to become visible.\n\nThe power of the Case tab is in aggregation. A single record of being excluded from a meeting might not mean much. But five records over three months showing a pattern of exclusion after you filed an HR complaint tells a very different story. The Case tab helps you see these connections.\n\nFill out the Case Info section with your name, company, role, and a brief summary of your situation. This becomes the header of your case file PDF and helps anyone reading it understand the context immediately.`,
      },
      {
        title: "Understanding patterns",
        description: "What patterns are, how they're identified, and what they mean.",
        readTime: "4 min",
        content: `DocketAlly scans your records for several types of patterns. Performance contradictions occur when you have documented positive feedback close in time to a negative action like a PIP. Shifting expectations appear when goals or criteria change after being set. Exclusion patterns emerge when records mention being removed from projects, meetings, or communication channels.\n\nThese patterns are identified through keyword analysis of your record text. They are observations, not legal conclusions. A pattern of exclusion after an HR complaint could indicate retaliation, but it could also have an innocent explanation. The value is in surfacing the pattern so you and your attorney can evaluate it.\n\nThe more detailed and consistent your records are, the more accurately patterns can be detected. If you mention specific names, dates, and actions, the analysis has more to work with. Vague records produce vague results.`,
      },
      {
        title: "Generating a case file PDF",
        description: "How to create, download, and share your complete documentation.",
        readTime: "2 min",
        content: `In the Case tab, click the "Generate PDF" button to create a comprehensive document containing your case information, a complete timeline of all records, pattern analysis, and key statistics. The PDF is generated entirely in your browser — your data never passes through an external service during generation.\n\nThe resulting document is organized chronologically and includes all the detail from your records. Share it with an employment attorney during a consultation, or keep it for your personal records. You can regenerate the PDF at any time as you add new records, so there is no need to wait until everything is perfect.\n\nBefore generating, make sure your Case Info section is filled out. This provides the context that makes the document useful to someone reading it for the first time.`,
      },
    ],
  },
  {
    label: "Using Templates",
    articles: [
      {
        title: "PIP Response Letter",
        description: "How to acknowledge a PIP while protecting your position.",
        readTime: "4 min",
        content: `When you receive a PIP, the first step is to acknowledge it in writing. This is not the same as agreeing with it. The PIP Acknowledgment template in the Comms tab helps you respond professionally while reserving your rights and requesting clarification on vague metrics.\n\nThe key points to address are: confirming you received the document, requesting specific measurable criteria for each goal, asking about the resources and support available to you, and noting any factual disagreements for the record. Sign to acknowledge receipt only, and state that explicitly.\n\nTiming matters. Respond within a few days, but do not rush. Take the time to review the PIP carefully, compare it to your recent performance reviews, and identify any inconsistencies. If the PIP contradicts a recent positive review, document that — it may be significant.`,
      },
      {
        title: "Meeting Follow-Up",
        description: "Turn a verbal conversation into a written record.",
        readTime: "3 min",
        content: `After any workplace meeting where something important was discussed, send a follow-up email summarizing what was covered. This is one of the most powerful documentation habits you can develop. It turns a verbal conversation — which is your word against theirs — into a written record.\n\nThe Meeting Summary template helps you structure this naturally. List the date, attendees, key discussion points, action items, and any agreements reached. End by asking the recipient to confirm your summary or let you know if anything was missed. If they do not respond, the summary stands as the record of what happened.\n\nMake this a regular habit, not just something you do during conflict. Consistently following up on all meetings makes it clear that this is your professional practice, not a reaction to a specific situation.`,
      },
      {
        title: "HR Escalation",
        description: "When and how to escalate beyond your direct manager.",
        readTime: "4 min",
        content: `Escalating to HR or a skip-level manager is a significant step. Before doing so, make sure you have a documented record of your attempts to resolve the issue directly. This creates a clear paper trail showing that escalation was a last resort.\n\nThe Formal HR Complaint template provides a structure for making your concerns official. Include specific incidents with dates, who was present, and what happened. Reference any prior attempts to resolve the matter informally. Be clear about what you are requesting — an investigation, a response, protection from retaliation.\n\nAfter filing, document the interaction itself. Note when you submitted the complaint, who received it, and what they told you about next steps and timeline. If they promise to follow up by a certain date, write that down. Hold them to it, and document if they miss it.`,
      },
    ],
  },
  {
    label: "Plans & PIPs",
    articles: [
      {
        title: "Tracking a PIP",
        description: "How to log goals, deadlines, and revisions so nothing gets lost.",
        readTime: "3 min",
        content: `When you are placed on a PIP, open the Plans tab and create a new plan. Enter the plan name, start date, and end date exactly as they appear on your official PIP document. Then add each goal individually with its description, success criteria, and deadline.\n\nAs you work through the plan, log check-ins after every meeting with your manager. Note what was discussed, what feedback they gave, and any private observations you want to keep on record. If a check-in relates to a specific record you created, link them together.\n\nThe plan dashboard shows your progress, days remaining, and the status of each goal. This gives you a clear picture of where you stand at any point during the PIP period. More importantly, it creates a structured record that is far more useful than scattered notes.`,
      },
      {
        title: "When goals change",
        description: "What to do when your employer revises expectations mid-plan.",
        readTime: "3 min",
        content: `If your manager changes a PIP goal, shifts the success criteria, or adds new expectations after the plan is already underway, that is significant. Use the "Flag as Revised" button on the affected goal in the Plans tab. This saves the original description, records the new one, and lets you add a note about what changed and when.\n\nMoving goalposts are a common pattern in problematic PIPs. An employer who genuinely wants you to succeed will set clear criteria and stick to them. An employer who is building a case for termination may keep changing what success looks like so it stays out of reach.\n\nThe Goal Revision History at the bottom of the Plans page shows all changes in chronological order. This creates a clear visual record of shifting expectations that an attorney can review. Even if the changes seem small, document every one of them.`,
      },
    ],
  },
  {
    label: "Exit & Separation",
    articles: [
      {
        title: "Readiness checklist",
        description: "Everything you should have in place before your last day.",
        readTime: "4 min",
        content: `The Exit tab's readiness checklist pulls from your actual data to show what you have prepared and what is still missing. It checks your record count, vault documents, case info, plan tracking, and personal preparation items.\n\nThe personal readiness section is manual — check off items as you complete them. Make sure you have copies of your employment contract, recent performance reviews, and any important communications saved outside of company systems. Review your company's severance and separation policies before you need them.\n\nDo not wait until your last day to prepare. The best time to organize your documentation is while you still have access to information and while events are fresh. The readiness score is a preparation metric, not a legal assessment, but completing more items means you are better prepared regardless of what happens next.`,
      },
      {
        title: "Reviewing a severance agreement",
        description: "What to look for, how long you have, and what's negotiable.",
        readTime: "5 min",
        content: `When presented with a severance agreement, the most important thing to know is that you do not have to sign immediately. In fact, you should not. Take the document home, read it carefully, and consider having an employment attorney review it. If you are 40 or older, federal law requires your employer to give you at least 21 days to review.\n\nLook at the payment amount and compare it to industry norms for your role and tenure. Check the benefits continuation period, reference language, non-disparagement clauses, and — critically — the release of claims. A release means you are giving up the right to sue. If you have documented workplace issues, that release has value, and the severance amount should reflect it.\n\nEverything in a severance agreement is negotiable. The first offer is a starting point. Common negotiation points include the payment amount, COBRA coverage duration, reference wording, and the scope of non-compete clauses. Your documentation from DocketAlly strengthens your position in these negotiations.`,
      },
      {
        title: "EEOC filing basics",
        description: "Step-by-step overview of the discrimination charge process.",
        readTime: "5 min",
        content: `The EEOC handles complaints of workplace discrimination based on protected characteristics including race, sex, age, disability, and religion. If you believe you have been discriminated against, you generally have 180 to 300 days from the discriminatory act to file a charge. Check your state's deadline, as it varies.\n\nYou can file online through the EEOC's public portal, in person at a local office, or by mail. The process begins with an intake questionnaire where you describe what happened. You do not need an attorney to file, but consulting one beforehand can help you frame the complaint effectively.\n\nAfter filing, the EEOC notifies your employer and may offer mediation. If mediation does not resolve the matter, they investigate. The process can take months. At any point, you can request a Right to Sue letter, which allows you to file a lawsuit in federal court within 90 days. Your DocketAlly case file organizes exactly the kind of documentation the EEOC asks for.`,
      },
    ],
  },
  {
    label: "Privacy & Security",
    articles: [
      {
        title: "Who can see your records?",
        description: "Only you. Not your employer. Not DocketAlly.",
        readTime: "2 min",
        content: `Your records are stored in a secure database with row-level security policies that ensure only your authenticated account can access your data. Your employer cannot see your records. DocketAlly staff do not access user record content as part of normal operations.\n\nThe database uses Supabase with PostgreSQL row-level security, which means the access rules are enforced at the database level, not just the application level. Even if someone gained access to the application code, they could not query another user's records without that user's authentication credentials.\n\nIf you are concerned about your employer monitoring your computer activity, access DocketAlly from a personal device on a non-company network. Your documentation is too important to risk having it discovered before you are ready.`,
      },
      {
        title: "Deleting your account",
        description: "How to remove all your data permanently.",
        readTime: "2 min",
        content: `If you want to remove all of your data from DocketAlly, you can delete your account through your profile settings. This action is permanent and removes all records, vault documents, plans, check-ins, goals, tickets, and any other data associated with your account.\n\nBefore deleting, consider generating a case file PDF and downloading any vault documents you want to keep. Once your account is deleted, there is no way to recover your data. If you are deleting because you have resolved your workplace situation, congratulations — but keep your documentation somewhere safe regardless.\n\nAccount deletion is processed immediately. Your data is removed from the database, and cascading deletes ensure that all related records are cleaned up.`,
      },
      {
        title: "Exporting your data",
        description: "Download everything you've created at any time.",
        readTime: "2 min",
        content: `You can export your data in several ways. The Case tab generates a comprehensive PDF that includes all of your records, timeline, patterns, and case information. This is the primary way most users export their documentation.\n\nVault documents can be downloaded individually at any time — they are stored exactly as you uploaded them. For a complete export of your raw data, you can use the browser's developer tools to inspect API responses, or contact support for a data export request.\n\nWe believe your data belongs to you. There are no restrictions on exporting, no paywalls on downloads, and no limits on how many times you can generate your case file. Build your documentation, export it when you need it, and use it however serves you best.`,
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  How It Works Steps                                                 */
/* ------------------------------------------------------------------ */

const HOW_STEPS = [
  {
    number: 1,
    title: "Document what happens",
    detail: "Use the Record tab to log workplace events as they happen. Meetings, emails, conversations, incidents. Each entry captures what happened, when, who was involved, and what comes next. Write factually. Avoid opinions or emotions. Include dates, times, and names. The goal is a record that reads like a professional putting things in writing.",
  },
  {
    number: 2,
    title: "Upload supporting documents",
    detail: "Use the Vault to store offer letters, performance reviews, PIP documents, emails, and agreements. These support your records and become part of your case file. Documents are stored privately on your account. They are referenced in your timeline but never shared without your permission.",
  },
  {
    number: 3,
    title: "Track formal expectations",
    detail: "If you are on a PIP or performance plan, use the Plans tab to track goals, deadlines, and any revisions. If goals change, you will have the original on record. Not everyone needs this tab. If you are not on a formal plan, skip it.",
  },
  {
    number: 4,
    title: "Communicate in writing",
    detail: "Use the Comms templates to respond to PIPs, follow up after meetings, escalate to HR, or counter a severance offer. Every template is editable. The goal is to move important conversations into writing. A verbal promise means nothing without a record.",
  },
  {
    number: 5,
    title: "Watch your case build",
    detail: "As you document over time, the Case tab organizes your records into a timeline, identifies patterns across entries, and tracks key people and dates. You do not create a case. It emerges from your records. Patterns like shifting expectations, contradictory reviews, or exclusion from team activities become visible over time.",
  },
  {
    number: 6,
    title: "Generate your case file",
    detail: "When you are ready, generate a complete PDF of your documentation. Organized, timestamped, with pattern analysis. Download it or share it with an attorney. Your case file includes a summary, complete timeline, pattern analysis, key dates, and a document index. Regenerate it any time you add new records.",
  },
];

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 600,
  color: "#44403C",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid var(--color-stone-200)",
  padding: "24px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #D6D3D1",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  color: "#1C1917",
  outline: "none",
  background: "#fff",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical" as const,
  lineHeight: 1.6,
};

const btnGreen: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: "var(--color-green)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

const btnOutline: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid #D6D3D1",
  background: "#fff",
  color: "#44403C",
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

const TICKET_CATEGORIES = ["Bug", "Billing", "How-to", "Account", "Feature Request", "General"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDateTime(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ticketStatusBadge(status: string): React.CSSProperties {
  if (status === "in_progress") {
    return { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)", letterSpacing: "0.02em", textTransform: "uppercase", color: "#1E40AF", background: "#DBEAFE", border: "1px solid #BFDBFE" };
  }
  if (status === "resolved") {
    return { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)", letterSpacing: "0.02em", textTransform: "uppercase", color: "#15803D", background: "#F0FDF4", border: "1px solid #BBF7D0" };
  }
  // open
  return { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)", letterSpacing: "0.02em", textTransform: "uppercase", color: "#92400E", background: "#FEF3C7", border: "1px solid #FDE68A" };
}

function focusInput(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "var(--color-green)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.10)";
}
function blurInput(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "#D6D3D1";
  e.currentTarget.style.boxShadow = "none";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SupportPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<Tab>("articles");
  const [articleSearch, setArticleSearch] = useState("");
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Tickets
  const [userId, setUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({ category: "General", subject: "", details: "" });
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase.auth]);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setTickets(data ?? []);
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) fetchTickets();
  }, [userId, fetchTickets]);

  // Fetch messages for selected ticket
  const fetchMessages = useCallback(async (ticketId: string) => {
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setTicketMessages(data ?? []);
  }, [supabase]);

  useEffect(() => {
    if (selectedTicket) fetchMessages(selectedTicket.id);
  }, [selectedTicket, fetchMessages]);

  // Submit new ticket
  async function submitTicket() {
    if (!userId || !ticketForm.subject || !ticketForm.details) return;
    setSaving(true);

    const { data: ticket } = await supabase
      .from("support_tickets")
      .insert({ user_id: userId, subject: ticketForm.subject, category: ticketForm.category })
      .select()
      .single();

    if (ticket) {
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        from_type: "user",
        message_text: ticketForm.details,
      });
    }

    setShowNewTicket(false);
    setTicketForm({ category: "General", subject: "", details: "" });
    setSaving(false);
    await fetchTickets();
  }

  // Send reply
  async function sendReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setSaving(true);

    await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      from_type: "user",
      message_text: replyText.trim(),
    });

    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedTicket.id);

    setReplyText("");
    setSaving(false);
    await fetchMessages(selectedTicket.id);
    await fetchTickets();
  }

  // Article filtering
  const filteredSections = ARTICLE_SECTIONS.map((section) => ({
    ...section,
    articles: section.articles.filter((a) => {
      if (!articleSearch) return true;
      const q = articleSearch.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    }),
  })).filter((s) => s.articles.length > 0);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, color: "#1C1917", marginBottom: 8 }}>
          Support
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-stone-500)", lineHeight: 1.6, fontFamily: "var(--font-sans)", maxWidth: 600 }}>
          Help articles, support requests, and a walkthrough of how DocketAlly works.
        </p>
      </div>

      {/* Tab pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {([
          { key: "articles" as Tab, label: "Help Articles" },
          { key: "tickets" as Tab, label: "Your Tickets" },
          { key: "how" as Tab, label: "How It Works" },
        ]).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 18px",
                borderRadius: 20,
                border: isActive ? "1px solid var(--color-green)" : "1px solid var(--color-stone-200)",
                background: isActive ? "var(--color-green-soft)" : "#fff",
                color: isActive ? "var(--color-green-text)" : "var(--color-stone-600)",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) { e.currentTarget.style.borderColor = "var(--color-stone-300)"; e.currentTarget.style.background = "var(--color-stone-50)"; }
              }}
              onMouseLeave={(e) => {
                if (!isActive) { e.currentTarget.style.borderColor = "var(--color-stone-200)"; e.currentTarget.style.background = "#fff"; }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/*  HELP ARTICLES TAB                                            */}
      {/* ============================================================ */}
      {activeTab === "articles" && (
        <>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 24 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={articleSearch}
              onChange={(e) => setArticleSearch(e.target.value)}
              placeholder="Search help articles..."
              style={{ ...inputStyle, paddingLeft: 38 }}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>

          {filteredSections.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
              <p style={{ fontSize: 14, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)" }}>
                No articles match your search.
              </p>
            </div>
          ) : (
            filteredSections.map((section) => (
              <div key={section.label} style={{ marginBottom: 28 }}>
                <span style={labelStyle}>{section.label}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {section.articles.map((article) => {
                    const key = `${section.label}-${article.title}`;
                    const isOpen = expandedArticle === key;
                    return (
                      <div key={key} style={{ border: "1px solid var(--color-stone-200)", borderRadius: 12, overflow: "hidden" }}>
                        <button
                          onClick={() => setExpandedArticle(isOpen ? null : key)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "16px 20px",
                            background: isOpen ? "var(--color-stone-50)" : "#fff",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = "var(--color-stone-50)"; }}
                          onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = "#fff"; }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1917", fontFamily: "var(--font-sans)" }}>
                                {article.title}
                              </span>
                              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-stone-400)", fontWeight: 600, whiteSpace: "nowrap" }}>
                                {article.readTime}
                              </span>
                            </div>
                            <p style={{ fontSize: 13, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)", margin: 0, lineHeight: 1.4 }}>
                              {article.description}
                            </p>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div style={{ padding: "0 20px 20px", background: "#fff" }}>
                            <div style={{ fontSize: 14, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                              {article.content}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ============================================================ */}
      {/*  YOUR TICKETS TAB                                             */}
      {/* ============================================================ */}
      {activeTab === "tickets" && (
        <>
          {/* Ticket detail view */}
          {selectedTicket ? (
            <>
              <button
                onClick={() => { setSelectedTicket(null); setTicketMessages([]); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)", color: "var(--color-stone-500)", marginBottom: 20 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to tickets
              </button>

              {/* Ticket header */}
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={ticketStatusBadge(selectedTicket.status)}>{selectedTicket.status.replace(/_/g, " ")}</span>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)", letterSpacing: "0.02em", textTransform: "uppercase", color: "#57534E", background: "#F5F5F4", border: "1px solid #E7E5E4" }}>{selectedTicket.category}</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-stone-400)" }}>
                    #{selectedTicket.id.slice(0, 8)}
                  </span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1C1917", fontFamily: "var(--font-sans)", marginBottom: 4 }}>
                  {selectedTicket.subject}
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-stone-400)", fontFamily: "var(--font-mono)", margin: 0 }}>
                  Opened {formatDateTime(selectedTicket.created_at)}
                </p>
              </div>

              {/* Messages */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {ticketMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      padding: "14px 18px",
                      borderRadius: 12,
                      background: msg.from_type === "user" ? "#F5F5F4" : "#F0FDF4",
                      border: msg.from_type === "user" ? "1px solid #E7E5E4" : "1px solid #BBF7D0",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", color: msg.from_type === "user" ? "#57534E" : "#15803D", textTransform: "uppercase" }}>
                        {msg.from_type === "user" ? "You" : "Support"}
                      </span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-stone-400)" }}>
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: "#1C1917", fontFamily: "var(--font-sans)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>
                      {msg.message_text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply or resolved */}
              {selectedTicket.status === "resolved" ? (
                <div style={{ ...cardStyle, textAlign: "center", padding: "24px" }}>
                  <p style={{ fontSize: 14, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)", margin: 0 }}>
                    Resolved. Need more help? Open a new ticket.
                  </p>
                </div>
              ) : (
                <div style={{ ...cardStyle }}>
                  <label style={labelStyle}>Reply</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    style={textareaStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <button
                      onClick={sendReply}
                      disabled={saving || !replyText.trim()}
                      style={{ ...btnGreen, padding: "8px 20px", fontSize: 13, opacity: saving || !replyText.trim() ? 0.5 : 1 }}
                    >
                      {saving ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* New ticket button */}
              {!showNewTicket && (
                <button
                  onClick={() => setShowNewTicket(true)}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: 12,
                    border: "2px dashed var(--color-green)",
                    background: "transparent",
                    color: "var(--color-green-text)",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-green-soft)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Support Request
                </button>
              )}

              {/* New ticket form */}
              {showNewTicket && (
                <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid var(--color-green)", borderLeft: "3px solid var(--color-green)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Category</label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        style={inputStyle}
                        onFocus={focusInput}
                        onBlur={blurInput}
                      >
                        {TICKET_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Subject</label>
                      <input
                        type="text"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        placeholder="Brief description of your issue"
                        style={inputStyle}
                        onFocus={focusInput}
                        onBlur={blurInput}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Details</label>
                      <textarea
                        value={ticketForm.details}
                        onChange={(e) => setTicketForm({ ...ticketForm, details: e.target.value })}
                        placeholder="Describe what you need help with"
                        style={textareaStyle}
                        onFocus={focusInput}
                        onBlur={blurInput}
                      />
                    </div>
                    <p style={{ fontSize: 12, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)", fontStyle: "italic", margin: 0 }}>
                      We typically respond within a few hours. Your support request does not include any of your record content.
                    </p>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button onClick={() => setShowNewTicket(false)} style={btnOutline}>Cancel</button>
                      <button
                        onClick={submitTicket}
                        disabled={saving || !ticketForm.subject || !ticketForm.details}
                        style={{ ...btnGreen, padding: "8px 20px", fontSize: 13, opacity: saving || !ticketForm.subject || !ticketForm.details ? 0.5 : 1 }}
                      >
                        {saving ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket list */}
              {tickets.length === 0 && !showNewTicket ? (
                <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
                  <p style={{ fontSize: 14, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)" }}>
                    No support tickets yet. If you need help, open a new request above.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      style={{
                        ...cardStyle,
                        padding: "16px 20px",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-stone-300)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-stone-200)"; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={ticketStatusBadge(ticket.status)}>{ticket.status.replace(/_/g, " ")}</span>
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "#57534E", background: "#F5F5F4", border: "1px solid #E7E5E4" }}>{ticket.category}</span>
                          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-stone-400)" }}>
                            #{ticket.id.slice(0, 8)}
                          </span>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: "#1C1917", fontFamily: "var(--font-sans)", margin: 0, marginBottom: 2 }}>
                          {ticket.subject}
                        </p>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-stone-400)" }}>
                          Updated {formatDateTime(ticket.updated_at)}
                        </span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/*  HOW IT WORKS TAB                                             */}
      {/* ============================================================ */}
      {activeTab === "how" && (
        <>
          {/* Info banner */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "14px 18px", marginBottom: 28, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p style={{ fontSize: 13, color: "#1E40AF", fontFamily: "var(--font-sans)", lineHeight: 1.6, margin: 0 }}>
              DocketAlly helps you document workplace events, organize them into a case, and generate professional documentation. Here&apos;s how the pieces fit together.
            </p>
          </div>

          {/* Steps with vertical line */}
          <div style={{ position: "relative", paddingLeft: 48 }}>
            {/* Vertical line */}
            <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: "var(--color-stone-200)" }} />

            {HOW_STEPS.map((step) => {
              const isOpen = expandedStep === step.number;
              return (
                <div key={step.number} style={{ position: "relative", marginBottom: 16 }}>
                  {/* Green numbered dot */}
                  <div style={{
                    position: "absolute",
                    left: -37,
                    top: 14,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--color-green)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: "#fff",
                    zIndex: 1,
                  }}>
                    {step.number}
                  </div>

                  <div style={{ border: "1px solid var(--color-stone-200)", borderRadius: 12, overflow: "hidden" }}>
                    <button
                      onClick={() => setExpandedStep(isOpen ? null : step.number)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "16px 20px",
                        background: isOpen ? "var(--color-stone-50)" : "#fff",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1917", fontFamily: "var(--font-sans)" }}>
                        {step.title}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 20px 20px", background: "#fff" }}>
                        <p style={{ fontSize: 14, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", lineHeight: 1.8, margin: 0 }}>
                          {step.detail}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
