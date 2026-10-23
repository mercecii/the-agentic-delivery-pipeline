# Pitch brief: Agentic Delivery → Sajal Gupta

Working notes for the deck. Captured 2026-10-22. Status: planning; the deck isn't built yet.

## Audience and setting

- **Presenter:** Deepak Kumar, a Coforge employee deployed at **Ameriprise Financial** (Coforge payroll; no regular contact with Coforge otherwise).
- **Audience:** Sajal Gupta, Global Delivery Head at Coforge, who is reviewing how his people are doing on client accounts. Ameriprise is one of them. He is very senior and his time is precious.
- **Reviewer:** Rajitha Sood (manager), who suggested the pointers below.
- **Slot:** 20 minutes including late joiners, interruptions and Q&A. Plan for **about 10 minutes of slides**.
- **Delivery:** fully remote on MS Teams web; the deck opens in PowerPoint for the web. Share the screen or window, **not PowerPoint Live** (attendees could click ahead and spoil the question slides).
- **Goal:** Coforge turns this into a product or accelerator and sells it to clients, and Coforge sees the presenter's work (a promotion is the unspoken hope; never ask for it directly).

## Format

- Alternate **question slide → answer slide** (Rajitha's "question-wise slides"). The question creates suspense; the answer is one big visual.
- Infographic-heavy: diagrams, icons, images. Don't compress the slide count.
- No company template. Dark theme, orange accent (Claude). Fade/appear/morph animations only, because heavy GIFs stutter over Teams.
- Output: PPTX (primary, presented in a browser) and PDF (leave-behind).
- Assets in repo: `claud agent.avif` (convert to PNG; PowerPoint doesn't support AVIF), `mcp.jpeg` (MCP logo), `WhatsApp Image 2026-10-18 at 23.14.41.jpeg` (rough master-agent diagram; use as a reference, redraw it cleanly).
- Ameriprise's name and internal details (e.g. `<CwpButton />`) **may be shown**.

## Facts (from the presenter)

**Platform:** Claude models, through GitHub Copilot and Kiro.

**Built by:** the presenter alone. The Figma MCP is Figma's paid offering (believed to be ~$35/dev seat/month, unconfirmed), and DevSecOps contributed some work.

**Adoption:** the Ameriprise frontend team (40–50 developers); scaling, not yet the whole of Ameriprise.

**Status:** every agent below and the JIRA + Figma → UI pipeline are built and running.

**Headline numbers:**
- 13-point story: 40 man-hours (5 man-days) → 8 hours (1 man-day). The bigger the task, the bigger the saving.
- Unit tests: 2 man-months human-only → under 2 weeks to reach 95% coverage, using `code-coverage-agent` (built on Copilot). Cost: $35/hr × 8 × 5 × 8 weeks = **$11,200** vs **~$1,120** in AI credits. Use this calculation as is.
- Sonar / CI / Veracode / Xray fixes: **~90% less effort**; the remaining ~10% is PR review.

**Atomic agents:**

| Agent | Connects to | What it does |
|---|---|---|
| sonar-reporter | SonarQube | Fetches issues, fixes the code, rebuilds, loops until clean |
| the-ci-analyzer | Jenkins | Reads console output, fixes the build failure, commits, pushes, re-runs, loops. Replaces "log in, read logs, find a Jenkins expert, wait" |
| veracode-analyser | Veracode (SAST) | Zips artifacts, uploads, waits for the scan, fetches results, fixes, loops |
| xray-analyzer | JFrog Xray (SCA), via a homegrown MCP (skills + scripts over the JFrog APIs) | Resolves SCA flaws (~90% saving) |
| jira-agent | Jira | Reads the story plus completed and backlog stories for the whole picture, reads the code, delivers. If input is missing, comments on the story and assigns it back to the reporter |
| figma-agent | Figma (via Figma MCP) | Follows the Figma link in Jira to the node ID and builds with the component library (Figma component → React component + props, e.g. `<CwpButton />`), not vanilla HTML |
| swagger-hub-agent | SwaggerHub | Follows the SwaggerHub URL in Jira and writes the API calls correctly |
| confluence-assistant | Confluence | Pulls linked docs into precise context; also publishes new docs |
| code-coverage-agent | Code coverage | Writes unit tests and loops until coverage reaches 95% |

**Orchestration (WhatsApp sketch):** a prompt-submit hook → **master agent** → Jira / Figma / Confluence / Swagger subagents, each with its own MCP connection → "Is input missing?" → **Yes:** comment, assign back to the reporter, exit (the sketch labels this branch "token concern": fail fast) → **No:** pass the Input JSON on.

**Tokens and context, practised today:** subagents with their own context; prompt caching; cheaper models for subagents (set in the agent markdown; *never switch models mid-session*, because that costs more and backfires); trimming tool output before it reaches the model. **Not done:** per-task token budgets (not supported in Kiro as far as the presenter knows; there is a monthly quota refill).

**Not built yet:** connecting to downstream teams (HTTP services such as the data & services / DNS team). Each Ameriprise team is being asked to publish its own MCP server, so SLA issues get resolved without long email chains. Staffing for this is up to Ameriprise leaders.

## Decisions

- Drop "release cycle duration" (no data).
- Governance and rollout policy stay **off the slides**. Q&A answer: "Rollout governance sits with Ameriprise DevSecOps/MLOps; every change still goes through human PR review."
- "Doesn't this reduce our billing?" is a **Q&A answer, not a slide**. Context: hiring is nearly frozen ("no more hiring, very few"), so the same team has to deliver more; productising opens a new revenue line.

## Rajitha's pointers → where they land

| Pointer | Slide |
|---|---|
| 1 Problem statement | Q/A: what a 13-point story costs |
| 2 Release cycle | Dropped |
| 3 Resource optimization | Q/A: unit tests, plus the hiring-freeze angle in the Coforge slide |
| 4 Productivity (full stack, tests, SAST/SCA, review, CI/CD) | Q/A slides on the build, quality and security loops, and coverage |
| 5 Man-hours | 40 → 8; 2 man-months → under 2 weeks |
| 6 Multi-agent workflow | Q/A: master agent diagram |
| 7 Atomic agents first | Q/A: agent gallery |
| 8 Developer effort | Q/A: the developer becomes a reviewer |
| 9, 12 Tokens and budget | Q/A: cost |
| 10 Question-wise slides | The whole format |
| 11 Context bloat | Q/A: context |

## Deck (built 2026-10-22)

Versioned as `pitch/v<N>-the-agentic-delivery-pipeline.pptx` / `.pdf`. **Never modify a published version; publish a new one.** v1 = 31 slides, presented 22 Oct 2026, confirmed to open correctly in PowerPoint for the web. The PDF is the leave-behind, exported via Keynote.
v2 (23 Oct 2026): the loop arrow GIF now spins clockwise, matching its arrowhead. Nothing else changed. Order: title → about me → 14 question/answer pairs → thank you. Speaker notes are on every slide; the Q&A answers (billing, governance, IP, platform) are in the notes of the last slide.
v3 (23 Oct 2026): fixes the "PowerPoint found a problem with content… Repair" prompt in desktop PowerPoint (v1 and v2 have it too; v1 was only checked in PowerPoint for the web). PptxGenJS hard-codes shape id 25 on the slide-number placeholder, which collided with a deck shape on 15 slides, and it writes lowercase section GUIDs. `animate.py` now renumbers the colliding shapes and uppercases the GUIDs. v3 is v2 with exactly those two fixes, so it looks identical. Keynote wasn't available where v3 was made, so `v3-…pdf` is the v2 Keynote export with its title metadata set to v3 (all 31 pages render pixel-identical to v2).

Rebuild (everything installs locally: yarn → `node_modules/`, Python → `.venv/`):

```
.venv/bin/python pitch/build/make_gifs.py            # GIFs + PNG assets
NODE_PATH=node_modules node pitch/build/deck.js      # writes pitch/build/out/*.pptx
.venv/bin/python pitch/build/animate.py pitch/build/out/the-agentic-delivery-pipeline.pptx
.venv/bin/python pitch/build/publish.py              # copies to the next pitch/vN-… and exports the PDF
```

`deck.js` names shapes `a<step><kind>_…` to schedule entrance animations, and `!!q` for the question text that morphs into the answer slide's kicker. `animate.py` turns those names into Morph transitions (falling back to Fade) and auto-playing builds.
