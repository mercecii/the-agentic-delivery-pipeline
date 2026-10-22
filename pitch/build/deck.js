// Builds pitch/build/out/the-agentic-delivery-pipeline.pptx
//   NODE_PATH=node_modules node pitch/build/deck.js
// Then run animate.py to add morph transitions and entrance animations.
//
// Animation tagging: a shape's objectName "a<step><kind>_<label>" makes it enter at
// <step> (after the previous step, no click). kind: f = fade, w = wipe from left,
// u = wipe from bottom. "!!q" names the question text so morph carries it from the
// question slide into the answer slide's kicker.
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const si = require("react-icons/si");
const lu = require("react-icons/lu");
const { applyTheme } = require("/Users/deepakkumar/.claude/skills/synced/fff91fd3-52dd-40ae-a048-64b0e9a2d7df_b3535a06-e586-441a-a8b6-3c33dce2c602/pptx/scripts/apply_theme.js");

const A = (f) => path.join(__dirname, "assets", f);
const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });
const FILE = path.join(OUT, "the-agentic-delivery-pipeline.pptx");

// Dark deck: lt1 is the (dark) background and dk1 the (light) text, so PowerPoint's
// default text and background mapping stay readable.
const THEME = {
  name: "Agentic Delivery",
  headFontFace: "Georgia",
  bodyFontFace: "Arial",
  colors: {
    dk1: "F4F1EA", lt1: "0B0B0E", dk2: "A3A09A", lt2: "17171C",
    accent1: "D97757", accent2: "7FCFA8", accent3: "2C2C33", accent4: "5A5A63",
    accent5: "F2B880", accent6: "8AA4FF", hlink: "D97757", folHlink: "F2B880",
  },
};
const HEX = THEME.colors;
const MONO = "Courier New";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "the-agentic-delivery-pipeline";
pres.author = "Deepak Kumar";
const C = pres.SchemeColor;
// Declare each section just before its first slide.
const declared = new Set();
const rawAddSlide = pres.addSlide.bind(pres);
pres.addSlide = (o) => {
  if (o.sectionTitle && !declared.has(o.sectionTitle)) { pres.addSection({ title: o.sectionTitle }); declared.add(o.sectionTitle); }
  return rawAddSlide(o);
};
const TEXT = C.text1, MUTED = C.text2, BG = C.background1, SURF = C.background2;
const CLAY = C.accent1, MINT = C.accent2, EDGE = C.accent3, DIM = C.accent4;

// ---------- icons ----------
const iconCache = new Map();
async function icon(Comp, hex, px = 256) {
  const key = `${Comp.name || Comp}-${hex}-${px}`;
  if (iconCache.has(key)) return iconCache.get(key);
  if (!Comp) throw new Error("missing icon");
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color: "#" + hex, size: px }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const data = "image/png;base64," + buf.toString("base64");
  iconCache.set(key, data);
  return data;
}

// ---------- helpers ----------
let uid = 0;
const nm = (step, kind = "f", label = "x") => (step ? `a${step}${kind}_${label}_${++uid}` : `s_${label}_${++uid}`);

function txt(slide, text, o) {
  slide.addText(text, {
    x: o.x, y: o.y, w: o.w, h: o.h,
    fontSize: o.size || 14, color: o.color || TEXT, bold: !!o.bold, italic: !!o.italic,
    fontFace: o.font, align: o.align || "left", valign: o.valign || "top",
    margin: o.margin ?? 0, isTextBox: true, charSpacing: o.spacing, strike: o.strike,
    paraSpaceAfter: o.paraAfter, lineSpacingMultiple: o.lineMul,
    objectName: o.name || nm(o.step, o.kind, "t"),
    transparency: o.transparency,
  });
}

function box(slide, o) {
  slide.addShape(o.shape || pres.shapes.ROUNDED_RECTANGLE, {
    x: o.x, y: o.y, w: o.w, h: o.h,
    fill: o.fill ? { color: o.fill, transparency: o.fillT } : { type: "none" },
    line: o.line ? { color: o.line, width: o.lw || 1, dashType: o.dash } : { type: "none" },
    rectRadius: o.shape && o.shape !== pres.shapes.ROUNDED_RECTANGLE ? undefined : (o.r ?? 0.12),
    objectName: o.name || nm(o.step, o.kind, "b"),
  });
}

function img(slide, data, o) {
  const opts = { x: o.x, y: o.y, w: o.w, h: o.h, objectName: o.name || nm(o.step, o.kind, "i") };
  if (data.startsWith("image/")) opts.data = data; else opts.path = data;
  slide.addImage(opts);
}

function line(slide, x1, y1, x2, y2, o = {}) {
  slide.addShape(pres.shapes.LINE, {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
    flipH: (x2 < x1) !== (y2 < y1) && x1 !== x2 && y1 !== y2 ? true : x2 < x1 && y1 === y2,
    flipV: y2 < y1 && x1 === x2,
    line: { color: o.color || DIM, width: o.width || 1.25, dashType: o.dash, endArrowType: o.arrow ? "triangle" : undefined },
    objectName: o.name || nm(o.step, o.kind, "l"),
  });
}

// A rounded tile with an icon inside: the deck's visual motif.
function tile(slide, data, o) {
  box(slide, { x: o.x, y: o.y, w: o.s, h: o.s, fill: o.fill || SURF, line: o.line || CLAY, lw: 1.25, r: o.s * 0.22, step: o.step, kind: o.kind });
  const p = o.s * 0.24;
  img(slide, data, { x: o.x + p, y: o.y + p, w: o.s - 2 * p, h: o.s - 2 * p, step: o.step, kind: o.kind });
}

// Icon in a tinted circle, used for row lists.
function dot(slide, data, o) {
  box(slide, { shape: pres.shapes.OVAL, x: o.x, y: o.y, w: o.s, h: o.s, fill: o.fill || CLAY, fillT: o.fillT ?? 80, step: o.step, kind: o.kind });
  const p = o.s * 0.25;
  img(slide, data, { x: o.x + p, y: o.y + p, w: o.s - 2 * p, h: o.s - 2 * p, step: o.step, kind: o.kind });
}

// ---------- layouts ----------
const footer = { text: { text: "the-agentic-delivery-pipeline  ·  Deepak Kumar", options: { x: 0.6, y: 6.98, w: 6, h: 0.3, fontSize: 10, color: MUTED, margin: 0 } } };
const slideNum = { x: 12.13, y: 6.98, w: 0.6, h: 0.3, fontSize: 10, color: MUTED, align: "right", margin: 0 };
pres.defineSlideMaster({ title: "TITLE", background: { color: BG }, objects: [] });
pres.defineSlideMaster({ title: "QUESTION", background: { color: BG }, objects: [footer], slideNumber: slideNum });
pres.defineSlideMaster({
  title: "ANSWER", background: { color: BG }, slideNumber: slideNum,
  objects: [footer, { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.8, w: 12.13, h: 0.75, fontSize: 28, bold: true, color: TEXT, align: "left", valign: "top", margin: 0 }, text: "" } }],
});

const QUESTIONS = [
  "What does a 13-point story cost us today?",
  "What if it took one day?",
  "How?",
  "What happens when the agents work together?",
  "What if the story itself is incomplete?",
  "Who fixes the build when it breaks?",
  "And code quality and security?",
  "Two man-months of unit tests?",
  "So what does the developer do now?",
  "Doesn't AI get expensive?",
  "Won't the AI drown in context?",
  "Is anyone actually using it?",
  "What's still slow?",
  "What could Coforge do with this?",
];

function questionSlide(i, section, notes) {
  const s = pres.addSlide({ masterName: "QUESTION", sectionTitle: section });
  txt(s, "?", { x: 8.3, y: 0.15, w: 4.6, h: 6.6, size: 400, font: "Georgia", color: CLAY, transparency: 82, align: "center", valign: "middle", name: "s_bigq" });
  txt(s, `QUESTION ${String(i + 1).padStart(2, "0")}`, { x: 0.6, y: 0.6, w: 4, h: 0.35, size: 12, bold: true, color: CLAY, spacing: 4 });
  txt(s, QUESTIONS[i], { x: 0.6, y: 2.0, w: 8.4, h: 3.2, size: 48, font: "Georgia", color: TEXT, valign: "middle", name: "!!q" });
  img(s, A("agent.gif"), { x: 0.6, y: 5.75, w: 1.0, h: 0.7, name: "s_mascot" });
  s.addNotes(notes);
  return s;
}

function answerSlide(i, section, title, notes) {
  const s = pres.addSlide({ masterName: "ANSWER", sectionTitle: section });
  txt(s, QUESTIONS[i], { x: 0.6, y: 0.35, w: 12.13, h: 0.4, size: 16, italic: true, font: "Georgia", color: CLAY, name: "!!q" });
  s.addText(title, { placeholder: "title" });
  s.addNotes(notes);
  return s;
}

// row of: icon dot, bold header, muted sub-line
function infoRow(s, ic, head, sub, o) {
  if (o.card) box(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: SURF, line: EDGE, lw: 0.75, step: o.step, kind: o.kind });
  const d = o.dot || 0.5;
  dot(s, ic, { x: o.x + 0.2, y: o.y + (o.h - d) / 2, s: d, step: o.step, kind: o.kind, fill: o.dotFill, fillT: o.dotT });
  const tx = o.x + 0.2 + d + 0.25;
  if (sub) txt(s, head, { x: tx, y: o.y + o.h / 2 - 0.32, w: o.w - (tx - o.x) - 0.2, h: 0.32, size: o.hs || 16, bold: true, color: o.hc || TEXT, step: o.step, kind: o.kind });
  else txt(s, head, { x: tx, y: o.y, w: o.w - (tx - o.x) - 0.2, h: o.h, size: o.hs || 16, bold: true, color: o.hc || TEXT, valign: "middle", step: o.step, kind: o.kind });
  if (sub) txt(s, sub, { x: tx, y: o.y + o.h / 2 + 0.02, w: o.w - (tx - o.x) - 0.2, h: 0.3, size: o.ss || 12, color: MUTED, step: o.step, kind: o.kind });
}

(async () => {
  const L = HEX.dk1, CL = HEX.accent1, GR = HEX.dk2, DM = HEX.accent4;
  const I = {
    jira: await icon(si.SiJira, L), figma: await icon(si.SiFigma, L), conf: await icon(si.SiConfluence, L),
    swag: await icon(si.SiSwagger, L), sonar: await icon(si.SiSonarqubeserver, L), jenkins: await icon(si.SiJenkins, L),
    veracode: await icon(lu.LuShieldCheck, L), jfrog: await icon(si.SiJfrog, L), cov: await icon(lu.LuTestTubeDiagonal, L),
  };
  const ic = async (name, hex = CL) => icon(lu[name], hex);

  // ================= 1. Title =================
  {
    const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Opening" });
    txt(s, "COFORGE  ·  AMERIPRISE FINANCIAL", { x: 0.7, y: 1.2, w: 6.5, h: 0.35, size: 12, bold: true, color: CLAY, spacing: 4 });
    txt(s, "the-agentic-\ndelivery-pipeline", { x: 0.7, y: 1.75, w: 6.8, h: 1.9, size: 44, bold: true, font: MONO, color: TEXT, lineMul: 0.95 });
    txt(s, "Jira story in. Tested, scanned, review-ready code out.", { x: 0.7, y: 3.85, w: 6.4, h: 0.9, size: 22, italic: true, font: "Georgia", color: TEXT });
    txt(s, "Deepak Kumar  ·  22 October 2026", { x: 0.7, y: 5.3, w: 6, h: 0.35, size: 14, color: MUTED });
    txt(s, "Built on Claude models, via GitHub Copilot and Kiro", { x: 0.7, y: 5.7, w: 6, h: 0.35, size: 12, color: MUTED });
    const cx = 10.05, cy = 3.6, R = 2.3;
    img(s, A("master-agent.gif"), { x: cx - 1.1, y: cy - 1.1, w: 2.2, h: 2.2, step: 1 });
    const orbit = [I.jira, I.figma, I.conf, I.swag, I.sonar, I.jenkins, I.veracode, I.jfrog, I.cov];
    orbit.forEach((d, k) => {
      const a = -Math.PI / 2 + (2 * Math.PI * k) / orbit.length;
      tile(s, d, { x: cx + R * Math.cos(a) - 0.3, y: cy + R * Math.sin(a) - 0.3, s: 0.6, step: 2 + k });
    });
    s.addNotes("Thank Sajal for the time. One line: this is what I've built at Ameriprise: nine AI agents and a pipeline that take a Jira story to tested, scanned, review-ready code. I'll run it as questions and answers, so it stays quick.");
  }

  // ================= 2. About me =================
  {
    const s = pres.addSlide({ masterName: "ANSWER", sectionTitle: "Opening" });
    txt(s, "WHO'S PRESENTING", { x: 0.6, y: 0.4, w: 6, h: 0.35, size: 12, bold: true, color: CLAY, spacing: 4 });
    s.addText("Deepak Kumar", { placeholder: "title" });
    infoRow(s, await ic("LuBuilding2"), "Coforge since 30 May 2024", "At Ameriprise Financial from day one", { x: 0.6, y: 2.0, w: 6.6, h: 1.0, card: true, step: 1 });
    infoRow(s, await ic("LuUsers"), "Frontend team, 40–50 developers", "The team using these agents today", { x: 0.6, y: 3.2, w: 6.6, h: 1.0, card: true, step: 2 });
    infoRow(s, await ic("LuSparkles"), "Built the-agentic-delivery-pipeline", "Solo, with some help from DevSecOps", { x: 0.6, y: 4.4, w: 6.6, h: 1.0, card: true, step: 3 });
    box(s, { x: 7.7, y: 2.0, w: 5.03, h: 4.4, fill: SURF, line: CLAY, lw: 1.25, r: 0.2, step: 4 });
    img(s, A("claude-symbol.png"), { x: 8.1, y: 2.4, w: 0.85, h: 0.85, step: 4 });
    txt(s, "Claude Certified Developer", { x: 8.1, y: 3.45, w: 4.4, h: 0.4, size: 20, bold: true, step: 4 });
    txt(s, "Foundations  ·  Anthropic  ·  passed 9 Oct 2026", { x: 8.1, y: 3.88, w: 4.4, h: 0.3, size: 12, color: MUTED, step: 4 });
    txt(s, "882", { x: 8.1, y: 4.45, w: 2.3, h: 1.2, size: 66, font: "Georgia", bold: true, color: CLAY, step: 5, kind: "f" });
    txt(s, "score\npass mark 720", { x: 10.35, y: 4.8, w: 2.2, h: 0.7, size: 14, color: MUTED, step: 5 });
    s.addNotes("Quick context on me: Coforge since May 2024, placed at Ameriprise since day one, on the frontend team of 40 to 50 developers. I designed and built everything in this deck myself. I'm also an Anthropic Claude Certified Developer: 882 against a pass mark of 720.");
  }

  // ================= Q1 / A1 Problem =================
  questionSlide(0, "The problem", "Pause for a second and let the question land.");
  {
    const s = answerSlide(0, "The problem", "40 man-hours, and most of it isn't writing code",
      "A 13-point story takes about 40 man-hours, five man-days. Most of that time goes on everything around the code: finding context, chasing gaps in the story, fixing scan findings, waiting for a Jenkins expert, writing tests by hand.");
    txt(s, "40", { x: 0.6, y: 1.85, w: 3.8, h: 2.0, size: 130, font: "Georgia", bold: true, color: CLAY, step: 1 });
    txt(s, "man-hours", { x: 0.6, y: 4.0, w: 3.8, h: 0.45, size: 22, bold: true, step: 1 });
    txt(s, "5 man-days for one\n13-point story", { x: 0.6, y: 4.55, w: 3.8, h: 0.8, size: 16, color: MUTED, step: 1 });
    const rows = [
      ["LuSearch", "Hunting for context", "Jira, Figma, Confluence and SwaggerHub, one tab at a time"],
      ["LuMessageSquareWarning", "Chasing incomplete stories", "Gaps surface mid-build, then wait on the reporter"],
      ["LuShieldAlert", "Fixing scan findings", "SonarQube, Veracode and Xray, one issue at a time"],
      ["LuHourglass", "Waiting on a Jenkins expert", "Read the logs, find someone, wait for their slot"],
      ["LuTestTubeDiagonal", "Writing unit tests by hand", "Slow, repetitive work to reach coverage"],
    ];
    for (let k = 0; k < rows.length; k++) {
      infoRow(s, await ic(rows[k][0]), rows[k][1], rows[k][2], { x: 5.0, y: 1.9 + k * 0.94, w: 7.73, h: 0.8, card: true, step: 2 + k });
    }
  }

  // ================= Q2 / A2 One day =================
  questionSlide(1, "The outcome", "Let it sit. Then click.");
  {
    const s = answerSlide(1, "The outcome", "Same 13-point story. One man-day.",
      "With the agents, the same 13-point story takes about 8 hours, one man-day. That's 80% less effort, and the bigger the story, the bigger the saving. The four days don't disappear; they go to the next story.");
    txt(s, "Before", { x: 0.6, y: 2.2, w: 1.8, h: 0.4, size: 18, bold: true, color: MUTED, step: 1 });
    txt(s, "40 hours", { x: 0.6, y: 2.6, w: 1.8, h: 0.3, size: 13, color: MUTED, step: 1 });
    txt(s, "With agents", { x: 0.6, y: 4.0, w: 1.9, h: 0.4, size: 18, bold: true, color: CLAY, step: 2 });
    txt(s, "8 hours", { x: 0.6, y: 4.4, w: 1.8, h: 0.3, size: 13, color: CLAY, step: 2 });
    for (let d = 0; d < 5; d++) {
      const x = 2.6 + d * 2.03;
      box(s, { x, y: 1.95, w: 1.83, h: 1.2, fill: EDGE, r: 0.14, step: 1 });
      txt(s, `Day ${d + 1}`, { x, y: 1.95, w: 1.83, h: 1.2, size: 16, color: MUTED, align: "center", valign: "middle", step: 1 });
      if (d === 0) {
        box(s, { x, y: 3.75, w: 1.83, h: 1.2, fill: CLAY, r: 0.14, step: 2 });
        txt(s, "Day 1\nstory done", { x, y: 3.75, w: 1.83, h: 1.2, size: 16, bold: true, color: BG, align: "center", valign: "middle", step: 2 });
      } else {
        box(s, { x, y: 3.75, w: 1.83, h: 1.2, line: CLAY, lw: 1.25, dash: "dash", r: 0.14, step: 3 });
        txt(s, "free for the\nnext story", { x, y: 3.75, w: 1.83, h: 1.2, size: 13, color: CLAY, align: "center", valign: "middle", step: 3 });
      }
    }
    txt(s, "−80%", { x: 0.6, y: 5.45, w: 3.0, h: 1.1, size: 60, font: "Georgia", bold: true, color: CLAY, step: 4 });
    txt(s, "effort per story. The bigger the story,\nthe bigger the saving.", { x: 3.7, y: 5.65, w: 8.5, h: 0.8, size: 20, italic: true, font: "Georgia", step: 4 });
  }

  // ================= Q3 / A3 Agents =================
  questionSlide(2, "How it works", "The shortest question in the deck. Hold it.");
  {
    const s = answerSlide(2, "How it works", "Nine atomic agents. Each does one job, end to end.",
      "We didn't start with one giant AI. We built small atomic agents first, each owning one job end to end and connected to one tool. Then we composed them. Walk the rows: understand the story, build it, keep it clean and secure.");
    const agents = [
      [I.jira, "jira-agent", "Jira", "Reads the story, done and backlog stories, and the code"],
      [I.figma, "figma-agent", "Figma MCP", "Builds from the node ID with real library components"],
      [I.swag, "swagger-hub-agent", "SwaggerHub", "Writes API calls straight from the spec"],
      [I.conf, "confluence-assistant", "Confluence", "Pulls linked docs as precise context; publishes docs"],
      [I.sonar, "sonar-reporter", "SonarQube", "Fetches issues, fixes them, rebuilds, repeats"],
      [I.jenkins, "the-ci-analyzer", "Jenkins", "Reads the console, fixes, commits, reruns"],
      [I.veracode, "veracode-analyser", "Veracode · SAST", "Uploads, waits for the scan, fixes the flaws"],
      [I.jfrog, "xray-analyzer", "JFrog Xray · SCA", "Fixes dependency flaws through our own MCP"],
      [I.cov, "code-coverage-agent", "Unit tests", "Writes tests and loops until 95% coverage"],
    ];
    agents.forEach(([d, name, tool, job], k) => {
      const x = 0.6 + (k % 3) * 4.11, y = 1.85 + Math.floor(k / 3) * 1.55, step = 1 + Math.floor(k / 3);
      box(s, { x, y, w: 3.91, h: 1.38, fill: SURF, line: EDGE, lw: 0.75, step });
      tile(s, d, { x: x + 0.2, y: y + 0.29, s: 0.8, step });
      txt(s, name, { x: x + 1.2, y: y + 0.17, w: 2.6, h: 0.3, size: 13, bold: true, font: MONO, step });
      txt(s, tool, { x: x + 1.2, y: y + 0.47, w: 2.6, h: 0.25, size: 11, bold: true, color: CLAY, step });
      txt(s, job, { x: x + 1.2, y: y + 0.75, w: 2.6, h: 0.5, size: 11, color: MUTED, step });
    });
    txt(s, "Built solo  ·  Claude models via GitHub Copilot and Kiro", { x: 0.6, y: 6.55, w: 8, h: 0.3, size: 12, italic: true, color: MUTED, step: 4 });
  }

  // ================= Q4 / A4 Master agent =================
  questionSlide(3, "How it works", "This is the architecture slide.");
  {
    const s = answerSlide(3, "How it works", "A master agent conducts. Specialists do the work.",
      "When a developer submits a prompt, a hook fires and the master agent takes over. It sends specialist subagents to Jira, Figma, Confluence and SwaggerHub, each through its own MCP connection. If anything is missing, it comments on the Jira story, assigns it back to the reporter and stops. If the input is complete, it hands one Input JSON to the build loop: tests, code, Playwright, up to five tries.");
    const xs = [3.67, 5.67, 7.67, 9.67];
    const tools = [[I.jira, "Jira"], [I.figma, "Figma"], [I.conf, "Confluence"], [I.swag, "SwaggerHub"]];
    tools.forEach(([d, label], k) => {
      tile(s, d, { x: xs[k] - 0.375, y: 1.75, s: 0.75, step: 1 });
      box(s, { shape: pres.shapes.OVAL, x: xs[k] + 0.2, y: 1.6, w: 0.34, h: 0.34, fill: BG, line: CLAY, lw: 1, step: 1 });
      img(s, A("mcp-light.png"), { x: xs[k] + 0.25, y: 1.65, w: 0.24, h: 0.24, step: 1 });
      txt(s, label, { x: xs[k] - 0.9, y: 2.55, w: 1.8, h: 0.28, size: 12, bold: true, align: "center", step: 1 });
      line(s, xs[k], 2.85, xs[k], 3.0, { color: DIM, step: 2 });
      img(s, A("agent.gif"), { x: xs[k] - 0.31, y: 3.0, w: 0.62, h: 0.43, step: 2 });
      line(s, xs[k], 3.45, 6.67, 3.75, { color: DIM, step: 2 });
    });
    txt(s, "MCP", { x: 10.5, y: 1.72, w: 2.2, h: 0.3, size: 11, bold: true, color: CLAY, step: 1 });
    txt(s, "one live tool connection each", { x: 10.5, y: 2.0, w: 2.2, h: 0.5, size: 11, color: MUTED, step: 1 });
    txt(s, "Subagents", { x: 10.5, y: 3.0, w: 2.2, h: 0.3, size: 11, bold: true, color: CLAY, step: 2 });
    txt(s, "each in its own context", { x: 10.5, y: 3.28, w: 2.2, h: 0.5, size: 11, color: MUTED, step: 2 });
    txt(s, "prompt-submit hook", { x: 0.6, y: 3.65, w: 2.6, h: 0.3, size: 11, italic: true, color: CLAY, step: 3 });
    box(s, { x: 0.6, y: 3.98, w: 2.6, h: 0.6, fill: SURF, line: EDGE, lw: 0.75, step: 3 });
    txt(s, "Developer submits a prompt", { x: 0.6, y: 3.98, w: 2.6, h: 0.6, size: 12, bold: true, align: "center", valign: "middle", step: 3 });
    line(s, 3.2, 4.28, 6.05, 4.28, { color: CLAY, arrow: true, step: 3 });
    img(s, A("master-agent.gif"), { x: 6.1, y: 3.72, w: 1.14, h: 1.14, step: 4 });
    txt(s, "Master agent", { x: 5.67, y: 4.88, w: 2.0, h: 0.3, size: 13, bold: true, color: CLAY, align: "center", step: 4 });
    line(s, 6.67, 5.2, 6.67, 5.4, { color: CLAY, arrow: true, step: 5 });
    box(s, { shape: pres.shapes.DIAMOND, x: 5.87, y: 5.4, w: 1.6, h: 1.1, fill: SURF, line: CLAY, lw: 1.25, step: 5 });
    txt(s, "Input\ncomplete?", { x: 5.87, y: 5.4, w: 1.6, h: 1.1, size: 12, bold: true, align: "center", valign: "middle", step: 5 });
    line(s, 5.87, 5.95, 5.15, 5.95, { color: DIM, arrow: true, step: 6 });
    txt(s, "No", { x: 5.25, y: 5.62, w: 0.6, h: 0.28, size: 12, bold: true, color: CLAY, step: 6 });
    box(s, { x: 2.45, y: 5.55, w: 2.7, h: 0.8, fill: SURF, line: EDGE, lw: 0.75, step: 6 });
    txt(s, "Comment on Jira, assign back to the reporter", { x: 2.55, y: 5.55, w: 2.5, h: 0.8, size: 12, align: "center", valign: "middle", step: 6 });
    line(s, 2.45, 5.95, 1.95, 5.95, { color: DIM, arrow: true, step: 6 });
    box(s, { shape: pres.shapes.OVAL, x: 1.2, y: 5.6, w: 0.72, h: 0.72, line: DIM, lw: 1.25, step: 6 });
    txt(s, "Exit", { x: 1.2, y: 5.6, w: 0.72, h: 0.72, size: 12, bold: true, color: MUTED, align: "center", valign: "middle", step: 6 });
    line(s, 7.47, 5.95, 8.15, 5.95, { color: CLAY, arrow: true, step: 7 });
    txt(s, "Yes", { x: 7.55, y: 5.62, w: 0.6, h: 0.28, size: 12, bold: true, color: CLAY, step: 7 });
    box(s, { x: 8.15, y: 5.55, w: 1.75, h: 0.8, fill: SURF, line: CLAY, lw: 1.25, step: 7 });
    txt(s, "Input JSON", { x: 8.15, y: 5.55, w: 1.75, h: 0.8, size: 13, bold: true, font: MONO, align: "center", valign: "middle", step: 7 });
    line(s, 9.9, 5.95, 10.3, 5.95, { color: CLAY, arrow: true, step: 7 });
    box(s, { x: 10.3, y: 5.55, w: 2.43, h: 0.8, fill: CLAY, step: 7 });
    txt(s, [{ text: "Build loop", options: { bold: true, fontSize: 13, breakLine: true } }, { text: "tests → code → Playwright", options: { fontSize: 10, breakLine: true } }, { text: "max 5 tries", options: { fontSize: 10 } }],
      { x: 10.4, y: 5.55, w: 2.23, h: 0.8, color: BG, align: "center", valign: "middle", step: 7 });
  }

  // ================= Q5 / A5 Incomplete story =================
  questionSlide(4, "How it works", "Most pipelines guess here. Ours doesn't.");
  {
    const s = answerSlide(4, "How it works", "It stops early and sends the story back",
      "Before any build work, jira-agent checks the story against completed and backlog stories and the code itself. If something is missing, it comments on the story and assigns it back to the reporter, then exits. No tokens spent guessing, and no developer hours spent building the wrong thing. The comment shown is an illustrative example.");
    box(s, { x: 0.6, y: 1.9, w: 6.3, h: 4.3, fill: SURF, line: EDGE, lw: 0.75, r: 0.18, step: 1 });
    tile(s, I.jira, { x: 0.9, y: 2.15, s: 0.5, step: 1 });
    txt(s, "WEB-1234  ·  Account summary card", { x: 1.6, y: 2.25, w: 5, h: 0.3, size: 14, bold: true, step: 1 });
    img(s, A("agent.png"), { x: 0.9, y: 2.95, w: 0.6, h: 0.42, step: 2 });
    txt(s, [{ text: "jira-agent", options: { bold: true, fontFace: MONO } }, { text: "  commented just now", options: { color: MUTED, fontSize: 11 } }],
      { x: 1.6, y: 3.0, w: 5, h: 0.3, size: 13, step: 2 });
    txt(s, [
      { text: "Before I build this, two things are missing:", options: { breakLine: true } },
      { text: "Acceptance criteria for the error state", options: { bullet: true, breakLine: true } },
      { text: "The Figma link for the mobile layout", options: { bullet: true, breakLine: true } },
      { text: "Assigning back to the reporter.", options: {} },
    ], { x: 1.6, y: 3.45, w: 5.1, h: 1.6, size: 14, paraAfter: 4, step: 2 });
    box(s, { x: 1.6, y: 5.35, w: 2.6, h: 0.45, line: CLAY, lw: 1.25, r: 0.22, step: 3 });
    txt(s, "Assignee  →  Reporter", { x: 1.6, y: 5.35, w: 2.6, h: 0.45, size: 12, bold: true, color: CLAY, align: "center", valign: "middle", step: 3 });
    txt(s, "Illustrative example", { x: 0.6, y: 6.3, w: 4, h: 0.3, size: 10, italic: true, color: MUTED, step: 1 });
    const rows = [
      ["LuCoins", "No tokens burned on guesswork", "The run exits before any build work starts"],
      ["LuUserCheck", "No hours spent on the wrong build", "The reporter fixes the story first"],
      ["LuLayers", "Checks more than one story", "Done and backlog stories, plus the code itself"],
    ];
    for (let k = 0; k < rows.length; k++) infoRow(s, await ic(rows[k][0]), rows[k][1], rows[k][2], { x: 7.3, y: 1.95 + k * 1.45, w: 5.43, h: 1.2, card: true, dot: 0.6, step: 4 + k });
  }

  // ================= Q6 / A6 CI =================
  questionSlide(5, "Productivity", "Everyone in delivery has lived this one.");
  {
    const s = answerSlide(5, "Productivity", "the-ci-analyzer fixes it and re-runs the build",
      "Before: log in to Jenkins, read the logs, find a Jenkins expert, wait for them, apply the fix. Now the-ci-analyzer reads the console output, fixes the failure, commits, pushes and re-runs the build, and keeps looping until it's green. That's about 90% of the effort gone.");
    txt(s, "BEFORE", { x: 0.6, y: 1.95, w: 3, h: 0.3, size: 12, bold: true, color: MUTED, spacing: 3, step: 1 });
    const before = [["LuLogIn", "Log in to Jenkins"], ["LuScrollText", "Read the console logs"], ["LuUserSearch", "Find a Jenkins expert"], ["LuHourglass", "Wait for their availability"], ["LuWrench", "Apply the suggested fix"]];
    for (let k = 0; k < before.length; k++) {
      infoRow(s, await ic(before[k][0], GR), before[k][1], null, { x: 0.6, y: 2.4 + k * 0.72, w: 4.6, h: 0.6, card: true, dot: 0.4, dotFill: DIM, dotT: 60, hs: 14, hc: MUTED, step: 2 + k });
    }
    txt(s, "~90% less effort", { x: 0.6, y: 6.15, w: 4.6, h: 0.6, size: 28, font: "Georgia", bold: true, color: CLAY, step: 13 });
    txt(s, "NOW", { x: 5.9, y: 1.95, w: 2, h: 0.3, size: 12, bold: true, color: CLAY, spacing: 3, step: 7 });
    const cx = 9.6, cy = 4.3;
    box(s, { shape: pres.shapes.OVAL, x: cx - 1.95, y: cy - 1.95, w: 3.9, h: 3.9, line: EDGE, lw: 1.5, dash: "dash", step: 7 });
    img(s, A("loop.gif"), { x: cx - 0.8, y: cy - 0.8, w: 1.6, h: 1.6, step: 7 });
    img(s, I.jenkins, { x: cx - 0.3, y: cy - 0.3, w: 0.6, h: 0.6, step: 7 });
    const nodes = [[cx, cy - 1.95, "Read console output"], [cx + 1.95, cy, "Fix the failure"], [cx, cy + 1.95, "Commit and push"], [cx - 1.95, cy, "Re-run the build"]];
    nodes.forEach(([x, y, label], k) => {
      box(s, { x: x - 1.1, y: y - 0.28, w: 2.2, h: 0.56, fill: SURF, line: CLAY, lw: 1.25, r: 0.28, step: 8 + k });
      txt(s, label, { x: x - 1.1, y: y - 0.28, w: 2.2, h: 0.56, size: 13, bold: true, align: "center", valign: "middle", step: 8 + k });
    });
    txt(s, "loops until green", { x: cx + 1.15, y: cy + 1.5, w: 2.2, h: 0.3, size: 12, italic: true, color: CLAY, step: 12 });
  }

  // ================= Q7 / A7 Quality & security =================
  questionSlide(6, "Productivity", "The scans every release has to clear.");
  {
    const s = answerSlide(6, "Productivity", "Scan, fix, rebuild, rescan, until it's clean",
      "Same pattern three times. sonar-reporter pulls SonarQube issues and fixes them. veracode-analyser zips the artifacts, uploads them to Veracode, waits for the scan and fixes what it finds. xray-analyzer resolves the SCA flaws through an in-house MCP built on the JFrog APIs. Each loops until clean. About 90% of the effort is gone; what's left is PR review.");
    const cols = [
      [I.sonar, "SonarQube", "Code quality", "sonar-reporter", "Fetch issues → fix\n→ build → recheck"],
      [I.veracode, "Veracode", "SAST", "veracode-analyser", "Zip → upload → scan\n→ fix → rescan"],
      [I.jfrog, "JFrog Xray", "SCA", "xray-analyzer", "Read flaws via in-house MCP\n→ fix → rescan"],
    ];
    cols.forEach(([d, tool, kind, agent, flow], k) => {
      const x = 0.6 + k * 4.17, w = 3.8, mid = x + w / 2, step = 1 + k;
      box(s, { x, y: 1.85, w, h: 4.05, line: EDGE, lw: 0.75, r: 0.18, step });
      tile(s, d, { x: mid - 0.42, y: 2.1, s: 0.84, step });
      txt(s, tool, { x, y: 3.05, w, h: 0.4, size: 18, bold: true, align: "center", step });
      txt(s, kind, { x, y: 3.42, w, h: 0.3, size: 12, bold: true, color: CLAY, align: "center", step });
      txt(s, agent, { x, y: 3.72, w, h: 0.3, size: 13, font: MONO, color: MUTED, align: "center", step });
      img(s, A("loop.gif"), { x: mid - 0.45, y: 4.12, w: 0.9, h: 0.9, step });
      txt(s, flow, { x: x + 0.2, y: 5.1, w: w - 0.4, h: 0.65, size: 12, color: MUTED, align: "center", step });
    });
    txt(s, [{ text: "~90% less effort.", options: { bold: true, color: CLAY } }, { text: "  The 10% left is PR review.", options: { color: TEXT } }],
      { x: 0.6, y: 6.15, w: 12.13, h: 0.55, size: 24, font: "Georgia", step: 4 });
  }

  // ================= Q8 / A8 Unit tests =================
  questionSlide(7, "Resource optimization", "Two man-months. Hold that number.");
  {
    const s = answerSlide(7, "Resource optimization", "95% coverage in under two weeks, at a tenth of the cost",
      "Unit tests used to need two man-months of human effort. code-coverage-agent writes tests, measures coverage and loops until it reaches 95%, in under two weeks. At our $35 an hour billing rate, two man-months is $11,200. The agent used about $1,120 of AI credits on GitHub Copilot, or less.");
    txt(s, "TIME", { x: 0.6, y: 1.95, w: 3, h: 0.3, size: 12, bold: true, color: MUTED, spacing: 3, step: 1 });
    txt(s, "Human only", { x: 0.6, y: 2.4, w: 4, h: 0.32, size: 15, bold: true, color: MUTED, step: 1 });
    box(s, { shape: pres.shapes.RECTANGLE, x: 0.6, y: 2.8, w: 6.4, h: 0.6, fill: DIM, step: 1, kind: "w" });
    txt(s, "8 weeks  ·  2 man-months", { x: 0.8, y: 2.8, w: 6, h: 0.6, size: 14, bold: true, valign: "middle", step: 1, kind: "w" });
    txt(s, "code-coverage-agent", { x: 0.6, y: 3.75, w: 4, h: 0.32, size: 15, bold: true, font: MONO, color: CLAY, step: 2 });
    box(s, { shape: pres.shapes.RECTANGLE, x: 0.6, y: 4.15, w: 1.55, h: 0.6, fill: CLAY, step: 2, kind: "w" });
    txt(s, "< 2 weeks", { x: 2.3, y: 4.15, w: 2.5, h: 0.6, size: 18, bold: true, color: CLAY, valign: "middle", step: 3 });
    img(s, A("loop.gif"), { x: 0.6, y: 5.2, w: 0.85, h: 0.85, step: 3 });
    txt(s, "Writes tests, measures coverage,\nrepeats until it reaches 95%", { x: 1.65, y: 5.3, w: 5.2, h: 0.7, size: 14, color: MUTED, step: 3 });
    box(s, { x: 7.6, y: 1.9, w: 5.13, h: 4.6, fill: SURF, line: EDGE, lw: 0.75, r: 0.18, step: 4 });
    txt(s, "COST", { x: 8.0, y: 2.15, w: 3, h: 0.3, size: 12, bold: true, color: MUTED, spacing: 3, step: 4 });
    txt(s, "$11,200", { x: 8.0, y: 2.5, w: 4.4, h: 0.85, size: 44, font: "Georgia", bold: true, color: MUTED, strike: "sngStrike", step: 5 });
    txt(s, "people: $35/hr × 8 hrs × 5 days × 8 weeks", { x: 8.0, y: 3.35, w: 4.5, h: 0.3, size: 12, color: MUTED, step: 5 });
    txt(s, "~$1,120", { x: 8.0, y: 3.85, w: 4.4, h: 1.0, size: 54, font: "Georgia", bold: true, color: CLAY, step: 6 });
    txt(s, "AI credits on GitHub Copilot, or less", { x: 8.0, y: 4.85, w: 4.5, h: 0.3, size: 12, color: MUTED, step: 6 });
    box(s, { x: 8.0, y: 5.45, w: 2.4, h: 0.6, fill: CLAY, r: 0.3, step: 7 });
    txt(s, "10× cheaper", { x: 8.0, y: 5.45, w: 2.4, h: 0.6, size: 18, bold: true, color: BG, align: "center", valign: "middle", step: 7 });
  }

  // ================= Q9 / A9 Developer role =================
  questionSlide(8, "Developer effort", "This is the question every engineer asks.");
  {
    const s = answerSlide(8, "Developer effort", "Developers move from writing code to reviewing it",
      "Across these loops, the agents do about 90% of the work. The developer's roughly 10% is the pull-request review: making the judgement calls and owning the quality bar. The developer still decides; they just stop doing the repetitive parts.");
    img(s, A("donut.png"), { x: 0.85, y: 1.95, w: 4.2, h: 4.2, step: 1, kind: "f" });
    txt(s, [{ text: "■ ", options: { color: CLAY } }, { text: "agents 90%      " }, { text: "■ ", options: { color: TEXT } }, { text: "developer 10%" }],
      { x: 0.6, y: 6.3, w: 4.7, h: 0.3, size: 11, color: MUTED, align: "center", step: 1 });
    txt(s, "~10%", { x: 0.6, y: 3.65, w: 4.7, h: 0.8, size: 40, font: "Georgia", bold: true, align: "center", step: 1 });
    txt(s, "left for the developer:\nPR review", { x: 0.6, y: 4.4, w: 4.7, h: 0.6, size: 13, color: MUTED, align: "center", step: 1 });
    txt(s, "BEFORE", { x: 6.0, y: 1.95, w: 3, h: 0.3, size: 12, bold: true, color: MUTED, spacing: 3, step: 2 });
    txt(s, "NOW", { x: 9.55, y: 1.95, w: 3, h: 0.3, size: 12, bold: true, color: CLAY, spacing: 3, step: 3 });
    const was = ["Writes the code", "Writes the tests", "Fixes scan findings", "Debugs broken builds"];
    for (let k = 0; k < was.length; k++) {
      box(s, { x: 6.0, y: 2.45 + k * 0.8, w: 3.2, h: 0.62, fill: SURF, r: 0.12, step: 2 });
      txt(s, was[k], { x: 6.2, y: 2.45 + k * 0.8, w: 2.9, h: 0.62, size: 14, color: MUTED, strike: "sngStrike", valign: "middle", step: 2 });
    }
    const now = [["LuGitPullRequest", "Reviews the PR"], ["LuBrain", "Makes the calls"], ["LuBadgeCheck", "Owns quality"]];
    for (let k = 0; k < now.length; k++) infoRow(s, await ic(now[k][0]), now[k][1], null, { x: 9.55, y: 2.45 + k * 0.8, w: 3.18, h: 0.62, card: true, dot: 0.42, hs: 13, step: 3 + k });
    line(s, 9.25, 3.65, 9.5, 3.65, { color: CLAY, arrow: true, step: 3 });
  }

  // ================= Q10 / A10 Tokens =================
  questionSlide(9, "Cost and context", "Every leader asks this. Good.");
  {
    const s = answerSlide(9, "Cost and context", "Tokens are spent only where they earn their keep",
      "Five habits keep cost down. Fail fast on incomplete stories. Cache stable context so it isn't paid for twice. Give subagents cheaper models, set in each agent's definition. Trim tool output before the model sees it. And never switch models mid-session, because that throws away the cache and ends up costing more. Budget today is a monthly per-seat quota; per-task token caps aren't available in Kiro yet.");
    const rows = [
      ["LuBan", "Fail fast", "Incomplete stories exit before any build work"],
      ["LuDatabase", "Prompt caching", "Stable context is reused, not paid for again"],
      ["LuCpu", "Right-sized models", "Cheaper models for subagents, set in each agent's definition"],
      ["LuScissors", "Trimmed tool output", "Logs and scan results filtered before the model sees them"],
      ["LuZap", "Never switch models mid-session", "It throws away the cache and costs more"],
    ];
    for (let k = 0; k < rows.length; k++) infoRow(s, await ic(rows[k][0]), rows[k][1], rows[k][2], { x: 0.6, y: 1.9 + k * 0.9, w: 7.6, h: 0.78, card: true, dot: 0.48, hs: 15, step: 1 + k });
    box(s, { x: 8.6, y: 1.9, w: 4.13, h: 4.38, fill: SURF, line: CLAY, lw: 1.25, r: 0.18, step: 6 });
    txt(s, "BUDGET TODAY", { x: 8.9, y: 2.15, w: 3.6, h: 0.3, size: 12, bold: true, color: CLAY, spacing: 3, step: 6 });
    const budget = [["Monthly per-seat quota", "GitHub Copilot AI credits, Kiro"], ["$35 per dev seat / month", "Figma MCP, dev seats only"], ["Per-task token caps", "Not available in Kiro yet"]];
    budget.forEach(([h, sub], k) => {
      txt(s, h, { x: 8.9, y: 2.7 + k * 1.15, w: 3.6, h: 0.35, size: 16, bold: true, color: k === 2 ? MUTED : TEXT, step: 6 });
      txt(s, sub, { x: 8.9, y: 3.07 + k * 1.15, w: 3.6, h: 0.3, size: 12, color: MUTED, step: 6 });
    });
  }

  // ================= Q11 / A11 Context =================
  questionSlide(10, "Cost and context", "The quiet failure mode of most AI tools.");
  {
    const s = answerSlide(10, "Cost and context", "Every agent works in a small, clean context",
      "If one agent did everything, every Jira story, Confluence page, Figma payload, Swagger spec, Jenkins log and scan report would pile into one context window. Quality drops and cost climbs. Instead the master agent holds only the Input JSON, and each specialist works in its own context and returns just its result.");
    txt(s, "ONE AGENT DOING EVERYTHING", { x: 0.6, y: 1.9, w: 5.5, h: 0.3, size: 12, bold: true, color: MUTED, spacing: 3, step: 1 });
    box(s, { shape: pres.shapes.RECTANGLE, x: 0.9, y: 2.75, w: 2.2, h: 3.7, line: DIM, lw: 1.5, step: 1 });
    const blocks = ["Xray report", "Veracode results", "Sonar report", "Jenkins logs", "Swagger spec", "Figma payload", "Confluence docs", "Jira story"];
    blocks.forEach((b, k) => {
      const y = 2.3 + k * 0.52;
      box(s, { shape: pres.shapes.RECTANGLE, x: 1.0, y, w: 2.0, h: 0.44, fill: k < 2 ? CLAY : EDGE, fillT: k < 2 ? 35 : 0, step: 2 + (blocks.length - 1 - k), kind: "u" });
      txt(s, b, { x: 1.0, y, w: 2.0, h: 0.44, size: 11, color: TEXT, align: "center", valign: "middle", step: 2 + (blocks.length - 1 - k), kind: "u" });
    });
    txt(s, "Overflow", { x: 3.35, y: 2.3, w: 2.4, h: 0.35, size: 16, bold: true, color: CLAY, step: 10 });
    txt(s, "Everything piles into one window. Quality drops, cost climbs.", { x: 3.35, y: 2.7, w: 2.6, h: 1.0, size: 13, color: MUTED, step: 10 });
    txt(s, "MASTER + SPECIALISTS", { x: 6.6, y: 1.9, w: 6, h: 0.3, size: 12, bold: true, color: CLAY, spacing: 3, step: 11 });
    box(s, { x: 6.6, y: 2.35, w: 6.13, h: 0.85, fill: SURF, line: CLAY, lw: 1.25, step: 11 });
    img(s, A("claude-symbol.png"), { x: 6.8, y: 2.5, w: 0.55, h: 0.55, step: 11 });
    txt(s, [{ text: "Master agent", options: { bold: true, breakLine: true } }, { text: "holds only the Input JSON", options: { color: MUTED, fontSize: 12 } }],
      { x: 7.55, y: 2.4, w: 5, h: 0.75, size: 15, valign: "middle", step: 11 });
    const subs = ["jira", "figma", "swagger-hub", "confluence"];
    subs.forEach((n, k) => {
      const x = 6.6 + k * 1.58;
      line(s, x + 0.69, 3.2, x + 0.69, 3.5, { color: DIM, step: 12 });
      box(s, { x, y: 3.5, w: 1.38, h: 1.35, fill: SURF, line: EDGE, lw: 0.75, step: 12 });
      img(s, A("agent.png"), { x: x + 0.39, y: 3.65, w: 0.6, h: 0.42, step: 12 });
      txt(s, n, { x, y: 4.15, w: 1.38, h: 0.3, size: 11, bold: true, font: MONO, align: "center", step: 12 });
      txt(s, "own context", { x, y: 4.45, w: 1.38, h: 0.25, size: 10, color: MUTED, align: "center", step: 12 });
    });
    txt(s, [
      { text: "Subagents return results, not their whole context", options: { bullet: true, breakLine: true } },
      { text: "The Input JSON is the contract between steps", options: { bullet: true, breakLine: true } },
      { text: "Tool output is trimmed before it reaches the model", options: { bullet: true } },
    ], { x: 6.6, y: 5.15, w: 6.13, h: 1.3, size: 14, paraAfter: 6, step: 13 });
  }

  // ================= Q12 / A12 Adoption =================
  questionSlide(11, "Proof", "Fair question for any pitch.");
  {
    const s = answerSlide(11, "Proof", "Live with Ameriprise's frontend team, and scaling",
      "This isn't a demo. Ameriprise's frontend team of 40 to 50 developers uses it. All nine agents are live, and the Jira-to-UI pipeline is running end to end. It isn't across all of Ameriprise yet; we're scaling.");
    const user = await ic("LuUser", CL), userDim = await ic("LuUser", DM);
    for (let k = 0; k < 50; k++) {
      const x = 0.6 + (k % 10) * 0.46, y = 2.05 + Math.floor(k / 10) * 0.5;
      img(s, k < 40 ? user : userDim, { x, y, w: 0.36, h: 0.36, step: 1 });
    }
    txt(s, "40–50 developers on the frontend team", { x: 0.6, y: 4.65, w: 4.8, h: 0.35, size: 15, bold: true, step: 1 });
    const stats = [["40–50", "developers using it"], ["9", "atomic agents, live"], ["1", "builder, designed and built solo"], ["Live", "Jira → UI pipeline, end to end"]];
    stats.forEach(([n, l], k) => {
      const x = 5.9 + (k % 2) * 3.47, y = 1.95 + Math.floor(k / 2) * 2.15;
      box(s, { x, y, w: 3.27, h: 1.95, fill: SURF, line: EDGE, lw: 0.75, r: 0.18, step: 2 + k });
      txt(s, n, { x: x + 0.3, y: y + 0.25, w: 2.8, h: 0.95, size: 48, font: "Georgia", bold: true, color: CLAY, step: 2 + k });
      txt(s, l, { x: x + 0.3, y: y + 1.25, w: 2.8, h: 0.5, size: 13, color: MUTED, step: 2 + k });
    });
    txt(s, "Not yet all of Ameriprise. Scaling now.", { x: 0.6, y: 5.3, w: 4.8, h: 0.4, size: 16, italic: true, font: "Georgia", color: MUTED, step: 6 });
  }

  // ================= Q13 / A13 Still slow =================
  questionSlide(12, "What's next", "Honest answer coming.");
  {
    const s = answerSlide(12, "What's next", "Next: other teams plug in through their own MCP servers",
      "What's still slow is anything that crosses team lines. Downstream services sit behind other teams, and resolving issues means long mail chains. The next step is for each team, such as data and services or the DNS team, to publish its own MCP server, so our agents can work with them directly. That needs Ameriprise leaders to plan the bandwidth.");
    txt(s, "TODAY", { x: 0.6, y: 1.9, w: 3, h: 0.3, size: 12, bold: true, color: MUTED, spacing: 3, step: 1 });
    const mails = ["RE: RE: FW: timeout calling the accounts service", "RE: FW: who owns this DNS record?", "FW: still waiting on data & services"];
    const mailIc = await ic("LuMail", GR);
    mails.forEach((m, k) => {
      const x = 0.6 + k * 0.3, y = 2.4 + k * 0.72;
      box(s, { x, y, w: 4.9, h: 0.62, fill: SURF, line: EDGE, lw: 0.75, step: 1 + k });
      img(s, mailIc, { x: x + 0.18, y: y + 0.16, w: 0.3, h: 0.3, step: 1 + k });
      txt(s, m, { x: x + 0.62, y, w: 4.15, h: 0.62, size: 12, color: MUTED, valign: "middle", step: 1 + k });
    });
    dot(s, await ic("LuClock"), { x: 0.6, y: 4.75, s: 0.55, step: 4 });
    txt(s, [{ text: "Long mail chains", options: { bold: true, breakLine: true } }, { text: "while the SLA clock runs", options: { color: MUTED, fontSize: 12 } }],
      { x: 1.4, y: 4.7, w: 4, h: 0.7, size: 16, step: 4 });
    txt(s, "NEXT", { x: 6.6, y: 1.9, w: 3, h: 0.3, size: 12, bold: true, color: CLAY, spacing: 3, step: 5 });
    const hx = 9.67, hy = 4.15;
    const spokes = [[7.7, 2.75, "Data & services"], [11.64, 2.75, "DNS team"], [7.7, 5.55, "Downstream APIs"], [11.64, 5.55, "Any team"]];
    spokes.forEach(([x, y]) => line(s, hx, hy, x, y, { color: DIM, dash: "dash", step: 6 }));
    img(s, A("master-agent.gif"), { x: hx - 0.6, y: hy - 0.6, w: 1.2, h: 1.2, step: 5 });
    spokes.forEach(([x, y, label]) => {
      box(s, { x: x - 1.05, y: y - 0.3, w: 2.1, h: 0.6, fill: SURF, line: CLAY, lw: 1.25, r: 0.3, step: 6 });
      img(s, A("mcp-light.png"), { x: x - 0.92, y: y - 0.15, w: 0.3, h: 0.3, step: 6 });
      txt(s, label, { x: x - 0.55, y: y - 0.3, w: 1.55, h: 0.6, size: 11, bold: true, valign: "middle", step: 6 });
    });
    txt(s, "Each team publishes an MCP server; our agents work with it directly, with no mail chain.", { x: 6.6, y: 6.25, w: 6.13, h: 0.5, size: 13, italic: true, color: MUTED, step: 7 });
  }

  // ================= Q14 / A14 Coforge =================
  questionSlide(13, "The opportunity", "The question that matters most for Coforge.");
  {
    const s = answerSlide(13, "The opportunity", "Turn it into a Coforge accelerator for every account",
      "It's proven at Ameriprise. The opportunity is for Coforge to package the approach as its own accelerator, Coforge-owned and client-agnostic, and offer it to other accounts as a product. With hiring nearly frozen, clients expect more from the same teams, and this is how we deliver it. I'd like to help build it.");
    const steps = [["1", "Proven", "Live at Ameriprise with a 40–50 developer frontend team"], ["2", "Packaged", "Rebuilt as a Coforge-owned accelerator that fits any client"], ["3", "Offered", "Sold to other accounts as a Coforge product"]];
    steps.forEach(([n, h, b], k) => {
      const x = 0.6 + k * 4.17, step = 1 + k;
      box(s, { x, y: 1.95, w: 3.79, h: 2.55, fill: SURF, line: k === 2 ? CLAY : EDGE, lw: k === 2 ? 1.5 : 0.75, r: 0.18, step });
      box(s, { shape: pres.shapes.OVAL, x: x + 0.3, y: 2.25, w: 0.65, h: 0.65, fill: CLAY, step });
      txt(s, n, { x: x + 0.3, y: 2.25, w: 0.65, h: 0.65, size: 20, bold: true, color: BG, align: "center", valign: "middle", step });
      txt(s, h, { x: x + 0.3, y: 3.1, w: 3.2, h: 0.45, size: 22, bold: true, font: "Georgia", step });
      txt(s, b, { x: x + 0.3, y: 3.6, w: 3.2, h: 0.75, size: 13, color: MUTED, step });
      if (k < 2) line(s, x + 3.84, 3.22, x + 4.12, 3.22, { color: CLAY, arrow: true, step: step + 1 });
    });
    infoRow(s, await ic("LuTrendingUp"), "Why now", "Hiring is nearly frozen. Clients expect more from the same teams.", { x: 0.6, y: 4.9, w: 7.6, h: 1.25, card: true, dot: 0.6, hs: 18, ss: 13, step: 4 });
    box(s, { x: 8.6, y: 4.9, w: 4.13, h: 1.25, fill: CLAY, r: 0.18, step: 5 });
    txt(s, "I'd like to help build it.", { x: 8.9, y: 4.9, w: 3.6, h: 1.25, size: 20, bold: true, font: "Georgia", color: BG, valign: "middle", step: 5 });
  }

  // ================= Close =================
  {
    const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Close" });
    txt(s, "Thank you", { x: 0.7, y: 2.0, w: 7, h: 1.3, size: 66, bold: true, font: "Georgia" });
    txt(s, "Questions?", { x: 0.7, y: 3.35, w: 7, h: 0.8, size: 32, italic: true, font: "Georgia", color: CLAY });
    txt(s, "Deepak Kumar  ·  Coforge @ Ameriprise Financial", { x: 0.7, y: 4.6, w: 7, h: 0.35, size: 14, color: MUTED });
    txt(s, "the-agentic-delivery-pipeline", { x: 0.7, y: 5.0, w: 7, h: 0.35, size: 14, font: MONO, color: MUTED });
    img(s, A("master-agent.gif"), { x: 8.6, y: 1.6, w: 3.6, h: 3.6, step: 1 });
    img(s, A("agent.gif"), { x: 9.85, y: 5.4, w: 1.1, h: 0.77, step: 2 });
    s.addNotes([
      "Prepared answers for Q&A:",
      "Does this cut our billing? Hiring is nearly frozen, so the same team has to deliver more scope. Packaged as a Coforge accelerator, it becomes something we sell, not just hours saved.",
      "Governance and rollout? Rollout governance sits with Ameriprise DevSecOps and MLOps. Every change still goes through human PR review.",
      "Can we reuse what you built? The agents were built for Ameriprise. What carries over is the approach and the know-how; a Coforge version would be built fresh and client-agnostic.",
      "What does it run on? Claude models, through GitHub Copilot and Kiro. Figma MCP costs $35 per dev seat per month.",
    ].join("\n\n"));
  }

  await pres.writeFile({ fileName: FILE });
  await applyTheme(FILE, THEME);
  console.log("wrote", FILE);
})().catch((e) => { console.error(e); process.exit(1); });
