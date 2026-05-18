---
name: pre-impl-discussion
description: "Conduct a thorough pre-implementation discussion before making significant changes. Use when the user wants to discuss, plan, or evaluate a change before implementing it — especially when they say words like 'discuss', 'evaluate', 'plan', or 'let's talk about'."
argument-hint: 'Describe the change to evaluate'
---

# Pre-Implementation Discussion

Facilitate a structured, collaborative discussion to evaluate a proposed change **before any implementation begins**.

## Golden Rule

**Do NOT implement anything until the user explicitly confirms the final plan and says to proceed.** Not even "let me try on a branch" — that's implementation. The user will tell you when discussion is over.

## Interaction Style

- **Concise during discussion.** Each intermediate response should be short and focused on the current question. Do NOT repeat the full plan in every response.
- **Complete when finalizing.** Once the plan is mature and the user asks for it, present a single comprehensive (but terse) summary for final review.
- **Ask, don't assume.** When uncertain about project context, constraints, or preferences — ask. The user prefers collaborative discussion over receiving a pre-baked answer.
- **Challenge the premise.** Question whether the proposed change is the right one. Suggest simpler alternatives if they exist.
- **Match the user's language.** Reply in the same language the user writes in.

## Procedure

### 1. Understand the Current State

Before forming any opinion:

- **Read the relevant source files** — configs, code, docs that relate to the change
- **Understand the project structure** — what's published vs private, what environments things target, existing constraints
- **Map the impact surface** — which files, packages, or systems would be affected
- **Estimate implementation cost** — how many files to touch, how much config to rewrite, what could break

Do NOT skip this step. Do NOT rely on assumptions about what "most projects" do.

### 2. Research Thoroughly

- **Consult official sources** — docs, changelogs, migration guides, GitHub issues
- **Verify every claim with evidence.** Don't say "X supports Y" without a source. If unsure, say so.
- **Search in parallel** to save time — batch independent queries

Common pitfalls:

- Assuming compatibility without checking actual version constraints
- Confusing roadmap/aspirations with actual released state
- Missing transitive constraints (a dependency of a dependency)

### 3. Present Findings (Concise)

Share a **brief** assessment. Tables work well for comparisons. Highlight **blockers** and **unknowns** prominently — don't bury them in paragraphs.

### 4. Identify Key Decisions

Surface the decisions the user needs to make. Present them as clear choices with trade-offs, not as a recommendation monologue.

For each decision point:

- What are the options? (2-3 max)
- What does each option cost or give up?
- What's your lean and why? (one sentence)

### 5. Iterate

The user will ask follow-up questions, raise concerns, or challenge assumptions. For each round:

- **Research if needed** — don't answer from instinct when facts are available
- **Answer only what was asked** — don't re-present the entire plan
- **Update your mental model** based on user feedback

Common mistakes in this phase:

- Repeating the full plan after every small clarification
- Answering a narrow question with a broad redesign
- Treating user questions as confirmation to proceed

### 6. Finalize the Plan

When the user signals the discussion is converging, present the **complete plan once**:

- **What changes** — concrete list of actions (table or bullet points)
- **Impact surface** — what files/systems are affected, estimated effort
- **What does NOT change** — explicitly state scope boundaries
- **Risks or open items** — anything that needs testing or further verification

Keep it terse. Tables over paragraphs. No explanations the user already heard during discussion.

### 7. Wait for Confirmation

After presenting the final plan, **stop and wait**. The user will either:

- Confirm → then (and only then) proceed to implementation
- Ask more questions → go back to step 5
- Modify scope → update the plan and re-present

## Anti-Patterns

| Don't                                               | Do Instead                               |
| --------------------------------------------------- | ---------------------------------------- |
| Start implementation "to test" without confirmation | Present findings and wait                |
| Repeat the full plan in every response              | Answer the specific question asked       |
| Say "X should work" without checking                | Say "I need to verify X" and research it |
| Assume project structure or constraints             | Read the actual files                    |
| Present one recommendation as the only option       | Present 2-3 options with trade-offs      |
| Write long paragraphs explaining trade-offs         | Use tables and bullet points             |
