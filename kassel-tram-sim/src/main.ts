import "./style.css";

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

type TrackType = "tram" | "light_rail" | "rail_600v";

interface TrackPoint {
  x: number;
  z: number;
}

interface Track {
  id: string;
  type: TrackType;
  points: TrackPoint[];
  properties: {
    name: string | null;
    operator: string | null;
    gauge: string | null;
    voltage: string | null;
    electrified: string | null;
    usage: string | null;
    service: string | null;
  };
}

interface TracksData {
  tracks: Track[];
}


// --------------------------------------------------
// HTML
// --------------------------------------------------

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <canvas id="renderCanvas"></canvas>

  <div id="info">
    <strong>Kassel Tram Simulator</strong>
    <span id="status">Lade Gleisdaten...</span>
  </div>
`;

const canvas =
  document.querySelector<HTMLCanvasElement>("#renderCanvas")!;


// --------------------------------------------------
// Engine + Scene
// --------------------------------------------------

const engine = new Engine(canvas, true);

const scene = new Scene(engine);

scene.clearColor = new Color4(
  0.03,
  0.04,
  0.06,
  1
);


// --------------------------------------------------
// Kamera
// --------------------------------------------------

const camera = new ArcRotateCamera(
  "camera",
  -Math.PI / 2,
  Math.PI / 3,
  15000,
  new Vector3(0, 0, 0),
  scene
);

camera.minZ = 0.1;
camera.maxZ = 100000;

camera.attachControl(canvas, true);

camera.lowerRadiusLimit = 20;
camera.upperRadiusLimit = 50000;

camera.wheelPrecision = 4;
camera.panningSensibility = 30;


// --------------------------------------------------
// Licht
// --------------------------------------------------

const light = new HemisphericLight(
  "light",
  new Vector3(0, 1, 0),
  scene
);

light.intensity = 0.9;


// --------------------------------------------------
// Boden
// --------------------------------------------------

const ground = MeshBuilder.CreateGround(
  "ground",
  {
    width: 30000,
    height: 30000
  },
  scene
);

ground.position.y = -0.05;

const groundMaterial =
  new StandardMaterial(
    "groundMaterial",
    scene
  );

groundMaterial.diffuseColor =
  new Color3(
    0.08,
    0.10,
    0.08
  );

ground.material = groundMaterial;


// --------------------------------------------------
// Track-Farben
// --------------------------------------------------

function getTrackColor(type: TrackType): Color3 {

  switch (type) {

    case "tram":
      return new Color3(
        0.8,
        0.8,
        0.8
      );

    case "light_rail":
      return new Color3(
        0.55,
        0.7,
        1
      );

    case "rail_600v":
      return new Color3(
        1,
        0.65,
        0.25
      );
  }
}


// --------------------------------------------------
// JSON laden
// --------------------------------------------------

async function loadTracks(): Promise<Track[]> {

  const response =
    await fetch("/data/tracks.json");

  if (!response.ok) {
    throw new Error(
      `tracks.json konnte nicht geladen werden: ${response.status}`
    );
  }

  const data =
    await response.json() as TracksData;

  return data.tracks;
}


// --------------------------------------------------
// Parallele Gleislinien berechnen
// --------------------------------------------------

function createParallelTrackLines(
  points: Vector3[],
  gauge: number
) {

  const left: Vector3[] = [];
  const right: Vector3[] = [];

  const halfGauge = gauge / 2;


  for (
    let i = 0;
    i < points.length;
    i++
  ) {

    let direction: Vector3;


    if (i === 0) {

      direction =
        points[1]
          .subtract(points[0]);

    } else if (
      i === points.length - 1
    ) {

      direction =
        points[i]
          .subtract(points[i - 1]);

    } else {

      const before =
        points[i]
          .subtract(points[i - 1]);

      const after =
        points[i + 1]
          .subtract(points[i]);

      direction =
        before
          .add(after);

    }


    direction.normalize();


    const perpendicular =
      new Vector3(
        -direction.z,
        0,
        direction.x
      );


    const offset =
      perpendicular.scale(
        halfGauge
      );


    left.push(
      points[i].add(offset)
    );

    right.push(
      points[i].subtract(offset)
    );
  }


  return {
    left,
    right
  };
}


// --------------------------------------------------
// Gleisnetz erzeugen
// --------------------------------------------------

async function createTrackNetwork() {

  const status =
    document.querySelector<HTMLSpanElement>("#status")!;

  const tracks =
    await loadTracks();

  let pointCount = 0;


  for (const track of tracks) {

    if (track.points.length < 2) {
      continue;
    }


    const centerPoints =
      track.points.map(
        point =>
          new Vector3(
            point.x,
            0.03,
            point.z
          )
      );


    pointCount +=
      centerPoints.length;


    const gauge =
      track.properties.gauge
        ? Number(track.properties.gauge) / 1000
        : 1.435;


    const {
      left,
      right
    } =
      createParallelTrackLines(
        centerPoints,
        gauge
      );


    const leftRail =
      MeshBuilder.CreateLines(
        `left-${track.id}`,
        {
          points: left
        },
        scene
      );


    const rightRail =
      MeshBuilder.CreateLines(
        `right-${track.id}`,
        {
          points: right
        },
        scene
      );


    const color =
      getTrackColor(
        track.type
      );


    leftRail.color = color;
    rightRail.color = color;
  }


  status.textContent =
    `${tracks.length} Gleisabschnitte / ${pointCount} Punkte`;

}


// --------------------------------------------------
// Start
// --------------------------------------------------

createTrackNetwork()
  .catch(error => {

    console.error(error);

    const status =
      document.querySelector<HTMLSpanElement>("#status")!;

    status.textContent =
      "Fehler beim Laden der Gleisdaten";

  });


// --------------------------------------------------
// Render Loop
// --------------------------------------------------

engine.runRenderLoop(
  () => {
    scene.render();
  }
);


// --------------------------------------------------
// Resize
// --------------------------------------------------

window.addEventListener(
  "resize",
  () => {
    engine.resize();
  }
);