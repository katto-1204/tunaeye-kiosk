# Product Demo Video — Codebase Scan, Storytelling & Visual Style Template

A reusable end-to-end blueprint modeled after **TunaEye's animated product demo** (`83s` tight cut / `2:20` full walkthrough). Start with **Phase 0 (Codebase Scan)** to ground the story in real screens and logic, then fill in the `[BRACKETED]` placeholders for your new project.

---

## 0. Phase 0 — Scan the Codebase First (Mandatory Before Scripting)

Before writing a single line of narration or building scenes, scan the target repository to extract the **ground truth** of the software:

1. **Identify the Active Entrypoint & Real Surfaces**
   - Find what actually boots (e.g., `main.tsx`, `App.tsx`, `index.html`, router config) vs. legacy/unused files.
   - List every user-facing surface: **Public/Landing**, **Main Operator Flow**, **Modals/Edge States**, **Operator Dashboard**, and **Admin/Settings Console**.
2. **Extract the Core Concept & "Human-First" Truth**
   - Summarize the product in one sentence: *Who uses it, what unit of work they process, and what problem it solves.*
   - **Truth rule:** Verify claims against source code. Never animate metrics, AI outputs, or hardware integrations that are only in marketing copy and not implemented in the codebase.
3. **Map Every Screen & State Transition**
   - Walk the actual state machine/reducer/routes from start to finish.
   - Note the **exact thresholds, validations, error modals, and overrides** (e.g., min/max input ranges, confidence gates, rejection/422 handling, PIN/auth locks).
4. **Inventory Reusable Assets & Brand Tokens**
   - Collect the real app icon/SVG logo, brand colors, fonts, sample data/images, and any existing screenshots or Playwright test selectors (so `capture-live-clips.mjs` can drive the real UI).
5. **Define the Capture Plan**
   - Pick **5–7 key live flows** to record from the running app (Welcome, Sign-In/Input, Core Action, Happy Path, Fallback/Rejection/Override, Output, Dashboard/Admin) using clearly labeled realistic sample data.

> **Pre-Flight Output:** Before animating, produce a quick **Codebase-to-Act Map** confirming which real screen/clip goes into Acts 1–8.

---

## 1. Core Storytelling Philosophy

1. **Human-first, not tech-first:** Frame the software as *extending* the user's skill or saving their time—never as replacing them.
   - *Formula:* `"[Product] doesn't replace [the human/craft]. It [extends / protects / speeds up] it."`
2. **One continuous journey ("Journey of One [Unit]"):** Follow a single realistic user + single unit of work from start to finish (e.g., *one fish*, *one order*, *one ticket*, *one patient*), rather than jumping between disconnected feature lists.
3. **Show the rules, not just the happy path:** The strongest credibility comes from showing **happy path + fallback + rejection + human override** in quick succession.
4. **Real UI, studio framing:** Capture live Playwright/browser clips inside a clean device bezel (`DeviceFrame`) over a studio backdrop with a minimal top chrome bar (`Logo + Brand` left, `01 / ACT NAME` pill right).

---

## 2. Visual & Typography Formula

| Element | Style Rule |
| :--- | :--- |
| **Backdrop Contrast** | Dark studio (`#090D16` / `#0F172A`) for **Problem, Hero, Safeguards, Outro**; Light frost (`#F4F7FB`) for **Live UI Walkthroughs**. |
| **Headline Formula** | **5–8 words max**, tight tracking (`-2px` to `-3px`), with **1–2 key words in Italic Serif** (`Instrument Serif`) for editorial punch.<br>*Examples:* `One tap to *begin.*` · `Built for *speed.*` · `Every decision, *traceable.*` |
| **Context Pills** | 3 short rounded pills beneath the headline (`[Mode/Constraint]`, `[Key Metric/Range]`, `[Version/Platform]`). |
| **Micro-Motion** | Spring physics (`damping: 18, stiffness: 200`), 7-frame (`0.23s`) fast transitions (`fade`, `slide`, `wipe`), animated tap-ripple at click coordinates, and a cyan scanline sweep during AI/processing moments. |
| **Semantic Color Cards** | Map outcomes to unmistakable full-bleed gradients (e.g., Green = Pass/Success, Amber = Review/Warn, Red = Fail/Alert, Dark Slate = Locked/Override). |

---

## 3. The 8-Act Narrative Arc (`~83 seconds` @ 30fps)

```text
[0:00-0:05] Act 1a: The Problem (Dark, 3 Pain Cards)
     │
[0:05-0:10] Act 1b: The Solution / Hero Lockup (Logo + Tagline)
     │
[0:10-0:20] Act 2:  Zero-Friction Entry & Setup (Sign-In + Preflight + Input)
     │
[0:20-0:28] Act 3:  Core Action / Capture (Guided Steps + Live Processing)
     │
[0:28-0:48] Act 4:  The Decision Engine (Happy Path -> Fallback -> Rejection -> Override)
     │
[0:48-0:54] Act 5:  Tangible Output (Receipt / Export / Confirmation + Auto-Next)
     │
[0:54-1:03] Act 6:  Operator History (Dashboard, Filters, Evidence Inspection)
     │
[1:03-1:18] Act 7:  Admin & Cloud Scale (PIN/Auth -> Analytics -> Sync to Cloud)
     │
[1:18-1:23] Act 8:  Outro Lockup (Logo + Tagline + 1s Fade-Out)
```

---

### Act-by-Act Script & Visual Template

#### Act 1a — The Problem (`0:00 – 0:05`)
- **Visual:** Dark `#090D16` background with subtle red radial glow. Eyebrow (`THE [DOMAIN] CHALLENGE`), big headline (`[Process] depends on *fragile / manual [pain].*`), and **3 staggered cards** (`PROBLEM 01`, `02`, `03`).
- **Narration (1 sentence):** *"[Manual/legacy process] depends on [pain 1], [pain 2], and [pain 3]."*

#### Act 1b — The Hero Reveal (`0:05 – 0:10`)
- **Visual:** Dark `#0F172A` studio. Spring-animated app icon + wordmark + primary tagline + subtle `1.0 -> 1.08` zoom-in.
- **Narration (1 sentence):** *"Enter [Product Name]. [Core differentiator, e.g., Offline-first / Real-time] [category] on [platform]."*

#### Act 2 — Entry, Readiness & Input (`0:10 – 0:20`)
- **Visual:** Light frost background. `CenterStageScene` showing real UI clip of tapping **Start**, signing in as `[Realistic Persona Name]`, passing preflight checks, and entering `[primary numeric/form input]`.
- **Narration (2 short sentences):** *"One tap starts [action]. [Persona] signs in, checks readiness, and enters [input]."*

#### Act 3 — Guided Core Action (`0:20 – 0:28`)
- **Visual:** Fast 3-card filmstrip (`1s` per step) of the onboarding/setup guide -> live action/capture clip with animated scanline overlay.
- **Narration (1 sentence):** *"[Do setup step], and [capture / run] live from [device/interface]."*

#### Act 4 — The Decision Engine / Edge Cases (`0:28 – 0:48`)
Show **4 rapid beats** (4–5s each) proving the software handles reality:
1. **Confident Pass:** High-confidence/valid input -> immediate green result.
   - *Line:* *"At [threshold] or higher, [clean case] goes straight to [output]."*
2. **Secondary Check / Fallback:** Uncertain or borderline case -> triggers secondary verification step and blends/resolves.
   - *Line:* *"[Borderline/flagged] cases trigger a live [secondary check]."*
3. **Clean Rejection:** Invalid input -> non-harsh alert modal -> auto-resets cleanly.
   - *Line:* *"Invalid [inputs] are rejected cleanly."*
4. **Human Safeguard / Override:** Severe conflict -> dark locked card -> PIN/Supervisor modal.
   - *Line:* *"Severe [disagreement/risk] locks behind a [Supervisor/Admin] PIN."*

#### Act 5 — Tangible Output & Loop (`0:48 – 0:54`)
- **Visual:** Output artifact (thermal receipt, PDF, webhook, confirmation card) + `3, 2, 1` auto-reset to next item.
- **Narration (1 sentence):** *"[Output device/system] auto-generates [artifact], then resets for the next [unit]."*

#### Act 6 — Operator Dashboard (`0:54 – 1:03`)
- **Visual:** Cascading/scrolling dashboard clip toggling `My records` / `All records` and opening a detail modal with saved proof.
- **Narration (1 sentence):** *"In the [Operator] Dashboard, review every session, inspect [evidence], and [reprint/export] anytime."*

#### Act 7 — Admin Console & Cloud Sync (`1:03 – 1:18`)
- **Visual:** 4-digit PIN / Auth unlock -> Bento grid of Overview KPIs, Records, Team, Devices/Settings -> Cloud Sync pulse diagram (`Local -> Cloud`).
- **Narration (2 sentences):** *"[Supervisors/Admins] unlock live [station/org] data, records, and devices. Once [network] returns, local records sync to [Cloud DB]."*

#### Act 8 — Outro Lockup (`1:18 – 1:23`)
- **Visual:** Same `HeroLockup` as Act 1b (no zoom), holding on Logo + Tagline + sub-tagline, fading to black over the last `1.0s` (`30 frames`).
- **Narration (3–5 words):** *"[Product Name]. [Short tagline]."*

---

## 4. Narration & Sound Design Rules

1. **Three-Layer Audio Mix:**
   - **Music Bed (`volume: 0.14`):** Warm, minimal rhythmic bed (`~95–100 BPM`) that stays under the voice and never competes.
   - **UI & Action SFX (`volume: 0.55`):** Triggered on exact frame numbers (`intro`, `tap`, `keypad`, `shutter`, `success chord`, `alert thud`, `lock`, `print`, `sync`).
   - **Voiceover (`volume: 0.92`):** Calm, confident, conversational; leave `~0.3–0.4s` breathing room around sharp SFX.
2. **Sentence Rhythm:** Keep every narration fragment **under 15 words**. If you can't say it in one breath inside the scene's duration, cut words—never speed up the voice.
3. **Transition Pacing:** Use `7`-frame (`~0.23s`) transitions (`fade`, `slide from-right`, `wipe from-left`, `slide from-bottom`) so cuts feel crisp and kinetic without jarring jumps.

---

## 5. Fill-in-the-Blank Brief for Your Next Project

Copy this block when starting a new demo video (complete **Codebase Scan** first, then fill in the **Story**):

```markdown
### Phase 0: Codebase Scan
- **Active Entrypoint & Routes:**
- **Real User Surfaces (Landing / Operator / Dashboard / Admin):**
- **State Machine / Core Rules (Thresholds, Errors, Overrides):**
- **Verified Assets (Logo SVG, Fonts, Sample Data, Test Selectors):**
- **Live Clips to Record (5–7 Playwright flows):**

### Phase 1: Story & Style
- **Product Name:**
- **Tagline (3–5 words):**
- **Human-First Hook:** "We don't replace [X]. We [Y]."
- **3 Problems (Act 1a):** 01 [___] · 02 [___] · 03 [___]
- **Persona Name (Act 2):**
- **Core Input + Valid Range (Act 2):**
- **Guided Action / Capture (Act 3):**
- **4 Decision Beats (Act 4):**
  1. Happy Path:
  2. Fallback / Secondary Check:
  3. Clean Rejection:
  4. Human Override / Safeguard:
- **Tangible Output (Act 5):**
- **Operator View (Act 6):**
- **Admin + Sync Story (Act 7):**
- **Brand Palette:** Dark `#______` · Deep `#______` · Accent `#______` · Light `#______`
```
