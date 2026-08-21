import {Video} from "@remotion/media";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const omniV2 = {
  width: 1280,
  height: 720,
  fps: 24,
  durationInFrames: 240,
} as const;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/**
 * Deterministic brand finishing pass over the approved Gemini Omni V2 plate.
 * The source logo JPEG is never regenerated, recolored, stretched or warped.
 * Only its unused outer white margin is clipped inside a fixed-size viewport.
 */
export const VeliraOmniV2Master: React.FC = () => {
  const frame = useCurrentFrame();
  const finalPlate = frame >= 200 ? 1 : 0;
  const navyDip = interpolate(
    frame,
    [196, 199, 200, 203],
    [0, 1, 1, 0],
    clamp,
  );
  const reveal = interpolate(frame, [199, 205], [0, 1], clamp);
  const settle = interpolate(frame, [199, 209], [0.985, 1], clamp);
  const phases = [
    {index: "01", label: "САЙТ", from: 48, to: 92},
    {index: "02", label: "TELEGRAM", from: 92, to: 136},
    {index: "03", label: "CRM", from: 136, to: 184},
  ] as const;

  return (
    <AbsoluteFill style={{backgroundColor: "#303647", overflow: "hidden"}}>
      <Video
        src={staticFile("assets/velira-open-line-omni-v2-raw.mp4")}
        muted
        objectFit="cover"
        style={{width: "100%", height: "100%"}}
      />

      {phases.map((phase) => {
        const opacity = interpolate(
          frame,
          [phase.from, phase.from + 5, phase.to - 5, phase.to],
          [0, 1, 1, 0],
          clamp,
        );

        return (
          <div
            key={phase.index}
            style={{
              position: "absolute",
              left: 68,
              top: 54,
              display: "flex",
              alignItems: "center",
              gap: 16,
              opacity,
              transform: `translateX(${(1 - opacity) * 14}px)`,
              fontFamily: "Onest, Arial, sans-serif",
              fontSize: 18,
              lineHeight: 1,
              fontWeight: 760,
              letterSpacing: 3.4,
            }}
          >
            <span style={{color: "#C80D0A"}}>{phase.index}</span>
            <span style={{width: 74, height: 2, backgroundColor: "#303647"}} />
            <span style={{color: "#303647"}}>{phase.label}</span>
          </div>
        );
      })}

      <Img
        src={staticFile("assets/velira-open-line-omni-v2-final-plate.png")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: finalPlate,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 232,
          top: 276,
          width: 140,
          height: 140,
          overflow: "hidden",
          opacity: reveal,
          mixBlendMode: "multiply",
          transform: `translateY(${(1 - reveal) * 4}px) scale(${settle})`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile("assets/velira-logo-original.jpg")}
          style={{
            position: "absolute",
            width: 252,
            height: 252,
            left: -56,
            top: -63,
            maxWidth: "none",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 492,
          top: 348,
          width: 646,
          height: 48,
          overflow: "hidden",
          color: "#F4E8C5",
          fontFamily: "Onest, Arial, sans-serif",
          fontSize: 34,
          lineHeight: 1,
          fontWeight: 820,
          letterSpacing: 2.1,
          whiteSpace: "nowrap",
          clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)`,
          transform: `translateY(${(1 - reveal) * 5}px)`,
        }}
      >
        НЕ РЕКЛАМА. СИСТЕМА.
      </div>

      <AbsoluteFill
        style={{
          backgroundColor: "#1A2E43",
          opacity: navyDip,
        }}
      />
    </AbsoluteFill>
  );
};
