# Interface baseline

The MVP uses a deliberately neutral, Apple HIG-inspired baseline: white and soft gray surfaces, system typography, minimal chrome, generous spacing, and text-first state communication. This is a design foundation, not a reimplementation of Apple-owned visual assets.

This is also a data-quality decision. A contributor working in sunlight, gloves, stress, low bandwidth, or an unfamiliar device needs accessible controls and unambiguous state feedback. Ease of use is part of collection reliability, not decoration around it.

Reference the official guidance when making UI decisions:

- [Materials — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Accessibility — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/accessibility)

## Decisions

- Use semantic HTML and native controls wherever possible.
- Keep touch targets comfortable and labels explicit; never make color the only signal.
- Establish hierarchy with typography, spacing, and alignment before adding containers or decoration.
- Use sheets, concise secondary actions, and progressive disclosure for supporting detail.
- Keep the active collection surface focused on the observation, not queue internals or admin metrics.
- Make local-save, waiting, syncing, and synced states visible in words.
- Respect system font scaling, light/dark appearance, reduced motion, keyboard navigation, and focus visibility.
- Avoid animation that delays data entry or obscures whether a write completed.
- Treat offline and error states as normal product states with factual copy, not alarming decoration.
