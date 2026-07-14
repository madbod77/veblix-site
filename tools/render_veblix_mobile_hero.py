#!/usr/bin/env python3
"""Build a scene-aware portrait version of the Veblix scroll hero.

Each third gets its own framing: the lead form, the complete physical phone,
then the workflow/analytics workspace.  This keeps real UI legible instead of
using one generic desktop crop for every scene.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "assets/video/veblix-hero.mp4"
DEFAULT_OUTPUT = ROOT / "assets/video/veblix-hero-mobile.mp4"
POSTERS = {
    4.70: ("hero-poster-mobile.jpg",),
    7.20: ("scene-01-mobile.jpg",),
    15.20: ("scene-02-mobile.jpg",),
    23.40: ("scene-05-mobile.jpg",),
}


def ffmpeg_path() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    fallback = Path.home() / ".local/bin/ffmpeg"
    if fallback.exists():
        return str(fallback)
    raise SystemExit("ffmpeg was not found")


def render(source: Path, output: Path, crf: int) -> None:
    ffmpeg = ffmpeg_path()
    output.parent.mkdir(parents=True, exist_ok=True)
    filter_graph = (
        "[0:v]trim=start=0:end=8,setpts=PTS-STARTPTS,crop=600:600:620:60,scale=720:720:flags=lanczos[s0];"
        "[0:v]trim=start=8:end=16,setpts=PTS-STARTPTS,crop=680:680:590:20,scale=720:720:flags=lanczos[s1];"
        "[0:v]trim=start=16:end=24,setpts=PTS-STARTPTS,crop=560:560:660:80,scale=720:720:flags=lanczos[s2];"
        "[s0][s1][s2]concat=n=3:v=1:a=0,format=rgba[ui];"
        "color=c=white:s=720x720:d=24:r=24,format=gray,"
        "geq=lum='if(lt(Y,600),255,max(0,255*(720-Y)/120))',setpts=PTS-STARTPTS[mask];"
        "[ui][mask]alphamerge[uia];[1:v]setpts=PTS-STARTPTS[bg];"
        "[bg][uia]overlay=0:0:shortest=1[out]"
    )
    subprocess.run(
        [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
            "-f", "lavfi", "-i", "color=c=0x0A0C15:s=720x1560:d=24:r=24",
            "-filter_complex", filter_graph, "-map", "[out]", "-an", "-r", "24",
            "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
            "-g", "1", "-keyint_min", "1", "-sc_threshold", "0",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
        ],
        check=True,
    )

    poster_dir = ROOT / "assets/img"
    poster_dir.mkdir(parents=True, exist_ok=True)
    for timestamp, names in POSTERS.items():
        first = poster_dir / names[0]
        subprocess.run(
            [
                ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{timestamp:.2f}",
                "-i", str(output), "-frames:v", "1", "-q:v", "2", str(first),
            ],
            check=True,
        )
        for duplicate in names[1:]:
            shutil.copyfile(first, poster_dir / duplicate)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--crf", type=int, default=33)
    args = parser.parse_args()
    render(args.input, args.output, args.crf)
    print(args.output)


if __name__ == "__main__":
    main()
