"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = "articles" | "tickets" | "how";

type ArticleCategory =
  | "Getting Started"
  | "Using DocketAlly"
  | "Preparing to Leave"
  | "Building Your Case"
  | "Using Templates"
  | "Plans & PIPs"
  | "Privacy & Security";

interface Article {
  title: string;
  description: string;
  readTime: string;
  content: React.ReactNode;
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
/*  Content Components                                                 */
/* ------------------------------------------------------------------ */

function Ap({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 24px" }}>{children}</p>;
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#F0FDF4",
      borderLeft: "3px solid #22C55E",
      borderRadius: "0 8px 8px 0",
      padding: "14px 18px",
      margin: "20px 0",
      fontSize: 14,
      color: "#15803D",
      lineHeight: 1.7,
    }}>
      {children}
    </div>
  );
}

function TabLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ color: "var(--color-green-text)", fontWeight: 600, textDecoration: "none" }}>
      {label} &rarr;
    </Link>
  );
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
        content: (
          <>
            <Ap>Opening a new record takes less than two minutes, and those two minutes can make a real difference down the line. Head to the Record tab, click &ldquo;New Record,&rdquo; and start with the basics: what happened, when it happened, and who was there.</Ap>
            <Ap>Pick the entry type that best fits the situation. If your manager pulled you into an unexpected meeting about performance, that might be a &ldquo;1:1 Meeting&rdquo; or a &ldquo;PIP Conversation&rdquo; depending on the content. If you received an email changing your responsibilities, that&apos;s &ldquo;Written Communication.&rdquo; Don&apos;t overthink the category, the important thing is getting it documented.</Ap>
            <Ap>Write your narrative the way you&apos;d explain it to a colleague: clearly and without embellishment. Stick to what happened, what was said, and what was decided. Skip the emotional reactions for now. You can always add context later, but you can&apos;t recover details you&apos;ve forgotten.</Ap>
            <Callout>The best time to create a record is right after the event happens. Details fade fast. Even waiting a day can cost you specifics that matter.</Callout>
            <Ap>Your record is saved to your personal timeline the moment you submit it. Over time, these entries build into something much more powerful than any single note. <TabLink href="/dashboard" label="Go to Record" /></Ap>
          </>
        ),
      },
      {
        title: "Choosing the right entry type",
        description: "When to use 1:1 Meeting vs. Incident vs. Written Communication.",
        readTime: "3 min",
        content: (
          <>
            <Ap>Entry types aren&apos;t just labels. They help DocketAlly identify patterns and organize your timeline. Choosing the right one makes your documentation more useful, both for you and for anyone who might review it later.</Ap>
            <Ap>Use &ldquo;1:1 Meeting&rdquo; for regular check-ins, performance discussions, or any scheduled conversation with your manager. &ldquo;Written Communication&rdquo; is for emails, Slack messages, or letters you want on record, especially follow-ups where you&apos;re putting a verbal conversation into writing. &ldquo;Incident&rdquo; covers specific events that stand out: being excluded from a meeting, a policy applied inconsistently, or a confrontation.</Ap>
            <Ap>&ldquo;PIP Conversation&rdquo; and &ldquo;HR Interaction&rdquo; are more targeted. Use PIP Conversation for anything directly tied to a performance improvement plan. Use HR Interaction any time human resources is involved, whether you reached out to them or they came to you.</Ap>
            <Callout>Don&apos;t overlook &ldquo;Positive Evidence.&rdquo; Documenting praise, strong reviews, and recognition creates a record of good performance that can become critical if your employer later claims otherwise.</Callout>
            <Ap>&ldquo;Self-Documentation&rdquo; is your personal perspective on something that doesn&apos;t fit neatly elsewhere. &ldquo;Other&rdquo; works as a catch-all when nothing else fits. The most important thing is that you&apos;re documenting. The category is secondary. <TabLink href="/dashboard" label="Go to Record" /></Ap>
          </>
        ),
      },
      {
        title: "What to write and what to skip",
        description: "Keep it factual, specific, and useful.",
        readTime: "3 min",
        content: (
          <>
            <Ap>The most useful records read like a professional putting things in writing, not a diary entry. Focus on what happened, when, where, and who was present. Include direct quotes when you can remember them. Note any commitments, decisions, or follow-up items that came out of the conversation.</Ap>
            <Ap>What you leave out matters just as much. Skip emotional reactions, personal opinions about someone&apos;s character, and speculation about why someone did what they did. Instead of writing &ldquo;My manager was being unfair,&rdquo; try something like &ldquo;My manager assigned three additional projects on Friday afternoon with Monday deadlines, after I had already reported working 55 hours that week.&rdquo; The second version is specific, factual, and far more useful to anyone reviewing your records.</Ap>
            <Ap>Always fill in the People field with full names. This builds a record of who was present and who was involved, which becomes valuable if you ever need to reference these events formally. Think of it as creating a witness list that assembles itself over time.</Ap>
            <Callout>A good test: would you be comfortable with an attorney, an HR representative, or a judge reading this record? If yes, you&apos;ve struck the right tone.</Callout>
            <Ap>The Facts and Follow-Up fields are optional but powerful. Use Facts for specific data points: numbers, dates, policy references. Use Follow-Up to note anything that was promised or needs to happen next. These small details add up.</Ap>
          </>
        ),
      },
    ],
  },
  {
    label: "Using DocketAlly",
    articles: [
      {
        title: "Understanding your documentation patterns",
        description: "How documentation consistency, frequency, and coverage affect your position.",
        readTime: "4 min",
        content: (
          <>
            <Ap>The strength of your documentation isn&apos;t just about how many records you have. It&apos;s about consistency, frequency, and coverage. Understanding these patterns helps you build a stronger position over time.</Ap>
            <Ap><strong>Why consistency matters.</strong> Regular documentation, even just one or two records per week, creates a steady timeline that&apos;s hard to dismiss. When records are evenly spaced, they show someone who was diligently tracking events as they happened. Clusters of records all created on the same day look different. They suggest after-the-fact documentation, which is less credible even if the content is accurate.</Ap>
            <Ap><strong>Gaps in documentation.</strong> Long periods with no records can signal several things: a quiet period at work, a time when you forgot to document, or a period when things were happening but you didn&apos;t capture them. If there&apos;s a gap in your timeline followed by a sudden burst of records, a reader might wonder what changed. The best way to avoid gaps is to make documentation a regular habit, not something you do only when things go wrong.</Ap>
            <Ap><strong>Coverage across entry types.</strong> Strong documentation uses a variety of entry types. If all your records are &ldquo;Incident&rdquo; entries, it paints a one-dimensional picture. But a mix of 1:1 Meetings, Written Communications, HR Interactions, and Positive Evidence creates a fuller, more credible account. It shows you were documenting your work life, not just building a complaint.</Ap>
            <Callout>Add Self-Documentation entries for your own observations and reflections. Follow up every HR interaction in writing, even if it&apos;s just a brief email confirming what was discussed. These habits fill gaps and strengthen your timeline.</Callout>
            <Ap>Patterns emerge from consistent documentation. The more regularly you record events, the clearer the picture becomes, both for you and for anyone who reviews your case. <TabLink href="/dashboard" label="Start a new record" /></Ap>
          </>
        ),
      },
      {
        title: "What makes strong evidence",
        description: "Entry types, positive evidence, contradictions, and what strengthens a case.",
        readTime: "4 min",
        content: (
          <>
            <Ap>Not all records carry the same weight. Understanding what makes documentation strong helps you focus on what matters most.</Ap>
            <Ap><strong>What positive evidence looks like.</strong> Positive evidence (strong performance reviews, emails with praise, promotions, awards, and recognition) is some of the most powerful documentation you can have. It establishes a baseline of good performance. If your employer later claims you were underperforming, your positive evidence directly contradicts that narrative.</Ap>
            <Ap><strong>Why contradictions strengthen cases.</strong> One of the most compelling patterns in employment cases is a contradiction between positive feedback and negative actions. A glowing performance review followed by a PIP two weeks later raises immediate questions. A promotion followed by sudden exclusion from meetings tells a story. These contradictions don&apos;t happen by accident, and documenting both sides makes the pattern visible.</Ap>
            <Ap><strong>When to use each entry type.</strong> Use &ldquo;Written Communication&rdquo; when you have or can create a paper trail: emails, messages, letters. Use &ldquo;1:1 Meeting&rdquo; for conversations with your manager, even casual ones where something important was said. Use &ldquo;HR Interaction&rdquo; any time human resources is involved. Use &ldquo;Positive Evidence&rdquo; more than you think you should. It&apos;s the most commonly under-documented entry type.</Ap>
            <Callout>The most common mistake is only documenting negative events. Strong cases show the full picture: positive performance, negative treatment, and the contradiction between the two. Document the good as carefully as you document the bad.</Callout>
            <Ap>How patterns emerge from consistent documentation is what makes a case compelling. Individual records are data points. Together, they tell a story that speaks for itself. <TabLink href="/dashboard" label="Start a new record" /></Ap>
          </>
        ),
      },
    ],
  },
  {
    label: "Preparing to Leave",
    articles: [
      {
        title: "Exit readiness assessment",
        description: "Everything you should have in place before your last day.",
        readTime: "5 min",
        content: (
          <>
            <Ap>Leaving a job, whether voluntarily or not, is one of the most consequential moments in an employment situation. Preparation isn&apos;t about pessimism. It&apos;s about making sure you&apos;re positioned well regardless of what happens next.</Ap>
            <Ap><strong>Documentation readiness.</strong> The foundation of your position is your record. Five or more documented entries give you a meaningful timeline. More is better, but consistency matters more than volume. Your records should span enough time to show a pattern, ideally at least a week between your earliest and most recent entries. If you&apos;ve uploaded supporting documents to the Vault (offer letters, reviews, emails), those strengthen your position further.</Ap>
            <Ap><strong>Case readiness.</strong> Your Case Info section should be filled in with your name, employer, role, and a summary of your situation. Key events in your timeline should be flagged, the ones you&apos;d want an attorney to see first. If DocketAlly has detected patterns in your documentation, review them to make sure they align with your understanding of the situation.</Ap>
            <Ap><strong>Plan tracking.</strong> If you&apos;re on a PIP or formal performance plan, your goals, check-ins, and any revisions should be documented in the Plans tab. This is especially important if goals have changed since the plan started. A complete plan history shows exactly how you engaged with the process.</Ap>
            <Ap><strong>Personal readiness.</strong> Beyond DocketAlly, there are things you should do while you still have access. Save copies of your employment contract, recent performance reviews, and any emails that document commitments or praise. Review your company&apos;s severance and separation policies. Know what your non-compete and non-solicitation clauses say. Consider scheduling a consultation with an employment attorney before you need one urgently. Have a financial plan for the transition period.</Ap>
            <Callout>Don&apos;t wait until your last day to prepare. The best time to organize your documentation and personal files is while you still have access to information and while events are fresh.</Callout>
            <Ap>Think of readiness as making sure your parachute is packed before you need it. Completing these steps doesn&apos;t mean you&apos;re planning to leave. It means you&apos;ll be ready if the situation changes. <TabLink href="/dashboard/case" label="Check your documentation strength" /></Ap>
          </>
        ),
      },
      {
        title: "Understanding severance",
        description: "What to look for, how long you have, and what's negotiable.",
        readTime: "5 min",
        content: (
          <>
            <Ap><strong>What severance is.</strong> Severance pay is not required by law in most situations. It&apos;s a negotiated agreement between you and your employer, typically offered in exchange for a release of legal claims. The fact that it&apos;s offered at all usually means your employer sees value in a clean separation, which means you have negotiating power.</Ap>
            <Ap><strong>What&apos;s typically included.</strong> A standard severance package may include a lump-sum payment (often based on tenure), continuation of health insurance through COBRA, payout of unused PTO, a reference agreement, and a non-disparagement clause. Some packages include outplacement services or extended access to company benefits. Read every section carefully. What&apos;s not included matters as much as what is.</Ap>
            <Ap><strong>Negotiation.</strong> Everything in a severance agreement is negotiable. The first offer is a starting point, not a final answer. Common negotiation points include the payment amount, COBRA coverage duration, reference wording, non-compete scope, and the release language itself. If you&apos;ve been documenting workplace issues, that documentation gives the release real value, and the severance amount should reflect it.</Ap>
            <Ap><strong>When to involve an attorney.</strong> If the severance amount is significant, if you&apos;re being asked to release discrimination or retaliation claims, or if you&apos;re unsure about any clause, consult an employment attorney before signing. Many offer free or low-cost initial consultations. The cost of a review is almost always worth it.</Ap>
            <Callout>If you&apos;re 40 or older, federal law (the Older Workers Benefit Protection Act) requires your employer to give you at least 21 days to review a severance agreement and 7 days to revoke your signature after signing. Don&apos;t let anyone rush you.</Callout>
            <Ap><strong>What NOT to do.</strong> Don&apos;t sign immediately, even if you&apos;re pressured. Don&apos;t discuss the terms with coworkers (most agreements prohibit this). Don&apos;t stop documenting. Events during the separation process matter too. And don&apos;t assume the first offer is the best you can get.</Ap>
          </>
        ),
      },
      {
        title: "Filing a complaint",
        description: "Step-by-step overview of the discrimination charge process.",
        readTime: "6 min",
        content: (
          <>
            <Ap><strong>What the EEOC is.</strong> The Equal Employment Opportunity Commission is the federal agency that enforces laws against workplace discrimination based on race, sex, age, disability, religion, national origin, and other protected characteristics. Filing a charge with the EEOC is often the first formal step in pursuing a discrimination claim.</Ap>
            <Ap><strong>When to file.</strong> You generally have 180 days from the discriminatory act to file a charge. In states with their own anti-discrimination agencies (most states), that deadline extends to 300 days. These deadlines are strict. Missing them can mean losing your right to pursue the claim entirely.</Ap>
            <Ap><strong>How to file.</strong> You can file online through the EEOC&apos;s public portal, in person at a local EEOC office, or by mail. The process starts with an intake questionnaire where you describe what happened. You don&apos;t need an attorney to file, though consulting one beforehand can help you frame the complaint effectively and identify all applicable claims.</Ap>
            <Ap><strong>What happens after filing.</strong> The EEOC notifies your employer within 10 days and may offer mediation as a voluntary first step. If mediation doesn&apos;t resolve the matter or either party declines, the EEOC moves to investigation. An investigator reviews evidence from both sides. This process can take several months to over a year.</Ap>
            <Ap><strong>Right to Sue letter.</strong> At any point during the EEOC process, you can request a Right to Sue letter. This letter gives you 90 days to file a lawsuit in federal court. If the EEOC completes its investigation without resolving the matter, they&apos;ll issue this letter automatically. The 90-day window is firm. Don&apos;t wait to find an attorney after receiving it.</Ap>
            <Ap><strong>State agencies and dual filing.</strong> Many states have their own anti-discrimination agencies that work with the EEOC through worksharing agreements. Filing with one often counts as filing with both, but check your state&apos;s specific process. State agencies sometimes offer broader protections than federal law.</Ap>
            <Callout>The filing deadline is strict. If you&apos;re considering an EEOC complaint, check your state&apos;s specific deadline and don&apos;t wait until the last week. Start the process as soon as you&apos;re ready.</Callout>
            <Ap>Your DocketAlly case file organizes exactly the kind of documentation the EEOC asks for: a chronological account of events, names and dates, supporting documents, and evidence of patterns. Having this organized before you file makes the process significantly smoother. <TabLink href="/dashboard/case" label="Generate your case file" /></Ap>
          </>
        ),
      },
      {
        title: "Leaving your job: what to document",
        description: "What to save, request, and avoid before your last day.",
        readTime: "4 min",
        content: (
          <>
            <Ap>The period between knowing you&apos;re leaving and actually walking out the door is critical. What you do, and don&apos;t do, during this window can significantly affect your position afterward.</Ap>
            <Ap><strong>What to save before your last day.</strong> While you still have access, save copies of anything that documents your performance, contributions, and communications. This includes performance reviews, emails with praise or commitments, pay stubs, bonus documentation, project records, and any written communications about your role or responsibilities. Save these to a personal device or personal email, not your work computer.</Ap>
            <Ap><strong>How to request your personnel file.</strong> Many states give employees the right to request a copy of their personnel file. This typically includes performance reviews, disciplinary records, and hiring documents. Submit this request in writing before your last day. Keep a copy of the request itself.</Ap>
            <Ap><strong>What NOT to sign without review.</strong> Before your last day, you may be asked to sign separation agreements, non-compete agreements, or other documents. Do not sign anything without reading it carefully. If the document includes a release of claims, consult an employment attorney before signing. You are almost never required to sign on the spot.</Ap>
            <Ap><strong>How to document your separation.</strong> Create a record in DocketAlly for each significant event during the separation process. How were you told? Who was present? What was said about the reason? Were you given anything in writing? What was the timeline? These details matter and fade quickly.</Ap>
            <Callout>If you&apos;re being let go, pay attention to what reason is given and whether it&apos;s consistent with your performance history. A sudden &ldquo;poor performance&rdquo; explanation after years of strong reviews is worth documenting carefully.</Callout>
            <Ap>The transition period is when documentation matters most. Every conversation, every document, every commitment should be captured while it&apos;s fresh. <TabLink href="/dashboard/comms" label="Use Comms templates to draft responses" /></Ap>
          </>
        ),
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
        content: (
          <>
            <Ap>You don&apos;t build a case in DocketAlly. Your case builds itself as you document. The Case tab reads from your records and organizes them into a visual timeline. The more consistently you document, the more complete your case becomes.</Ap>
            <Ap>The real power is in aggregation. A single record of being left off a meeting invite doesn&apos;t tell much of a story. But a dozen records over three months showing a pattern of exclusion, especially after you filed an HR complaint, that tells a very different story. The Case tab surfaces these connections so you can see them clearly.</Ap>
            <Ap>Start by filling out the Case Info section with your name, company, role, and a brief summary of your situation. This becomes the header of your case file and helps anyone reading it understand the context immediately. You can update it anytime.</Ap>
            <Callout>You don&apos;t need a minimum number of records to use the Case tab. Even two or three entries start forming a timeline. Start early and let it grow.</Callout>
            <Ap>The pattern detection engine scans your records for trends like increasing frequency, shifting expectations, and performance contradictions. These observations appear automatically as your documentation grows. <TabLink href="/dashboard/case" label="Go to Case" /></Ap>
          </>
        ),
      },
      {
        title: "Understanding patterns",
        description: "What patterns are, how they're identified, and what they mean.",
        readTime: "4 min",
        content: (
          <>
            <Ap>DocketAlly scans your records and surfaces patterns that might be significant. These aren&apos;t legal conclusions. They&apos;re observations based on your documentation that help you and your attorney see the bigger picture.</Ap>
            <Ap>Several types of patterns are tracked. Frequency analysis shows whether your documentation rate is increasing, which might indicate an escalating situation. Performance contradictions flag cases where positive feedback and negative actions occur close together, like receiving praise in a review but being placed on a PIP two weeks later. Exclusion patterns emerge when your records mention being removed from projects, meetings, or communication channels.</Ap>
            <Ap>The pattern engine also tracks people across your records. If one manager&apos;s name appears in the majority of your negative entries, that&apos;s visible at a glance. Timeline gaps are flagged too. Periods where you stopped documenting might represent missed opportunities or simply quieter times.</Ap>
            <Callout>Patterns are only as good as your records. Detailed, consistent entries with specific names, dates, and actions give the analysis more to work with. Vague records produce vague results.</Callout>
            <Ap>Think of pattern detection as a second pair of eyes on your documentation. It catches things you might miss when you&apos;re living through a situation day by day. <TabLink href="/dashboard/case" label="Go to Case" /></Ap>
          </>
        ),
      },
      {
        title: "Generating a case file PDF",
        description: "How to create, download, and share your complete documentation.",
        readTime: "2 min",
        content: (
          <>
            <Ap>When you need to share your documentation with an attorney, HR, or for your own records, the Case tab generates a complete PDF that organizes everything into a professional document.</Ap>
            <Ap>The PDF includes your case information, a complete chronological timeline of all records, pattern analysis, key statistics, and a list of linked vault documents. It&apos;s structured to give a reader (especially an attorney seeing your situation for the first time) a clear, organized picture of what&apos;s been happening.</Ap>
            <Ap>Click &ldquo;Generate PDF&rdquo; in the Case File view. The document is created entirely in your browser. Your data doesn&apos;t pass through any external service during generation. The filename includes today&apos;s date, so you can regenerate it over time and keep multiple versions.</Ap>
            <Callout>Before generating, make sure your Case Info section is filled out. It provides the context that makes the document immediately useful to a first-time reader.</Callout>
            <Ap>You can regenerate the PDF as many times as you want, at no cost. There&apos;s no reason to wait until everything is perfect. Generate an early version, share it if you need to, and create updated versions as you add more records. <TabLink href="/dashboard/case" label="Go to Case" /></Ap>
          </>
        ),
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
        content: (
          <>
            <Ap>Receiving a performance improvement plan can be stressful, but your first written response matters. The PIP Acknowledgment template in the Comms tab helps you respond professionally while protecting your position.</Ap>
            <Ap>The key is acknowledging receipt without agreeing with the content. Your response should confirm you received the document, request specific and measurable criteria for each goal, ask about the resources and support available to you, and note any factual disagreements for the record. Sign to acknowledge receipt only, and say so explicitly.</Ap>
            <Ap>Before responding, take time to review the PIP carefully. Compare it to your recent performance reviews and identify any inconsistencies. If you received a positive review two months ago and now you&apos;re on a PIP, that discrepancy is worth noting in your response and documenting separately.</Ap>
            <Callout>Don&apos;t rush your response. You typically have a few days to reply. Use that time to review, compare to past feedback, and write a thoughtful acknowledgment.</Callout>
            <Ap>The template gives you a professional starting point that you can customize to your situation. Edit it to match your specific circumstances, then send it. And after you send it, create a record in DocketAlly documenting that you responded and what you said. <TabLink href="/dashboard/comms" label="Go to Comms" /></Ap>
          </>
        ),
      },
      {
        title: "Meeting Follow-Up",
        description: "Turn a verbal conversation into a written record.",
        readTime: "3 min",
        content: (
          <>
            <Ap>One of the most powerful habits you can develop is sending a follow-up email after every important meeting. It turns a verbal conversation, which is your word against theirs, into a written record that both parties have seen.</Ap>
            <Ap>The Meeting Summary template helps you structure this naturally. Include the date, who was present, key discussion points, action items, and any agreements or commitments made. Close by inviting the other person to confirm your summary or correct anything you may have missed. If they don&apos;t respond, your summary stands as the record.</Ap>
            <Ap>What makes this effective is consistency. Don&apos;t just send follow-ups during conflict. Make it a regular professional practice after all significant meetings. When it&apos;s something you always do, it can&apos;t be characterized as adversarial behavior. It&apos;s just how you work.</Ap>
            <Callout>If someone says something important in a meeting but doesn&apos;t put it in writing, your follow-up email creates that written record for them. This is one of the simplest and most effective documentation strategies.</Callout>
            <Ap>After sending your follow-up, create a &ldquo;Written Communication&rdquo; record in DocketAlly with the key points. This ensures your timeline captures the conversation regardless of what happens to your email access later. <TabLink href="/dashboard/comms" label="Go to Comms" /></Ap>
          </>
        ),
      },
      {
        title: "HR Escalation",
        description: "When and how to escalate beyond your direct manager.",
        readTime: "4 min",
        content: (
          <>
            <Ap>Escalating to HR is a significant step, and preparation matters. Before filing a formal complaint, make sure you have a documented trail showing that you attempted to address the issue through other channels first. This establishes that escalation was a measured decision, not an impulsive reaction.</Ap>
            <Ap>The Formal HR Complaint template provides a professional structure for your escalation. Include specific incidents with dates, names, and what happened. Reference any prior attempts to resolve the matter informally: the meeting where you raised concerns, the email you sent, the follow-up that went unanswered. Be explicit about what you&apos;re requesting: an investigation, a response, protection from retaliation.</Ap>
            <Ap>After submitting your complaint, document the submission itself. Note when you filed it, who received it, what they told you about next steps and timeline. If they promise to follow up by a certain date, write that down. If they miss that date, document that too.</Ap>
            <Callout>The act of filing an HR complaint creates legal protections against retaliation in many jurisdictions. Document the filing carefully. It may become an important reference point in your timeline.</Callout>
            <Ap>Keep in mind that HR works for the company, not for you. That doesn&apos;t mean they won&apos;t help, but it means your documentation needs to be thorough enough to speak for itself regardless of the outcome. <TabLink href="/dashboard/comms" label="Go to Comms" /></Ap>
          </>
        ),
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
        content: (
          <>
            <Ap>If you&apos;ve been placed on a performance improvement plan, the Plans tab gives you a structured way to track every aspect of it. Start by creating a new plan with the exact name, start date, and end date from your official PIP document.</Ap>
            <Ap>Add each goal individually with its description and success criteria, exactly as they appear in the plan. This creates your baseline. If anything changes later, you&apos;ll have the original on record. Then, as you work through the PIP, log check-ins after each meeting with your manager about your progress.</Ap>
            <Ap>Check-ins capture what was discussed, what feedback was given, and any private observations you want to keep on record. You can link check-ins to specific records you&apos;ve created, connecting your formal plan tracking to your broader documentation.</Ap>
            <Callout>The plan dashboard shows your progress at a glance: days remaining, goal status, and a complete check-in history. Review it before every meeting with your manager so you&apos;re always prepared.</Callout>
            <Ap>The Plans tab isn&apos;t just for your own reference. The structured data it creates (goals with dates, check-in history, revision tracking) becomes part of your case documentation and can demonstrate exactly how you engaged with the process. <TabLink href="/dashboard/plans" label="Go to Plans" /></Ap>
          </>
        ),
      },
      {
        title: "When goals change",
        description: "What to do when your employer revises expectations mid-plan.",
        readTime: "3 min",
        content: (
          <>
            <Ap>If your manager changes a PIP goal, shifts the success criteria, or adds new expectations after the plan is already underway, that&apos;s worth paying close attention to. In the Plans tab, use the &ldquo;Flag as Revised&rdquo; button on the affected goal to capture exactly what changed.</Ap>
            <Ap>Flagging a revision saves the original goal description alongside the new one, records the date of the change, and lets you add notes about the circumstances. This creates a clear before-and-after record that shows the goalposts moved.</Ap>
            <Ap>Moving goalposts are one of the most common patterns in problematic PIPs. An employer who genuinely wants you to succeed will set clear criteria and stick to them. An employer who is managing you out may keep changing what success looks like so it stays just out of reach. Your revision history makes this pattern visible.</Ap>
            <Callout>Document every change, even small ones. A &ldquo;minor clarification&rdquo; to a goal&apos;s success criteria can fundamentally change what you need to deliver. The Goal Revision History captures all of this chronologically.</Callout>
            <Ap>The revision history appears at the bottom of the Plans page and is included in your case documentation. Even if a single revision seems minor, the cumulative pattern of changes tells a story. <TabLink href="/dashboard/plans" label="Go to Plans" /></Ap>
          </>
        ),
      },
      {
        title: "Making the most of check-ins",
        description: "How to document manager meetings during a PIP so nothing is lost.",
        readTime: "3 min",
        content: (
          <>
            <Ap>Check-ins are your record of every conversation with your manager about your performance plan. After each meeting, open the Plans tab, find your active plan, and log what was discussed. Capture the date, a summary of the conversation, any feedback your manager gave you, and your own private observations.</Ap>
            <Ap>The summary field should reflect what actually happened in the meeting. Did your manager acknowledge progress? Did they raise new concerns that weren&apos;t in the original plan? Did they promise resources or support? Write it down while it&apos;s fresh. The manager feedback field captures their exact words as closely as you can recall. This becomes part of your documented record.</Ap>
            <Ap>Private notes are for your eyes only. Use them to record things you noticed but didn&apos;t say out loud: a dismissive tone, contradictions with previous feedback, or the fact that a promised resource never materialized. These observations can reveal patterns over time that aren&apos;t obvious in any single meeting.</Ap>
            <Callout>Link each check-in to a Record entry when possible. This connects your plan tracking to your broader documentation timeline, making your case file more complete and easier to follow.</Callout>
            <Ap>Consistent check-in documentation does two things. It shows that you actively engaged with the improvement process, and it creates a paper trail if your employer&apos;s version of events later differs from yours. Both matter. <TabLink href="/dashboard/plans" label="Go to Plans" /></Ap>
          </>
        ),
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
        content: (
          <>
            <Ap>Only you. Your records are stored in a secure database with row-level security policies that enforce access at the database level. Your employer cannot see them. DocketAlly staff do not access user record content as part of normal operations.</Ap>
            <Ap>The technical foundation is Supabase with PostgreSQL row-level security. This means access rules aren&apos;t just enforced by the application. They&apos;re enforced by the database itself. Even if someone gained access to the application code, they couldn&apos;t query another user&apos;s records without that user&apos;s authentication credentials.</Ap>
            <Ap>Your vault documents are stored with the same protections. Files you upload are associated with your account and accessible only through your authenticated session. They aren&apos;t shared, indexed, or accessible to anyone else.</Ap>
            <Callout>If your employer monitors your work computer or network, access DocketAlly from a personal device on a personal network. Your documentation is too important to risk having it discovered before you&apos;re ready.</Callout>
            <Ap>We designed DocketAlly&apos;s security model around one principle: your workplace documentation is sensitive, and only you should control who sees it. That&apos;s not a feature. It&apos;s the foundation.</Ap>
          </>
        ),
      },
      {
        title: "Deleting your account",
        description: "How to remove all your data permanently.",
        readTime: "2 min",
        content: (
          <>
            <Ap>If you decide to remove all of your data from DocketAlly, you can delete your account through your profile settings. Deletion is permanent and removes everything: records, vault documents, plans, check-ins, goals, tickets, and all associated data.</Ap>
            <Ap>Before deleting, generate a case file PDF from the Case tab and download any vault documents you want to keep. Once your account is deleted, your data cannot be recovered. This is by design. When you ask us to delete your data, we actually delete it.</Ap>
            <Ap>If you&apos;re deleting because your workplace situation has been resolved, that&apos;s good news. But even then, consider keeping your documentation somewhere safe. Employment situations can resurface, and having records available, even offline, gives you options.</Ap>
            <Callout>Account deletion is immediate and irreversible. Download your case file PDF and vault documents before you delete. There is no recovery process.</Callout>
            <Ap>The deletion cascades through all related data. When your account goes, everything connected to it goes with it. No orphaned records, no lingering data, no exceptions.</Ap>
          </>
        ),
      },
      {
        title: "Exporting your data",
        description: "Download everything you've created at any time.",
        readTime: "2 min",
        content: (
          <>
            <Ap>You own your data, and you can take it with you at any time. The primary export method is the case file PDF, which generates a full document with your complete timeline, pattern analysis, statistics, and case information from the Case tab.</Ap>
            <Ap>Vault documents can be downloaded individually whenever you need them. They&apos;re stored exactly as you uploaded them: no conversion, no compression, no modification. What you put in is what you get out.</Ap>
            <Ap>For your complete documentation, the case file PDF is designed to be the definitive export. It includes everything a reader would need to understand your situation: background information, chronological records, detected patterns, key people, and a document index.</Ap>
            <Callout>There are no restrictions on exporting, no paywalls on downloads, and no limits on how many times you can generate your case file. Your data is yours.</Callout>
            <Ap>We recommend generating a fresh PDF periodically as you add records, and saving copies in a secure personal location. Cloud storage that your employer can&apos;t access, such as a personal Google Drive, Dropbox, or encrypted USB drive, works well. <TabLink href="/dashboard/case" label="Go to Case" /></Ap>
          </>
        ),
      },
    ],
  },
];

const ARTICLE_CATEGORIES: ArticleCategory[] = [
  "Getting Started",
  "Using DocketAlly",
  "Preparing to Leave",
  "Building Your Case",
  "Using Templates",
  "Plans & PIPs",
  "Privacy & Security",
];

function getCategoryBadgeStyle(category: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
  };
  switch (category) {
    case "Getting Started":
    case "Building Your Case":
      return { ...base, color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0" };
    case "Using DocketAlly":
      return { ...base, color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE" };
    case "Preparing to Leave":
      return { ...base, color: "#D97706", background: "#FFFBEB", border: "1px solid #FDE68A" };
    case "Using Templates":
    case "Privacy & Security":
      return { ...base, color: "#57534E", background: "#F5F5F4", border: "1px solid #E7E5E4" };
    case "Plans & PIPs":
      return { ...base, color: "#9333EA", background: "#FAF5FF", border: "1px solid #E9D5FF" };
    default:
      return { ...base, color: "#57534E", background: "#F5F5F4", border: "1px solid #E7E5E4" };
  }
}

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
  fontWeight: 700,
  color: "#292524",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid var(--color-stone-300)",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #D6D3D1",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  color: "#292524",
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
  color: "#292524",
  fontSize: 13,
  fontWeight: 600,
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
    return { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.02em", textTransform: "uppercase", color: "#1E40AF", background: "#DBEAFE", border: "1px solid #BFDBFE" };
  }
  if (status === "resolved") {
    return { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.02em", textTransform: "uppercase", color: "#15803D", background: "#F0FDF4", border: "1px solid #BBF7D0" };
  }
  // open
  return { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.02em", textTransform: "uppercase", color: "#92400E", background: "#FEF3C7", border: "1px solid #FDE68A" };
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
  const [activeArticleCategory, setActiveArticleCategory] = useState<ArticleCategory | "All">("All");
  const [selectedArticle, setSelectedArticle] = useState<{ sectionIdx: number; articleIdx: number } | null>(null);
  const [helpful, setHelpful] = useState<Record<string, "up" | "down">>({});
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

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

  // Article filtering — preserve original indices
  const filteredSections = ARTICLE_SECTIONS.map((section, sIdx) => ({
    ...section,
    sectionIdx: sIdx,
    articles: section.articles
      .map((a, aIdx) => ({ ...a, articleIdx: aIdx }))
      .filter((a) => {
        if (!articleSearch) return true;
        const q = articleSearch.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      }),
  })).filter((s) => {
    if (s.articles.length === 0) return false;
    if (activeArticleCategory !== "All" && s.label !== activeArticleCategory) return false;
    return true;
  });

  // Resolve selected article
  const currentArticle = selectedArticle
    ? ARTICLE_SECTIONS[selectedArticle.sectionIdx]?.articles[selectedArticle.articleIdx]
    : null;
  const currentSection = selectedArticle
    ? ARTICLE_SECTIONS[selectedArticle.sectionIdx]
    : null;
  const relatedArticles = selectedArticle
    ? ARTICLE_SECTIONS[selectedArticle.sectionIdx].articles
        .map((a, i) => ({ ...a, articleIdx: i }))
        .filter((_, i) => i !== selectedArticle.articleIdx)
    : [];
  const helpfulKey = selectedArticle ? `${selectedArticle.sectionIdx}-${selectedArticle.articleIdx}` : "";

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 26, fontWeight: 700, color: "#292524", marginBottom: 8 }}>
          Support
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-stone-600)", lineHeight: 1.6, fontFamily: "var(--font-sans)", maxWidth: 600 }}>
          Help articles, support requests, and a walkthrough of how DocketAlly works.
        </p>
      </div>

      {/* Tab pills */}
      <div className="da-support-tabs da-pills-scroll" style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {([
          { key: "articles" as Tab, label: "Help Articles" },
          { key: "tickets" as Tab, label: "Your Tickets" },
          { key: "how" as Tab, label: "How It Works" },
        ]).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedArticle(null);
              }}
              style={{
                padding: "10px 18px",
                borderRadius: 20,
                border: isActive ? "1px solid var(--color-green)" : "1px solid var(--color-stone-300)",
                background: isActive ? "var(--color-green-soft)" : "#fff",
                color: isActive ? "var(--color-green-text)" : "var(--color-stone-700)",
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
                if (!isActive) { e.currentTarget.style.borderColor = "var(--color-stone-300)"; e.currentTarget.style.background = "#fff"; }
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
          {/* ---- ARTICLE DETAIL VIEW ---- */}
          {selectedArticle && currentArticle && currentSection ? (
            <div>
              {/* Back button */}
              <button
                onClick={() => setSelectedArticle(null)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", color: "var(--color-stone-600)", marginBottom: 28 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#292524"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-stone-600)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Help Articles
              </button>

              {/* Article header */}
              <div style={{ marginBottom: 32 }}>
                <span style={{
                  display: "inline-block",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--color-stone-600)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}>
                  {currentSection.label}
                </span>
                <h2 style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#292524",
                  lineHeight: 1.3,
                  marginBottom: 10,
                }}>
                  {currentArticle.title}
                </h2>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--color-stone-500)",
                  fontWeight: 600,
                }}>
                  {currentArticle.readTime} read
                </span>
                {/* Green divider */}
                <div style={{
                  width: 60,
                  height: 1,
                  background: "var(--color-green)",
                  borderRadius: 1,
                  marginTop: 16,
                }} />
              </div>

              {/* Article body */}
              <div className="da-article-body" style={{
                maxWidth: 640,
                fontSize: 16,
                lineHeight: 1.8,
                color: "var(--color-stone-800)",
                fontFamily: "var(--font-sans)",
                marginBottom: 40,
              }}>
                {currentArticle.content}
              </div>

              {/* Footer divider */}
              <div style={{ height: 1, background: "var(--color-stone-300)", marginBottom: 28 }} />

              {/* Was this helpful? */}
              <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)" }}>
                  Was this helpful?
                </span>
                <button
                  onClick={() => setHelpful((h) => ({ ...h, [helpfulKey]: "up" }))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: helpful[helpfulKey] === "up" ? "1px solid var(--color-green)" : "1px solid var(--color-stone-300)",
                    background: helpful[helpfulKey] === "up" ? "#F0FDF4" : "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={helpful[helpfulKey] === "up" ? "#15803D" : "var(--color-stone-500)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                    <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                  </svg>
                </button>
                <button
                  onClick={() => setHelpful((h) => ({ ...h, [helpfulKey]: "down" }))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: helpful[helpfulKey] === "down" ? "1px solid #FCA5A5" : "1px solid var(--color-stone-300)",
                    background: helpful[helpfulKey] === "down" ? "#FEF2F2" : "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={helpful[helpfulKey] === "down" ? "#991B1B" : "var(--color-stone-500)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                    <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
                  </svg>
                </button>
                {helpful[helpfulKey] && (
                  <span style={{ fontSize: 12, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)" }}>
                    Thanks for your feedback
                  </span>
                )}
              </div>

              {/* Related articles */}
              {relatedArticles.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <span style={labelStyle}>Related Articles</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {relatedArticles.map((ra) => (
                      <button
                        key={ra.articleIdx}
                        onClick={() => {
                          setSelectedArticle({ sectionIdx: selectedArticle.sectionIdx, articleIdx: ra.articleIdx });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "14px 18px",
                          borderRadius: 12,
                          border: "1px solid var(--color-stone-300)",
                          background: "#fff",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-stone-300)"; e.currentTarget.style.background = "var(--color-stone-50)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-stone-300)"; e.currentTarget.style.background = "#fff"; }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)" }}>
                            {ra.title}
                          </span>
                          <p style={{ fontSize: 12, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", margin: "4px 0 0", lineHeight: 1.4 }}>
                            {ra.description}
                          </p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Still need help? */}
              <div style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: "var(--color-stone-50)",
                border: "1px solid var(--color-stone-300)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}>
                <span style={{ fontSize: 13, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)" }}>
                  Still need help?
                </span>
                <button
                  onClick={() => { setActiveTab("tickets"); setSelectedArticle(null); setShowNewTicket(true); }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--color-green)",
                    background: "var(--color-green-soft)",
                    color: "var(--color-green-text)",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Submit a support ticket &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* ---- ARTICLE LIST VIEW ---- */
            <>
              {/* Search */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
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

              {/* Category filter chips */}
              <div className="da-pills-scroll" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
                {(["All", ...ARTICLE_CATEGORIES] as const).map((cat) => {
                  const isActive = activeArticleCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveArticleCategory(cat)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 20,
                        border: isActive
                          ? "1px solid var(--color-green)"
                          : "1px solid var(--color-stone-300)",
                        background: isActive ? "var(--color-green-soft)" : "#fff",
                        color: isActive ? "var(--color-green-text)" : "var(--color-stone-700)",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-sans)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = "var(--color-stone-300)";
                          e.currentTarget.style.background = "var(--color-stone-50)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = "var(--color-stone-300)";
                          e.currentTarget.style.background = "#fff";
                        }
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {filteredSections.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                  <div style={{ textAlign: "center", maxWidth: 420, background: "#fff", borderRadius: 16, border: "1px solid var(--color-stone-300)", padding: "56px 40px" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 600, color: "#292524", marginBottom: 10 }}>
                      No articles found
                    </h2>
                    <p style={{ fontSize: 14, color: "var(--color-stone-600)", lineHeight: 1.6 }}>
                      Try adjusting your search or filter.
                    </p>
                  </div>
                </div>
              ) : (
                filteredSections.map((section) => (
                  <div key={section.label} style={{ marginBottom: 32 }}>
                    {/* Section header */}
                    <h2
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#292524",
                        marginBottom: 14,
                        paddingBottom: 8,
                        borderBottom: "1px solid var(--color-stone-100)",
                      }}
                    >
                      {section.label}
                    </h2>

                    {/* Card grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {section.articles.map((article) => (
                        <button
                          key={`${section.sectionIdx}-${article.articleIdx}`}
                          onClick={() => {
                            setSelectedArticle({ sectionIdx: section.sectionIdx, articleIdx: article.articleIdx });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          style={{
                            background: "#fff",
                            borderRadius: 14,
                            border: "1px solid var(--color-stone-300)",
                            padding: "20px 20px",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "border-color 0.15s, box-shadow 0.15s",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#D6D3D1";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.03)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-stone-300)";
                            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)";
                          }}
                        >
                          {/* Badge + read time */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={getCategoryBadgeStyle(section.label)}>{section.label}</span>
                            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-stone-500)", fontWeight: 700, whiteSpace: "nowrap" }}>
                              {article.readTime}
                            </span>
                          </div>
                          {/* Title */}
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)" }}>
                            {article.title}
                          </div>
                          {/* Description */}
                          <p
                            style={{
                              fontSize: 13,
                              color: "var(--color-stone-600)",
                              lineHeight: 1.6,
                              fontFamily: "var(--font-sans)",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as never,
                              overflow: "hidden",
                              margin: 0,
                            }}
                          >
                            {article.description}
                          </p>
                          {/* Read link */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 12,
                              color: "var(--color-green-text)",
                              fontWeight: 600,
                              fontFamily: "var(--font-sans)",
                              marginTop: "auto",
                            }}
                          >
                            Read article
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
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
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", color: "var(--color-stone-600)", marginBottom: 20 }}
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
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.02em", textTransform: "uppercase", color: "#292524", background: "#F5F5F4", border: "1px solid #D6D3D1" }}>{selectedTicket.category}</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-stone-500)" }}>
                    #{selectedTicket.id.slice(0, 8)}
                  </span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)", marginBottom: 4 }}>
                  {selectedTicket.subject}
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)", margin: 0 }}>
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
                      border: msg.from_type === "user" ? "1px solid #D6D3D1" : "1px solid #BBF7D0",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: msg.from_type === "user" ? "#292524" : "#15803D", textTransform: "uppercase" }}>
                        {msg.from_type === "user" ? "You" : "Support"}
                      </span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-stone-500)" }}>
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: "#292524", fontFamily: "var(--font-sans)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>
                      {msg.message_text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply or resolved */}
              {selectedTicket.status === "resolved" ? (
                <div style={{ ...cardStyle, textAlign: "center", padding: "24px" }}>
                  <p style={{ fontSize: 14, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", margin: 0 }}>
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
                    <p style={{ fontSize: 12, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)", fontStyle: "italic", margin: 0 }}>
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
                  <p style={{ fontSize: 14, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)" }}>
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
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-stone-300)"; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={ticketStatusBadge(ticket.status)}>{ticket.status.replace(/_/g, " ")}</span>
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "#292524", background: "#F5F5F4", border: "1px solid #D6D3D1" }}>{ticket.category}</span>
                          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-stone-500)" }}>
                            #{ticket.id.slice(0, 8)}
                          </span>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)", margin: 0, marginBottom: 2 }}>
                          {ticket.subject}
                        </p>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-stone-500)" }}>
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
          <div style={{ background: "#F5F5F4", border: "1px solid #E7E5E4", borderRadius: 10, padding: "14px 18px", marginBottom: 28, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p style={{ fontSize: 13, color: "#57534E", fontFamily: "var(--font-sans)", lineHeight: 1.6, margin: 0 }}>
              DocketAlly helps you document workplace events, organize them into a case, and generate professional documentation. Here&apos;s how the pieces fit together.
            </p>
          </div>

          {/* Steps accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {HOW_STEPS.map((step) => {
              const isOpen = expandedStep === step.number;
              const isActive = isOpen || hoveredStep === step.number;
              return (
                <div
                  key={step.number}
                  onMouseEnter={() => setHoveredStep(step.number)}
                  onMouseLeave={() => setHoveredStep(null)}
                  style={{ display: "flex", gap: 0 }}
                >
                  {/* Vertical green bar */}
                  <div style={{
                    width: 3,
                    flexShrink: 0,
                    borderRadius: 2,
                    background: isActive ? "#22C55E" : "#E7E5E4",
                    transition: "background 0.2s",
                  }} />

                  {/* Step content + chevron */}
                  <button
                    onClick={() => setExpandedStep(isOpen ? null : step.number)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "14px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {/* Step label */}
                      <div style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.06em",
                        color: "#A8A29E",
                        marginBottom: 4,
                      }}>
                        STEP {step.number}
                      </div>
                      {/* Step title */}
                      <div style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#292524",
                      }}>
                        {step.title}
                      </div>
                      {/* Expanded description */}
                      {isOpen && (
                        <p style={{
                          fontSize: 14,
                          color: "#57534E",
                          fontFamily: "var(--font-sans)",
                          lineHeight: 1.65,
                          margin: "10px 0 0",
                        }}>
                          {step.detail}
                        </p>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A8A29E"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        flexShrink: 0,
                        marginTop: 6,
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
