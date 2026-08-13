# Interface baseline

`collect` is a mobile-first field application. The interface follows Apple Human Interface Guidelines where web platform capabilities permit, while preserving semantic HTML, browser interoperability, and the product’s evidence contract.

The visual system is deliberately quiet: neutral surfaces, system typography, restrained chrome, large interaction regions, explicit text states, and progressive disclosure. Simplicity is a reliability feature because contributors may work in sunlight, gloves, stress, low bandwidth, or unfamiliar devices.

Primary references:

- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data)
- [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [Modality](https://developer.apple.com/design/human-interface-guidelines/modality)
- [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)

## Product hierarchy

The most frequent consequential action is the easiest to reach.

### Contributor hierarchy

1. **New observation**
2. Resume the current draft
3. Project context
4. Synchronization status when action is required
5. Profile, privacy, installation, recovery, and account actions

The contributor surface does not expose database views, queue internals, administrator metrics, or persistent top-level navigation.

### Administrator hierarchy

1. Project or contributor requiring action
2. Create a project
3. Open an active project
4. Readiness and export
5. Schema details, identifiers, and technical recovery information

Rare project actions belong in a secondary action menu. Supporting configuration remains collapsed until requested.

## Core principles

- Use semantic HTML and native controls where possible.
- Keep the primary action visually and spatially dominant.
- Use at least a 44-point interaction region.
- Use plain labels rather than icon-only meaning.
- Never use color as the only state cue.
- Establish hierarchy with type, spacing, alignment, and grouping before adding containers.
- Keep healthy background systems quiet.
- Surface errors at the point where a person can act.
- Automate provenance, synchronization, retry, hashing, and readiness.
- Require explicit action for consent, saving, publication, invitation, project closure, and export.
- Respect text scaling, VoiceOver, keyboard navigation, reduced motion, increased contrast, safe areas, and system appearance.

## Mobile viewport and software keyboard

The software keyboard is part of the primary viewport, not an overlay the user must manage.

The application-level `visualViewport` controller publishes the visible height and offset. Authentication, forms, sheets, dialogs, and persistent action bars use those values to remain inside the visible region.

Required behavior:

- The primary action remains reachable above the keyboard.
- A user never needs to dismiss the keyboard before continuing or skipping.
- Optional empty text and number fields do not receive automatic focus.
- The action label is **Skip** when an optional field is empty.
- Required editable fields may receive focus when that reduces a real step.
- Secondary navigation is reduced while typing.
- Content uses the visible viewport without trapping the entire page in unstable fixed positioning.
- Bottom actions include the device safe-area inset.

This behavior is covered by interaction tests and must be verified on iOS Safari and the installed app after material changes.

## Guided observation flow

The collection surface presents one field at a time.

### Structure

- A compact project label and progress indicator provide context.
- The current question is the only dominant content.
- The bottom action area contains Back and one primary action.
- The final action is **Save observation**.
- Location fields remain background provenance rather than visible steps. If a project declares one, a single contextual permission gate blocks collection until access and a position are available.
- Section headings become short transitional steps only when they improve comprehension.

### Interaction

- Single-choice, tri-state, date, and date-time answers may advance automatically after completion.
- Multiple-choice, text, number, media, and repeatable-group fields wait for an explicit action.
- Required fields prevent continuation and show an inline explanation.
- Optional empty fields show **Skip**.
- Long text and repeatable content may scroll within the field region; the primary page hierarchy remains stable.
- Return-key behavior must not submit an incomplete or unintended answer.

### Progress

Use a thin determinate indicator and concise step text. Avoid decorative dots or secondary summaries that compete with the question.

## Forms and project creation

Project setup uses progressive disclosure:

- Project name is the only required identity input.
- Description, instructions, workspace name, license, contact, and identifier remain under optional disclosure.
- Field labels and types are primary.
- Machine keys and less common configuration remain under **Advanced**.
- Contributor invitations are optional during creation and can happen later.

Do not force users to complete metadata that can be safely defaulted or deferred.

## Sheets and dialogs

Every sheet and dialog uses the shared modal surface:

- semantic dialog role;
- labelled title;
- focus containment;
- Escape dismissal where safe;
- focus return to the trigger;
- safe-area and visual-viewport positioning;
- one obvious completion or dismissal action.

Use a sheet for supporting tasks that preserve context. Use an alert-style confirmation only for consequential actions. Do not nest modals.

## Status and feedback

Use text that states the proven system fact:

| State                      | Preferred copy       |
| -------------------------- | -------------------- |
| Local transaction complete | Saved on this device |
| Durable work pending       | Waiting to send      |
| Transfer active            | Sending observations |
| Server receipt stored      | Synced               |
| Permanent conflict         | Action required      |

Do not display a success check for request initiation or media upload alone. Use relative time in the interface and preserve the exact timestamp in an accessible title or detail.

## Profile and secondary information

Profile consolidates infrequent personal and account information:

- contribution count;
- number saved locally;
- last server receipt;
- consent status;
- advisory attention score and explanation;
- Add to Home Screen guidance;
- device-link code generation;
- privacy summary and local export;
- sign out.

The attention score appears as a circular numeric indicator with a non-color label and explanatory disclosure. Color may reinforce range but cannot carry the meaning alone.

## Privacy presentation

Privacy is presented in plain language before technical or legal detail:

1. what the contributor provides;
2. what the application records automatically;
3. why those data are needed;
4. who can access the project;
5. how local and server transfer differ;
6. how to export local data.

The consent screen begins with a scannable summary and leaves the full statement under disclosure. The interface must not imply that a configured in-app step automatically satisfies a deployment’s legal or ethics obligations.

## Accessibility contract

- All controls have programmatic names.
- Questions label their inputs.
- Required and invalid state use semantic attributes and visible text.
- Focus order follows reading order.
- Focus indicators remain visible in both appearances.
- Touch targets remain comfortable under text scaling.
- Motion is optional and disabled by `prefers-reduced-motion`.
- Contrast strengthens under `prefers-contrast: more`.
- Dialogs trap focus and return it on close.
- Status changes use appropriate live regions without excessive announcements.
- Automated Axe checks cover representative consent, project setup, profile, and synchronization surfaces.

Automated tests do not replace VoiceOver, keyboard, zoom, text-size, contrast, and real-device review.

## Visual language

The contributor app uses a stable light appearance for field legibility. The administrator app uses a distinct dark appearance to signal a different operational surface.

| Token          | Contributor         | Administrator       |
| -------------- | ------------------- | ------------------- |
| Canvas         | `#f5f5f7`           | `#000000`           |
| Paper          | `#ffffff`           | `#1c1c1e`           |
| Primary text   | `#1d1d1f`           | `#f5f5f7`           |
| Secondary text | neutral system gray | neutral system gray |
| Accent         | black               | white               |
| Accent text    | white               | black               |
| Destructive    | semantic red        | semantic red        |

Neutral color is a project-specific visual decision. Words, icons, shape, order, and accessible names carry state.

The surface identity is established before React paints so PWA chrome does not flash the wrong appearance.

## Intentional platform adaptations

### Focused full-screen collection

The collection task removes persistent top-level navigation. Back remains available, and the bottom reach zone is reserved for the current field action. This adaptation prioritizes uninterrupted capture over application browsing.

### Monochrome custom accent

The web implementation uses neutral custom tokens rather than a platform tint. Increased contrast, explicit labels, and non-color state indicators preserve accessibility.

### Web symbols and materials

The PWA cannot use native SF Symbols or UIKit materials directly. A small SVG symbol set and CSS material approximation preserve semantic roles, consistent sizing, and accessible names. Icons never replace necessary text.

### Auto-advance

Completed single-value fields may advance without an extra tap. Back remains one action away, motion is brief and reducible, and fields that can be partially complete never auto-advance.

## Review checklist

Before merging an interface change:

1. identify the primary action;
2. remove duplicate or non-actionable information;
3. move supporting configuration behind disclosure;
4. verify the software keyboard cannot cover the action;
5. test a 320-pixel-wide viewport and large text;
6. test keyboard navigation and focus return;
7. run automated accessibility checks;
8. verify light contributor and dark administrator appearances;
9. confirm status copy matches the receipt boundary;
10. inspect the affected flow on iOS Safari or the installed app.

## Related documentation

- [User and system flows](flows.md)
- [Privacy and data handling](privacy.md)
- [Architecture](architecture.md)
- [Contributing](../CONTRIBUTING.md)
