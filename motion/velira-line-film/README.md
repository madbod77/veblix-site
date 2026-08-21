# Velira — Open Line

Ten-second 16:9 brand film built in Remotion from the approved Velira palette, red telephone, original logo, and Onest typography.

## Deliverables

- Final master: `../../video/velira-open-line.mp4`
- Storyboard: `qa/velira-open-line-storyboard.png`
- Poster: `../../video/velira-open-line-poster.png`
- Gemini Flow package: `prompts/GEMINI-OMNI-FLOW-PACKAGE.md`
- Flow master prompt: `prompts/GEMINI-OMNI-MASTER-PROMPT.txt`
- Structured Gemini brief: `prompts/gemini-omni-flow-brief.json`
- Validation report: `qa/VALIDATION.md`

## Reproduce

```bash
npm install
npm run typecheck
npm run validate:plan
npm run render:storyboard
npm run render
```

The Flow package stops at the explicit paid-generation gate. The local Remotion master is already complete and requires no external generation service.
