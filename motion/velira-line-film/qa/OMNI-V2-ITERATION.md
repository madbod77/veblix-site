# Velira Omni v2 — controlled regeneration

## Why v1 was rejected

- The prompt asked one generative shot to solve phone identity, three abstract systems, a pulse, a final plate and a brand reveal.
- The model replaced the causal mechanism with generic blocks, kept the phone present, lost the pulse and hallucinated a television in the final frame.
- This is a structural failure, so the Gemini Omni recovery workflow requires a fresh generation rather than a cosmetic edit.

## V2 hypothesis

One object, one path, one pulse and one continuous camera move are feasible in ten seconds. The phone exits by 1.8 seconds; the camera then follows only the cable. The final state contains one underline and one blank logo-safe plate, with the original logo reserved for deterministic Remotion compositing.

## Hard fails

- More than one phone, handset, cable, pulse or visible gate at a time.
- Phone visible after 1.8 seconds or returning later.
- Cable branches, disconnects, changes colour or gains a cable-like duplicate shadow.
- Pulse leaves the cable, duplicates, reverses or teleports.
- Gate activates before contact or becomes a floating card, screen or portal.
- Any cut, camera reversal, generated lettering, logo, television or pseudo-UI.
- Final frame contains anything except navy paper, one red underline, one tiny teal terminal and one blank cream logo-safe plate.
- Final camera lock begins later than 8.6 seconds.

## Paid action

- Model: Gemini Omni Flash
- Surface: Google Flow Agent
- Duration: 10 seconds
- Aspect: 16:9
- Outputs: 1
- Displayed cost: 15 credits
- Authorization: approved by the owner immediately before this V2 generation

## Raw V2 inspection

- Raw asset: `video/velira-open-line-omni-v2-raw.mp4`
- SHA-256: `b4a3cf29a939f60ca5c47afd9e38a4d471273a0ca464cf0f5cac29b9345ac2b6`
- Technical inspector: pass with no errors or warnings; full decode passed.
- Scene-change detector: no frame exceeded the `0.35` cut threshold.
- Independent semantic score: **68/100, no-go as a raw delivery**.
- Passes: one phone, one cable, one pulse; pulse stays on the cable; forward camera chase; no fake text, logo or television; clean navy destination; one underline.
- Misses: the final edge of the phone clears around 1.92–1.96 seconds rather than 1.8; Omni renders more than three physical gate bodies; the native final camera hold is too short.

## Deterministic finishing pass

The raw generation is treated as footage, not as the brand master. Remotion adds only controlled, auditable layers:

- Three sequential code-native semantic chapters: `01 / САЙТ`, `02 / TELEGRAM`, `03 / CRM`.
- A crossfade to an unmodified raw final frame completes by frame 203 (8.458 seconds), producing a stable **1.54-second** background hold.
- The exact owner JPEG is composited from `velira-logo-original.jpg`; its tracked SHA-256 remains `ed7c299466921a85f4d30c1ea643cf8ad4a71b6594d27afbf810de78159633c3`.
- Only unused outer whitespace is clipped; the complete symbol, wordmark and tagline remain intact. No AI redraw, recolour or geometric warp is used.
- `НЕ РЕКЛАМА. СИСТЕМА.` is code-native Onest typography, not generated lettering.
- The project-owned procedural soundtrack replaces the uneven native mix: one ring, one connection, three relay contacts, terminal resolve and room tone; no music or voice.

## Final delivery gate

- Final asset: `video/velira-open-line-omni-v2-final.mp4`
- SHA-256: `17fb0ae9460ce42315c7c7a57cd0135a91685fd06fc9be348e5d4e4e21ad7db1`
- Duration: exactly 10.000 seconds.
- Video: H.264 High, 1280×720, 24 fps, `yuv420p`, explicit `bt709` primaries/transfer/space.
- Audio: AAC stereo, 48 kHz; integrated loudness **−17.8 LUFS**; true peak **−1.5 dBFS**.
- Full decode: pass. Inspector findings: 0 errors, 0 warnings.
- Final full logo/text reveal completes at frame 205, leaving a **1.46-second** readable lockup.
- The raw-to-lockup change uses a deliberate dip-to-navy; no duplicate cream plate or ghost terminal remains in transition frames 196–205.
- TypeScript: pass. Launch-plan validator: pass. `npm audit --audit-level=low`: 0 vulnerabilities.
- Independent final-master review: **PASS, 88/100**. Frames 196–200 dip cleanly to navy; frames 201–205 reveal only the locked brand plate and copy.

## Honest residual

The deterministic master repairs clarity, branding, audio and the final hold, but it cannot erase the raw model's extra physical gate bodies without replacing the generated middle section. The three code-native chapter labels make the intended SITE → TELEGRAM → CRM story explicit; the background machinery remains visually richer than the strict three-gate prompt requested. A further Omni generation would require a new cost authorization.
