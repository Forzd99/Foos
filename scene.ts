import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";
import "@babylonjs/loaders/STL";

export type TableMode = "leonhart" | "bonzini" | "tornado";

export type GameHandle = {
  scene: Scene;
  dispose: () => void;
};

const MODEL_URL = "/manus-storage/Foosball_Table_web_1480062b.gltf";
const DEMO_MODE = new URLSearchParams(window.location.search).has("demo");

/**
 * Per-table player figure calibration.
 *
 * Each source STL was authored in its own local coordinate frame (units, "up" axis
 * and centring all differ). These numbers were derived directly from the vertex
 * data of the three supplied STL files rather than guessed:
 *
 *  - Leonhart: local X/Y centred on 0, local Z runs 0.11..117.86 -> Z is "up".
 *    Needs a -90 deg rotation around X to map local Z onto Babylon's world Y (up).
 *  - Bonzini: local X/Z centred on 0, local Y runs ~0..110.58 -> Y is ALREADY "up".
 *    No rotation should be applied (rotating this one further tips it onto its side,
 *    which is exactly the "crooked figure" bug the previous build had).
 *  - Tornado: local Y runs 76.7..179.3 (also the "up" axis) but the whole mesh is
 *    NOT centred on the origin (it sits at local X~126, Y~144, Z~8, a leftover from
 *    whatever scene it was originally scanned/exported in). It needs the same
 *    "no extra rotation" treatment as Bonzini, plus a position correction to bring
 *    its centre back onto the rod axis.
 *
 * scale is chosen so every table's player stands roughly the same in-scene height
 * (~1.18 units), and offsetY places the model's mid-height (approx. hip/mount level)
 * at the rod's pivot instead of the model's raw local origin.
 */
type TableProfile = {
  label: string;
  player: string;
  cabinet: string;
  rim: string;
  accent: string;
  team: string;
  opponent: string;
  field: string;
  /** Rotation around local X to convert the STL's "up" axis into Babylon's Y-up. */
  rotX: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  /** Yaw (radians) applied so the figure faces the ball instead of side-on. */
  facing: number;
};

const TABLE_PROFILES: Record<TableMode, TableProfile> = {
  leonhart: {
    label: "Leonhart ITSF",
    player: "/manus-storage/leonhart-player.stl",
    cabinet: "#E8E8E2",
    rim: "#111517",
    accent: "#83F13A",
    team: "#F1F3E8",
    opponent: "#13181A",
    field: "#0B4B38",
    rotX: -Math.PI / 2,
    scale: 0.01,
    offsetX: 0,
    offsetY: -0.59,
    offsetZ: 0,
    facing: (Math.PI * 70) / 180,
  },
  bonzini: {
    label: "Bonzini Classic",
    player: "/manus-storage/bonzini-player.stl",
    cabinet: "#C89558",
    rim: "#B72D24",
    accent: "#B72D24",
    team: "#2C63B4",
    opponent: "#C92D24",
    field: "#0B4B38",
    rotX: 0,
    scale: 0.01065,
    offsetX: -0.005,
    offsetY: -0.589,
    offsetZ: -0.018,
    facing: (Math.PI * 70) / 180,
  },
  tornado: {
    label: "Tornado Power",
    player: "/manus-storage/tornado-player.stl",
    cabinet: "#171A1D",
    rim: "#F5D21F",
    accent: "#F5D21F",
    team: "#F5D21F",
    opponent: "#111517",
    field: "#111B17",
    rotX: 0,
    scale: 0.01148,
    offsetX: -1.451,
    offsetY: -1.4695,
    offsetZ: -0.097,
    facing: (Math.PI * 70) / 180,
  },
};

export function getTableMode(): TableMode {
  const requested = new URLSearchParams(window.location.search).get("table");
  return requested === "bonzini" || requested === "tornado" ? requested : "leonhart";
}

const COLORS = {
  ink: new Color3(0.025, 0.075, 0.12),
  feltLine: new Color3(0.23, 0.84, 0.79),
  brass: new Color3(0.74, 0.45, 0.12),
  steel: new Color3(0.35, 0.45, 0.48),
  ball: new Color3(1.0, 0.36, 0.08),
  skin: new Color3(0.73, 0.55, 0.4),
  cyan: new Color3(0.05, 0.92, 0.88),
};

function mat(scene: Scene, name: string, color: Color3, metallic = 0.0, roughness = 0.45) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(metallic, metallic, metallic);
  material.roughness = roughness;
  return material;
}

function hexMat(scene: Scene, name: string, hex: string, metallic = 0.1, roughness = 0.5) {
  return mat(scene, name, Color3.FromHexString(hex), metallic, roughness);
}

function box(scene: Scene, name: string, size: { width: number; height: number; depth: number }, position: Vector3, material: StandardMaterial) {
  const mesh = MeshBuilder.CreateBox(name, size, scene);
  mesh.position.copyFrom(position);
  mesh.material = material;
  return mesh;
}

function cylinder(scene: Scene, name: string, diameter: number, height: number, position: Vector3, material: StandardMaterial, rotation?: Vector3) {
  const mesh = MeshBuilder.CreateCylinder(name, { diameter, height, tessellation: 24 }, scene);
  mesh.position.copyFrom(position);
  if (rotation) mesh.rotation.copyFrom(rotation);
  mesh.material = material;
  return mesh;
}

function sphere(scene: Scene, name: string, diameter: number, position: Vector3, material: StandardMaterial) {
  const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 20 }, scene);
  mesh.position.copyFrom(position);
  mesh.material = material;
  return mesh;
}

/** Loads the profile's player STL once and returns a disabled template mesh to clone from. */
async function loadPlayerTemplate(scene: Scene, profile: TableProfile): Promise<Mesh | null> {
  try {
    const imported = await SceneLoader.ImportMeshAsync("", "", profile.player, scene, undefined, ".stl");
    const template = imported.meshes.find((m) => m.getTotalVertices() > 0) as Mesh | undefined;
    if (!template) throw new Error("STL contained no renderable mesh");
    template.setEnabled(false);
    template.isPickable = false;
    return template;
  } catch (error) {
    console.warn(`Player model for "${profile.label}" could not load; using fallback silhouette.`, error);
    return null;
  }
}

let skinMaterial: StandardMaterial | null = null;
function skinMat(scene: Scene) {
  if (!skinMaterial) skinMaterial = mat(scene, "skin", COLORS.skin, 0.0, 0.5);
  return skinMaterial;
}

function createFallbackFigure(scene: Scene, parent: TransformNode, primary: StandardMaterial, accent: StandardMaterial) {
  const player = new TransformNode("player-fallback", scene);
  player.parent = parent;
  sphere(scene, "fallback-head", 0.25, new Vector3(0, 0.54, 0), skinMat(scene)).parent = player;
  box(scene, "fallback-body", { width: 0.22, height: 0.58, depth: 0.22 }, new Vector3(0, 0.16, 0), primary).parent = player;
  box(scene, "fallback-foot", { width: 0.28, height: 0.1, depth: 0.36 }, new Vector3(0, -0.17, 0), primary).parent = player;
  cylinder(scene, "fallback-badge", 0.1, 0.025, new Vector3(0, 0.28, -0.18), accent, new Vector3(Math.PI / 2, 0, 0)).parent = player;
}

function createPlayerRows(
  scene: Scene,
  profile: TableProfile,
  template: Mesh | null,
  materials: Record<string, StandardMaterial>,
) {
  const root = new TransformNode("player-rows", scene);
  const rows = [
    { x: -3.0, count: 3, side: "left" as const },
    { x: -1.55, count: 2, side: "left" as const },
    { x: 0.0, count: 5, side: "left" as const },
    { x: 1.55, count: 2, side: "right" as const },
    { x: 3.0, count: 3, side: "right" as const },
  ];
  rows.forEach((row, index) => {
    const rod = cylinder(scene, `rod-${index}`, 0.065, 5.95, new Vector3(row.x, 1.43, 0), materials.steel, new Vector3(Math.PI / 2, 0, 0));
    rod.parent = root;
    const rodCap = cylinder(scene, `rod-cap-${index}`, 0.18, 0.22, new Vector3(row.x, 1.43, 2.97), materials.brass, new Vector3(Math.PI / 2, 0, 0));
    rodCap.parent = root;
    const gap = row.count === 1 ? 0 : 3.7 / (row.count - 1);
    const teamMaterial = row.side === "left" ? materials.team : materials.opponent;
    for (let i = 0; i < row.count; i++) {
      const z = row.count === 1 ? 0 : -1.85 + gap * i;
      const facingSign = row.side === "left" ? 1 : -1;

      const pivot = new TransformNode(`player-pivot-${index}-${i}`, scene);
      pivot.parent = root;
      pivot.position = new Vector3(row.x, 1.18, z);

      const yaw = new TransformNode(`player-yaw-${index}-${i}`, scene);
      yaw.parent = pivot;
      yaw.rotation.y = facingSign === 1 ? -profile.facing : profile.facing;

      if (template) {
        const clone = template.clone(`player-stl-${index}-${i}`, yaw) as Mesh;
        clone.setEnabled(true);
        clone.position = new Vector3(profile.offsetX, profile.offsetY, profile.offsetZ);
        clone.rotation = new Vector3(profile.rotX, 0, 0);
        clone.scaling = new Vector3(profile.scale, profile.scale, profile.scale);
        clone.material = teamMaterial;
      } else {
        createFallbackFigure(scene, yaw, teamMaterial, materials.brass);
      }
    }
  });
  return root;
}

function createTable(scene: Scene, materials: Record<string, StandardMaterial>) {
  const root = new TransformNode("arena-table", scene);
  box(scene, "pitch", { width: 8.2, height: 0.24, depth: 4.8 }, new Vector3(0, 1.0, 0), materials.field).parent = root;
  box(scene, "rail-front", { width: 9.2, height: 0.65, depth: 0.32 }, new Vector3(0, 1.38, -2.58), materials.cabinet).parent = root;
  box(scene, "rail-back", { width: 9.2, height: 0.65, depth: 0.32 }, new Vector3(0, 1.38, 2.58), materials.cabinet).parent = root;
  box(scene, "rail-left", { width: 0.32, height: 0.65, depth: 5.0 }, new Vector3(-4.44, 1.38, 0), materials.cabinet).parent = root;
  box(scene, "rail-right", { width: 0.32, height: 0.65, depth: 5.0 }, new Vector3(4.44, 1.38, 0), materials.cabinet).parent = root;
  box(scene, "center-line", { width: 0.025, height: 0.012, depth: 4.35 }, new Vector3(0, 1.135, 0), materials.feltLine).parent = root;
  box(scene, "line-top", { width: 8.0, height: 0.012, depth: 0.025 }, new Vector3(0, 1.135, 2.08), materials.feltLine).parent = root;
  box(scene, "line-bottom", { width: 8.0, height: 0.012, depth: 0.025 }, new Vector3(0, 1.135, -2.08), materials.feltLine).parent = root;
  box(scene, "goal-left", { width: 0.14, height: 0.48, depth: 1.25 }, new Vector3(-4.25, 1.36, 0), materials.ink).parent = root;
  box(scene, "goal-right", { width: 0.14, height: 0.48, depth: 1.25 }, new Vector3(4.25, 1.36, 0), materials.ink).parent = root;
  [-1, 1].forEach((x) => [-1, 1].forEach((z) => {
    box(scene, "leg", { width: 0.45, height: 2.25, depth: 0.45 }, new Vector3(x * 3.65, -0.18, z * 1.85), materials.rim).parent = root;
  }));
  return root;
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const tableMode = getTableMode();
  const profile = TABLE_PROFILES[tableMode];

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.015, 0.035, 0.07, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.015;
  scene.fogColor = new Color3(0.015, 0.035, 0.07);

  const camera = new ArcRotateCamera("camera", -1.06, 0.92, 12.5, new Vector3(0, 0.85, 0), scene);
  camera.lowerRadiusLimit = 8.5;
  camera.upperRadiusLimit = 18;
  camera.lowerBetaLimit = 0.48;
  camera.upperBetaLimit = 1.35;
  camera.attachControl(canvas, true);
  camera.wheelPrecision = 80;
  camera.panningSensibility = 0;

  const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.65;
  hemi.diffuse = new Color3(0.45, 0.74, 0.77);
  const key = new DirectionalLight("key", new Vector3(-0.5, -1, 0.4), scene);
  key.position = new Vector3(4, 10, -5);
  key.intensity = 1.8;

  const materials: Record<string, StandardMaterial> = {
    ink: mat(scene, "ink", COLORS.ink, 0.05, 0.58),
    feltLine: mat(scene, "felt-line", COLORS.feltLine, 0.1, 0.38),
    brass: mat(scene, "brass", COLORS.brass, 0.8, 0.24),
    steel: mat(scene, "steel", COLORS.steel, 0.9, 0.22),
    ball: mat(scene, "ball", COLORS.ball, 0.2, 0.25),
    cyan: mat(scene, "cyan", COLORS.cyan, 0.45, 0.2),
    cabinet: hexMat(scene, "cabinet", profile.cabinet, 0.15, 0.55),
    rim: hexMat(scene, "rim", profile.rim, 0.3, 0.45),
    field: hexMat(scene, "field", profile.field, 0.0, 0.9),
    team: hexMat(scene, "team", profile.team, 0.1, 0.4),
    opponent: hexMat(scene, "opponent", profile.opponent, 0.1, 0.4),
  };

  const table = createTable(scene, materials);
  const playerTemplate = await loadPlayerTemplate(scene, profile);
  const playerRoot = createPlayerRows(scene, profile, playerTemplate, materials);
  const ball = sphere(scene, "ball", 0.28, new Vector3(0, 1.42, 0), materials.ball);
  const ballGlow = sphere(scene, "ball-glow", 0.42, new Vector3(0, 1.42, 0), materials.cyan);
  ballGlow.visibility = 0.08;

  const floor = box(scene, "floor", { width: 23, height: 0.15, depth: 18 }, new Vector3(0, -1.32, 0), materials.ink);
  floor.isPickable = false;
  const grid = box(scene, "grid-strip", { width: 0.018, height: 0.018, depth: 15 }, new Vector3(0, -1.225, 0), materials.cyan);
  grid.visibility = 0.13;

  // Load the supplied glTF in the background as a fidelity reference. The playable arena remains
  // procedural so controls stay deterministic even if a slow texture is pending.
  try {
    const imported = await SceneLoader.ImportMeshAsync(null, "", MODEL_URL, scene);
    const importedRoot = new TransformNode("supplied-source-model", scene);
    imported.transformNodes.filter((node) => !node.parent).forEach((node) => { node.parent = importedRoot; });
    imported.meshes.filter((mesh) => !mesh.parent).forEach((mesh) => { mesh.parent = importedRoot; });
    importedRoot.scaling = new Vector3(0.01, 0.01, 0.01);
    importedRoot.position = new Vector3(0, -1.32, 0);
    importedRoot.setEnabled(false);
    importedRoot.metadata = { role: "source-model", note: "Supplied Foosball_Table.gltf; procedural arena is the interactive replacement." };
  } catch (error) {
    console.warn("Supplied glTF was not loaded; keeping procedural arena", error);
  }

  let leftScore = 0;
  let rightScore = 0;
  let velocity = new Vector3(0.032, 0, 0.018);
  let lastTime = performance.now();
  let disposed = false;
  const rods = [
    { x: -3.0, offset: 0 }, { x: -1.55, offset: 0.5 }, { x: 0, offset: -0.25 }, { x: 1.55, offset: -0.65 }, { x: 3.0, offset: 0.4 },
  ];
  let rodOffset = 0;

  const reset = () => {
    leftScore = 0;
    rightScore = 0;
    ball.position.x = 0;
    ball.position.z = 0;
    velocity = new Vector3(0.032, 0, 0.018);
    window.dispatchEvent(new CustomEvent("foosball:score", { detail: { left: leftScore, right: rightScore, last: "RESET" } }));
  };
  const kick = () => {
    const direction = velocity.x >= 0 ? 1 : -1;
    velocity.x = direction * Math.min(0.11, Math.max(0.042, Math.abs(velocity.x) + 0.018));
    velocity.z += (Math.random() - 0.5) * 0.034;
  };
  const onReset = () => reset();
  const onKick = () => kick();
  const onRod = (event: Event) => { rodOffset += (event as CustomEvent<{ delta?: number }>).detail?.delta ?? 0; };
  window.addEventListener("foosball:reset", onReset);
  window.addEventListener("foosball:kick", onKick);
  window.addEventListener("foosball:rod", onRod);

  const keyDown = (event: KeyboardEvent) => {
    if (event.code === "Space") { event.preventDefault(); kick(); }
    if (event.key.toLowerCase() === "r") reset();
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") rodOffset = Math.min(1.2, rodOffset + 0.18);
    if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") rodOffset = Math.max(-1.2, rodOffset - 0.18);
  };
  window.addEventListener("keydown", keyDown);

  scene.onBeforeRenderObservable.add(() => {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min(2.2, (now - lastTime) / 16.67);
    lastTime = now;
    if (DEMO_MODE) rodOffset = Math.sin(now / 600) * 0.82;
    ball.position.x += velocity.x * dt;
    ball.position.z += velocity.z * dt;
    if (Math.abs(ball.position.z) > 2.15) {
      ball.position.z = Math.sign(ball.position.z) * 2.15;
      velocity.z *= -1;
    }
    if (Math.abs(ball.position.x) > 4.15) {
      const scoredLeft = ball.position.x > 0;
      if (scoredLeft) leftScore += 1; else rightScore += 1;
      window.dispatchEvent(new CustomEvent("foosball:score", { detail: { left: leftScore, right: rightScore, last: scoredLeft ? "LEFT POINT" : "RIGHT POINT" } }));
      ball.position.x = 0;
      ball.position.z = 0;
      velocity = new Vector3((scoredLeft ? -1 : 1) * 0.032, 0, (Math.random() - 0.5) * 0.042);
    }
    rods.forEach((rod, index) => {
      const nodes = playerRoot.getChildTransformNodes().filter((node) => node.name.includes(`rod-${index}`));
      nodes.forEach((node) => { node.rotation.x = rodOffset * 0.5 + rod.offset; });
    });
    ballGlow.position.copyFrom(ball.position);
    ball.rotation.y += 0.05 * dt;
  });

  return {
    scene,
    dispose: () => {
      disposed = true;
      window.removeEventListener("foosball:reset", onReset);
      window.removeEventListener("foosball:kick", onKick);
      window.removeEventListener("foosball:rod", onRod);
      window.removeEventListener("keydown", keyDown);
      scene.dispose();
    },
  };
}

export { TABLE_PROFILES };
