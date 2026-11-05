import "./style.css";

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import {
  Vector3,
  Color3,
  Color4
} from "@babylonjs/core/Maths/math";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";


// ============================================================
// TYPEN
// ============================================================

type TrackType =
  | "tram"
  | "light_rail"
  | "rail_600v";

type StructureType =
  | "ground"
  | "bridge"
  | "tunnel"
  | "covered"
  | "embankment"
  | "cutting"
  | string;


interface GraphPoint {
  x: number;
  y: number;
  z: number;
}


interface GraphEdge {
  id: string;

  from: string;
  to: string;

  type: TrackType;

  structure: StructureType;

  length_m: number;

  points: GraphPoint[];

  source_way_ids: string[];

  properties: {
    name: string | null;
    operator: string | null;

    gauge: string | null;
    voltage: string | null;

    electrified: string | null;

    bridge: string | null;
    tunnel: string | null;
    covered: string | null;

    layer: string | null;

    embankment: string | null;
    cutting: string | null;
  };
}


interface GraphData {

  coordinate_system: {
    x: string;
    y: string;
    z: string;
    unit: string;
  };

  origin: {
    epsg: number;
    utm_x: number;
    utm_z: number;
  };

  nodes: unknown[];

  edges: GraphEdge[];
}


// ============================================================
// KONFIGURATION
// ============================================================

// Wir verschieben die realen Höhen nur für Babylon.
//
// Beispiel:
//
// reale Höhe 180 m
// -> Babylon Y = 0
//
// reale Höhe 220 m
// -> Babylon Y = 40
//
const WORLD_BASE_HEIGHT = 180;


// Vertikale Überhöhung.
//
// 1.0 = echte Höhen
//
// Wenn Kassels Relief aus großer Entfernung zu flach wirkt,
// kannst du testweise z.B. 1.5 verwenden.
//
// Für die eigentliche Simulation später wieder 1.0.
const HEIGHT_SCALE = 1.0;


// Spurweite als Fallback in Metern.
const DEFAULT_GAUGE = 1.435;


// ============================================================
// HTML
// ============================================================

document.querySelector<HTMLDivElement>(
  "#app"
)!.innerHTML = `

  <canvas id="renderCanvas"></canvas>

  <div id="info">

    <strong>
      Kassel Tram Simulator
    </strong>

    <span id="status">
      Lade 3D-Gleisnetz...
    </span>

    <span class="help">
      WASD = bewegen
      · Maus = umsehen
      · Shift = schneller
    </span>

  </div>

`;


// ============================================================
// CANVAS
// ============================================================

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#renderCanvas"
  )!;


// ============================================================
// ENGINE + SCENE
// ============================================================

const engine =
  new Engine(
    canvas,
    true
  );


const scene =
  new Scene(
    engine
  );


scene.clearColor =
  new Color4(
    0.55,
    0.72,
    0.9,
    1
  );


// ============================================================
// KAMERA
// ============================================================

const camera =
  new FreeCamera(
    "camera",

    new Vector3(
      -4000,
      350,
      3000
    ),

    scene
  );


// Erstmal Richtung Boden / Innenstadt schauen.
camera.setTarget(
  new Vector3(
    -4000,
    0,
    3000
  )
);


camera.attachControl(
  canvas,
  true
);


camera.minZ = 0.1;

camera.maxZ = 100000;


// Normale Geschwindigkeit
camera.speed = 60;


// Maus-Empfindlichkeit
camera.angularSensibility = 3000;


// WASD
camera.keysUp = [87];

camera.keysDown = [83];

camera.keysLeft = [65];

camera.keysRight = [68];


// ============================================================
// SHIFT = SCHNELLER FLIEGEN
// ============================================================

let shiftPressed = false;


window.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Shift"
    ) {

      shiftPressed = true;

      camera.speed = 250;
    }

  }
);


window.addEventListener(
  "keyup",
  event => {

    if (
      event.key === "Shift"
    ) {

      shiftPressed = false;

      camera.speed = 60;
    }

  }
);


// ============================================================
// LICHT
// ============================================================

const light =
  new HemisphericLight(
    "light",
    new Vector3(
      0,
      1,
      0
    ),
    scene
  );


light.intensity = 1.0;


// ============================================================
// BODEN
// ============================================================
//
// Der Boden ist momentan nur eine Orientierungsebene.
//
// Er folgt NOCH NICHT dem DGM.
// Das echte Terrain kommt später.
//

const ground =
  MeshBuilder.CreateGround(
    "ground",
    {
      width: 30000,
      height: 25000
    },
    scene
  );


ground.position.y =
  (
    140
    - WORLD_BASE_HEIGHT
  )
  * HEIGHT_SCALE;


const groundMaterial =
  new StandardMaterial(
    "groundMaterial",
    scene
  );


groundMaterial.diffuseColor =
  new Color3(
    0.16,
    0.23,
    0.12
  );


groundMaterial.specularColor =
  new Color3(
    0,
    0,
    0
  );


ground.material =
  groundMaterial;


// ============================================================
// FARBEN
// ============================================================

function getTrackColor(
  type: TrackType,
  structure: StructureType
): Color3 {

  // Bauwerke bewusst hervorheben,
  // damit wir Problemstellen visuell erkennen können.

  if (
    structure === "bridge"
  ) {

    return new Color3(
      1,
      0.75,
      0.1
    );

  }


  if (
    structure === "tunnel"
  ) {

    return new Color3(
      0.8,
      0.2,
      0.9
    );

  }


  if (
    structure === "covered"
  ) {

    return new Color3(
      0.2,
      0.9,
      0.9
    );

  }


  switch (type) {

    case "tram":

      return new Color3(
        0.95,
        0.95,
        0.95
      );


    case "light_rail":

      return new Color3(
        0.3,
        0.5,
        1
      );


    case "rail_600v":

      return new Color3(
        1,
        0.45,
        0.1
      );

  }

}


// ============================================================
// JSON LADEN
// ============================================================

async function loadGraph():
Promise<GraphData> {

  const response =
    await fetch(
      "/data/graph_3d.json"
    );


  if (!response.ok) {

    throw new Error(
      "graph_3d.json konnte "
      + "nicht geladen werden: "
      + response.status
    );

  }


  return (
    await response.json()
  ) as GraphData;

}


// ============================================================
// JSON-PUNKT -> BABYLON-PUNKT
// ============================================================

function toBabylonPoint(
  point: GraphPoint
): Vector3 {

  return new Vector3(

    point.x,

    (
      point.y
      - WORLD_BASE_HEIGHT
    )
    * HEIGHT_SCALE,

    point.z

  );

}


// ============================================================
// PARALLELE SCHIENEN BERECHNEN
//
// Wichtig:
//
// Die Schienen liegen jetzt in echtem 3D.
//
// Für die seitliche Verschiebung verwenden wir vorerst
// nur X/Z.
//
// Das reicht für die Visualisierung.
// Später bauen wir ein echtes 3D-Frenet-System für
// geneigte Gleise.
// ============================================================

function createParallelRails(
  centerPoints: Vector3[],
  gauge: number
) {

  const left: Vector3[] = [];

  const right: Vector3[] = [];


  const halfGauge =
    gauge / 2;


  for (
    let i = 0;
    i < centerPoints.length;
    i++
  ) {

    let direction:
      Vector3;


    if (
      i === 0
    ) {

      direction =
        centerPoints[1]
          .subtract(
            centerPoints[0]
          );

    }

    else if (
      i ===
      centerPoints.length - 1
    ) {

      direction =
        centerPoints[i]
          .subtract(
            centerPoints[i - 1]
          );

    }

    else {

      const before =
        centerPoints[i]
          .subtract(
            centerPoints[i - 1]
          );


      const after =
        centerPoints[i + 1]
          .subtract(
            centerPoints[i]
          );


      direction =
        before.add(
          after
        );

    }


    // Für Spurweite nur horizontale
    // Richtung verwenden.
    direction.y = 0;


    if (
      direction.lengthSquared()
      < 0.000001
    ) {

      direction =
        new Vector3(
          1,
          0,
          0
        );

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
      centerPoints[i]
        .add(
          offset
        )
    );


    right.push(
      centerPoints[i]
        .subtract(
          offset
        )
    );

  }


  return {
    left,
    right
  };

}


// ============================================================
// TRACK-NETZ
// ============================================================

async function createTrackNetwork() {

  const status =
    document.querySelector<HTMLSpanElement>(
      "#status"
    )!;


  const graph =
    await loadGraph();


  let totalPoints = 0;

  let bridges = 0;

  let tunnels = 0;

  let covered = 0;


  for (
    const edge of graph.edges
  ) {

    if (
      edge.points.length < 2
    ) {

      continue;

    }


    totalPoints +=
      edge.points.length;


    if (
      edge.structure === "bridge"
    ) {

      bridges++;

    }


    if (
      edge.structure === "tunnel"
    ) {

      tunnels++;

    }


    if (
      edge.structure === "covered"
    ) {

      covered++;

    }


    const centerPoints =
      edge.points.map(
        toBabylonPoint
      );


    let gauge =
      DEFAULT_GAUGE;


    if (
      edge.properties.gauge
    ) {

      const parsedGauge =
        Number(
          edge.properties.gauge
        );


      if (
        Number.isFinite(
          parsedGauge
        )
      ) {

        gauge =
          parsedGauge
          / 1000;

      }

    }


    const {
      left,
      right
    } =
      createParallelRails(
        centerPoints,
        gauge
      );


    const color =
      getTrackColor(
        edge.type,
        edge.structure
      );


    const leftRail =
      MeshBuilder.CreateLines(
        `left-${edge.id}`,
        {
          points: left
        },
        scene
      );


    const rightRail =
      MeshBuilder.CreateLines(
        `right-${edge.id}`,
        {
          points: right
        },
        scene
      );


    leftRail.color =
      color;


    rightRail.color =
      color;

  }


  status.textContent =
    `${graph.edges.length} Edges`
    + ` · ${totalPoints} Punkte`
    + ` · ${bridges} Brücken`
    + ` · ${tunnels} Tunnel`
    + ` · ${covered} überdeckt`;


  console.log(
    "3D-Gleisgraph geladen:",
    graph
  );

}


// ============================================================
// LADEN
// ============================================================

createTrackNetwork()
  .catch(
    error => {

      console.error(
        error
      );


      const status =
        document.querySelector<HTMLSpanElement>(
          "#status"
        )!;


      status.textContent =
        "Fehler beim Laden "
        + "von graph_3d.json";

    }
  );


// ============================================================
// RENDER LOOP
// ============================================================

engine.runRenderLoop(
  () => {

    scene.render();

  }
);


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
  "resize",
  () => {

    engine.resize();

  }
);