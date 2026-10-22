# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A context store for the design of an **agentic delivery pipeline**: turning JIRA tickets + Figma designs into tested UI code via AI agents. Its job is to keep the design context in one place so it isn't lost. It is not where the pipeline gets built, so it has no source code, build, lint, or test setup.

Files:
- `CHAT-CONTEXT.md` — handoff from the earlier design chat: sketch transcriptions, the user's confirmed clarifications, the critique, the proposed implementation, open questions. Read it first when starting implementation work.
- `Agentic Delivery.pdf` — the written proposal.
- `pipeline-flow.drawio` — single page ("AI Dev Pipeline"): the flow with critique / MCP / subagent / skill annotations drawn **inline** as boxes beside the stages.
- `pipeline-flow.drawio.svg` — editable SVG export of `pipeline-flow.drawio` (the diagram XML is embedded in the `content` attribute). Re-export it from draw.io after editing the `.drawio`; don't hand-edit it.
- `pipeline-flow-spacious.drawio` — **not** just a re-layout. It is the newer 3-page version: `1 - Flow` (clean flow with red numbered badges 1–7), `2 - AI layers` (stage × MCP / subagent / skill grid), `3 - Critique` (one card per finding, numbers match the badges). Solid borders = confirmed by the user; dashed = suggestion.
- `mcp.jpeg` — MCP-related illustration.
- `pitch/` — pitch to Sajal Gupta (Coforge Global Delivery Head). `brief.md` holds the audience, the facts and numbers, the decisions and the rebuild steps; the deck generator is in `pitch/build/`. Tooling stays local (yarn `node_modules/`, `.venv/`); never install anything globally.

No draw.io CLI is installed. Diagrams have been generated as mxGraph XML by script and opened manually in app.diagrams.net.

## Pipeline architecture (as modeled)

1. **Inputs**: JIRA ticket (references a persona by name, carries a Figma node ID), `Persona.md` (actor definitions incl. credential types; actors are resolved from here, never extracted from JIRA text), Figma reference (node ID only), SSWA / GGR (identity unconfirmed), Others. Design system = Component Library + Design Guidelines & Theme Library, with Figma designs mapped to library components.
2. **Design context**: the Figma MCP Server (exists) resolves node ID → design context, cross-referencing the design system.
3. **Ingestion**: reads every input, checks completeness, resolves persona refs.
4. **Classification**: Actor / Scenario / Others → one structured **Input JSON**.
5. **Build loop**: write tests (BDD or unit) → develop against them (using component library + theme) → validate with Playwright → if match & tests pass, Stop; else `count++` and retry, capped at 5 iterations.

## Confirmed vs. inferred

`CHAT-CONTEXT.md` tags statements **[Confirmed]** (the user said or drew it) or **[Inferred]** (a suggestion). Only these are confirmed: actors come from Persona.md, the design system exists, the Figma MCP server exists. Everything else is a proposal, not agreed design: the JIRA MCP, the subagent splits, the skill gaps, Playwright MCP, the severity ratings, the Input JSON shape, and the TypeScript + Claude Agent SDK implementation plan. Don't present it as decided. Open questions are in section 10 of that file. Ask the user about them instead of guessing.

## Critique findings (keep consistent across diagrams)

The seven numbered findings are: 1 Security: indirect prompt injection from ingested text (High); 2 Tools/MCP: unversioned Figma node IDs (Medium); 3 Evaluation: the implementer judges its own output (High); 4 Agents/Workflows: retry loop carries no failure diagnostics (Medium); 5 Output format: no JSON schema or version (Medium); 6 Source conflicts: no precedence rule (Low); 7 Human oversight: no review gate, and hitting the cap exits through the same Stop as success (Medium).

The compact `pipeline-flow.drawio` currently shows only findings 1–5 plus a weaker version of 7, and leaves out 6. The spacious file has all seven. Along with the subagent candidates (classification, tests, dev, independent evaluator), the skill gaps (test-writing, design-system / component-library, persona resolution) and the implied JIRA MCP, keep the findings consistent across both `.drawio` files when editing.
