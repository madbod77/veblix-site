import {AbsoluteFill, Img, staticFile} from "remotion";
import {palette} from "../project";

const panels = [
  {
    index: "01",
    time: "00:00.0–00:01.8",
    title: "SIGNAL IGNITES",
    verb: "RING / ATTACH / DEPART",
    image: "storyboard-v2/frame-a-ignition.png",
  },
  {
    index: "02",
    time: "00:01.8–00:07.8",
    title: "CHASE THE LINE",
    verb: "TRACK / CONTACT / LOCK",
    image: "storyboard-v2/frame-b-contact.png",
  },
  {
    index: "03",
    time: "00:07.8–00:10.0",
    title: "OPEN LINE",
    verb: "STRAIGHTEN / SETTLE / HOLD",
    image: "storyboard-v2/frame-c-open-line.png",
  },
] as const;

export const VeliraStoryboardV2: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: palette.navy,
      color: palette.white,
      padding: 54,
      fontFamily: "Onest, sans-serif",
    }}
  >
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
      <div style={{fontSize: 25, fontWeight: 850, letterSpacing: 4.5}}>
        VELIRA — OPEN LINE / OMNI V2 STORYBOARD
      </div>
      <div style={{fontSize: 14, fontWeight: 750, letterSpacing: 3.4, color: palette.teal}}>
        IMAGEGEN STYLE FRAMES · FLOW AGENT · 10 SECONDS
      </div>
    </div>

    <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 34}}>
      {panels.map((panel) => (
        <div
          key={panel.index}
          style={{
            border: `2px solid ${palette.white}`,
            backgroundColor: palette.paper,
            color: palette.navy,
            boxShadow: `10px 10px 0 ${palette.red}`,
          }}
        >
          <div
            style={{
              height: 30,
              display: "flex",
              alignItems: "center",
              gap: 9,
              paddingLeft: 13,
              borderBottom: `2px solid ${palette.navy}`,
            }}
          >
            <span style={{width: 10, height: 10, borderRadius: "50%", backgroundColor: palette.red}} />
            <span style={{width: 10, height: 10, borderRadius: "50%", border: `2px solid ${palette.navy}`}} />
            <span style={{width: 10, height: 10, borderRadius: "50%", border: `2px solid ${palette.navy}`}} />
          </div>
          <Img
            src={staticFile(panel.image)}
            style={{width: "100%", height: 304, objectFit: "cover", display: "block"}}
          />
          <div style={{padding: "20px 22px 24px", minHeight: 202, borderTop: `2px solid ${palette.navy}`}}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: palette.red,
                fontSize: 14,
                fontWeight: 850,
                letterSpacing: 2.2,
              }}
            >
              <span>{panel.index}</span>
              <span>{panel.time}</span>
            </div>
            <div style={{marginTop: 25, fontSize: 38, lineHeight: 0.96, fontWeight: 900, letterSpacing: -1.4}}>
              {panel.title}
            </div>
            <div style={{marginTop: 20, color: palette.teal, fontSize: 13, fontWeight: 800, letterSpacing: 2.7}}>
              {panel.verb}
            </div>
          </div>
        </div>
      ))}
    </div>

    <div
      style={{
        marginTop: 26,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 20,
        borderTop: `2px solid ${palette.red}`,
      }}
    >
      <div style={{fontSize: 16, fontWeight: 750, letterSpacing: 3.2}}>
        ONE OBJECT · ONE PATH · ONE PULSE · ONE CAMERA MOVE
      </div>
      <div style={{fontSize: 14, fontWeight: 750, color: palette.teal}}>
        PHONE EXITS BY 01.8 · FINAL HOLD 02.2S
      </div>
    </div>
  </AbsoluteFill>
);
