# Interface baseline

The MVP uses a deliberately monochrome, Apple HIG-inspired baseline: a `#f5f5f7` soft-gray canvas, white paper surfaces, neutral black/gray text, system typography, minimal chrome, generous spacing, and text-first state communication. This is a design foundation, not a reimplementation of Apple-owned visual assets.

This is also a data-quality decision. A contributor working in sunlight, gloves, stress, low bandwidth, or an unfamiliar device needs accessible controls and unambiguous state feedback. Ease of use is part of collection reliability, not decoration around it.

Reference the official guidance when making UI decisions:

- [Materials — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Accessibility — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/accessibility)

## Decisions

- Use semantic HTML and native controls wherever possible.
- Keep touch targets comfortable and labels explicit; never make color the only signal.
- Keep the visual language monochrome: neutral grays only, with state communicated through words, weight, position, and shape.
- Establish hierarchy with typography, spacing, and alignment before adding containers or decoration.
- Use sheets, concise secondary actions, and progressive disclosure for supporting detail.
- Keep the active collection surface focused on the observation, not queue internals or admin metrics.
- Make local-save, waiting, syncing, and synced states visible in words.
- Put the frequent, consequential action first: the contributor opens on **New observation**, while project context and sync details remain secondary. A sync-status tap may start a retry, but normal synchronization is automatic.
- Focus the first meaningful editable control when a screen, step, or dialog opens; prefilled context fields do not steal focus from the first field the user needs to enter.
- Respect system font scaling, light/dark appearance, reduced motion, keyboard navigation, and focus visibility.
- Avoid animation that delays data entry or obscures whether a write completed.
- Treat offline and error states as normal product states with factual copy, not alarming decoration.

## Product hierarchy

The two installable identities are separate surfaces:

- **collect** is the contributor app. Its launch surface is capture-first: start
  or resume an observation, with project context below it.
- **collect Admin** is the operations app. Its launch surface is project and
  readiness management.

The role is fixed by the app entry URL (`?role=admin` for the admin manifest) and
is not a control in the account menu. An administrator can preview a contributor
form from the schema editor, but that temporary preview is not a workspace
switch. Local state may travel between the installs for recovery; it cannot
change the active surface.

Synchronization is an implementation detail. The contributor sees factual status
near the project and can open a secondary sheet for details or recovery, while
health probes, retries, and server readiness happen automatically.

## Native iOS interaction contract

The default is Apple's Human Interface Guidelines. We deviate only when the
fieldwork reliability contract requires a different behavior, and each
exception must be explainable in terms of data preservation or offline use.
These are the official references used for the current interface system:

- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) — the primary reference.
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) — hierarchy, margins, safe areas, and adaptation.
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) — system typography and Dynamic Type.
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) — legibility, assistive technologies, and non-colour state communication.
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) — immediate, clearly labelled actions.
- [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) — grouped rows for related content and settings-like navigation.
- [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) — top-level navigation only, never a replacement for an action button.
- [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) — compact navigation and contextual actions.
- [Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets) — progressive disclosure for sync and recovery actions.
- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) — translucent chrome only; collected evidence stays on opaque surfaces.
- [Selection and input](https://developer.apple.com/design/human-interface-guidelines/selection-and-input) — native input and selection behavior.

### How the contract appears in collect

| HIG principle                 | collect implementation                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One clear hierarchy           | A navigation bar identifies the current surface; the observation screen has one primary action: **Save observation**.                                                    |
| Comfortable touch interaction | Interactive controls use a 44 px minimum target, with larger rows for repeated field choices.                                                                            |
| Native input behavior         | Semantic HTML inputs (`date`, `datetime-local`, numeric input, file picker), system keyboard hints, visible labels, and browser focus are preferred over custom widgets. |
| Group related content         | Field definitions are rendered as inset grouped sections and list rows, not a generic form-builder canvas.                                                               |
| Progressive disclosure        | Sync details, privacy detail, and recovery actions live in sheets or disclosures instead of competing with collection.                                                   |
| Accessible state              | Words, checkmarks, selection shape, focus, and live status text communicate state; colour is never the only signal.                                                      |
| Respect system settings       | System font stacks, rem-based type, light/dark appearance, safe-area insets, keyboard navigation, and reduced motion are supported.                                      |
| Preserve the task             | Offline receipts are explicit and factual. The interface never turns a request start or upload completion into a server receipt.                                         |

### Deliberate deviations

- The collection action is a persistent bottom action because a contributor must
  be able to finish an observation with one reachable thumb action while moving
  through a site. It is not used for navigation.
- The interface remains monochrome rather than adopting semantic iOS tint
  colours. Research observations need strong, calm contrast in sunlight and
  under uncertainty; words and shape carry state instead.
- A saved local draft is visible while typing. This is more prominent than a
  typical native form because the local receipt boundary is a product promise,
  not decorative status.

## HIG audit — 2026-08-11

The interface was re-audited against the locally cached Apple HIG pages for
[Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios),
[Typography](https://developer.apple.com/design/human-interface-guidelines/typography),
[Layout](https://developer.apple.com/design/human-interface-guidelines/layout),
[Color](https://developer.apple.com/design/human-interface-guidelines/color),
[Materials](https://developer.apple.com/design/human-interface-guidelines/materials),
[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility),
[Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode),
[Motion](https://developer.apple.com/design/human-interface-guidelines/motion),
[Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons),
[Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars),
[Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets),
[Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields),
[Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators),
[Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), and
[Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables).

The audit focuses on the collection path first: 17 pt primary input text,
44 pt hit regions, logical keyboard input, clear text actions, semantic state,
system-adaptive contrast, and native-style sheets/dialogs. The app uses
Liquid Glass-like translucency only for navigation and action chrome; grouped
content surfaces stay opaque.

### Explicit deviation records

These are the few intentional deviations from platform guidance. Every other
screen and control follows the HIG defaults above.

#### Full-screen observation task

- **HIG rule:** [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) should remain visible while navigating between top-level sections; full-screen task presentations can temporarily cover navigation.
- **Why this is better here:** An observation is a focused, field-site task. Keeping the tab bar out of the collection surface prevents accidental navigation and leaves the bottom reach zone for the one required completion action. The contributor app went further: navigation between top-level areas was removed entirely (there are no top-level sections to navigate between), so the tab bar no longer exists anywhere in the contributor surface.
- **Scope:** The whole contributor app. The capture-first home screen is the only top-level surface; project details are reached by secondary navigation and the observation screen has one primary action.
- **Risk check:** Back remains available in the navigation bar, the task has one labelled primary action, and no screen navigates between top-level areas.

#### Monochrome accent

- **HIG rule:** Prefer semantic system colors and use color consistently for status and hierarchy.
- **Why this is better here:** Field evidence status must remain readable in bright sunlight and under uncertainty; words, checkmarks, grouping, and shape communicate state without assigning red/green meaning to observations.
- **Scope:** Collect’s custom accent and state tokens only; system appearance and increased-contrast variants are still supplied.
- **Risk check:** Color is never the sole state cue; contrast is tested in both appearances and the increased-contrast media query strengthens tokens.

#### Web PWA symbol/material approximation

- **HIG rule:** Use SF Symbols and system-provided materials for native controls and navigation.
- **Why this is better here:** This is a source-available web PWA, not a signed UIKit/SwiftUI bundle. The implementation uses a small, consistent SVG symbol set and CSS material approximation while preserving the same semantic roles, sizing, and visual hierarchy.
- **Scope:** `src/components/Icon.tsx` and browser CSS chrome only; no custom symbol treatment is used to replace text labels or accessibility names.
- **Risk check:** Icons remain secondary to labels, use consistent stroke weight, and all interactive elements retain text or accessible labels and 44 pt hit regions.

## Guided observation flow (one question at a time)

The contributor collection surface is a **guided flow**, not a scrolling form:
one question per screen, a page that never moves, and a single primary action
at thumb reach. This is the pattern Apple uses for setup, onboarding, and
checkout flows (see [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding),
[Page controls](https://developer.apple.com/design/human-interface-guidelines/page-controls),
[Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)).

### Why one question per screen

Survey-methodology and form-design research consistently supports the pattern:

- Reducing per-screen cognitive load improves response quality and completion
  (Nielsen Norman Group, _4 Principles to Reduce Cognitive Load in Forms_).
- "Ask one thing at a time" is a standard survey best practice (Qualtrics, _UX
  Survey Best Practices_).
- Concise, interactive questionnaires reduce survey fatigue and abandonment
  (Maptionnaire, _12 Best Practices in Survey Design_).

A field worker in sunlight, gloves, or stress should never have to _parse_ a
form — only answer the visible question and tap the obvious next action.

### How the flow behaves

- **Sequential steps.** Each visible data question is one screen. Section headings
  become brief full-screen section intros. Location fields are excluded from the
  sequence: they are provenance captured automatically when an observation opens
  and refreshed at save.
- **No page movement.** The screen height is fixed; content is centered and the
  page never scrolls (long text and repeatable rows scroll inside their step).
- **Capsule geometry.** Answers and actions use fully rounded capsules
  (56 pt), segmented controls for tri-state, native date pickers, a stepper
  beside numeric fields, and large thumbnails for media.
- **Auto-advance.** A single answer (choice, tri-state, date, or datetime)
  advances automatically after ~200 ms. Multi-select, text, number, and media
  wait for an explicit **Continue**. Location never becomes a contributor step;
  the browser permission request and capture stay in the background. A problem
  is surfaced only at the save boundary when the schema requires coordinates.
- **One primary action.** The bottom bar holds **Back** (chevron) and a single
  prominent capsule **Continue**; the final step becomes **Save observation**.
- **Required clarity.** Required steps disable Continue until answered, with a
  "Required" chip next to the title; errors appear inline with the control.
- **Progress.** A thin determinate bar plus the step position ("Step 3 of 12")
  keeps people oriented without the distraction of per-step dots.
- **Keyboard-friendly.** Text steps autofocus; the return key continues; the
  flow is a single `<form>`.
- **Accessible.** Each control is labelled by its question, `aria-required` and
  `aria-invalid` follow state, reduced motion disables the step transition,
  and VoiceOver hears the question title before the control.

### Admin reflection

- The admin schema panel gains **Preview flow**, which opens the exact
  contributor experience for the current schema without persisting anything.
- Admin surfaces share the same primitives (capsule buttons, grouped lists,
  sheets, dialogs) so the system stays one system.

### Deviations (additions to the records above)

- **Auto-advance on complete answers** deviates from a strict "press Continue"
  convention. It is better here because a field worker's dominant hand may be
  occupied; a completed answer should carry them forward, and Back is always
  one tap away. Scope: single-choice, tri-state, date, and datetime steps.
- **Capsule answers instead of list rows** keep the Apple geometry while giving
  options a 56 pt target — larger than the 44 pt minimum — for glove use.
- **Invisible provenance instead of a location step** deviates from treating every
  schema field as an interactive page. This is better for fieldwork because
  coordinates are device context, not an observation the contributor should
  manually navigate to. Scope: contributor collection only; required failures
  remain actionable at save and optional failures do not interrupt capture. Risk
  check: the app records the capture timestamp and accuracy, and never hides a
  required failure behind a successful local receipt.

## Colour: the house neutral greys

collect uses the **house monochrome palette** rooted in
[gbrlpzz/index](https://github.com/gbrlpzz/index) and
[gbrlpzz/dispatch](https://github.com/gbrlpzz/dispatch) — no colour tint
anywhere. The two installable surfaces are locked to distinct appearances so
the field surface is stable in sunlight and the operations console reads as a
different tool:

| Token                | Contributor (light)                 | Admin (dark)                    |
| -------------------- | ----------------------------------- | ------------------------------- |
| Canvas               | `#f5f5f7`                           | `#000000`                       |
| Paper                | `#ffffff`                           | `#1c1c1e`                       |
| Ink (text)           | `#1d1d1f`                           | `#f5f5f7`                       |
| Dim (secondary)      | `rgba(60,60,67,.60)`                | `rgba(235,235,245,.60)`         |
| Tertiary             | `rgba(60,60,67,.42)`                | `rgba(235,235,245,.36)`         |
| Separator / light    | `rgba(60,60,67,.29)` / `.18`        | `rgba(235,235,245,.28)` / `.16` |
| Fill / fill-strong   | `rgba(118,118,128,.12)` / `#e5e5ea` | `rgba(118,118,128,.28)` / `.46` |
| Chrome (nav/glass)   | `rgba(245,245,247,.86)`             | `rgba(28,28,30,.86)`            |
| Accent / accent text | `#000` / `#fff`                     | `#fff` / `#000`                 |
| Destructive          | `#d70015`                           | `#ff6961`                       |

The surface is fixed before first paint (`data-collect-surface` on `<html>`,
theme-color and status-bar metadata included) so the installed PWA chrome
never flashes a mismatched appearance. `prefers-contrast: more` strengthens
dim/tertiary tokens on both surfaces for accessibility settings.
