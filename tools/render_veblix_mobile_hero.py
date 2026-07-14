#!/usr/bin/env python3
"""Build the portrait, scroll-scrubbable Veblix hero from the desktop master."""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "assets/video/veblix-hero.mp4"
DEFAULT_OUTPUT = ROOT / "assets/video/veblix-hero-mobile.mp4"
POSTERS = {
    4.70: ("hero-poster-mobile.jpg", "scene-01-mobile.jpg"),
    12.50: ("scene-02-mobile.jpg",),
    21.00: ("scene-05-mobile.jpg",),
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
        "[0:v]crop=720:720:520:0,format=rgba,setpts=PTS-STARTPTS[ui];"
        "color=c=white:s=720x720:d=24:r=24,format=gray,"
        "geq=lum='if(lt(Y,480),255,max(0,255*(720-Y)/240))',setpts=PTS-STARTPTS[mask];"
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
