# The AI development loop

This repository uses a structured, human-controlled AI feature-development workflow driven by globally installed Cursor commands:

- `/ai-bootstrap` — set up or refresh this workflow in a repository
- `/ai-spec` — turn an idea into an approved, build-ready specification
- `/ai-build` — autonomously implement an approved issue
- `/ai-review` — independent final review of a pull request
- `/ai-status` — report the current state of loop work

The flow is:

idea → specification interview → explicit human approval → issue created and marked ready → autonomous build/test/fix cycle → draft pull request → independent final review → human merge

Agents automate the mechanical work. Humans keep the decisions: a human approves every specification, a human starts every build, and only a human ever merges.

## Setup: `/ai-bootstrap`

Run `/ai-bootstrap` in a fresh Agent chat to create or refresh:

- `AI_LOOP.md` — the project adapter documenting the stack, commands, architecture, protected files and verification journeys. Every loop command reads it first.
- `.cursor/rules/ai-loop-governance.mdc` — binding governance and safety rules.
- `docs/ai-loop/README.md` — this document.
- GitHub workflow labels (see below).

Re-run it whenever the stack, commands or CI change materially, so `AI_LOOP.md` stays accurate.

## Writing a specification: `/ai-spec`

1. Open a fresh Agent chat and run `/ai-spec` with your feature idea.
2. The spec agent inspects the code first, then interviews you — one to four genuine product questions per round — until two competent developers could implement the same observable behaviour from the spec.
3. It produces a specification with binding acceptance criteria (AC-1, AC-2, …) and binding non-goals (NG-1, NG-2, …).

### Explicit approval

The spec agent will show you the complete specification and ask for approval. Approval must be explicit — for example "I approve this specification" or "Approved. Create the issue." Silence, partial agreement or an unrelated reply never counts.

After you explicitly approve, the spec agent may automatically:

- create one GitHub issue containing the complete approved specification, and
- apply the `agent-ready` label.

It never applies `agent-ready` to an unapproved draft or to an issue whose body differs from what you approved.

## Building: `/ai-build`

1. Open a fresh chat and run `/ai-build #ISSUE_NUMBER`.
2. The builder requires a clean working tree — unrelated local changes are a firm stop.
3. It implements the issue on its own branch, then loops autonomously: run every relevant check from `AI_LOOP.md` (lint, type-check, tests, build), perform the applicable browser verification journeys where tooling allows, diagnose failures and fix them.
4. Before opening a PR, it asks a fresh read-only internal reviewer subagent to check the diff against the approved contract.
5. The builder may fix must-fix findings and re-verify, but for **at most two internal correction rounds**. If it still has not converged after two rounds, it stops and escalates to human review instead of grinding on.
6. On convergence it opens a **draft pull request**. It never merges and never enables auto-merge.

Verification that could not actually run (missing browser tools, environment, etc.) is recorded as pending — never claimed as passed.

## Testing the draft PR

Check out the branch (or use a preview deployment when available) and manually exercise the verification journeys listed in the issue and in `AI_LOOP.md`. Treat the draft PR as untrusted until you have seen it work.

## Final review: `/ai-review`

Run `/ai-review PR #PR_NUMBER` in **another fresh chat** — one that did not implement the feature. The final reviewer:

- reviews the exact current PR commit against the approved issue,
- is strictly read-only — it never edits, pushes, merges or enables auto-merge,
- applies `loop-approved` or `loop-changes-requested` with its findings.

Independence matters: a reviewer that wrote the code (or shares its conversation context) tends to confirm its own assumptions. A fresh, read-only reviewer catches what the builder cannot see.

If changes are requested, run `/ai-build PR #PR_NUMBER` to address them, then review the new commit again.

## Merging

A human performs final checks and merges. Agents never merge and never enable auto-merge, because merging is the point where responsibility for the change transfers to the project — that judgement stays human.

## Labels

| Label | Meaning |
| --- | --- |
| `agent-ready` | Specification approved by a human; issue is ready for `/ai-build`. |
| `blocked` | Work cannot proceed; a dependency or decision is outstanding. |
| `loop-changes-requested` | Final reviewer found must-fix issues on the PR. |
| `loop-approved` | Final reviewer approved the current PR commit. |
| `needs-human-review` | High-risk change or escalation; a human must review. |
| `loop-stuck` | Builder exhausted its correction rounds without converging. |

## The normal workflow, end to end

1. Run `/ai-spec` in a fresh Agent chat.
2. Answer the specification questions.
3. Explicitly approve the complete specification.
4. The spec agent creates the GitHub issue and applies `agent-ready`.
5. Run `/ai-build #ISSUE_NUMBER` in a fresh chat.
6. The builder implements, runs automated checks, performs available browser verification, fixes failures and uses a fresh internal reviewer when available.
7. The builder opens a draft pull request after convergence, or escalates after two unsuccessful correction rounds.
8. Manually inspect and test the draft pull request.
9. Run `/ai-review PR #PR_NUMBER` in another fresh chat.
10. Address any final `loop-changes-requested` findings with `/ai-build PR #PR_NUMBER`.
11. Review the new commit again.
12. A human performs final checks and merges.

## Removing the setup

To remove the project-specific AI-loop setup from this repository, delete:

- `AI_LOOP.md`
- `.cursor/rules/ai-loop-governance.mdc`
- `docs/ai-loop/` (this folder)

Optionally delete the six GitHub labels above. The global commands live in your personal Cursor configuration and are unaffected.
