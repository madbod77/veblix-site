import {AbsoluteFill, Img, staticFile} from "remotion";
import {palette} from "../project";

const swatches = [
  ["PAPER", palette.paper],
  ["NAVY", palette.navy],
  ["SIGNAL", palette.red],
  ["TEAL", palette.teal],
  ["PEACH", palette.peach],
  ["WHITE", palette.white],
] as const;

export const VeliraAssetSheet: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: palette.paper, color: palette.navy, padding: 72, fontFamily: "Onest, sans-serif"}}>
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
      <div style={{fontSize: 22, fontWeight: 800, letterSpacing: 5}}>VELIRA / MOTION ASSET SHEET</div>
      <div style={{fontSize: 16, fontWeight: 700, letterSpacing: 4, color: palette.teal}}>OPEN LINE / 10S / 16:9</div>
    </div>
    <div style={{display: "grid", gridTemplateColumns: "1.4fr 0.62fr", gap: 28, marginTop: 46, height: 690}}>
      <div style={{position: "relative", overflow: "hidden", border: `2px solid ${palette.navy}`}}>
        <Img src={staticFile("assets/velira-phone-hero.jpg")} style={{width: "100%", height: "100%", objectFit: "cover"}} />
        <div style={{position: "absolute", left: 24, bottom: 24, padding: "14px 18px", backgroundColor: palette.navy, color: palette.white, fontSize: 16, fontWeight: 750, letterSpacing: 3}}>
          PHONE / APPROVED HERO
        </div>
      </div>
      <div style={{backgroundColor: palette.white, border: `2px solid ${palette.navy}`, padding: 22}}>
        <Img src={staticFile("assets/velira-logo-original.jpg")} style={{width: "100%", height: "100%", objectFit: "contain"}} />
      </div>
    </div>
    <div style={{display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0, marginTop: 28, border: `2px solid ${palette.navy}`}}>
      {swatches.map(([name, color]) => (
        <div key={name} style={{height: 112, backgroundColor: color, color: color === palette.navy || color === palette.red ? palette.white : palette.navy, padding: 16, borderRight: `1px solid ${palette.navy}55`, fontSize: 14, fontWeight: 800, letterSpacing: 2}}>
          {name}<br />{color}
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
