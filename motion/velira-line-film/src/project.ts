export const palette = {
  paper: "#F4E8C5",
  navy: "#303647",
  teal: "#668C8F",
  red: "#C80D0A",
  peach: "#E8C3A8",
  ink: "#101114",
  white: "#FFF9EA",
} as const;

export const project = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 300,
  scenes: [
    {id: "VeliraSceneOne", from: 0, duration: 90, heroFrame: 45},
    {id: "VeliraSceneTwo", from: 90, duration: 120, heroFrame: 60},
    {id: "VeliraSceneThree", from: 210, duration: 90, heroFrame: 45},
  ],
  storyboardFrames: [45, 150, 255],
} as const;
