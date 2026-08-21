import "./index.css";
import {Composition} from "remotion";
import {VeliraAssetSheet} from "./compositions/VeliraAssetSheet";
import {VeliraStoryboard} from "./compositions/VeliraStoryboard";
import {
  VeliraOpenLine,
  VeliraSceneOne,
  VeliraSceneThree,
  VeliraSceneTwo,
} from "./compositions/VeliraOpenLine";
import {project} from "./project";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="VeliraOpenLine"
      component={VeliraOpenLine}
      durationInFrames={project.durationInFrames}
      fps={project.fps}
      width={project.width}
      height={project.height}
    />
    <Composition
      id="VeliraSceneOne"
      component={VeliraSceneOne}
      durationInFrames={project.scenes[0].duration}
      fps={project.fps}
      width={project.width}
      height={project.height}
    />
    <Composition
      id="VeliraSceneTwo"
      component={VeliraSceneTwo}
      durationInFrames={project.scenes[1].duration}
      fps={project.fps}
      width={project.width}
      height={project.height}
    />
    <Composition
      id="VeliraSceneThree"
      component={VeliraSceneThree}
      durationInFrames={project.scenes[2].duration}
      fps={project.fps}
      width={project.width}
      height={project.height}
    />
    <Composition
      id="VeliraStoryboard"
      component={VeliraStoryboard}
      durationInFrames={1}
      fps={project.fps}
      width={project.width}
      height={project.height}
    />
    <Composition
      id="VeliraAssetSheet"
      component={VeliraAssetSheet}
      durationInFrames={1}
      fps={project.fps}
      width={project.width}
      height={project.height}
    />
  </>
);
