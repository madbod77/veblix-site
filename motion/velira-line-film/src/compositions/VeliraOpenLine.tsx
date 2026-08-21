import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  interpolateColors,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {svgPathProperties} from "svg-path-properties";
import {palette} from "../project";

const WORLD_WIDTH = 5760;
const PATH =
  "M 980 770 C 1180 820 1420 950 1710 910 C 1920 880 2050 540 2290 540 C 2470 540 2690 540 2870 540 C 3050 540 3270 540 3450 540 C 3650 540 3890 670 4200 760 L 5570 760";
const PATH_PROPERTIES = new svgPathProperties(PATH);
const PATH_TOTAL_LENGTH = PATH_PROPERTIES.getTotalLength();

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const smooth = Easing.bezier(0.22, 0.76, 0.2, 1);

const reveal = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {...clamp, easing: smooth});

const EditorialGrid: React.FC<{left: number; dark?: boolean}> = ({left, dark = false}) => (
  <div style={{position: "absolute", left, top: 0, width: 1920, height: 1080}}>
    {Array.from({length: 13}, (_, index) => (
      <div
        key={index}
        style={{
          position: "absolute",
          left: 80 + index * 146.7,
          top: 0,
          width: 1,
          height: 1080,
          backgroundColor: dark ? palette.white : palette.navy,
          opacity: dark ? 0.045 : 0.055,
        }}
      />
    ))}
  </div>
);

const Kicker: React.FC<{
  left: number;
  top: number;
  index: string;
  label: string;
  dark?: boolean;
  progress?: number;
}> = ({left, top, index, label, dark = false, progress = 1}) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width: 520,
      display: "flex",
      alignItems: "center",
      gap: 20,
      opacity: progress,
      transform: `translateY(${(1 - progress) * 12}px)`,
      color: dark ? palette.white : palette.navy,
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: 5,
    }}
  >
    <span style={{color: palette.red}}>{index}</span>
    <span style={{width: 76, height: 2, backgroundColor: dark ? palette.white : palette.navy, opacity: 0.45}} />
    <span>{label}</span>
  </div>
);

const MaskedLine: React.FC<{
  children: React.ReactNode;
  progress: number;
  color: string;
  fontSize: number;
  top: number;
}> = ({children, progress, color, fontSize, top}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: top - 16,
      height: fontSize * 1.2,
      width: 720,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        color,
        fontSize,
        lineHeight: 0.92,
        fontWeight: 850,
        letterSpacing: -5.8,
        whiteSpace: "nowrap",
        paddingTop: 16,
        opacity: progress,
        transform: `translateY(${(1 - progress) * 118}%)`,
      }}
    >
      {children}
    </div>
  </div>
);

const PhoneHero: React.FC<{frame: number}> = ({frame}) => {
  const intro = spring({
    frame: frame - 2,
    fps: 30,
    config: {damping: 26, stiffness: 125, mass: 0.9},
  });
  const ringEnvelope = interpolate(frame, [14, 17, 28, 32], [0, 1, 1, 0], clamp);
  const ringY = Math.sin((frame - 14) * 1.55) * 3.2 * ringEnvelope;
  const dialAttack = interpolate(frame, [14, 22], [0, -18], clamp);
  const dialReturn = spring({
    frame: frame - 22,
    fps: 30,
    from: -18,
    to: 0,
    config: {damping: 15, stiffness: 112, mass: 0.78},
  });
  const dialRotation = frame < 22 ? dialAttack : dialReturn;

  return (
    <div
      style={{
        position: "absolute",
        left: 560,
        top: 88,
        width: 1280,
        height: 853,
        opacity: intro,
        transform: `translate(${(1 - intro) * 85}px, ${ringY}px) scale(${1.035 - intro * 0.035})`,
        transformOrigin: "70% 56%",
      }}
    >
      <Img
        src={staticFile("assets/velira-phone-hero.jpg")}
        style={{position: "absolute", inset: 0, width: 1280, height: 853}}
      />
      <div
        style={{
          position: "absolute",
          left: 738,
          top: 275,
          width: 316,
          height: 316,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: `inset 0 0 0 2px ${palette.paper}66`,
        }}
      >
        <Img
          src={staticFile("assets/velira-phone-hero.jpg")}
          style={{
            position: "absolute",
            left: -738,
            top: -275,
            width: 1280,
            height: 853,
            transform: `rotate(${dialRotation}deg)`,
            transformOrigin: "896px 433px",
          }}
        />
      </div>
    </div>
  );
};

type StationProps = {
  x: number;
  number: string;
  label: string;
  sublabel: string;
  activationFrame: number;
  frame: number;
};

const Station: React.FC<StationProps> = ({x, number, label, sublabel, activationFrame, frame}) => {
  const active = spring({
    frame: frame - activationFrame,
    fps: 30,
    config: {damping: 23, stiffness: 170, mass: 0.72},
  });
  const contact = reveal(frame, activationFrame, activationFrame + 4);
  const presence = reveal(frame, 94, 108);
  const fill = interpolateColors(contact, [0, 1], [palette.paper, palette.navy]);
  const ink = interpolateColors(contact, [0, 1], [palette.navy, palette.white]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 292,
        width: 360,
        height: 248,
        color: ink,
        backgroundColor: fill,
        borderTop: `2px solid ${palette.navy}`,
        borderBottom: `2px solid ${palette.navy}`,
        opacity: presence,
        transform: `translateY(${(1 - presence) * 22 - active * 5}px)`,
        padding: "30px 30px 26px",
      }}
    >
      <div style={{display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 750, letterSpacing: 3}}>
        <span style={{color: contact > 0.5 ? palette.peach : palette.red}}>{number}</span>
        <span style={{opacity: 0.58}}>ACTIVE / {contact > 0.5 ? "ON" : "WAIT"}</span>
      </div>
      <div style={{marginTop: 53, fontSize: label.length > 5 ? 48 : 66, lineHeight: 0.9, fontWeight: 850, letterSpacing: -2.8}}>
        {label}
      </div>
      <div style={{marginTop: 24, fontSize: 15, fontWeight: 650, letterSpacing: 3.2, opacity: 0.7}}>{sublabel}</div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: -11,
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: contact > 0.5 ? palette.teal : palette.paper,
          border: `4px solid ${palette.red}`,
          transform: `translateX(-50%) scale(${0.82 + active * 0.18})`,
        }}
      />
    </div>
  );
};

const FinalLockup: React.FC<{frame: number}> = ({frame}) => {
  const logo = spring({
    frame: frame - 223,
    fps: 30,
    config: {damping: 26, stiffness: 145, mass: 0.82},
  });
  const copy = reveal(frame, 228, 248);
  const cta = reveal(frame, 242, 258);

  return (
    <>
      <Kicker left={3970} top={82} index="03" label="VELIRA / OPEN LINE" dark progress={copy} />
      <div
        style={{
          position: "absolute",
          left: 3980,
          top: 188,
          width: 518,
          height: 518,
          padding: 18,
          backgroundColor: palette.white,
          opacity: logo,
          transform: `translateY(${(1 - logo) * 52}px) scale(${0.96 + logo * 0.04})`,
          boxShadow: `22px 22px 0 ${palette.red}`,
        }}
      >
        <Img
          src={staticFile("assets/velira-logo-original.jpg")}
          style={{width: "100%", height: "100%", objectFit: "cover"}}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 4685,
          top: 205,
          width: 790,
          height: 440,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            color: palette.white,
            fontSize: 118,
            lineHeight: 0.88,
            fontWeight: 850,
            letterSpacing: -5.5,
            opacity: copy,
            transform: `translateY(${(1 - copy) * 115}%)`,
          }}
        >
          ЛІНІЯ<br />
          <span style={{color: palette.red}}>ВІДКРИТА.</span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 4688,
          top: 644,
          color: palette.paper,
          fontSize: 18,
          fontWeight: 720,
          letterSpacing: 4.3,
          opacity: copy,
        }}
      >
        САЙТИ · БОТИ · АВТОМАТИЗАЦІЯ
      </div>
      <div
        style={{
          position: "absolute",
          left: 4688,
          top: 824,
          width: 640,
          padding: "24px 0 20px",
          borderTop: `2px solid ${palette.white}`,
          borderBottom: `2px solid ${palette.white}`,
          display: "flex",
          justifyContent: "space-between",
          color: palette.white,
          fontSize: 24,
          fontWeight: 760,
          letterSpacing: 1.2,
          opacity: cta,
          transform: `translateY(${(1 - cta) * 18}px)`,
        }}
      >
        <span>ОБГОВОРИТИ ПРОЄКТ</span>
        <span style={{color: palette.red, fontSize: 32, lineHeight: 0.7}}>→</span>
      </div>
    </>
  );
};

export const VeliraFilmCanvas: React.FC<{frame: number}> = ({frame}) => {
  const title = reveal(frame, 6, 26);
  const kicker = reveal(frame, 2, 16);
  const routeTitle = reveal(frame, 88, 104);
  const cableDraw = interpolate(
    frame,
    [18, 45, 62, 78, 102, 112, 140, 168, 178, 198, 223],
    [0, 0.0535, 0.0875, 0.1574, 0.27, 0.3051, 0.4267, 0.5483, 0.5892, 0.7127, 1],
    {...clamp, easing: Easing.inOut(Easing.cubic)},
  );
  const cameraX = interpolate(
    frame,
    [0, 82, 104, 198, 232, 300],
    [0, 0, 1920, 1920, 3840, 3840],
    {...clamp, easing: smooth},
  );

  const pulsePoint = PATH_PROPERTIES.getPointAtLength(PATH_TOTAL_LENGTH * cableDraw);
  const pulseOpacity = interpolate(frame, [16, 22, 176, 184], [0, 1, 1, 0], clamp);
  const terminal = spring({frame: frame - 178, fps: 30, config: {damping: 21, stiffness: 170, mass: 0.72}});
  const bridgeLabel = interpolate(frame, [80, 86, 92, 98], [0, 1, 1, 0], {
    ...clamp,
    easing: smooth,
  });

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: palette.paper, fontFamily: "Onest, sans-serif"}}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: WORLD_WIDTH,
          height: 1080,
          transform: `translateX(${-cameraX}px)`,
          willChange: "transform",
        }}
      >
        <div style={{position: "absolute", left: 0, top: 0, width: 3840, height: 1080, backgroundColor: palette.paper}} />
        <div style={{position: "absolute", left: 3840, top: 0, width: 1920, height: 1080, backgroundColor: palette.navy}} />
        <EditorialGrid left={0} />
        <EditorialGrid left={1920} />
        <EditorialGrid left={3840} dark />

        <PhoneHero frame={frame} />
        <Kicker left={80} top={78} index="01" label="OPEN LINE" progress={kicker} />
        <div style={{position: "absolute", left: 80, top: 0, width: 700, height: 1080}}>
          <MaskedLine progress={title} color={palette.navy} fontSize={146} top={246}>
            КЛІЄНТ
          </MaskedLine>
          <MaskedLine progress={title} color={palette.red} fontSize={140} top={395}>
            НА ЛІНІЇ.
          </MaskedLine>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 654,
              width: 500,
              color: palette.navy,
              fontSize: 20,
              fontWeight: 650,
              letterSpacing: 3.8,
              opacity: title,
            }}
          >
            СИГНАЛ НЕ МАЄ ЗНИКНУТИ
          </div>
        </div>

        <Kicker left={2000} top={76} index="02" label="CLIENT ROUTE" progress={routeTitle} />
        <div
          style={{
            position: "absolute",
            left: 2000,
            top: 146,
            width: 1480,
            height: 124,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              color: palette.navy,
              fontSize: 96,
              fontWeight: 850,
              lineHeight: 1,
              letterSpacing: -4,
              opacity: routeTitle,
              transform: `translateY(${(1 - routeTitle) * 120}%)`,
            }}
          >
            ЗАЯВКА РУХАЄТЬСЯ.
          </div>
        </div>
        <Station x={2110} number="01" label="САЙТ" sublabel="ПОЯСНЮЄ" activationFrame={112} frame={frame} />
        <Station x={2690} number="02" label="TELEGRAM" sublabel="ВІДПОВІДАЄ" activationFrame={140} frame={frame} />
        <Station x={3270} number="03" label="CRM" sublabel="ПЕРЕДАЄ" activationFrame={168} frame={frame} />
        <div
          style={{
            position: "absolute",
            left: 2000,
            top: 760,
            width: 1540,
            paddingTop: 24,
            borderTop: `2px solid ${palette.navy}`,
            display: "flex",
            justifyContent: "space-between",
            color: palette.navy,
            fontSize: 18,
            fontWeight: 720,
            letterSpacing: 4,
            opacity: routeTitle,
          }}
        >
          <span>ОДНА ЛІНІЯ</span>
          <span>ЖОДНОЇ ВТРАТИ</span>
        </div>

        <svg
          width={WORLD_WIDTH}
          height={1080}
          viewBox={`0 0 ${WORLD_WIDTH} 1080`}
          style={{position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none"}}
        >
          <path
            d={PATH}
            pathLength={1}
            fill="none"
            stroke={palette.red}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={1}
            strokeDashoffset={1 - cableDraw}
          />
        </svg>

        <div
          style={{
            position: "absolute",
            left: pulsePoint.x - 15,
            top: pulsePoint.y - 15,
            width: 30,
            height: 30,
            borderRadius: "50%",
            backgroundColor: palette.white,
            border: `6px solid ${palette.red}`,
            opacity: pulseOpacity,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 3596,
            top: 525,
            width: 92,
            height: 92,
            borderRadius: "50%",
            backgroundColor: palette.teal,
            border: `12px solid ${palette.paper}`,
            opacity: terminal,
            transform: `scale(${0.75 + terminal * 0.25})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 21,
              top: 17,
              width: 28,
              height: 15,
              borderLeft: `7px solid ${palette.white}`,
              borderBottom: `7px solid ${palette.white}`,
              transform: "rotate(-45deg)",
            }}
          />
        </div>

        <FinalLockup frame={frame} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 650,
          top: 430,
          display: "flex",
          alignItems: "center",
          gap: 28,
          opacity: bridgeLabel,
          transform: `translateX(${(1 - bridgeLabel) * 36}px)`,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            width: 150,
            height: 12,
            backgroundColor: palette.red,
            transform: `scaleX(${bridgeLabel})`,
            transformOrigin: "right center",
          }}
        />
        <span
          style={{
            color: palette.navy,
            fontSize: 82,
            lineHeight: 1,
            fontWeight: 850,
            letterSpacing: -3.6,
            whiteSpace: "nowrap",
          }}
        >
          СИГНАЛ →
        </span>
      </div>
    </AbsoluteFill>
  );
};

export const VeliraOpenLine: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <VeliraFilmCanvas frame={frame} />
      <Audio src={staticFile("audio/velira-open-line.wav")} volume={1} />
    </>
  );
};

const SceneSlice: React.FC<{offset: number}> = ({offset}) => {
  const localFrame = useCurrentFrame();
  return <VeliraFilmCanvas frame={localFrame + offset} />;
};

export const VeliraSceneOne: React.FC = () => <SceneSlice offset={0} />;
export const VeliraSceneTwo: React.FC = () => <SceneSlice offset={90} />;
export const VeliraSceneThree: React.FC = () => <SceneSlice offset={210} />;
