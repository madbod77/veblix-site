# Velira — Open Line / validation

Validated on 2026-08-21 from the final local Remotion master.

## Delivery verdict

**PASS — delivery-ready local master.** The film is a deterministic 10-second branded motion graphic with an original sound design. No Google Flow generation, paid retry, upscale, deployment, or publication was performed.

Independent post-repair review returned **GO** with no remaining blocker or high-severity finding.

## Output contract

| Check | Result |
| --- | --- |
| Container / video | MP4 / H.264 |
| Dimensions | 1920×1080 |
| Frame rate | 30 fps |
| Program duration | 10.000 s / 300 frames |
| Pixel format | yuv420p |
| Colour space | BT.709 |
| Audio | AAC stereo |
| Integrated loudness | −17.97 LUFS |
| True peak | −1.33 dBTP |
| Loudness range | 9.3 LU |
| File size | 1,669,822 bytes |
| Master SHA-256 | `e958485ef0fc83ce910a1c94a1d9f97bbcae4a4ae3be9da5d75f2179b3727c2c` |

The automated render validator passed resolution, frame rate, duration, codec, pixel format, colour space, audio presence, loudness, true peak, and required still existence.

## Brand and logo integrity

- Palette and typography follow `DESIGN.md`: paper `#F4E8C5`, navy `#303647`, teal `#668C8F`, red `#C80D0A`, peach `#E8C3A8`, Onest.
- The final lockup composites the owner-supplied JPEG as one rigid layer. It is scaled uniformly and is not redrawn, recoloured, morphed, re-typeset, or internally cropped.
- Source logo SHA-256 and film-project logo SHA-256 both equal `ed7c299466921a85f4d30c1ea643cf8ad4a71b6594d27afbf810de78159633c3`.
- Critical Ukrainian copy is code-native rather than generated text.

## Visual QA

Reviewed source and encoded-output samples across the full timeline, including frames 000, 012, 045, 078, 088, 092, 097, 101, 102, 150, 168, 180, 198, 203, 208, 212, 222, 255, 288, and 299.

- Scene 1: telephone entrance, dial/ring response, headline reveal, and the photographed cord-to-code-line handoff remain legible and continuous.
- Transition 1→2: camera timing was repaired so the phone holds longer, the signal remains visible, and route typography/stations enter before the frame loses its subject.
- Scene 2: one signal path activates SITE → TELEGRAM → CRM in order; the pulse position is calculated from the exact SVG path length, so it cannot detach from the cable.
- Success proof: all three stages remain visibly active for a full second before the camera leaves the route.
- Transition 2→3: the route terminal and line lead into the navy lockup without a cut.
- Scene 3: exact-logo plate, headline, services line, underline, and CTA settle into a readable final hold.
- All masked headlines now have an explicit opacity gate; no pre-reveal copy leaks into a neighbouring scene.
- Small functional labels use high-contrast navy/cream; teal remains a non-text confirmation accent.
- No frame showed horizontal page overflow, a second decorative signal line, duplicated cable shadows, generated pseudo-text, or a reconstructed logo.

Evidence:

- `velira-open-line-storyboard.png` — three approved hero frames and time ranges.
- `velira-render-contact-sheet.png` — twenty encoded-output samples at 0.5-second intervals.
- `velira-asset-sheet.png` — approved sources and palette.

## Audio QA

The soundtrack is an original procedural stereo WAV: warm room tone, one restrained telephone ring, a dry connection click, three relay contacts, and a terminal confirmation chime. It contains no third-party music or dialogue. The AAC encode remains within the delivery loudness and peak limits above.

## Prompt QA

The Gemini Omni Flash brief passes deterministic validation with **0 errors and 0 warnings**. The Flow package is deliberately gated before any billed action. To protect the logo, Omni is instructed to generate a completely blank logo-safe plate; the exact owner artwork and all Ukrainian typography are then composited deterministically in Remotion.

## Engineering QA

- `npm run typecheck` — pass.
- `npm run validate:plan` — pass: 1920×1080, 30 fps, 300 frames, 3 scenes, 5 tracked assets, no plan errors or warnings.
- `npm audit --audit-level=low` — 0 vulnerabilities after non-breaking dependency updates.
- The first parallel render attempt hit a local Chromium preview-port race before frame 1. The stable single-worker render completed all 300 frames and produced the validated master above.

## Honest limits

- Conversion uplift cannot be inferred from a motion film alone; it requires instrumented campaign traffic and an A/B test.
- The Flow prompt has not been billed or executed, so no claim is made about a future generative take until its downloaded output passes the same semantic and technical QA.
