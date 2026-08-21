import {Config} from "@remotion/cli/config";
import {existsSync} from "node:fs";

Config.setOverwriteOutput(true);
Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");

const browserCandidates = [
  process.env.REMOTION_BROWSER_EXECUTABLE,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter((candidate): candidate is string => Boolean(candidate));

const localBrowser = browserCandidates.find((candidate) => existsSync(candidate));
if (localBrowser) {
  Config.setBrowserExecutable(localBrowser);
}
