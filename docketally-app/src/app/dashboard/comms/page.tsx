"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSubscription } from "@/components/SubscriptionProvider";
import { hasActiveAccess } from "@/lib/subscription";
import ProGate from "@/components/ProGate";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Template {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  tag: "Critical" | "Weekly" | "Strategic";
  body: string;
}

type TemplateCategory =
  | "Responding to a PIP"
  | "Meeting Follow-Ups"
  | "Escalation & HR"
  | "Severance & Exit"
  | "Feedback & Reviews"
  | "Role & Compensation"
  | "Workplace Changes";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES: TemplateCategory[] = [
  "Responding to a PIP",
  "Meeting Follow-Ups",
  "Escalation & HR",
  "Severance & Exit",
  "Feedback & Reviews",
  "Role & Compensation",
  "Workplace Changes",
];

function getTagStyle(tag: string): React.CSSProperties {
  if (tag === "Critical") {
    return {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
      textTransform: "uppercase",
      color: "#991B1B",
      background: "#FEF2F2",
      border: "1px solid #FECACA",
    };
  }
  if (tag === "Strategic") {
    return {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
      textTransform: "uppercase",
      color: "#1E40AF",
      background: "#EFF6FF",
      border: "1px solid #BFDBFE",
    };
  }
  // Weekly
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    color: "#292524",
    background: "#F5F5F4",
    border: "1px solid #D6D3D1",
  };
}

const TEMPLATES: Template[] = [
  /* ---- Responding to a PIP ---- */
  {
    id: "pip-acknowledgment",
    title: "PIP Acknowledgment Letter",
    description:
      "Formally acknowledge receipt of a PIP while reserving your rights and requesting clarification on metrics.",
    category: "Responding to a PIP",
    tag: "Critical",
    body: `Dear [MANAGER NAME],

I am writing to acknowledge receipt of the Performance Improvement Plan dated [PIP DATE]. I have reviewed the document and understand that the company has outlined concerns regarding [AREA OF CONCERN].

I want to confirm that I am committed to meeting the expectations outlined, and I take this matter seriously. However, I would like to request clarification on a few points to ensure I can meet the stated objectives.

For [GOAL 1], I would appreciate knowing what specific, measurable benchmarks will be used to evaluate success. For [GOAL 2], can you confirm the resources and support that will be made available during this period? And for [GOAL 3], what is the timeline for each milestone, and how will progress be measured?

I also want to note the following for the record. [CONTEXT OR DISAGREEMENT, e.g.,"I was not previously informed that X was considered below expectations."] Additionally, [ADDITIONAL CONTEXT, e.g.,"I received a positive performance review on DATE."]

I would appreciate a meeting to discuss these points at your earliest convenience. Please confirm whether [HR REPRESENTATIVE NAME] will be involved in future check-ins.

I am signing this document to acknowledge receipt only. My signature does not indicate agreement with the characterizations or assessments contained within the PIP.

Sincerely,
[YOUR NAME]
[YOUR TITLE]
[DATE]`,
  },
  {
    id: "pip-clarification",
    title: "PIP Clarification Request",
    description:
      "Request specific, measurable criteria and challenge vague language in a PIP.",
    category: "Responding to a PIP",
    tag: "Strategic",
    body: `Dear [MANAGER NAME],

Thank you for the meeting on [MEETING DATE] regarding the Performance Improvement Plan. I want to ensure I fully understand the expectations so I can work toward meeting them effectively.

I am writing to request clarification on several areas.

Regarding metrics and measurement, the PIP states I need to "improve" in [AREA]. Could you provide the specific metric or KPI that defines success? I would also like to know what baseline measurement is being used to evaluate my current performance, how frequently progress will be measured, and who will conduct the evaluation.

Regarding the timeline, the PIP lists a [DURATION]-day timeline. I would appreciate knowing whether there are interim milestones or checkpoints, and what happens if I meet some but not all of the stated goals by the deadline.

On the topic of resources and support, will I have access to [TRAINING/MENTORING/TOOLS] as mentioned in our discussion? I would also like to confirm who my designated point of contact is for questions during this period.

Finally, regarding documentation, will I receive written feedback at each checkpoint? And how should I document my own progress? Is there a preferred format?

I am committed to this process and want to ensure transparency on both sides. I would appreciate written responses to the above so we have a shared understanding of the expectations.

Please let me know a good time to meet and discuss.

Best regards,
[YOUR NAME]
[YOUR TITLE]
[DATE]`,
  },
  {
    id: "pip-rebuttal",
    title: "PIP Rebuttal Letter",
    description:
      "Formally dispute the basis of a PIP with documented evidence and timeline of events.",
    category: "Responding to a PIP",
    tag: "Critical",
    body: `Dear [MANAGER NAME] and [HR REPRESENTATIVE NAME],

I am writing to formally respond to the Performance Improvement Plan issued on [PIP DATE]. While I acknowledge receipt of this document, I respectfully disagree with several of the characterizations and assessments contained within it.

I would like to address some factual corrections. The PIP states [SPECIFIC CLAIM FROM PIP]. However, [YOUR EVIDENCE TO THE CONTRARY, e.g.,"my quarterly metrics from Q1-Q3 show I exceeded the team average by X%."]. The PIP also references [ANOTHER CLAIM]. For the record, [YOUR DOCUMENTED RESPONSE, e.g.,"I raised this issue with management on DATE and received no response."]

I also have concerns about the timeline. On [DATE], I received a performance review rating of [RATING], with no mention of the concerns now cited. The issues described in the PIP were first raised on [DATE], giving me only [NUMBER] days before the PIP was issued. [ANY OTHER RELEVANT TIMELINE ITEMS]

For additional context, [RELEVANT CONTEXT, e.g.,"during this period, my team was reduced by 40% while my workload remained the same."]. [ADDITIONAL CONTEXT, e.g.,"I requested additional support on DATE and was told none was available."]

I am requesting a written response to the factual corrections above, a meeting with [HR / SKIP-LEVEL MANAGER] to discuss this matter, and clarification on whether an alternative to the PIP has been considered.

I remain committed to performing my role to the best of my ability. I am documenting this response for my personal records.

Sincerely,
[YOUR NAME]
[YOUR TITLE]
[DATE]`,
  },

  /* ---- Meeting Follow-Ups ---- */
  {
    id: "meeting-summary",
    title: "Meeting Summary Email",
    description:
      "Send a written summary after any workplace meeting to establish a paper trail of what was discussed and agreed.",
    category: "Meeting Follow-Ups",
    tag: "Weekly",
    body: `Dear [RECIPIENT NAME],

Thank you for meeting with me on [MEETING DATE]. I wanted to follow up with a written summary of what we discussed to make sure we are aligned.

The meeting took place on [MEETING DATE] at [MEETING TIME], held at [LOCATION / VIRTUAL PLATFORM]. The attendees were [LIST OF ATTENDEES].

We covered several key discussion points. First, we discussed [TOPIC 1], specifically [BRIEF SUMMARY OF WHAT WAS DISCUSSED]. We also talked about [TOPIC 2], where [BRIEF SUMMARY OF WHAT WAS DISCUSSED]. Finally, we addressed [TOPIC 3], and [BRIEF SUMMARY OF WHAT WAS DISCUSSED].

In terms of action items, [YOUR NAME] will [ACTION ITEM] by [DATE]. [OTHER PERSON] will [ACTION ITEM] by [DATE]. [ADDITIONAL ACTION ITEMS]

We also reached some agreements. We agreed that [AGREEMENT 1], and we agreed that [AGREEMENT 2].

Please let me know if I have mischaracterized anything or if you have additions. If I don't hear back, I will consider this an accurate record of our discussion.

Best regards,
[YOUR NAME]`,
  },
  {
    id: "one-on-one-followup",
    title: "1:1 Follow-Up",
    description:
      "Document key takeaways from your regular 1:1 meetings, especially when performance or expectations are discussed.",
    category: "Meeting Follow-Ups",
    tag: "Weekly",
    body: `Hi [MANAGER NAME],

Thanks for the 1:1 today. I want to make sure I captured the key points correctly.

On the feedback side, [FEEDBACK ITEM 1, e.g.,"you mentioned I should prioritize X project over Y."]. You also noted [FEEDBACK ITEM 2, e.g.,"that my presentation last week went well."]. [FEEDBACK ITEM 3]

From my end, I shared that [YOUR UPDATE, e.g.,"the Q2 report is on track for Friday delivery."]. I also raised [CONCERN/QUESTION, e.g.,"the timeline for the product launch may need adjustment."]

For next steps, I will [ACTION ITEM] by [DATE]. You mentioned you would [ACTION ITEM, e.g.,"follow up with the team about resource allocation."]

Please let me know if I missed anything. Looking forward to our next check-in on [NEXT MEETING DATE].

Best,
[YOUR NAME]`,
  },
  {
    id: "verbal-warning-followup",
    title: "Verbal Warning Follow-Up",
    description:
      "Create a written record after receiving a verbal warning or informal reprimand.",
    category: "Meeting Follow-Ups",
    tag: "Critical",
    body: `Dear [MANAGER NAME],

I am following up on our conversation on [DATE] at [TIME] regarding [TOPIC OF WARNING]. I want to ensure I have an accurate understanding of what was communicated.

Based on our discussion, you stated that [SUMMARY OF WARNING, e.g.,"my recent project delivery was below expectations."]. You indicated that [CONSEQUENCE OR NEXT STEP, e.g.,"if this continues, it may result in a formal PIP."]. You also suggested I [RECOMMENDED ACTION, e.g.,"work more closely with the team lead on project planning."]

I want to note for the record that [CONTEXT, e.g.,"this is the first time this concern has been raised with me."]. I should also mention that [ADDITIONAL CONTEXT, e.g.,"I was not provided with written documentation of this warning."]. During our conversation, [YOUR RESPONSE, e.g.,"I explained that the delay was due to a dependency on another team."]

Going forward, I will [YOUR PLANNED ACTION] to address the concern raised. I would appreciate [YOUR REQUEST, e.g.,"written feedback going forward so I can track expectations clearly."]

Please confirm whether this accurately reflects our discussion. I am keeping a copy of this email for my personal records.

Regards,
[YOUR NAME]
[YOUR TITLE]
[DATE]`,
  },

  /* ---- Escalation & HR ---- */
  {
    id: "hr-complaint",
    title: "Formal HR Complaint",
    description:
      "File a formal written complaint with HR about workplace treatment, discrimination, or policy violations.",
    category: "Escalation & HR",
    tag: "Critical",
    body: `Dear [HR REPRESENTATIVE NAME],

I am writing to file a formal complaint regarding [NATURE OF COMPLAINT, e.g.,"workplace treatment," "harassment," "discrimination," "retaliation"]. I have attempted to resolve this matter informally but believe it requires formal attention.

[1-2 SENTENCE OVERVIEW, e.g.,"Over the past X months, I have experienced repeated instances of Y from Z, which I believe constitutes a violation of company policy."]

I would like to provide a detailed account of the relevant incidents. On [DATE], [SPECIFIC INCIDENT, include who was present, what was said/done, and the impact]. On [DATE], [SPECIFIC INCIDENT]. On [DATE], [SPECIFIC INCIDENT].

I have made prior attempts to resolve this. On [DATE], I raised this issue with [PERSON] and was told [RESPONSE]. On [DATE], I [ACTION TAKEN, e.g.,"sent an email requesting a meeting to discuss my concerns."]

I have supporting evidence available, including [EMAIL/DOCUMENT REFERENCE, e.g.,"an email from DATE regarding X"]. [WITNESS, e.g.,"NAME was present during the incident on DATE."] I also have [OTHER EVIDENCE, e.g.,"a performance review from DATE showing positive feedback."]

I am requesting a formal investigation into this matter, written confirmation that this complaint has been received and logged, information about the company's investigation process and expected timeline, and assurance that I will be protected from retaliation for filing this complaint.

I am available to meet at your earliest convenience to discuss further.

Sincerely,
[YOUR NAME]
[YOUR TITLE]
[DEPARTMENT]
[DATE]`,
  },
  {
    id: "skip-level-escalation",
    title: "Skip-Level Escalation",
    description:
      "Escalate concerns to your manager's manager when direct communication has been unsuccessful.",
    category: "Escalation & HR",
    tag: "Strategic",
    body: `Dear [SKIP-LEVEL MANAGER NAME],

I hope this message finds you well. I am reaching out directly because I have been unable to resolve a matter through the usual channels, and I believe it warrants your attention.

I have been in the [ROLE] position on the [TEAM NAME] team for [DURATION]. During this time, [BRIEF POSITIVE CONTEXT, e.g.,"I have consistently met or exceeded performance targets."]

The core concern is as follows. [CLEAR SUMMARY, e.g.,"I have raised concerns about X with my direct manager on multiple occasions, but the issue remains unaddressed."]

To give you a sense of the timeline, I first raised this on [DATE] when [FIRST ATTEMPT TO RESOLVE, e.g.,"I brought it up with NAME during our 1:1."]. I followed up on [DATE] by [SECOND ATTEMPT, e.g.,"sending an email (attached)."]. Most recently, on [DATE], [MOST RECENT ATTEMPT, e.g.,"I requested a meeting and did not receive a response."]

I am asking for [SPECIFIC REQUEST, e.g.,"an opportunity to discuss this matter with you directly."]. I would also welcome [ADDITIONAL REQUEST, e.g.,"a fair review of my performance concerns."]

I want to emphasize that I am raising this matter in good faith and with the goal of finding a constructive resolution. I have documentation available to support the points above.

Thank you for your time. I am available to meet at your convenience.

Respectfully,
[YOUR NAME]
[YOUR TITLE]
[DATE]`,
  },
  {
    id: "retaliation-documentation",
    title: "Retaliation Documentation Letter",
    description:
      "Document suspected retaliation following a complaint, HR report, or protected activity.",
    category: "Escalation & HR",
    tag: "Critical",
    body: `Dear [HR REPRESENTATIVE NAME],

I am writing to formally document what I believe to be retaliatory actions taken against me following [PROTECTED ACTIVITY, e.g.,"my formal complaint filed on DATE," "my request for accommodation on DATE," "my report of policy violations on DATE"].

Here is the timeline of events. On [DATE], I [PROTECTED ACTIVITY, e.g.,"filed a formal complaint about X."]. Then on [DATE], [FIRST RETALIATORY ACTION, e.g.,"I was removed from the Y project without explanation."]. On [DATE], [SECOND ACTION, e.g.,"my 1:1 meetings with my manager were cancelled for three consecutive weeks."]. On [DATE], [ADDITIONAL ACTION, e.g.,"I was excluded from a team meeting that all other team members attended."]

The change in treatment has been noticeable. Before [PROTECTED ACTIVITY DATE], [POSITIVE TREATMENT, e.g.,"I was included in all team decisions and received positive feedback."]. After [PROTECTED ACTIVITY DATE], [CHANGED TREATMENT, e.g.,"I have been excluded from meetings, reassigned from key projects, and received my first negative feedback."]

I have supporting documentation available. This includes [DOCUMENT 1, e.g.,"an email from DATE showing my inclusion on the project"], [DOCUMENT 2, e.g.,"calendar screenshots showing cancelled meetings"], and [DOCUMENT 3, e.g.,"a performance review from DATE showing strong ratings."]

I am requesting an immediate investigation into the pattern described above, written confirmation that this letter has been received and logged, protection from further retaliatory actions, and a meeting with [HR/LEGAL] to discuss next steps.

I am documenting this matter for my personal records as well.

Sincerely,
[YOUR NAME]
[YOUR TITLE]
[DATE]`,
  },

  /* ---- Severance & Exit ---- */
  {
    id: "severance-counter",
    title: "Severance Counteroffer Letter",
    description:
      "Respond to a severance offer with a professional counteroffer requesting better terms.",
    category: "Severance & Exit",
    tag: "Strategic",
    body: `Dear [HR REPRESENTATIVE NAME / MANAGER NAME],

Thank you for presenting the severance agreement dated [DATE]. I have carefully reviewed the terms and would like to propose the following modifications before signing.

As I understand it, the current offer includes [AMOUNT / WEEKS] in severance pay, [DURATION] of benefits continuation, and [SUMMARY OF KEY TERMS].

I respectfully request the following adjustments.

Regarding severance pay, [YOUR REQUESTED AMOUNT, e.g.,"I am requesting X weeks of base salary, increased from the offered Y weeks, reflecting my Z years of tenure."]

Regarding benefits, [YOUR REQUEST, e.g.,"I am requesting COBRA coverage paid by the company for X months instead of Y months."]

Regarding references, [YOUR REQUEST, e.g.,"I am requesting a neutral or positive reference letter, and agreement that the company will not contest unemployment benefits."]

Regarding non-disparagement, [YOUR REQUEST, e.g.,"I am requesting a mutual non-disparagement clause, applying to both parties equally."]

Regarding the transition timeline, [YOUR REQUEST, e.g.,"I am requesting X additional days to review and sign the agreement."]

My rationale is as follows. I have been with the company for [DURATION] and have [RELEVANT CONTRIBUTIONS]. [ADDITIONAL CONTEXT, e.g.,"The circumstances of my departure were not performance-related."]. [MARKET CONTEXT, e.g.,"Industry standard for my role and tenure is X weeks."]

I am open to discussing these points further. Please let me know a convenient time to meet. I may also seek independent legal review of the agreement, as is my right under [RELEVANT LAW, e.g.,"the Older Workers Benefit Protection Act" or "state law"].

Regards,
[YOUR NAME]
[DATE]`,
  },
  {
    id: "resignation-professional",
    title: "Professional Resignation Letter",
    description:
      "Resign from your position with a clear, professional tone while preserving your documented record.",
    category: "Severance & Exit",
    tag: "Strategic",
    body: `Dear [MANAGER NAME],

I am writing to formally notify you of my resignation from my position as [YOUR TITLE] at [COMPANY NAME], effective [LAST DAY, typically 2 weeks from date].

I have valued my time with the company and the opportunities for professional growth. I am committed to ensuring a smooth transition during my remaining time.

For the transition, I plan to complete [CURRENT PROJECT/TASK] by [DATE]. I am available to train my replacement or hand off responsibilities, and I will document [KEY PROCESSES/KNOWLEDGE] before my departure.

On the administrative side, please confirm the process for final pay, including any accrued PTO. I would also appreciate information about COBRA enrollment and benefits termination dates, as well as the return process for company equipment.

I want to note for the record that [OPTIONAL, e.g.,"my resignation is voluntary" or "I have documented my workplace concerns separately" or "this resignation follows the events I have previously reported to HR"]. I am retaining copies of my personal performance records and correspondence for my files.

Please send written confirmation of receipt of this resignation and my official last day.

Thank you for your time.

Sincerely,
[YOUR NAME]
[YOUR TITLE]
[DATE]`,
  },
  {
    id: "exit-interview-prep",
    title: "Exit Interview Talking Points",
    description:
      "Prepare structured talking points for your exit interview: what to say, what to document, and what to hold back.",
    category: "Severance & Exit",
    tag: "Weekly",
    body: `EXIT INTERVIEW PREPARATION NOTES
Date: [EXIT INTERVIEW DATE]
Interviewer: [NAME AND TITLE]

THINGS TO SAY

When discussing positive contributions, mention [ACHIEVEMENT 1, e.g.,"leading the X initiative which resulted in Y."] Also highlight [ACHIEVEMENT 2] and [ACHIEVEMENT 3].

For constructive feedback that is safe to share, consider mentioning [FEEDBACK 1, e.g.,"that the onboarding process could benefit from better documentation."] You could also note [FEEDBACK 2, e.g.,"that cross-team communication was sometimes challenging."]

When asked about your reason for departure, use this prepared statement: [PREPARED STATEMENT, e.g.,"I am pursuing a new opportunity that aligns with my career goals."]

THINGS TO DOCUMENT BUT NOT SAY

Keep these in your personal records but do not volunteer them in the exit interview. This includes [SENSITIVE ITEM 1, e.g.,"the specific incidents I reported to HR on DATE"], [SENSITIVE ITEM 2, e.g.,"my concerns about retaliation following my complaint"], and [SENSITIVE ITEM 3, e.g.,"details of the severance negotiation."]

QUESTIONS TO ASK

Ask whether you will receive a written summary of the exit interview. Ask about the reference policy, specifically who you can list and what will be disclosed. Confirm when you will receive your final paycheck and any owed PTO. Also ask about the timeline for COBRA enrollment paperwork.

REMINDERS

Be professional and measured throughout the conversation. Do not sign anything new without reviewing it first. Take notes during the interview, and request a copy of any documents presented.`,
  },

  /* ---- Feedback & Reviews ---- */
  {
    id: "request-written-feedback",
    title: "Request for Written Feedback",
    description:
      "Ask your manager to put verbal feedback in writing so it's on record.",
    category: "Feedback & Reviews",
    tag: "Strategic",
    body: `Hi [MANAGER NAME],

Thanks for the feedback you shared during [our conversation on DATE / our recent 1:1 / the team meeting]. I found it helpful and want to make sure I'm capturing it accurately.

Would you mind sending me a brief written version of what you shared? Even a few sentences would be great. I like to keep track of feedback I receive so I can reference it during review season and make sure I'm making progress in the right areas.

If it's easier, I'm happy to write up my understanding and send it to you for confirmation. Just let me know what works best.

Thanks,
[YOUR NAME]`,
  },
  {
    id: "performance-review-response",
    title: "Performance Review Response",
    description:
      "Respond professionally to a review you disagree with, using facts.",
    category: "Feedback & Reviews",
    tag: "Critical",
    body: `Hi [MANAGER NAME],

Thank you for completing my performance review. I appreciate the time you put into it and want to share some additional context on a few points.

Regarding [AREA OF DISAGREEMENT], I want to note that [SPECIFIC FACT OR EXAMPLE THAT CONTRADICTS THE ASSESSMENT]. For reference, [SUPPORTING DETAIL, e.g.,"this was acknowledged in your email on DATE" or "the project was delivered on DATE, ahead of the original deadline"].

I also want to highlight [ACCOMPLISHMENT OR CONTRIBUTION NOT MENTIONED IN THE REVIEW], which I believe is relevant to the overall assessment of my performance during this period.

I'm not asking for the review to be rewritten, but I would like this response to be included alongside the original evaluation in my file. I want to make sure there's a complete picture of my work.

I'm happy to discuss this further if that would be helpful.

Thank you,
[YOUR NAME]`,
  },
  {
    id: "self-assessment-submission",
    title: "Self-Assessment Submission",
    description:
      "Document your accomplishments before review season in your own words.",
    category: "Feedback & Reviews",
    tag: "Weekly",
    body: `Hi [MANAGER NAME],

Ahead of the upcoming review cycle, I wanted to share a summary of my contributions over the past [REVIEW PERIOD, e.g.,"six months" or "year"].

The projects I'm most proud of include [PROJECT 1], where I [SPECIFIC RESULT OR IMPACT], and [PROJECT 2], where I [SPECIFIC RESULT OR IMPACT]. I also took on [ADDITIONAL RESPONSIBILITY OR INITIATIVE] which contributed to [OUTCOME].

In terms of growth, I've developed in [SKILL OR AREA] through [HOW, e.g.,"leading the Q3 migration" or "completing the certification program"]. Feedback from [COLLEAGUE/STAKEHOLDER NAME] on [DATE OR CONTEXT] reflected this progress.

Looking ahead, I'd like to focus on [DEVELOPMENT GOAL] and would appreciate your support in [SPECIFIC ASK, e.g.,"access to the leadership training program" or "more visibility on cross-functional projects"].

I hope this is useful context for our review conversation. Happy to discuss any of this in more detail.

Best,
[YOUR NAME]`,
  },

  /* ---- Role & Compensation ---- */
  {
    id: "role-expansion-documentation",
    title: "Role Expansion Documentation",
    description:
      "Document when your responsibilities have grown beyond your current title or compensation.",
    category: "Role & Compensation",
    tag: "Strategic",
    body: `Hi [MANAGER NAME],

I wanted to take a moment to document some of the responsibilities I've taken on over the past [TIME PERIOD] that go beyond my current role as [CURRENT TITLE].

Since [DATE OR EVENT], I've been handling [RESPONSIBILITY 1], which was previously managed by [PERSON OR ROLE]. I've also taken on [RESPONSIBILITY 2] and [RESPONSIBILITY 3], including [SPECIFIC EXAMPLE OF SCOPE INCREASE].

I'm glad to contribute at this level and want to continue doing so. At the same time, I want to make sure my role and compensation reflect the work I'm actually doing. I'd appreciate the opportunity to discuss whether a title adjustment or compensation review would be appropriate given these changes.

I'm not looking for an immediate answer, just a conversation. Would any time this week or next work for you?

Thank you,
[YOUR NAME]`,
  },
  {
    id: "promotion-request",
    title: "Promotion Request",
    description:
      "Make a structured case for why you're ready for the next level.",
    category: "Role & Compensation",
    tag: "Strategic",
    body: `Hi [MANAGER NAME],

I'd like to formally express my interest in being considered for a promotion to [TARGET ROLE OR LEVEL]. I've given this a lot of thought and want to share why I believe the timing is right.

Over the past [TIME PERIOD], I've consistently delivered at or above the expectations for my current role. Highlights include [ACCOMPLISHMENT 1 WITH MEASURABLE IMPACT], [ACCOMPLISHMENT 2], and [ACCOMPLISHMENT 3]. I've also received positive feedback from [STAKEHOLDER OR COLLEAGUE] regarding [SPECIFIC CONTEXT].

In terms of readiness for the next level, I'm already operating at that scope in several areas, including [EXAMPLE OF NEXT-LEVEL WORK]. I've also invested in [DEVELOPMENT ACTIVITY, e.g.,"mentoring junior team members" or "completing the management training program"].

I understand that promotions involve timing and budget considerations beyond individual performance. I'm happy to discuss what the path looks like and what, if anything, you'd want to see from me to make this move happen.

Thank you for your support,
[YOUR NAME]`,
  },
  {
    id: "compensation-adjustment-request",
    title: "Compensation Adjustment Request",
    description:
      "A data-driven, professional ask for a raise.",
    category: "Role & Compensation",
    tag: "Strategic",
    body: `Hi [MANAGER NAME],

I'd like to schedule some time to discuss my compensation. I want to approach this thoughtfully, so I'm sharing some context in advance.

Since my last adjustment on [DATE], my responsibilities have expanded to include [NEW RESPONSIBILITY 1] and [NEW RESPONSIBILITY 2]. I've also delivered [KEY RESULT OR PROJECT] which contributed to [BUSINESS IMPACT].

Based on my research into market rates for [ROLE TITLE] in [LOCATION OR INDUSTRY], the typical range is [SALARY RANGE]. My current compensation of [CURRENT COMP] falls [below/at the lower end of] that range given my experience and contributions.

I'm requesting an adjustment to [TARGET AMOUNT OR RANGE] to reflect both the expanded scope of my work and current market benchmarks. I'm open to discussing the timing and structure of any adjustment.

I value my role here and want to make sure the compensation reflects the value I'm contributing. Happy to discuss whenever works for you.

Thank you,
[YOUR NAME]`,
  },
  {
    id: "title-change-request",
    title: "Title Change Request",
    description:
      "Request a title update when your work has outgrown your current title.",
    category: "Role & Compensation",
    tag: "Strategic",
    body: `Hi [MANAGER NAME],

I'd like to discuss updating my title to better reflect the work I'm currently doing. My current title of [CURRENT TITLE] was accurate when I started in this role on [DATE], but my responsibilities have since evolved significantly.

Today, I'm regularly [DESCRIPTION OF CURRENT SCOPE, e.g.,"leading cross-functional initiatives", "managing vendor relationships", "owning the full project lifecycle for CLIENT"]. This work aligns more closely with a [PROPOSED TITLE] role than my current designation.

A title update matters to me for a few reasons. It ensures my contributions are accurately represented internally, it aligns my role with how I'm already introduced to external stakeholders, and it supports my long-term career development.

I'm happy to discuss this at your convenience and provide any additional context that would be helpful.

Thank you,
[YOUR NAME]`,
  },

  /* ---- Workplace Changes ---- */
  {
    id: "transfer-request",
    title: "Transfer Request",
    description:
      "Request a team or department transfer professionally.",
    category: "Workplace Changes",
    tag: "Strategic",
    body: `Hi [MANAGER NAME / HR REPRESENTATIVE NAME],

I'd like to discuss the possibility of transferring to [TARGET TEAM OR DEPARTMENT]. I've thought about this carefully and want to share my reasoning.

I've valued my time on [CURRENT TEAM] and am proud of the work I've done here, particularly [SPECIFIC CONTRIBUTION]. At the same time, I believe my skills in [RELEVANT SKILL] and my interest in [AREA] would allow me to make a stronger impact on [TARGET TEAM], especially given [SPECIFIC OPPORTUNITY OR NEED ON THAT TEAM].

I've spoken informally with [CONTACT ON TARGET TEAM, if applicable] and understand there may be [OPPORTUNITY OR OPENING]. I want to make sure I'm pursuing this through the right channels and with your awareness.

I'm committed to ensuring a smooth transition for my current responsibilities and am happy to work with you on a timeline that works for the team.

Thank you for considering this,
[YOUR NAME]`,
  },
  {
    id: "remote-hybrid-accommodation",
    title: "Remote/Hybrid Accommodation Request",
    description:
      "Request flexible work arrangements with a professional, documented ask.",
    category: "Workplace Changes",
    tag: "Strategic",
    body: `Hi [MANAGER NAME],

I'd like to request a [remote / hybrid / adjusted schedule] arrangement and wanted to put this in writing so we can discuss it properly.

The reason for this request is [REASON, e.g.,"a medical need that I'm happy to discuss privately", "a caregiving responsibility", "a commute that significantly impacts my productivity", "a personal circumstance"]. I've found that I'm able to deliver my best work when [DESCRIPTION OF PREFERRED ARRANGEMENT].

To address any concerns, I want to note that during [PREVIOUS REMOTE/FLEXIBLE PERIOD OR EXAMPLE], I successfully [SPECIFIC DELIVERABLE OR RESULT]. I'm committed to maintaining full availability during core hours, attending all required meetings, and meeting every deadline.

If there's a formal process for requesting this accommodation, I'm happy to follow it. I'd also welcome a trial period if that would be helpful in evaluating the arrangement.

Thank you for considering this,
[YOUR NAME]`,
  },
  {
    id: "workload-concern-documentation",
    title: "Workload Concern Documentation",
    description:
      "Document when your workload is unrealistic or being used to set you up to fail.",
    category: "Workplace Changes",
    tag: "Critical",
    body: `Hi [MANAGER NAME],

I want to flag a concern about my current workload and make sure it's documented. I take my responsibilities seriously and want to deliver quality work, which is why I'm raising this now rather than waiting until something falls through the cracks.

Over the past [TIME PERIOD], my assignments have included [LIST KEY ASSIGNMENTS]. Several of these have overlapping deadlines, specifically [DEADLINE CONFLICT DETAILS]. Given the scope of each project, I don't believe it's realistic to complete all of them to the standard expected within the current timeline.

I'd like to discuss how to prioritize these assignments. Specifically, I'd appreciate your guidance on which deliverables take priority, whether any deadlines can be adjusted, and whether any tasks can be reassigned or supported by additional resources.

I want to be transparent about this so that expectations are clear and I can focus my energy where it matters most. I'm happy to discuss this in our next meeting or sooner if needed.

Thank you,
[YOUR NAME]`,
  },
  {
    id: "reasonable-accommodation",
    title: "Reasonable Accommodation Request",
    description:
      "Formally request a workplace accommodation under the ADA or similar laws.",
    category: "Workplace Changes",
    tag: "Critical",
    body: `Dear [MANAGER NAME / HR REPRESENTATIVE NAME],

I am writing to formally request a reasonable accommodation in connection with [CONDITION OR DISABILITY, you are not required to disclose a specific diagnosis, but should indicate that you have a qualifying need]. This request is being made under the Americans with Disabilities Act and any applicable state or local laws.

The accommodation I am requesting is [SPECIFIC ACCOMMODATION, e.g.,"a modified work schedule," "ergonomic equipment," "the ability to work remotely on certain days," "a reassignment of non-essential job functions"]. This accommodation would allow me to continue performing the essential functions of my role as [YOUR TITLE] while managing my condition.

I am happy to provide supporting documentation from my healthcare provider if needed. I understand the company may want to engage in an interactive process to identify effective accommodations, and I welcome that conversation.

For context, I have been in my current role since [START DATE] and have [BRIEF POSITIVE CONTEXT, e.g.,"consistently met performance expectations" or "received positive feedback during my most recent review"]. My request is not related to performance concerns and should not be treated as such.

I would appreciate a written acknowledgment that this request has been received, along with information about the next steps and expected timeline for a response. I am available to meet at your convenience to discuss this further.

Thank you for your attention to this matter.

Sincerely,
[YOUR NAME]
[YOUR TITLE]
[DATE]`,
  },
];

/* ------------------------------------------------------------------ */
/*  Shared Styles                                                      */
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CommsPage() {
  const subscription = useSubscription();
  if (!hasActiveAccess(subscription)) return <ProGate feature="Comms" />;

  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "All">(
    "All"
  );
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter templates
  const filteredTemplates = TEMPLATES.filter((t) => {
    const matchesCategory =
      activeCategory === "All" || t.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by category for display
  const grouped = CATEGORIES.filter(
    (cat) => activeCategory === "All" || activeCategory === cat
  ).map((cat) => ({
    category: cat,
    templates: filteredTemplates.filter((t) => t.category === cat),
  })).filter((g) => g.templates.length > 0);

  // Select template
  const openTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
    setEditedBody(template.body);
    setCopied(false);
  }, []);

  // Copy to clipboard
  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(editedBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = editedBody;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Reset template
  function resetTemplate() {
    if (selectedTemplate) {
      setEditedBody(selectedTemplate.body);
      setCopied(false);
    }
  }

  // Back to list
  function backToList() {
    setSelectedTemplate(null);
    setEditedBody("");
    setCopied(false);
  }

  // Count placeholders
  const placeholderCount = (editedBody.match(/\[[A-Z][A-Z0-9 /—,.']*\]/g) || []).length;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [editedBody]);

  /* ---------------------------------------------------------------- */
  /*  Template Editor View                                             */
  /* ---------------------------------------------------------------- */

  if (selectedTemplate) {
    return (
      <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        {/* Back button */}
        <button
          onClick={backToList}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            color: "var(--color-stone-600)",
            marginBottom: 20,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#292524";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-stone-600)";
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to templates
        </button>

        {/* Template header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={getTagStyle(selectedTemplate.tag)}>
              {selectedTemplate.tag}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--color-stone-500)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {selectedTemplate.category}
            </span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 26,
              fontWeight: 700,
              color: "#292524",
              marginBottom: 8,
            }}
          >
            {selectedTemplate.title}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-stone-600)",
              lineHeight: 1.6,
              fontFamily: "var(--font-sans)",
            }}
          >
            {selectedTemplate.description}
          </p>
        </div>

        {/* Placeholder hint */}
        {placeholderCount > 0 && (
          <div
            style={{
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "#1E40AF",
              fontFamily: "var(--font-sans)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {placeholderCount} placeholder{placeholderCount !== 1 ? "s" : ""} to fill in. Look for [BRACKETED TEXT]
          </div>
        )}

        {/* ADA disclaimer for reasonable accommodation template */}
        {selectedTemplate.id === "reasonable-accommodation" && (
          <div
            style={{
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 13,
              color: "#92400E",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.6,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: 2 }}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            This template helps you put your request in writing. It does not
            constitute legal advice. If you believe your rights under the ADA or
            similar laws are being violated, consult an employment attorney.
          </div>
        )}

        {/* Textarea editor */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid var(--color-stone-300)",
            overflow: "hidden",
          }}
        >
          <div
            className="da-comms-editor-bar"
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--color-stone-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>Edit Template</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={resetTemplate}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "1px solid #D6D3D1",
                  background: "#fff",
                  color: "#292524",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-stone-50)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                }}
              >
                Reset
              </button>
              <button
                onClick={copyToClipboard}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: copied ? "#16A34A" : "var(--color-green)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background 0.15s",
                }}
              >
                {copied ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={editedBody}
            onChange={(e) => {
              setEditedBody(e.target.value);
              setCopied(false);
            }}
            style={{
              width: "100%",
              padding: "20px 20px",
              border: "none",
              fontSize: 14,
              fontFamily: "var(--font-sans)",
              color: "#292524",
              lineHeight: 1.7,
              resize: "none",
              outline: "none",
              background: "#fff",
              minHeight: 400,
              display: "block",
            }}
          />
        </div>

        {/* Bottom action bar */}
        <div
          className="da-comms-editor-bar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--color-stone-500)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {editedBody.length} characters
          </span>
          <button
            onClick={copyToClipboard}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              border: "none",
              background: copied ? "#16A34A" : "var(--color-green)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "background 0.15s",
            }}
          >
            {copied ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied to Clipboard
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Template List View                                               */
  /* ---------------------------------------------------------------- */

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 26,
            fontWeight: 700,
            color: "#292524",
            marginBottom: 8,
          }}
        >
          Communication Templates
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-stone-600)",
            lineHeight: 1.6,
            fontFamily: "var(--font-sans)",
            maxWidth: 600,
          }}
        >
          Pre-written templates to help you respond professionally to workplace
          situations. Select a template, fill in the placeholders, and copy.
        </p>
      </div>

      {/* Search + Category Filter */}
      <div
        className="da-list-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-stone-500)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: 10,
              border: "1px solid #D6D3D1",
              fontSize: 14,
              fontFamily: "var(--font-sans)",
              color: "#292524",
              outline: "none",
              background: "#fff",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-green)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.10)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#D6D3D1";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Category pills */}
        <div className="da-pills-scroll" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["All", ...CATEGORIES] as const).map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
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
      </div>

      {/* Template Grid */}
      {grouped.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 300,
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: 420,
              background: "#fff",
              borderRadius: 16,
              border: "1px solid var(--color-stone-300)",
              padding: "56px 40px",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#F0FDF4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                fontWeight: 600,
                color: "#292524",
                marginBottom: 10,
              }}
            >
              No templates found
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-stone-600)",
                lineHeight: 1.6,
              }}
            >
              Try adjusting your search or filter.
            </p>
          </div>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.category} style={{ marginBottom: 32 }}>
            {/* Category heading */}
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                fontWeight: 600,
                color: "#292524",
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: "1px solid var(--color-stone-100)",
              }}
            >
              {group.category}
            </h2>

            {/* Template cards */}
            <div
              className="da-comms-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {group.templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => openTemplate(template)}
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
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-stone-300)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={getTagStyle(template.tag)}>{template.tag}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#292524",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {template.title}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-stone-600)",
                      lineHeight: 1.6,
                      fontFamily: "var(--font-sans)",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical" as never,
                      overflow: "hidden",
                    }}
                  >
                    {template.description}
                  </p>
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
                    Use template
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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

      {/* Disclaimer */}
      <div
        style={{
          marginTop: 20,
          padding: "16px 20px",
          background: "var(--color-stone-50)",
          borderRadius: 10,
          border: "1px solid var(--color-stone-100)",
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: "var(--color-stone-500)",
            lineHeight: 1.6,
            fontFamily: "var(--font-sans)",
            fontStyle: "italic",
          }}
        >
          These templates are starting points for professional communication, not
          legal advice. Review and customize each template for your specific
          situation. Consider consulting with an employment attorney before sending
          formal correspondence.
        </p>
      </div>
    </div>
  );
}
