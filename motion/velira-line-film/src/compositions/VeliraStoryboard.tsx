import {AbsoluteFill, Img, staticFile} from "remotion";
import {palette} from "../project";

const panels = [
  {index: "01", time: "00:00–00:03", title: "SIGNAL AWAKES", verb: "DIAL / UNSPOOL", image: "storyboard/frame-045.png"},
  {index: "02", time: "00:03–00:07", title: "SIGNAL ROUTES", verb: "ROUTE / LOCK", image: "storyboard/frame-150.png"},
  {index: "03", time: "00:07–00:10", title: "LINE STAYS OPEN", verb: "SETTLE / HOLD", image: "storyboard/frame-255.png"},
] as const;

export const VeliraStoryboard: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: palette.navy, color: palette.white, padding: 60, fontFamily: "Onest, sans-serif"}}>
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
      <div style={{fontSize: 26, fontWeight: 820, letterSpacing: 5}}>VELIRA — OPEN LINE / STORYBOARD</div>
      <div style={{fontSize: 16, fontWeight: 700, letterSpacing: 4, color: palette.teal}}>1920×1080 · 30 FPS · 300 FRAMES</div>
    </div>
    <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, marginTop: 40}}>
      {panels.map((panel) => (
        <div key={panel.index} style={{border: `2px solid ${palette.white}`, backgroundColor: palette.paper, color: palette.navy}}>
          <div style={{height: 32, display: "flex", alignItems: "center", gap: 10, paddingLeft: 14, borderBottom: `2px solid ${palette.navy}`}}>
            <span style={{width: 11, height: 11, borderRadius: "50%", backgroundColor: palette.red}} />
            <span style={{width: 11, height: 11, borderRadius: "50%", border: `2px solid ${palette.navy}`}} />
            <span style={{width: 11, height: 11, borderRadius: "50%", border: `2px solid ${palette.navy}`}} />
          </div>
          <Img src={staticFile(panel.image)} style={{width: "100%", height: 310, objectFit: "cover", display: "block"}} />
          <div style={{padding: "24px 24px 26px", minHeight: 200, borderTop: `2px solid ${palette.navy}`}}>
            <div style={{display: "flex", justifyContent: "space-between", color: palette.red, fontSize: 15, fontWeight: 800, letterSpacing: 2.6}}>
              <span>{panel.index}</span><span>{panel.time}</span>
            </div>
            <div style={{marginTop: 28, fontSize: 42, lineHeight: 0.96, fontWeight: 850, letterSpacing: -1.5}}>{panel.title}</div>
            <div style={{marginTop: 20, color: palette.teal, fontSize: 15, fontWeight: 750, letterSpacing: 3}}>{panel.verb}</div>
          </div>
        </div>
      ))}
    </div>
    <div style={{marginTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 22, borderTop: `2px solid ${palette.red}`}}>
      <div style={{fontSize: 17, fontWeight: 700, letterSpacing: 3.5}}>ONE PHONE · ONE CABLE · ONE SIGNAL · NO LOST STATE</div>
      <div style={{fontSize: 16, fontWeight: 700, color: palette.teal}}>HERO FRAMES 045 / 150 / 255</div>
    </div>
  </AbsoluteFill>
);
