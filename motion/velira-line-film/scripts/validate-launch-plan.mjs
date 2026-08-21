import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";

const root = resolve(import.meta.dirname, "..");
const plan = JSON.parse(readFileSync(resolve(root, "scene-plan.json"), "utf8"));
const manifest = JSON.parse(readFileSync(resolve(root, "asset-manifest.json"), "utf8"));
const errors = [];
const warnings = [];

if (plan.mode !== "launch-motion") errors.push("mode must be launch-motion");
if (plan.width !== 1920 || plan.height !== 1080) errors.push("composition must be 1920x1080");
if (plan.fps !== 30) errors.push("fps must be 30");
if (!Number.isInteger(plan.durationInFrames) || plan.durationInFrames <= 0) errors.push("invalid durationInFrames");
if (!Array.isArray(plan.scenes) || plan.scenes.length !== 3) errors.push("exactly three scenes are required");

const assetIds = new Set(manifest.assets.map((asset) => asset.id));
let cursor = 0;
for (const [index, scene] of plan.scenes.entries()) {
  if (scene.from !== cursor) errors.push(`scene ${scene.id} starts at ${scene.from}; expected ${cursor}`);
  if (!Number.isInteger(scene.duration) || scene.duration <= 0) errors.push(`scene ${scene.id} has invalid duration`);
  if (!Number.isInteger(scene.heroFrame) || scene.heroFrame < 0 || scene.heroFrame >= scene.duration) {
    errors.push(`scene ${scene.id} heroFrame is outside its local range`);
  }
  if (!scene.visualVerb || !scene.primaryMessage || !scene.evidenceObject) {
    errors.push(`scene ${scene.id} lacks its motion contract`);
  }
  if (!Array.isArray(scene.exactText) || scene.exactText.length === 0) errors.push(`scene ${scene.id} has no exactText`);
  if (!Array.isArray(scene.assets) || scene.assets.length === 0) errors.push(`scene ${scene.id} has no assets`);
  for (const asset of scene.assets ?? []) {
    if (!assetIds.has(asset)) errors.push(`scene ${scene.id} references unknown asset ${asset}`);
  }
  for (const frame of scene.qaFrames ?? []) {
    if (!Number.isInteger(frame) || frame < 0 || frame >= scene.duration) {
      errors.push(`scene ${scene.id} QA frame ${frame} is outside its local range`);
    }
  }
  if (index > 0 && scene.continuityIn !== plan.scenes[index - 1].continuityOut) {
    errors.push(`scene ${scene.id} continuityIn does not match the prior continuityOut`);
  }
  cursor += scene.duration;
}

if (cursor !== plan.durationInFrames) errors.push(`scene ranges end at ${cursor}, expected ${plan.durationInFrames}`);

for (const asset of manifest.assets) {
  if (!asset.id || !asset.path || !asset.source || !asset.provenance || !asset.license) {
    errors.push(`asset ${asset.id ?? "<unknown>"} lacks required provenance fields`);
    continue;
  }
  if (!existsSync(resolve(root, asset.path))) errors.push(`asset file is missing: ${asset.path}`);
}

if (!Array.isArray(plan.storyboardFrames) || plan.storyboardFrames.join(",") !== "45,150,255") {
  warnings.push("storyboardFrames differ from the approved 45 / 150 / 255 hero set");
}

const report = {
  ok: errors.length === 0,
  mode: plan.mode,
  dimensions: `${plan.width}x${plan.height}`,
  fps: plan.fps,
  durationInFrames: plan.durationInFrames,
  sceneCount: plan.scenes.length,
  assetCount: manifest.assets.length,
  errors,
  warnings,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
