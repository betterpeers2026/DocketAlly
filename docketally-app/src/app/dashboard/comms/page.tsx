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
      padding: "3px 8px",
      borderRadius: 4,
      fontSize: 9,
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.06em",
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
      padding: "3px 8px",
      borderRadius: 4,
      fontSize: 9,
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.06em",
      whiteSpace: "nowrap",
      textTransform: "uppercase",
      color: "#15803D",
      background: "#F0FDF4",
      border: "1px solid #BBF7D0",
    };
  }
  // Weekly
  return {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    color: "#57534E",
    background: "#F5F5F4",
    border: "1px solid #E7E5E4",
  };
}

const TEMPLATES: Template[] = [
  /* ---- Responding to a PIP ---- */
  {
    id: "pip-acknowledgment",
    title: "PIP Acknowledgment Letter",
    description:
      "Acknowledge receipt of a PIP while asking the right clarifying questions to set yourself up for success.",
    category: "Responding to a PIP",
    tag: "Critical",
    body: `Subject: PIP Follow-Up -- Next Steps

Hi [Manager Name],

Thank you for walking me through the performance improvement plan. I want to make sure I understand the expectations clearly so I can meet them.

A few quick clarifications that would help me:

- What does success look like at the 30/60/90-day marks?
- How often should we check in on progress?
- Are there specific resources or support available as I work through this?

I'm committed to meeting these goals and want to set myself up for success. Would it be helpful to schedule a weekly check-in?

Best,
[Your Name]`,
  },
  {
    id: "pip-clarification",
    title: "PIP Clarification Request",
    description:
      "Request specific, measurable benchmarks so you can track your own progress and stay focused.",
    category: "Responding to a PIP",
    tag: "Strategic",
    body: `Subject: Quick Question on Improvement Plan Details

Hi [Manager Name],

I've been reviewing the improvement plan and want to make sure I'm focused on the right things. A couple of the goals feel broad -- could we define specific, measurable benchmarks so I can track my own progress?

For example, for [Specific Goal], would success mean [Possible Metric A] or [Possible Metric B]?

I'd rather ask now than realize later I was aiming at the wrong target. Happy to discuss in our next 1:1 or whenever works for you.

Thanks,
[Your Name]`,
  },
  {
    id: "pip-rebuttal",
    title: "PIP Response Letter",
    description:
      "Share additional context and relevant performance data that may not be reflected in the improvement plan.",
    category: "Responding to a PIP",
    tag: "Critical",
    body: `Subject: Additional Context on Performance Review

Hi [Manager Name],

I appreciate the feedback in the improvement plan and I'm taking it seriously. I did want to share some additional context that I think is relevant:

- [Specific example of strong performance, with dates]
- [Specific example of positive feedback received, with dates]
- [Specific example of challenges outside your control, factually stated]

I'm not looking to dispute the process -- I want to make sure we have the full picture so the plan reflects where I actually need to improve. I'm happy to discuss any of this in person.

Thanks for your time,
[Your Name]`,
  },
  {
    id: "pip-progress-update",
    title: "PIP Progress Update",
    description:
      "Send a proactive update on your improvement plan progress to show engagement and accountability.",
    category: "Responding to a PIP",
    tag: "Strategic",
    body: `Subject: Progress Update -- Week [Week Number]

Hi [Manager Name],

Wanted to send a quick update on where things stand:

- [Goal 1]: [What you've done, specific result]
- [Goal 2]: [What you've done, specific result]
- [Goal 3]: [What you've done, specific result]

Is this tracking with your expectations? If there's anything I should adjust, I'd rather know now. Looking forward to our next check-in.

Best,
[Your Name]`,
  },

  /* ---- Meeting Follow-Ups ---- */
  {
    id: "meeting-summary",
    title: "Meeting Summary Email",
    description:
      "Capture what was discussed and agreed upon so everyone stays aligned on next steps.",
    category: "Meeting Follow-Ups",
    tag: "Weekly",
    body: `Subject: Summary from Our [Meeting Type] -- [Date]

Hi [Attendee Names],

Thanks for the meeting today. Wanted to capture what we discussed so we're all on the same page:

What we covered:
- [Topic 1]: [Key point or decision]
- [Topic 2]: [Key point or decision]

Action items:
- [Your Name]: [Task] by [Date]
- [Other Person]: [Task] by [Date]

Anything I missed or got wrong? If not, I'll use this as our working plan. Thanks, everyone.

Best,
[Your Name]`,
  },
  {
    id: "one-on-one-followup",
    title: "1:1 Follow-Up",
    description:
      "Recap key takeaways from your 1:1 so you and your manager stay aligned on expectations.",
    category: "Meeting Follow-Ups",
    tag: "Weekly",
    body: `Subject: Follow-Up from Our 1:1

Hi [Manager Name],

Thanks for the conversation today. Just wanted to capture the key takeaways:

- [Key discussion point or feedback received]
- [Any agreed-upon next steps]
- [Any deadlines or deliverables discussed]

Let me know if I missed anything. Appreciate the time.

Best,
[Your Name]`,
  },
  {
    id: "verbal-warning-followup",
    title: "Verbal Warning Follow-Up",
    description:
      "Confirm your understanding of feedback received and show you're already taking action to address it.",
    category: "Meeting Follow-Ups",
    tag: "Critical",
    body: `Subject: Following Up on Our Conversation -- Want to Make Sure I'm on Track

Hi [Manager Name],

Thanks for being direct with me today. I want to make sure I understood the feedback correctly so I can act on it:

- The concern was about [Your understanding of the issue]
- Going forward, the expectation is [Your understanding of what needs to change]
- We agreed on [Any next steps discussed]

I've already started [Specific action you're taking], and I plan to [Additional step]. If there's anything else I should be doing differently, I'm open to hearing it.

I appreciate you bringing this to my attention directly -- I'd rather know and fix it than not know.

Thanks,
[Your Name]`,
  },

  /* ---- Escalation & HR ---- */
  {
    id: "hr-complaint",
    title: "Formal HR Complaint",
    description:
      "Request HR's guidance on a workplace situation you haven't been able to resolve on your own.",
    category: "Escalation & HR",
    tag: "Critical",
    body: `Subject: Requesting Guidance on a Workplace Situation

Hi [HR Representative Name],

I'm reaching out because I'd like your help with a situation I've been trying to work through on my own.

Here's a quick summary:
- [Factual description of the issue -- dates, what happened, who was involved]
- I've already tried to address this by [What you did -- spoke to manager, raised it in 1:1, sent follow-up email, etc.]
- Unfortunately, [What happened -- nothing changed, it continued, it got worse, I didn't receive a response]

I want to resolve this the right way, and I'd appreciate your guidance on what options are available. I'm not looking to create problems -- I genuinely want to find a solution that works for everyone.

Could we set up a time to talk? I'm flexible on scheduling.

Thank you,
[Your Name]`,
  },
  {
    id: "discrimination-concern",
    title: "Discrimination Concern",
    description:
      "Request a confidential conversation with HR about experiences that may involve discriminatory treatment.",
    category: "Escalation & HR",
    tag: "Critical",
    body: `Subject: Requesting a Confidential Conversation

Hi [HR Representative Name],

I'd like to request a confidential conversation about some experiences I've been having at work. I've taken some time to reflect on this and have tried to address it through [Previous steps -- e.g., conversations with my manager, raising it in team settings], but I believe it may need additional attention.

I want to handle this appropriately and would appreciate your guidance on the right approach. Could we find time to meet this week? I can walk you through the specifics in person.

Thank you for your time,
[Your Name]`,
  },
  {
    id: "harassment-report",
    title: "Harassment Report",
    description:
      "Request a confidential meeting with HR about behavior that's affecting your ability to work.",
    category: "Escalation & HR",
    tag: "Critical",
    body: `Subject: Request for a Confidential Meeting

Hi [HR Representative Name],

I need to discuss something that's been affecting my work. I've been trying to manage it on my own, but I've reached a point where I think it's important to involve someone who can help.

I've previously [Steps taken -- e.g., asked the person to stop, raised it with my manager, tried to avoid the situation], and I want to make sure I'm handling next steps correctly.

Could we schedule 30 minutes this week? I'd prefer to discuss details in person.

Thank you,
[Your Name]`,
  },
  {
    id: "skip-level-escalation",
    title: "Skip-Level Escalation",
    description:
      "Reach out to a senior leader for guidance when you haven't been able to resolve a matter through regular channels.",
    category: "Escalation & HR",
    tag: "Strategic",
    body: `Subject: Would Appreciate Your Perspective

Hi [Senior Leader Name],

I hope you're doing well. I wanted to reach out because I'd value your perspective on something I've been working through.

I've raised [Brief description of issue] with [Manager Name] on [Date] and followed up on [Date], but I haven't been able to make progress. I don't want to create unnecessary noise -- I just want to make sure I'm approaching this the right way.

Could I get 15 minutes of your time to talk it through? I appreciate your leadership and would value your guidance.

Thanks for your time,
[Your Name]`,
  },
  {
    id: "retaliation-concern",
    title: "Retaliation Concern",
    description:
      "Flag changes in your treatment following a complaint or protected activity so they can be addressed early.",
    category: "Escalation & HR",
    tag: "Critical",
    body: `Subject: Following Up -- Wanted to Flag Something

Hi [HR Representative Name],

I hope you're well. I wanted to follow up on our previous conversation from [Date] about [Brief reference to original complaint].

Since then, I've noticed some changes that I want to mention, in case they're relevant:

- [Specific factual change 1 -- e.g., removed from project on Date]
- [Specific factual change 2 -- e.g., meeting invites stopped on Date]
- [Specific factual change 3 -- e.g., shift in responsibilities on Date]

There may be a perfectly reasonable explanation for each of these, and I don't want to jump to conclusions. But given the timing, I thought it was worth mentioning so we can address it early if needed.

I'm still committed to resolving the original matter constructively. Could we touch base briefly?

Thanks,
[Your Name]`,
  },

  /* ---- Severance & Exit ---- */
  {
    id: "severance-negotiation",
    title: "Severance Negotiation",
    description:
      "Respond to a severance offer with clarifying questions and professional requests for adjusted terms.",
    category: "Severance & Exit",
    tag: "Strategic",
    body: `Subject: Following Up on Separation Terms

Hi [HR Representative Name],

Thank you for the conversation about my transition. I've reviewed the initial terms and I have a few questions:

- Could you clarify [Specific term or timeline]?
- Is there flexibility on [Specific item -- e.g., extended benefits, reference letter]?
- What is the timeline for finalizing the agreement?

I want to make sure I fully understand everything before moving forward. Happy to schedule a call if that's easier.

Thank you,
[Your Name]`,
  },
  {
    id: "resignation-professional",
    title: "Resignation Letter",
    description:
      "Resign from your position with a clear, professional tone and a commitment to a smooth transition.",
    category: "Severance & Exit",
    tag: "Strategic",
    body: `Subject: Resignation -- [Your Name]

Dear [Manager Name],

I'm writing to formally resign from my position as [Your Title], effective [Last Day Date].

I've valued my time here and the opportunities I've had. I'm committed to making the transition as smooth as possible and am happy to help with knowledge transfer over the next [Notice Period].

Thank you for everything.

Sincerely,
[Your Name]`,
  },
  {
    id: "exit-interview-prep",
    title: "Exit Interview Talking Points",
    description:
      "Prepare structured talking points so you stay professional and on-message during your exit interview.",
    category: "Severance & Exit",
    tag: "Weekly",
    body: `EXIT INTERVIEW PREPARATION

Date: [Exit Interview Date]
Interviewer: [Interviewer Name and Title]

KEY MESSAGES

What to say:
- I've valued my time here and learned a lot, especially [Specific Positive Experience]
- The strongest parts of my experience were [Positive Aspect 1] and [Positive Aspect 2]
- One suggestion: [Constructive, Non-Inflammatory Suggestion]
- Reason for leaving: [Prepared Statement -- e.g., I found an opportunity that aligns with my long-term goals]

What to keep to yourself:
- [Sensitive Item 1 -- e.g., details of any ongoing HR matters]
- [Sensitive Item 2 -- e.g., specifics about interpersonal conflicts]
- [Sensitive Item 3 -- e.g., anything you wouldn't want quoted back to you]

Questions to ask:
- Will I receive a written summary of this conversation?
- What is the company's reference policy?
- When will I receive my final paycheck and any accrued PTO?
- What's the timeline for COBRA paperwork?

Reminders:
- Be warm and professional throughout
- Don't sign anything new without reading it carefully
- Take notes after the meeting while details are fresh`,
  },

  /* ---- Feedback & Reviews ---- */
  {
    id: "performance-review-response",
    title: "Performance Review Response",
    description:
      "Respond thoughtfully to your review by acknowledging feedback and sharing additional context.",
    category: "Feedback & Reviews",
    tag: "Critical",
    body: `Subject: Thoughts on Performance Review

Hi [Manager Name],

Thank you for the review and the feedback. I appreciate the recognition of [Positive Items Mentioned] and I understand the areas you'd like to see growth in.

I wanted to share a few thoughts:

- Regarding [Area of Growth]: I've actually been working on this -- [Specific example]. I'd welcome any suggestions on how to improve further.
- I'd also love to discuss opportunities for [Professional development, expanded responsibilities, etc.]

Could we schedule a follow-up to talk through a development plan? I want to keep building on the momentum.

Best,
[Your Name]`,
  },
  {
    id: "request-written-feedback",
    title: "Request for Written Feedback",
    description:
      "Ask your manager to send a quick written recap of verbal feedback so you can stay on track.",
    category: "Feedback & Reviews",
    tag: "Strategic",
    body: `Subject: Quick Request -- Written Recap of Feedback

Hi [Manager Name],

Thanks for the feedback in our [Meeting or 1:1] today. Would you mind sending me a quick written summary of the key points? It helps me track what I'm working on and make sure I don't miss anything.

No need for anything formal -- even a few bullet points would be great. Appreciate it.

Thanks,
[Your Name]`,
  },
  {
    id: "self-assessment-submission",
    title: "Self-Assessment Submission",
    description:
      "Share a summary of your contributions and growth areas ahead of review season.",
    category: "Feedback & Reviews",
    tag: "Weekly",
    body: `Subject: Self-Assessment for Review Period

Hi [Manager Name],

Ahead of our upcoming review, I wanted to share a summary of what I've been focused on and where I'd like to grow.

Key contributions this period:
- [Project 1]: [Specific outcome or metric]
- [Project 2]: [Specific outcome or metric]
- [Additional Responsibility]: [How it contributed to the team]

Areas I'm working to strengthen:
- [Growth Area]: I've been [Specific action you're taking to improve]

Looking ahead, I'd love to focus on [Development Goal] and would appreciate your input on the best way to get there.

Happy to discuss any of this in our review conversation. Thanks for your support.

Best,
[Your Name]`,
  },

  /* ---- Role & Compensation ---- */
  {
    id: "role-expansion-documentation",
    title: "Role Expansion Check-In",
    description:
      "Touch base with your manager about responsibilities that have grown beyond your original scope.",
    category: "Role & Compensation",
    tag: "Strategic",
    body: `Subject: Quick Check-In on My Current Scope

Hi [Manager Name],

I wanted to touch base about the scope of my role. Over the past [Time Period], I've taken on a few additional responsibilities and I want to make sure we're aligned on expectations.

Here's what I'm currently handling beyond my original scope:
- [New Responsibility 1] -- started around [Date or Timeframe]
- [New Responsibility 2] -- picked up when [Context]
- [New Responsibility 3] -- ongoing since [Date or Timeframe]

I'm happy to keep contributing at this level -- I enjoy the work. I just want to make sure my role reflects what I'm actually doing, so we can have a conversation about it when the time is right.

No rush -- just wanted to plant the seed. Happy to discuss whenever works.

Thanks,
[Your Name]`,
  },
  {
    id: "promotion-request",
    title: "Promotion Request",
    description:
      "Start a conversation about your career trajectory and what the path to the next level looks like.",
    category: "Role & Compensation",
    tag: "Strategic",
    body: `Subject: Career Growth Conversation

Hi [Manager Name],

I'd love to set up some time to talk about my career trajectory. I've been thinking about what the path to [Target Role or Level] looks like, and I want to make sure I'm doing the right things to get there.

Over the past [Time Period], I've focused on:
- [Accomplishment 1 with Measurable Impact]
- [Accomplishment 2]
- [Area Where You're Already Operating at Next Level]

I'd value your candid feedback on where I stand and what you'd need to see from me to make that next step. I'm open to whatever timeline makes sense -- I just want to be proactive about my growth.

Thanks for your support,
[Your Name]`,
  },
  {
    id: "compensation-adjustment-request",
    title: "Compensation Adjustment Request",
    description:
      "Share context for a compensation discussion with market data and expanded scope.",
    category: "Role & Compensation",
    tag: "Strategic",
    body: `Subject: Compensation Discussion

Hi [Manager Name],

I'd like to schedule some time to discuss my compensation. I want to be thoughtful about this, so I'm sharing context in advance.

Since my last adjustment on [Date], my role has expanded to include [New Responsibility 1] and [New Responsibility 2]. I've also delivered [Key Result] which contributed to [Business Impact].

Based on what I'm seeing in the market for [Role Title] in [Location or Industry], the typical range is [Salary Range]. I'd like to discuss whether an adjustment is possible to reflect the expanded scope and current benchmarks.

I'm flexible on timing and structure -- I just want to make sure we're on the same page. Would any time in the next couple weeks work?

Thanks,
[Your Name]`,
  },
  {
    id: "title-change-request",
    title: "Title Change Request",
    description:
      "Ask about updating your title to better reflect the work you're actually doing.",
    category: "Role & Compensation",
    tag: "Strategic",
    body: `Subject: Quick Question About My Title

Hi [Manager Name],

I wanted to ask about the possibility of updating my title. My current title of [Current Title] was accurate when I started, but the work I'm doing now looks quite different.

Day to day, I'm regularly [Description of Current Scope -- e.g., leading cross-functional projects, managing vendor relationships, owning client deliverables]. This aligns more closely with a [Proposed Title] role.

I know titles aren't everything, but it would help with [Reason -- e.g., working with external stakeholders, career development]. Happy to discuss whenever it makes sense.

Thanks,
[Your Name]`,
  },

  /* ---- Workplace Changes ---- */
  {
    id: "transfer-concerns",
    title: "Transfer/Role Change Request",
    description:
      "Ask clarifying questions about a recent change to make sure you're set up for success.",
    category: "Workplace Changes",
    tag: "Strategic",
    body: `Subject: Questions About the Recent Changes

Hi [Manager or HR Name],

I wanted to follow up about the recent [Transfer, role change, or restructuring]. I have a few questions:

- How does this change affect my [Reporting structure, responsibilities, or title]?
- Is there a formal timeline for the transition?
- Who should I reach out to if I have concerns during the process?

I want to make sure I'm set up for success in the new structure. Appreciate any details you can share.

Thanks,
[Your Name]`,
  },
  {
    id: "remote-hybrid-accommodation",
    title: "Remote/Hybrid Accommodation Request",
    description:
      "Request a flexible work arrangement with a professional, results-oriented ask.",
    category: "Workplace Changes",
    tag: "Strategic",
    body: `Subject: Flexible Work Arrangement Request

Hi [Manager Name],

I'd like to discuss the possibility of a [Remote, hybrid, or adjusted schedule] arrangement. I think it would help me do my best work while still meeting all team expectations.

The reason: [Brief professional reason -- e.g., a long commute affecting productivity, a personal situation, a health-related need].

To put your mind at ease, during [Previous remote period or example], I [Specific deliverable or result]. I'm committed to full availability during core hours, attending all meetings, and hitting every deadline.

If it helps, I'm open to a trial period so we can see how it works. Would you be open to discussing it?

Thanks,
[Your Name]`,
  },
  {
    id: "workload-concern",
    title: "Workload Priorities Request",
    description:
      "Ask your manager to help you prioritize when deadlines overlap and workload exceeds capacity.",
    category: "Workplace Changes",
    tag: "Critical",
    body: `Subject: Quick Question on Priorities

Hi [Manager Name],

I wanted to get your input on how to prioritize my workload. Right now I'm working on:

- [Assignment 1] -- due [Date]
- [Assignment 2] -- due [Date]
- [Assignment 3] -- due [Date]

I want to deliver quality work on all of these, and a few of the timelines overlap. Could you help me rank these in order of importance? That way I can make sure the highest-priority items get my best attention first.

If everything needs to land on time, I'm happy to discuss what trade-offs might help -- whether that's adjusted deadlines, additional support, or narrowing scope on one of them. I just want to set realistic expectations rather than quietly let something slip.

Happy to discuss whenever works for you.

Thanks,
[Your Name]`,
  },
  {
    id: "reasonable-accommodation",
    title: "Reasonable Accommodation Request",
    description:
      "Formally request a workplace accommodation with a brief, professional ask.",
    category: "Workplace Changes",
    tag: "Critical",
    body: `Subject: Accommodation Request

Hi [HR Representative Name],

I'd like to request a workplace accommodation related to [General description -- e.g., a medical condition, disability]. I can provide documentation from my healthcare provider if needed.

The accommodation I'm requesting is [Specific accommodation -- e.g., modified schedule, ergonomic equipment, remote work arrangement]. I believe this would allow me to continue performing my role effectively.

Could we schedule a time to discuss the process?

Thank you,
[Your Name]`,
  },
];

/* ------------------------------------------------------------------ */
/*  Placeholder regex                                                  */
/* ------------------------------------------------------------------ */

const PLACEHOLDER_RE = /(\[[A-Z][^\[\]]*\])/g;

/* ------------------------------------------------------------------ */
/*  Template tips                                                      */
/* ------------------------------------------------------------------ */

const TEMPLATE_TIPS: Record<string, string[]> = {
  "pip-acknowledgment": [
    "Send within 24 hours -- it shows you're taking it seriously",
    "Asking clarifying questions signals engagement, not pushback",
    "Offering to schedule check-ins shows you want to succeed",
  ],
  "pip-clarification": [
    "Specific metrics protect both sides -- your manager will appreciate the directness",
    "Asking questions now prevents misunderstandings later",
    "Shorter is better -- keep it focused on what you need to know",
  ],
  "pip-rebuttal": [
    "Lead with what you agree with before sharing additional context",
    "Use specific dates and results -- accuracy shows professionalism",
    "Offer to discuss in person -- it shows you're collaborative, not combative",
  ],
  "pip-progress-update": [
    "Send these proactively -- don't wait to be asked",
    "Include specific results, not just activities",
    "Ask if you're on track -- it shows you care about the outcome",
  ],
  "meeting-summary": [
    "Send within 24 hours while details are fresh and accurate",
    "Ending with 'let me know if I missed anything' invites correction naturally",
    "Including action items keeps everyone accountable",
  ],
  "one-on-one-followup": [
    "Send the same day while the conversation is fresh",
    "Include any verbal commitments -- it helps both of you stay aligned",
    "Keep it brief -- a quick recap is more likely to be read",
  ],
  "verbal-warning-followup": [
    "Frame it as wanting to get it right, not as defending yourself",
    "Mention what you're already doing to address it -- action speaks loudest",
    "Thanking them for directness disarms the situation",
  ],
  "hr-complaint": [
    "Reference what you've already tried -- it shows you're not jumping to escalation",
    "Asking for guidance rather than demanding action sets a collaborative tone",
    "Always offer to meet -- it shows you want resolution",
  ],
  "discrimination-concern": [
    "Requesting a confidential conversation gives HR the chance to help before it escalates",
    "Mention previous steps you've taken -- it shows patience and good faith",
    "Keep the email short -- details are better shared in person",
  ],
  "harassment-report": [
    "Mention that you've tried to handle it yourself first -- it shows reasonableness",
    "Requesting an in-person meeting keeps sensitive details out of email",
    "Keep the tone measured -- calm emails carry more weight",
  ],
  "skip-level-escalation": [
    "Only reach out after you've genuinely tried to resolve it directly",
    "Be specific about what you've already tried -- it shows you're not skipping steps",
    "Frame it as wanting guidance, not as going over your manager's head",
  ],
  "retaliation-concern": [
    "Acknowledge there may be a reasonable explanation -- it shows fairness",
    "Include specific dates and changes -- accuracy builds credibility",
    "Framing it as 'flagging early' rather than accusing keeps the door open",
  ],
  "severance-negotiation": [
    "Never accept or sign anything on the spot -- asking questions is expected",
    "Framing requests as questions keeps the negotiation collaborative",
    "Take your time -- you usually have at least 21 days to review",
  ],
  "resignation-professional": [
    "Keep it brief and warm -- you may need these relationships later",
    "Offering to help with transition shows class and professionalism",
    "Send via email so your last day and terms are in writing",
  ],
  "exit-interview-prep": [
    "Prepare talking points in advance so you stay on message",
    "Be positive and constructive -- what you say here can follow you",
    "Don't volunteer more than you're asked -- keep it professional",
  ],
  "performance-review-response": [
    "Start with what you agree with before sharing your perspective",
    "Specific examples with dates carry more weight than general statements",
    "Asking for a follow-up shows you're invested in growth",
  ],
  "request-written-feedback": [
    "Frame it as helping yourself stay on track, not as a request for proof",
    "Offering to write it up yourself makes it easy for them to say yes",
    "Follow up once if you don't hear back, then let it go",
  ],
  "self-assessment-submission": [
    "Quantify results wherever possible -- numbers speak louder than narratives",
    "Include feedback from others to show broader impact",
    "Submitting early gives your manager time to prepare thoughtfully",
  ],
  "role-expansion-documentation": [
    "Frame it as wanting alignment, not as a complaint about workload",
    "Be specific about when each new responsibility started",
    "Planting the seed early makes the eventual conversation easier",
  ],
  "promotion-request": [
    "Asking for feedback on readiness is more effective than asking for a promotion directly",
    "Tie your contributions to business impact, not just personal effort",
    "Time this during review season or after a visible win",
  ],
  "compensation-adjustment-request": [
    "Sharing context in advance gives your manager time to advocate internally",
    "Market data makes the case -- focus on benchmarks, not personal needs",
    "Being flexible on timing shows maturity and patience",
  ],
  "title-change-request": [
    "Titles are often easier to change than compensation -- start here if relevant",
    "Reference how you're already being introduced externally",
    "Keep the ask casual -- a light touch goes further than a formal demand",
  ],
  "transfer-concerns": [
    "Ask clarifying questions -- it shows you're engaged, not resistant",
    "Understanding the rationale helps you adapt faster",
    "Following up in writing prevents misunderstandings during transitions",
  ],
  "remote-hybrid-accommodation": [
    "Offering a trial period reduces perceived risk for your manager",
    "Reference past productivity during flexible work -- results matter",
    "Keep it professional -- personal reasons don't need to be detailed",
  ],
  "workload-concern": [
    "Asking for priorities shows initiative, not weakness",
    "Raise it before something falls through the cracks, not after",
    "Offering trade-offs shows you're thinking about the team, not just yourself",
  ],
  "reasonable-accommodation": [
    "You don't need to share your specific diagnosis",
    "Your employer is legally required to engage in a conversation about accommodations",
    "Keep the email brief -- details can be discussed in person",
  ],
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
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit & Fill state
  const [isEditMode, setIsEditMode] = useState(false);
  const [filledValues, setFilledValues] = useState<Record<string, string>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);

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
    setActiveTemplateId(template.id);
    setIsEditMode(false);
    setFilledValues({});
    setEditingIndex(null);
    setShowToast(false);
  }, []);

  // Build final text with filled placeholder values
  function getTextWithFilledValues(body: string): string {
    if (Object.keys(filledValues).length === 0) return body;
    return body.replace(PLACEHOLDER_RE, (match) => {
      return filledValues[match] || match;
    });
  }

  // Copy to clipboard
  async function copyToClipboard() {
    const text = selectedTemplate ? getTextWithFilledValues(selectedTemplate.body) : "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }

  // Back to list
  function backToList() {
    setSelectedTemplate(null);
    setIsEditMode(false);
    setFilledValues({});
    setEditingIndex(null);
    setShowToast(false);
  }

  // Auto-focus edit input
  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingIndex]);

  /* ---------------------------------------------------------------- */
  /*  Render body with placeholder chips                               */
  /* ---------------------------------------------------------------- */

  function renderBodyWithPlaceholders(body: string) {
    const parts = body.split(PLACEHOLDER_RE);
    return parts.map((part, i) => {
      // Check if this part is a placeholder
      if (PLACEHOLDER_RE.test(part)) {
        // Reset regex lastIndex since we use .test
        PLACEHOLDER_RE.lastIndex = 0;
        const filled = filledValues[part];

        // Currently editing this specific placeholder instance
        if (isEditMode && editingIndex === i) {
          return (
            <input
              key={i}
              ref={editInputRef}
              defaultValue={filled || ""}
              placeholder={part.slice(1, -1)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    setFilledValues((prev) => ({ ...prev, [part]: val }));
                  }
                  setEditingIndex(null);
                }
              }}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val) {
                  setFilledValues((prev) => ({ ...prev, [part]: val }));
                }
                setEditingIndex(null);
              }}
              style={{
                border: "none",
                borderBottom: "2px solid #22C55E",
                background: "transparent",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "#292524",
                outline: "none",
                padding: "0 2px",
                minWidth: 80,
                width: `${Math.max(80, (filled || part.slice(1, -1)).length * 8.5)}px`,
              }}
            />
          );
        }

        // Filled placeholder
        if (filled) {
          return (
            <span
              key={i}
              onClick={() => {
                if (isEditMode) setEditingIndex(i);
              }}
              style={{
                background: "#F0FDF4",
                color: "#15803D",
                border: "1px solid #BBF7D0",
                borderRadius: 4,
                padding: "1px 6px",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                cursor: isEditMode ? "pointer" : "default",
                transition: "background 0.15s",
              }}
            >
              {filled}
            </span>
          );
        }

        // Unfilled placeholder chip
        return (
          <span
            key={i}
            onClick={() => {
              if (isEditMode) setEditingIndex(i);
            }}
            onMouseEnter={(e) => {
              if (isEditMode) {
                e.currentTarget.style.background = "#FEF3C7";
                e.currentTarget.style.borderColor = "#F59E0B";
              }
            }}
            onMouseLeave={(e) => {
              if (isEditMode) {
                e.currentTarget.style.background = "#FFFBEB";
                e.currentTarget.style.borderColor = "#FDE68A";
              }
            }}
            style={{
              background: "#FFFBEB",
              color: "#92400E",
              border: "1px solid #FDE68A",
              borderRadius: 4,
              padding: "1px 6px",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              cursor: isEditMode ? "pointer" : "default",
              transition: "background 0.15s",
            }}
          >
            {part}
          </span>
        );
      }

      // Regular text -- preserve newlines
      return (
        <span key={i}>
          {part.split("\n").map((line, li, arr) => (
            <span key={li}>
              {line}
              {li < arr.length - 1 && <br />}
            </span>
          ))}
        </span>
      );
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Template Editor View                                             */
  /* ---------------------------------------------------------------- */

  const tips = selectedTemplate ? (TEMPLATE_TIPS[selectedTemplate.id] || []) : [];

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

        {/* Template header with actions */}
        <div style={{ marginBottom: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            {/* Left: Title + Tag */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <h1
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#292524",
                    margin: 0,
                  }}
                >
                  {selectedTemplate.title}
                </h1>
                <span style={getTagStyle(selectedTemplate.tag)}>
                  {selectedTemplate.tag}
                </span>
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-stone-600)",
                  lineHeight: 1.6,
                  fontFamily: "var(--font-sans)",
                  margin: 0,
                }}
              >
                {selectedTemplate.description}
              </p>
            </div>

            {/* Right: Copy + Edit & Fill buttons */}
            <div style={{ display: "flex", gap: 8, flexShrink: 0, marginTop: 4 }}>
              <button
                onClick={copyToClipboard}
                style={{
                  background: "transparent",
                  border: "1px solid #E7E5E4",
                  borderRadius: 8,
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#57534E",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#D6D3D1";
                  e.currentTarget.style.background = "var(--color-stone-50)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#E7E5E4";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy
              </button>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                style={{
                  background: isEditMode ? "#16A34A" : "#22C55E",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {isEditMode ? "Done Editing" : "Edit & Fill"}
              </button>
            </div>
          </div>
        </div>

        {/* Tip bar */}
        {isEditMode && (
          <div
            style={{
              padding: "10px 28px",
              background: "#FFFBEB",
              borderBottom: "1px solid #FDE68A",
              borderTop: "1px solid #FDE68A",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
              borderRadius: "10px 10px 0 0",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span style={{ fontSize: 12, color: "#92400E", fontFamily: "var(--font-sans)" }}>
              Click any highlighted field to fill in your details
            </span>
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
              marginTop: isEditMode ? 0 : 16,
              marginBottom: 0,
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

        {/* Template content with placeholder chips */}
        <div
          style={{
            background: "#fff",
            borderRadius: isEditMode ? "0 0 14px 14px" : 14,
            border: "1px solid var(--color-stone-300)",
            borderTop: isEditMode ? "none" : "1px solid var(--color-stone-300)",
            padding: "28px 28px",
            marginTop: isEditMode ? 0 : 16,
            fontSize: 14,
            fontFamily: "var(--font-sans)",
            color: "#292524",
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        >
          {renderBodyWithPlaceholders(selectedTemplate.body)}
        </div>

        {/* Tips footer */}
        {tips.length > 0 && (
          <div
            style={{
              padding: "28px 28px 16px",
              background: "#FAFAF9",
              borderLeft: "1px solid var(--color-stone-300)",
              borderRight: "1px solid var(--color-stone-300)",
              borderBottom: "1px solid var(--color-stone-300)",
              borderTop: "1px solid #F5F5F4",
              borderRadius: "0 0 14px 14px",
              marginTop: -14,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#A8A29E",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}
            >
              Tips for this template
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {tips.map((tip, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 13,
                    color: "var(--color-stone-600)",
                    fontFamily: "var(--font-sans)",
                    lineHeight: 1.5,
                  }}
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Toast notification */}
        {showToast && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#292524",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 20px",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              zIndex: 9999,
              animation: "toastFade 2s ease forwards",
            }}
          >
            Copied to clipboard
          </div>
        )}
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
              {group.templates.map((template) => {
                const isCardActive = activeTemplateId === template.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => openTemplate(template)}
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      border: isCardActive
                        ? "2px solid #22C55E"
                        : "1px solid var(--color-stone-300)",
                      padding: isCardActive ? "19px 19px" : "20px 20px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      boxShadow: isCardActive
                        ? "0 0 0 3px rgba(34,197,94,0.08), 0 1px 3px rgba(0,0,0,0.04)"
                        : "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isCardActive) {
                        e.currentTarget.style.borderColor = "#D6D3D1";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.03)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCardActive) {
                        e.currentTarget.style.borderColor = "var(--color-stone-300)";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)";
                      }
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
                );
              })}
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
