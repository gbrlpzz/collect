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
- Respect system font scaling, light/dark appearance, reduced motion, keyboard navigation, and focus visibility.
- Avoid animation that delays data entry or obscures whether a write completed.
- Treat offline and error states as normal product states with factual copy, not alarming decoration.


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

| HIG principle | collect implementation |
| --- | --- |
| One clear hierarchy | A navigation bar identifies the current surface; the observation screen has one primary action: **Save observation**. |
| Comfortable touch interaction | Interactive controls use a 44 px minimum target, with larger rows for repeated field choices. |
| Native input behavior | Semantic HTML inputs (`date`, `datetime-local`, numeric input, file picker), system keyboard hints, visible labels, and browser focus are preferred over custom widgets. |
| Group related content | Field definitions are rendered as inset grouped sections and list rows, not a generic form-builder canvas. |
| Progressive disclosure | Sync details, privacy detail, and recovery actions live in sheets or disclosures instead of competing with collection. |
| Accessible state | Words, checkmarks, selection shape, focus, and live status text communicate state; colour is never the only signal. |
| Respect system settings | System font stacks, rem-based type, light/dark appearance, safe-area insets, keyboard navigation, and reduced motion are supported. |
| Preserve the task | Offline receipts are explicit and factual. The interface never turns a request start or upload completion into a server receipt. |

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
- **Why this is better here:** An observation is a focused, field-site task. Keeping the tab bar out of the collection surface prevents accidental navigation and leaves the bottom reach zone for the one required completion action.
- **Scope:** Contributor observation screen only; project and project-list navigation retain the tab bar.
- **Risk check:** Back remains available in the navigation bar, the task has one labelled primary action, and the screen is not used to navigate between top-level areas.

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
  (Nielsen Norman Group, *4 Principles to Reduce Cognitive Load in Forms*).
- "Ask one thing at a time" is a standard survey best practice (Qualtrics, *UX
  Survey Best Practices*).
- Concise, interactive questionnaires reduce survey fatigue and abandonment
  (Maptionnaire, *12 Best Practices in Survey Design*).

A field worker in sunlight, gloves, or stress should never have to *parse* a
form — only answer the visible question and tap the obvious next action.

### How the flow behaves

- **Sequential steps.** Each field definition is one screen. Section headings
  become brief full-screen section intros.
- **No page movement.** The screen height is fixed; content is centered and the
  page never scrolls (long text and repeatable rows scroll inside their step).
- **Capsule geometry.** Answers and actions use fully rounded capsules
  (56 pt), segmented controls for tri-state, native date pickers, a stepper
  beside numeric fields, and large thumbnails for media.
- **Auto-advance.** A single answer (choice or tri-state) advances
  automatically after ~200 ms. Multi-select, text, number, date, location, and
  media wait for an explicit **Continue**.
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

- **Auto-advance on single answers** deviates from a strict "press Continue"
  convention. It is better here because a field worker's dominant hand may be
  occupied; a single tap should carry them forward, and Back is always one tap
  away. Scope: single-choice and tri-state steps only.
- **Capsule answers instead of list rows** keep the Apple geometry while giving
  options a 56 pt target — larger than the 44 pt minimum — for glove use.
