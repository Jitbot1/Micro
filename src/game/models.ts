import * as THREE from 'three';
import { ProceduralTextures } from './textures';
import { RoadPickupKind } from './types';

export interface BusRig {
  root: THREE.Group;
  bodyTilt: THREE.Group;
  steeringWheel: THREE.Object3D;
  wheels: THREE.Object3D[];
  brakeLights: THREE.MeshStandardMaterial;
  rearArtGroup: THREE.Group;
  turretGroup?: THREE.Group;
  muzzleFlash?: THREE.Mesh;
  primaryMat?: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  secondaryMat?: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  stripeMat?: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  stickerMeshes?: THREE.Mesh[];
}

export interface PoliceRig {
  root: THREE.Group;
  bodyTilt: THREE.Group;
  wheels: THREE.Object3D[];
  redBeaconMat: THREE.MeshStandardMaterial;
  blueBeaconMat: THREE.MeshStandardMaterial;
  redLight: THREE.PointLight;
  blueLight: THREE.PointLight;
}

export interface CowRig {
  root: THREE.Group;
  legs: THREE.Object3D[];
  head: THREE.Object3D;
  tail: THREE.Object3D;
}

export interface DogRig {
  root: THREE.Group;
  legs: THREE.Object3D[];
  tail: THREE.Object3D;
}

export interface PedestrianRig {
  root: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
}

export interface VendorRig {
  root: THREE.Group;
  ped: PedestrianRig;
  cartWheels: THREE.Object3D[];
}

export interface FallingTreeRig {
  root: THREE.Group;
  hinge: THREE.Group;
}

export interface CaimanRig {
  root: THREE.Group;
  body: THREE.Group;
  tail: THREE.Group;
  jaw: THREE.Group;
}

export interface RuinPillarRig {
  root: THREE.Group;
  column: THREE.Group;
}

function addContactShadow(
  parent: THREE.Object3D,
  tex: THREE.Texture,
  width: number,
  depth: number,
  opacity = 0.52,
): void {
  const geo = new THREE.PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(geo, mat);
  shadow.position.y = 0.025;
  shadow.renderOrder = 1;
  parent.add(shadow);
}

/**
 * Warm Santa Cruz Tropical Sky Dome with Sun Disc & Horizon Haze
 */
export function createSkyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(290, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(0x1d6fa5) },
      uMidColor: { value: new THREE.Color(0x7cc4e8) },
      uHorizonColor: { value: new THREE.Color(0xf6cf88) },
      uSunDir: { value: new THREE.Vector3(0.42, 0.36, -0.83).normalize() },
      uSunColor: { value: new THREE.Color(0xfffbeb) },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      varying vec3 vWorldDir;

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 sky = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
        sky = mix(sky, uTopColor, smoothstep(0.24, 0.88, h));

        float sunAmt = max(dot(dir, uSunDir), 0.0);
        float sunGlow = pow(sunAmt, 12.0) * 0.42;
        float sunCore = smoothstep(0.9965, 0.9992, sunAmt) * 1.1;
        sky += uSunColor * (sunGlow + sunCore);

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.renderOrder = -1;
  return dome;
}

function createWheel(radius: number, width: number, rimColor = 0xd1d5db): THREE.Group {
  const wheel = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.86,
    metalness: 0.06,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  wheel.add(tire);

  // Dark inner barrel / brake rotor silhouette
  const rotorGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.01, 16);
  rotorGeo.rotateZ(Math.PI / 2);
  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.45,
    metalness: 0.72,
  });
  wheel.add(new THREE.Mesh(rotorGeo, rotorMat));

  // Alloy outer lip ring
  const lipGeo = new THREE.TorusGeometry(radius * 0.56, radius * 0.055, 8, 18);
  lipGeo.rotateY(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.22,
    metalness: 0.88,
  });
  for (const side of [-1, 1]) {
    const lip = new THREE.Mesh(lipGeo, rimMat);
    lip.position.x = side * (width * 0.46);
    wheel.add(lip);
  }

  // 5-spoke star alloy pattern on both sides
  const spokeGeo = new THREE.BoxGeometry(width + 0.025, radius * 1.05, radius * 0.13);
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(spokeGeo, rimMat);
    spoke.rotation.x = (i / 5) * Math.PI;
    wheel.add(spoke);
  }

  const capGeo = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.04, 10);
  capGeo.rotateZ(Math.PI / 2);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.35,
    metalness: 0.75,
  });
  wheel.add(new THREE.Mesh(capGeo, capMat));
  return wheel;
}

/**
 * Helper to extrude a realistic 2D automotive side silhouette (X: -front to +rear, Y: height)
 * centered on X=0 with front pointing toward -Z.
 */
function extrudeCarProfile(points: [number, number][], width: number, bevel = 0.06): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    steps: 1,
  });
  geo.translate(0, 0, -(width - bevel * 2) / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Authentic battered Santa Cruz Micro (Línea 18) with First-Person Driver Cockpit
 */
export function createSantaCruzMicro(textures: ProceduralTextures): BusRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 3.1, 7.6, 0.62);

  const bodyTilt = new THREE.Group();
  root.add(bodyTilt);

  const greenMat = new THREE.MeshPhysicalMaterial({
    color: 0x059669,
    roughness: 0.38,
    metalness: 0.16,
    clearcoat: 0.55,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.25,
  });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.58 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.48 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.24, metalness: 0.85 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.78, metalness: 0.25 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.15,
    opacity: 0.78,
    transparent: true,
  });
  const clearWindshieldMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    opacity: 0.22,
    transparent: true,
    depthWrite: false,
  });

  // 1. Heavy steel chassis & step bumper
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.34, 6.75), darkMetalMat);
  chassis.position.set(0, 0.48, 0);
  chassis.castShadow = true;
  bodyTilt.add(chassis);

  // 2. Lower hull
  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(2.38, 1.05, 6.85), greenMat);
  lowerHull.position.set(0, 1.12, 0.05);
  lowerHull.castShadow = true;
  lowerHull.receiveShadow = true;
  bodyTilt.add(lowerHull);

  // Side livery panels ("LÍNEA 18 · SANTA CRUZ")
  const sideLiveryMat = new THREE.MeshStandardMaterial({ map: textures.microSide, roughness: 0.45 });
  const leftSide = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 0.98), sideLiveryMat);
  leftSide.rotation.y = -Math.PI / 2;
  leftSide.position.set(-1.2, 1.12, 0.05);
  bodyTilt.add(leftSide);

  const rightSide = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 0.98), sideLiveryMat);
  rightSide.rotation.y = Math.PI / 2;
  rightSide.position.set(1.2, 1.12, 0.05);
  bodyTilt.add(rightSide);

  // 3. Sculpted classic rounded-nose Micro front hood & grille (-Z)
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.92, 0.65), greenMat);
  nose.position.set(0, 1.04, -3.48);
  nose.castShadow = true;
  bodyTilt.add(nose);

  const noseStripe = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.22, 0.67), redMat);
  noseStripe.position.set(0, 1.38, -3.48);
  bodyTilt.add(noseStripe);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.48, 0.08), chromeMat);
  grille.position.set(0, 0.95, -3.82);
  bodyTilt.add(grille);

  // 4. Rear Artwork Group ("LÍNEA 18 / LOS POZOS · LA RAMADA")
  const rearArtGroup = new THREE.Group();
  const rearBack = new THREE.Mesh(new THREE.BoxGeometry(2.34, 2.15, 0.14), greenMat);
  rearBack.position.set(0, 1.75, 3.44);
  rearArtGroup.add(rearBack);

  const rearPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.26, 2.08),
    new THREE.MeshStandardMaterial({ map: textures.microRear, roughness: 0.48 }),
  );
  rearPanel.position.set(0, 1.75, 3.52);
  rearArtGroup.add(rearPanel);
  bodyTilt.add(rearArtGroup);

  // 5. Open Cabin Window Belt (built with distinct pillars + roof so 1st-person driver view sees right through!)
  // Side window frames & glass
  for (const sx of [-1.16, 1.16]) {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.84, 5.95), glassMat);
    sideGlass.position.set(sx, 2.16, 0.15);
    bodyTilt.add(sideGlass);
  }

  // Corner & side window pillars
  for (const pz of [-2.95, -1.6, -0.25, 1.1, 2.45, 3.4]) {
    for (const sx of [-1.15, 1.15]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.14), creamMat);
      pillar.position.set(sx, 2.16, pz);
      bodyTilt.add(pillar);
    }
  }

  // Center windshield divider + clear front windshield + painted "18" sticker
  const centerMullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.96, 0.08), darkMetalMat);
  centerMullion.position.set(0, 2.14, -3.22);
  centerMullion.rotation.x = -0.18;
  bodyTilt.add(centerMullion);

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.9), clearWindshieldMat);
  windshield.position.set(0, 2.14, -3.24);
  windshield.rotation.x = -0.18;
  windshield.rotation.y = Math.PI;
  bodyTilt.add(windshield);

  const wsSticker = new THREE.Mesh(
    new THREE.PlaneGeometry(2.14, 0.86),
    new THREE.MeshBasicMaterial({
      map: textures.windshieldSticker,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  wsSticker.position.set(0, 2.14, -3.23);
  wsSticker.rotation.x = -0.18;
  bodyTilt.add(wsSticker);

  // Curb-side folding passenger door (+X)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 0.9), redMat);
  door.position.set(1.2, 1.45, -2.35);
  bodyTilt.add(door);

  // 6. First-Person Driver Cockpit (Dashboard & Turning Steering Wheel)
  const dash = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.42, 0.55), darkMetalMat);
  dash.position.set(0, 1.56, -2.95);
  bodyTilt.add(dash);

  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(-0.56, 1.72, -2.65);
  steeringWheel.rotation.x = -0.55;
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.032, 8, 20), darkMetalMat);
  steeringWheel.add(wheelRim);
  const spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.03), chromeMat);
  steeringWheel.add(spokeH);
  const spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.03), darkMetalMat);
  spokeV.position.y = -0.12;
  steeringWheel.add(spokeV);
  bodyTilt.add(steeringWheel);

  // 7. Roof Crown + Illuminated Route Signboard ("18 LOS POZOS") + Battered Roof Rack
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.22, 6.72), creamMat);
  roof.position.set(0, 2.74, 0.12);
  roof.castShadow = true;
  bodyTilt.add(roof);

  const routeMat = new THREE.MeshStandardMaterial({
    map: textures.microRouteBoard,
    emissive: 0xfef3c7,
    emissiveMap: textures.microRouteBoard,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });
  const frontRouteBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.76, 0.4, 0.22),
    [creamMat, creamMat, creamMat, creamMat, routeMat, routeMat],
  );
  frontRouteBox.position.set(0, 2.94, -3.08);
  bodyTilt.add(frontRouteBox);

  // Roof rack + spare tire + tarp bundle
  const rack = new THREE.Group();
  rack.position.set(0, 2.88, 0.6);
  const railLong = new THREE.CylinderGeometry(0.03, 0.03, 4.1, 8);
  railLong.rotateX(Math.PI / 2);
  for (const sx of [-0.92, 0.92]) {
    const r = new THREE.Mesh(railLong, chromeMat);
    r.position.set(sx, 0.16, 0);
    rack.add(r);
  }
  const tarp = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.36, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.82 }),
  );
  tarp.position.set(-0.12, 0.18, -0.6);
  rack.add(tarp);

  const spare = createWheel(0.36, 0.22);
  spare.rotation.z = Math.PI / 2;
  spare.position.set(0.35, 0.14, 1.1);
  rack.add(spare);
  bodyTilt.add(rack);

  // 8. Front & Rear Bumpers + Lights + Mirrors
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.26, 0.24), darkMetalMat);
  frontBumper.position.set(0, 0.52, -3.82);
  bodyTilt.add(frontBumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.26, 0.24), darkMetalMat);
  rearBumper.position.set(0, 0.52, 3.55);
  bodyTilt.add(rearBumper);

  // Rear exhaust tailpipe
  const tailpipeGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 10);
  tailpipeGeo.rotateX(Math.PI / 2);
  const tailpipe = new THREE.Mesh(tailpipeGeo, chromeMat);
  tailpipe.position.set(-0.85, 0.38, 3.56);
  bodyTilt.add(tailpipe);

  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfde047,
    emissiveIntensity: 1.4,
  });
  const brakeLights = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x991b1b,
    emissiveIntensity: 0.8,
  });

  const hlGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12);
  hlGeo.rotateX(Math.PI / 2);
  for (const sx of [-0.88, 0.88]) {
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(sx, 0.9, -3.81);
    bodyTilt.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1), brakeLights);
    tl.position.set(sx * 1.02, 0.78, 3.52);
    bodyTilt.add(tl);
  }

  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.04), darkMetalMat);
    stalk.position.set(side * 1.32, 2.15, -3.18);
    bodyTilt.add(stalk);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.16), darkMetalMat);
    mirror.position.set(side * 1.45, 2.08, -3.18);
    bodyTilt.add(mirror);
  }

  // 9. Four Wheels
  const wheels: THREE.Object3D[] = [];
  for (const [wx, wy, wz] of [
    [-1.12, 0.45, -2.15],
    [1.12, 0.45, -2.15],
    [-1.12, 0.45, 1.95],
    [1.12, 0.45, 1.95],
  ] as [number, number, number][]) {
    const w = createWheel(0.45, 0.3);
    w.position.set(wx, wy, wz);
    root.add(w);
    wheels.push(w);
  }

  return {
    root,
    bodyTilt,
    steeringWheel,
    wheels,
    brakeLights,
    rearArtGroup,
    primaryMat: greenMat,
    secondaryMat: creamMat,
    stripeMat: redMat,
  };
}

/**
 * Realistic 3-Box Sedan / Taxi (ExtrudeGeometry silhouette, proper cabin, bumpers, headlights, 4 wheels)
 */
export function createSedan(
  textures: ProceduralTextures,
  colorHex: number,
  isTaxi = false,
): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.15, 4.7, 0.54);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    roughness: 0.26,
    metalness: 0.28,
    clearcoat: 0.9,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.35,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.2,
    clearcoat: 1.0,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72 });

  // Realistic 3-box sedan profile: hood -> windshield -> roof -> rear window -> trunk
  const hullGeo = extrudeCarProfile(
    [
      [-2.18, 0.28],
      [-2.18, 0.76],
      [-1.18, 0.88],
      [-0.52, 1.42],
      [0.72, 1.42],
      [1.42, 0.92],
      [2.12, 0.86],
      [2.16, 0.3],
    ],
    1.78,
    0.06,
  );
  const hull = new THREE.Mesh(hullGeo, bodyMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  root.add(hull);

  // Recessed side window belt & front/rear windshields
  const cabinGlassGeo = extrudeCarProfile(
    [
      [-1.08, 0.9],
      [-0.5, 1.36],
      [0.68, 1.36],
      [1.32, 0.92],
    ],
    1.8,
    0.01,
  );
  // Make side windows flush cleanly on cabin sides & windshields
  const sideGlass = new THREE.Mesh(cabinGlassGeo, glassMat);
  sideGlass.scale.set(1.01, 0.94, 0.92);
  root.add(sideGlass);

  // Bumpers & Grille
  const fBumper = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.2, 0.14), trimMat);
  fBumper.position.set(0, 0.38, -2.21);
  root.add(fBumper);

  const rBumper = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.2, 0.14), trimMat);
  rBumper.position.set(0, 0.38, 2.19);
  root.add(rBumper);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.08), trimMat);
  grille.position.set(0, 0.58, -2.21);
  root.add(grille);

  // Headlights & Tail Lights
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfde047, emissiveIntensity: 1.3 });
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.9 });
  for (const sx of [-0.66, 0.66]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), hlMat);
    hl.position.set(sx, 0.64, -2.2);
    root.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.08), tlMat);
    tl.position.set(sx, 0.72, 2.17);
    root.add(tl);
    // Side-view mirrors
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.12), trimMat);
    mirror.position.set(sx * 1.44, 0.98, -0.78);
    root.add(mirror);
  }

  // Taxi roof light sign
  if (isTaxi) {
    const taxiSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.18, 0.24),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.7,
      }),
    );
    taxiSign.position.set(0, 1.54, 0.05);
    root.add(taxiSign);
  }

  // 4 Wheels
  for (const [wx, wz] of [
    [-0.86, -1.34],
    [0.86, -1.34],
    [-0.86, 1.34],
    [0.86, 1.34],
  ]) {
    const w = createWheel(0.33, 0.2);
    w.position.set(wx, 0.33, wz);
    root.add(w);
  }

  return root;
}

/**
 * Realistic 2-Box Hatchback / Trufi (ExtrudeGeometry sloped hatchback + TRUFI roof placard)
 */
export function createTrufiHatchback(
  textures: ProceduralTextures,
  colorHex: number,
  isTrufi = true,
): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.0, 4.1, 0.52);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    roughness: 0.28,
    metalness: 0.24,
    clearcoat: 0.85,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.35,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, clearcoat: 1.0 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.75 });

  // Compact hatchback 2-box profile
  const hullGeo = extrudeCarProfile(
    [
      [-1.82, 0.26],
      [-1.82, 0.72],
      [-1.02, 0.84],
      [-0.45, 1.44],
      [1.05, 1.42],
      [1.76, 0.86],
      [1.78, 0.28],
    ],
    1.68,
    0.055,
  );
  const hull = new THREE.Mesh(hullGeo, bodyMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  root.add(hull);

  const glassGeo = extrudeCarProfile(
    [
      [-0.92, 0.88],
      [-0.42, 1.38],
      [0.98, 1.36],
      [1.64, 0.88],
    ],
    1.7,
    0.01,
  );
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.scale.set(1.01, 0.92, 0.9);
  root.add(glass);

  // Bumpers & lights
  const fBumper = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.18, 0.12), trimMat);
  fBumper.position.set(0, 0.35, -1.84);
  root.add(fBumper);
  const rBumper = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.18, 0.12), trimMat);
  rBumper.position.set(0, 0.35, 1.8);
  root.add(rBumper);

  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfde047, emissiveIntensity: 1.3 });
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.9 });
  for (const sx of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.08), hlMat);
    hl.position.set(sx, 0.62, -1.84);
    root.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), tlMat);
    tl.position.set(sx, 0.72, 1.79);
    root.add(tl);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.11), trimMat);
    mirror.position.set(sx * 1.48, 0.94, -0.66);
    root.add(mirror);
  }

  // Roof "TRUFI" placard
  if (isTrufi) {
    const signMat = new THREE.MeshStandardMaterial({
      map: textures.trufiSign,
      emissive: 0xfde047,
      emissiveMap: textures.trufiSign,
      emissiveIntensity: 0.35,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.24, 0.18), signMat);
    sign.position.set(0, 1.56, -0.1);
    root.add(sign);
  }

  for (const [wx, wz] of [
    [-0.8, -1.16],
    [0.8, -1.16],
    [-0.8, 1.14],
    [0.8, 1.14],
  ]) {
    const w = createWheel(0.31, 0.19);
    w.position.set(wx, 0.31, wz);
    root.add(w);
  }

  return root;
}

/**
 * Realistic Pickup Truck (cab + open rear cargo bed + tailgate + crates + 4 wheels)
 */
export function createPickupTruck(textures: ProceduralTextures, colorHex: number): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.3, 5.2, 0.56);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    roughness: 0.32,
    metalness: 0.25,
    clearcoat: 0.75,
    envMapIntensity: 1.3,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.12 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.78 });

  // Sculpted pickup silhouette (hood + cab + open bed walls)
  const hullGeo = extrudeCarProfile(
    [
      [-2.35, 0.34],
      [-2.35, 0.96],
      [-1.25, 1.08],
      [-0.65, 1.72],
      [0.35, 1.72],
      [0.42, 1.12],
      [2.32, 1.12],
      [2.34, 0.34],
    ],
    1.9,
    0.06,
  );
  const hull = new THREE.Mesh(hullGeo, bodyMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  root.add(hull);

  // Cab windows
  const cabGlassGeo = extrudeCarProfile(
    [
      [-1.15, 1.12],
      [-0.62, 1.64],
      [0.28, 1.64],
      [0.36, 1.14],
    ],
    1.92,
    0.01,
  );
  const cabGlass = new THREE.Mesh(cabGlassGeo, glassMat);
  cabGlass.scale.set(1.01, 0.9, 0.9);
  root.add(cabGlass);

  // Dark cargo bed floor & cargo crates in bed
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.08, 1.72), darkMat);
  bedFloor.position.set(0, 1.14, 1.38);
  root.add(bedFloor);

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.45, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 }),
  );
  crate.position.set(-0.2, 1.38, 1.25);
  crate.castShadow = true;
  root.add(crate);

  // Bumpers, grille, lights
  const fBumper = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.22, 0.16), darkMat);
  fBumper.position.set(0, 0.44, -2.38);
  root.add(fBumper);

  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfde047, emissiveIntensity: 1.3 });
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.9 });
  for (const sx of [-0.72, 0.72]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.08), hlMat);
    hl.position.set(sx, 0.78, -2.37);
    root.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.08), tlMat);
    tl.position.set(sx * 1.1, 0.82, 2.35);
    root.add(tl);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.12), darkMat);
    mirror.position.set(sx * 1.42, 1.2, -0.84);
    root.add(mirror);
  }

  for (const [wx, wz] of [
    [-0.92, -1.48],
    [0.92, -1.48],
    [-0.92, 1.44],
    [0.92, 1.44],
  ]) {
    const w = createWheel(0.38, 0.24);
    w.position.set(wx, 0.38, wz);
    root.add(w);
  }

  return root;
}

/**
 * Santa Cruz Torito / Moto-Taxi (3-wheeler with rounded front fairing, windshield, canopy, open rear bench)
 */
export function createTorito(textures: ProceduralTextures, colorHex = 0xe11d48): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 1.75, 2.8, 0.48);

  const bodyMat = new THREE.MeshPhysicalMaterial({ color: colorHex, roughness: 0.36, clearcoat: 0.6 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.84 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, opacity: 0.55, transparent: true });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.25 });

  // Lower rear passenger compartment
  const tub = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.62, 1.45), bodyMat);
  tub.position.set(0, 0.58, 0.32);
  tub.castShadow = true;
  root.add(tub);

  // Tapered front scooter fairing
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.48, 0.9, 10), bodyMat);
  nose.position.set(0, 0.72, -0.76);
  nose.castShadow = true;
  root.add(nose);

  const hl = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfde047, emissiveIntensity: 1.4 }),
  );
  hl.position.set(0, 0.74, -1.16);
  root.add(hl);

  // Windshield & tubular canopy posts
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.56, 0.06), glassMat);
  windshield.position.set(0, 1.34, -0.7);
  windshield.rotation.x = 0.22;
  root.add(windshield);

  for (const [px, pz] of [
    [-0.56, -0.58],
    [0.56, -0.58],
    [-0.6, 0.96],
    [0.6, 0.96],
  ]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), frameMat);
    post.position.set(px, 1.28, pz);
    root.add(post);
  }

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.16, 1.78), canopyMat);
  canopy.position.set(0, 1.72, 0.18);
  canopy.castShadow = true;
  root.add(canopy);

  const tlMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.9 });
  for (const sx of [-0.46, 0.46]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.07), tlMat);
    tl.position.set(sx, 0.65, 1.06);
    root.add(tl);
  }

  const fw = createWheel(0.26, 0.16);
  fw.position.set(0, 0.26, -0.94);
  root.add(fw);
  for (const sx of [-0.62, 0.62]) {
    const rw = createWheel(0.26, 0.17);
    rw.position.set(sx, 0.26, 0.72);
    root.add(rw);
  }

  return root;
}

/**
 * Delivery Motorbike + Rider
 */
export function createMotorbike(textures: ProceduralTextures, colorHex: number): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 0.95, 2.2, 0.44);

  const frameMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.32, metalness: 0.45 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.75 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.24 });

  const fw = createWheel(0.31, 0.12);
  fw.position.set(0, 0.31, -0.72);
  root.add(fw);
  const rw = createWheel(0.31, 0.14);
  rw.position.set(0, 0.31, 0.7);
  root.add(rw);

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 1.15), darkMat);
  chassis.position.set(0, 0.54, 0);
  root.add(chassis);

  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.54), frameMat);
  tank.position.set(0, 0.8, -0.2);
  root.add(tank);

  // Rear delivery box
  const deliveryBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.42, 0.46),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }),
  );
  deliveryBox.position.set(0, 0.95, 0.68);
  deliveryBox.castShadow = true;
  root.add(deliveryBox);

  const bars = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), darkMat);
  bars.position.set(0, 1.02, -0.5);
  root.add(bars);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.28), jacketMat);
  torso.position.set(0, 1.16, 0.12);
  torso.rotation.x = 0.22;
  torso.castShadow = true;
  root.add(torso);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), helmetMat);
  helmet.position.set(0, 1.58, 0.02);
  helmet.castShadow = true;
  root.add(helmet);

  return root;
}

/**
 * Green Bolivian Police Patrol Sedan (Policía Boliviana) with Flashing Red/Blue Lightbar
 */
export function createPoliceCar(textures: ProceduralTextures): PoliceRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.2, 4.7, 0.56);

  const bodyTilt = new THREE.Group();
  root.add(bodyTilt);

  const greenMat = new THREE.MeshPhysicalMaterial({
    color: 0x14532d, // Policía Boliviana olive/emerald green
    roughness: 0.24,
    metalness: 0.35,
    clearcoat: 0.9,
    envMapIntensity: 1.35,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, clearcoat: 1.0 });

  const hullGeo = extrudeCarProfile(
    [
      [-2.18, 0.28],
      [-2.18, 0.78],
      [-1.18, 0.9],
      [-0.52, 1.44],
      [0.72, 1.44],
      [1.42, 0.92],
      [2.12, 0.86],
      [2.16, 0.3],
    ],
    1.82,
    0.06,
  );
  const hull = new THREE.Mesh(hullGeo, greenMat);
  hull.castShadow = true;
  bodyTilt.add(hull);

  // White police doors
  const doorStripe = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.44, 1.55), whiteMat);
  doorStripe.position.set(0, 0.62, 0.05);
  bodyTilt.add(doorStripe);

  // Cabin glass
  const glassGeo = extrudeCarProfile(
    [
      [-1.08, 0.92],
      [-0.5, 1.38],
      [0.68, 1.38],
      [1.32, 0.94],
    ],
    1.84,
    0.01,
  );
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.scale.set(1.01, 0.94, 0.92);
  bodyTilt.add(glass);

  // Push bumper & headlights
  const bullBar = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.3, 0.18), darkMat);
  bullBar.position.set(0, 0.48, -2.24);
  bodyTilt.add(bullBar);

  const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 1.5 });
  for (const sx of [-0.66, 0.66]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), hlMat);
    hl.position.set(sx, 0.64, -2.2);
    bodyTilt.add(hl);
  }

  // Flashing Red/Blue Beacon Lightbar
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.08, 0.24), darkMat);
  barBase.position.set(0, 1.48, 0.05);
  bodyTilt.add(barBase);

  const redBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0xff0000,
    emissiveIntensity: 2.5,
  });
  const blueBeaconMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x2563eb,
    emissiveIntensity: 0.2,
  });

  const redPod = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.22), redBeaconMat);
  redPod.position.set(-0.3, 1.56, 0.05);
  bodyTilt.add(redPod);

  const bluePod = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.22), blueBeaconMat);
  bluePod.position.set(0.3, 1.56, 0.05);
  bodyTilt.add(bluePod);

  const redLight = new THREE.PointLight(0xff2222, 3.5, 14);
  redLight.position.set(-0.4, 1.9, 0.05);
  bodyTilt.add(redLight);

  const blueLight = new THREE.PointLight(0x3b82f6, 0, 14);
  blueLight.position.set(0.4, 1.9, 0.05);
  bodyTilt.add(blueLight);

  const wheels: THREE.Object3D[] = [];
  for (const [wx, wz] of [
    [-0.88, -1.34],
    [0.88, -1.34],
    [-0.88, 1.34],
    [0.88, 1.34],
  ]) {
    const w = createWheel(0.34, 0.22);
    w.position.set(wx, 0.34, wz);
    root.add(w);
    wheels.push(w);
  }

  return { root, bodyTilt, wheels, redBeaconMat, blueBeaconMat, redLight, blueLight };
}

/**
 * Wandering Livestock Cow
 */
export function createCow(textures: ProceduralTextures, spotted = false): CowRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 1.2, 2.0, 0.45);

  const coatMat = new THREE.MeshStandardMaterial({
    color: spotted ? 0xfef3c7 : 0xf8fafc,
    roughness: 0.85,
  });
  const spotMat = new THREE.MeshStandardMaterial({
    color: spotted ? 0x78350f : 0xd6d3d1,
    roughness: 0.85,
  });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.5 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.74, 1.45), coatMat);
  torso.position.set(0, 0.92, 0);
  torso.castShadow = true;
  root.add(torso);

  if (spotted) {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.44, 0.62), spotMat);
    patch.position.set(0, 1.0, 0.16);
    root.add(patch);
  }

  const head = new THREE.Group();
  head.position.set(0, 1.08, -0.78);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.54), coatMat);
  skull.position.set(0, 0, -0.18);
  skull.castShadow = true;
  head.add(skull);

  const snout = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.24, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.7 }),
  );
  snout.position.set(0, -0.1, -0.48);
  head.add(snout);

  for (const sx of [-0.18, 0.18]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 6), hornMat);
    horn.position.set(sx, 0.28, -0.14);
    horn.rotation.z = -sx * 1.4;
    horn.rotation.x = 0.3;
    head.add(horn);
  }
  root.add(head);

  const legs: THREE.Object3D[] = [];
  const legGeo = new THREE.BoxGeometry(0.16, 0.62, 0.16);
  legGeo.translate(0, -0.31, 0);
  for (const [lx, lz] of [
    [-0.24, -0.5],
    [0.24, -0.5],
    [-0.24, 0.52],
    [0.24, 0.52],
  ]) {
    const leg = new THREE.Mesh(legGeo, coatMat);
    leg.position.set(lx, 0.62, lz);
    leg.castShadow = true;
    root.add(leg);
    legs.push(leg);
  }

  const tailGeo = new THREE.BoxGeometry(0.08, 0.52, 0.08);
  tailGeo.translate(0, -0.26, 0);
  const tail = new THREE.Mesh(tailGeo, spotMat);
  tail.position.set(0, 1.08, 0.74);
  tail.rotation.x = 0.2;
  root.add(tail);

  return { root, legs, head, tail };
}

/**
 * Stray Street Dog
 */
export function createDog(textures: ProceduralTextures, coatHex = 0xc27838): DogRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 0.65, 1.05, 0.38);

  const coatMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.85 });
  const earMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.74), coatMat);
  body.position.set(0, 0.44, 0);
  body.castShadow = true;
  root.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.28), coatMat);
  head.position.set(0, 0.62, -0.4);
  head.castShadow = true;
  root.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.18), earMat);
  snout.position.set(0, 0.56, -0.56);
  root.add(snout);

  for (const sx of [-0.12, 0.12]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.08), earMat);
    ear.position.set(sx, 0.68, -0.36);
    root.add(ear);
  }

  const legs: THREE.Object3D[] = [];
  const legGeo = new THREE.BoxGeometry(0.09, 0.32, 0.09);
  legGeo.translate(0, -0.16, 0);
  for (const [lx, lz] of [
    [-0.1, -0.26],
    [0.1, -0.26],
    [-0.1, 0.26],
    [0.1, 0.26],
  ]) {
    const leg = new THREE.Mesh(legGeo, coatMat);
    leg.position.set(lx, 0.32, lz);
    root.add(leg);
    legs.push(leg);
  }

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), coatMat);
  tail.position.set(0, 0.58, 0.4);
  tail.rotation.x = -0.5;
  root.add(tail);

  return { root, legs, tail };
}

/**
 * Jaywalking Pedestrian or Waving Pickup Passenger
 */
export function createPedestrian(
  textures: ProceduralTextures,
  shirtColor: number,
  isWavingPassenger = false,
): PedestrianRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 0.8, 0.8, 0.4);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb47b52, roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });

  const legGeo = new THREE.BoxGeometry(0.16, 0.68, 0.16);
  legGeo.translate(0, -0.34, 0);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.11, 0.68, 0);
  leftLeg.castShadow = true;
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.11, 0.68, 0);
  rightLeg.castShadow = true;
  root.add(rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.24), shirtMat);
  torso.position.set(0, 0.99, 0);
  torso.castShadow = true;
  root.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skinMat);
  head.position.set(0, 1.48, 0);
  head.castShadow = true;
  root.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat,
  );
  hair.position.set(0, 1.5, 0);
  root.add(hair);

  const armGeo = new THREE.BoxGeometry(0.12, 0.52, 0.12);
  armGeo.translate(0, -0.22, 0);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.28, 1.24, 0);
  root.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.28, 1.24, 0);
  if (isWavingPassenger) {
    rightArm.rotation.z = 2.6;
  }
  root.add(rightArm);

  return { root, leftLeg, rightLeg, leftArm, rightArm };
}

/**
 * Street Vendor Pushing a Colorful Carrito (Fruit/Juice/Snack Cart)
 */
export function createVendorCart(textures: ProceduralTextures, accentColor: number): VendorRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 1.5, 2.2, 0.46);

  const ped = createPedestrian(textures, accentColor, false);
  ped.root.position.set(0, 0, 0.85);
  ped.leftArm.rotation.x = 0.8;
  ped.rightArm.rotation.x = 0.8;
  root.add(ped.root);

  const cartBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.72, 1.25),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 }),
  );
  cartBody.position.set(0, 0.62, -0.15);
  cartBody.castShadow = true;
  root.add(cartBody);

  const cartRim = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.14, 1.3),
    new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.55 }),
  );
  cartRim.position.set(0, 0.98, -0.15);
  root.add(cartRim);

  // Fruit/produce piles on cart
  for (let i = 0; i < 3; i++) {
    const pile = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.18, 0),
      new THREE.MeshStandardMaterial({ color: [0xf97316, 0x22c55e, 0xeab308][i], roughness: 0.7 }),
    );
    pile.position.set((i - 1) * 0.25, 1.12, -0.2);
    root.add(pile);
  }

  // Sun umbrella over cart
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.35, 6),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7 }),
  );
  pole.position.set(0, 1.65, -0.15);
  root.add(pole);

  const umbrella = new THREE.Mesh(
    new THREE.ConeGeometry(0.92, 0.36, 8),
    new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.65, side: THREE.DoubleSide }),
  );
  umbrella.position.set(0, 2.32, -0.15);
  umbrella.castShadow = true;
  root.add(umbrella);

  const cartWheels: THREE.Object3D[] = [];
  for (const sx of [-0.52, 0.52]) {
    const w = createWheel(0.24, 0.08, 0xf59e0b);
    w.position.set(sx, 0.24, -0.15);
    root.add(w);
    cartWheels.push(w);
  }

  return { root, ped, cartWheels };
}

/**
 * Los Pozos / La Ramada Plastic Tarp Market Stall
 */
export function createMarketStall(tarpTex: THREE.Texture, accentColor: number): THREE.Group {
  const stall = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const tarpMat = new THREE.MeshStandardMaterial({ map: tarpTex, roughness: 0.6, side: THREE.DoubleSide });
  const counterMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.7 });

  for (const [px, pz] of [
    [-1.4, -2.0],
    [1.4, -2.0],
    [-1.4, 2.0],
    [1.4, 2.0],
  ]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.75, 6), woodMat);
    post.position.set(px, 1.38, pz);
    post.castShadow = true;
    stall.add(post);
  }

  const tarp = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 4.6), tarpMat);
  tarp.position.set(0, 2.8, 0);
  tarp.rotation.z = 0.2;
  tarp.castShadow = true;
  stall.add(tarp);

  const table = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.9, 3.8), counterMat);
  table.position.set(-0.35, 0.45, 0);
  table.castShadow = true;
  stall.add(table);

  const basketColors = [0xf97316, 0xeab308, 0x16a34a, 0xdc2626];
  for (let i = 0; i < 4; i++) {
    const basket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.22, 0.34, 8),
      new THREE.MeshStandardMaterial({ color: basketColors[i], roughness: 0.78 }),
    );
    basket.position.set(-0.35, 1.07, -1.35 + i * 0.9);
    stall.add(basket);
  }

  return stall;
}

/**
 * Weathered Tropical Concrete Building (Santa Cruz commercial street facade)
 * Front facade faces -X in local space (rotate by PI on left side of avenue).
 */
export function createTropicalBuilding(
  wallColor: number,
  trimColor: number,
  height: number,
  width: number,
  depth: number,
  shopSignTex?: THREE.Texture,
): THREE.Group {
  const b = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.88 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.74 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.65 });
  const winMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.14,
    metalness: 0.28,
    clearcoat: 0.7,
  });

  const main = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  main.position.y = height / 2;
  main.castShadow = true;
  main.receiveShadow = true;
  b.add(main);

  // Rooftop cornice parapet
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(width + 0.34, 0.44, depth + 0.34), trimMat);
  parapet.position.y = height + 0.2;
  b.add(parapet);

  // Rooftop plastic water tank (tinaco)
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45 });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 1.35, 12), tankMat);
  tank.position.set(width * 0.18, height + 1.05, -depth * 0.22);
  b.add(tank);

  // Ground-floor recessed commercial shutter & doorway
  const shutter = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 2.7, depth * 0.74), ironMat);
  shutter.position.y = 1.35;
  b.add(shutter);

  // Sloped corrugated shop awning facing the sidewalk (-X)
  const awning = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, depth * 0.84), trimMat);
  awning.position.set(-width / 2 - 0.68, 3.05, 0);
  awning.rotation.z = 0.18;
  awning.castShadow = true;
  b.add(awning);

  // Colorful local Santa Cruz shop sign billboard above the awning
  if (shopSignTex) {
    const signBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(depth * 0.66, 1.25),
      new THREE.MeshStandardMaterial({
        map: shopSignTex,
        roughness: 0.35,
        emissive: 0xffffff,
        emissiveMap: shopSignTex,
        emissiveIntensity: 0.18,
      }),
    );
    signBoard.rotation.y = -Math.PI / 2;
    signBoard.position.set(-width / 2 - 0.08, 3.85, 0);
    b.add(signBoard);
  }

  // Upper floor windows + 2nd-floor concrete balcony with iron railing
  const floors = Math.floor(height / 3.4);
  for (let f = 1; f < floors; f++) {
    const wy = f * 3.2 + 1.2;
    const winBand = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 1.15, depth * 0.66), winMat);
    winBand.position.y = wy;
    b.add(winBand);

    const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, 0.14, depth * 0.7), trimMat);
    sill.position.y = wy - 0.64;
    b.add(sill);

    if (f === 1) {
      const balcFloor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, depth * 0.72), trimMat);
      balcFloor.position.set(-width / 2 - 0.5, wy - 0.68, 0);
      b.add(balcFloor);

      const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, depth * 0.72), ironMat);
      railTop.position.set(-width / 2 - 1.0, wy + 0.12, 0);
      b.add(railTop);

      for (const rz of [-depth * 0.34, 0, depth * 0.34]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.76, 0.06), ironMat);
        post.position.set(-width / 2 - 1.0, wy - 0.25, rz);
        b.add(post);
      }
    }
  }

  return b;
}

/**
 * Dusty Santa Cruz Palm Tree (Slender curved trunk + radiating palm fronds)
 */
export function createPalmTree(scale = 1): THREE.Group {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.92 });
  const frondMatA = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.78, side: THREE.DoubleSide });
  const frondMatB = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.78, side: THREE.DoubleSide });

  // Segmented slightly curved trunk
  const segCount = 6;
  let curX = 0;
  for (let i = 0; i < segCount; i++) {
    const h = 1.05;
    const rBot = 0.28 - i * 0.025;
    const rTop = 0.25 - i * 0.025;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 7), trunkMat);
    seg.position.set(curX, i * 0.98 + h / 2, 0);
    seg.rotation.z = -0.06 * i;
    seg.castShadow = true;
    palm.add(seg);
    curX += 0.07 * i;
  }

  const crown = new THREE.Group();
  crown.position.set(curX, segCount * 0.98 + 0.1, 0);
  const frondGeo = new THREE.ConeGeometry(0.55, 3.2, 4);
  frondGeo.scale(1, 1, 0.16);
  frondGeo.translate(0, 1.5, 0);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const frond = new THREE.Mesh(frondGeo, i % 2 === 0 ? frondMatA : frondMatB);
    frond.rotation.y = angle;
    frond.rotation.x = 1.18 + (i % 2) * 0.16;
    frond.castShadow = true;
    crown.add(frond);
  }
  palm.add(crown);

  palm.scale.setScalar(scale);
  return palm;
}

/**
 * Overhead Tangled Power Lines & Concrete Utility Poles spanning the avenue
 */
export function createOverheadPowerSpan(roadWidth: number): THREE.Group {
  const span = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x18181b });

  const poleX = roadWidth / 2 + 1.1;
  for (const sx of [-poleX, poleX]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 8.6, 8), poleMat);
    pole.position.set(sx, 4.3, 0);
    pole.castShadow = true;
    span.add(pole);

    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.5), poleMat);
    crossArm.position.set(sx, 8.1, 0);
    span.add(crossArm);
  }

  // 3 sagging catenary power cables crossing overhead
  for (let w = 0; w < 3; w++) {
    const zOff = (w - 1) * 0.45;
    const sag = 0.75 + w * 0.28;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-poleX, 8.1, zOff),
      new THREE.Vector3(0, 8.1 - sag, zOff + (w % 2 === 0 ? 0.35 : -0.25)),
      new THREE.Vector3(poleX, 8.1, zOff),
    );
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.025, 4, false), wireMat);
    span.add(tube);
  }

  return span;
}

/**
 * 3D Road Trash Cluster (crushed cartons, garbage bags, cans, plastic cups)
 */
export function createRoadTrash(textures: ProceduralTextures, variant = 0): THREE.Group {
  const trash = new THREE.Group();
  addContactShadow(trash, textures.contactShadow, 1.0, 1.0, 0.3);

  if (variant === 0) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.26, 0.54),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.92 }),
    );
    box.position.set(0, 0.13, 0);
    box.rotation.set(0.06, 0.4, -0.05);
    trash.add(box);

    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, metalness: 0.6 }),
    );
    can.rotation.z = Math.PI / 2;
    can.position.set(0.4, 0.07, 0.18);
    trash.add(can);
  } else if (variant === 1) {
    const sackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.58 });
    const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 1), sackMat);
    sack.scale.set(1.15, 0.8, 1.05);
    sack.position.set(0, 0.26, 0);
    trash.add(sack);

    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.04, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.95 }),
    );
    paper.position.set(-0.4, 0.03, 0.22);
    paper.rotation.y = 0.7;
    trash.add(paper);
  } else {
    const litterColors = [0xf8fafc, 0x38bdf8, 0xfacc15, 0xf43f5e];
    for (let i = 0; i < 4; i++) {
      const item = new THREE.Mesh(
        i % 2 === 0
          ? new THREE.CylinderGeometry(0.065, 0.055, 0.22, 7)
          : new THREE.BoxGeometry(0.22, 0.05, 0.16),
        new THREE.MeshStandardMaterial({ color: litterColors[i], roughness: 0.6 }),
      );
      const angle = i * 1.6;
      item.position.set(Math.cos(angle) * 0.3, 0.06, Math.sin(angle) * 0.3);
      if (i % 2 === 0) item.rotation.z = Math.PI / 2;
      item.rotation.y = angle;
      trash.add(item);
    }
  }

  return trash;
}

/**
 * Bolivian Intercity Flota Touring Coach (tall panoramic bus with luggage bays, 6 wheels, roof cargo)
 */
export function createFlotaBus(textures: ProceduralTextures): BusRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 3.3, 8.8, 0.65);

  const bodyTilt = new THREE.Group();
  root.add(bodyTilt);

  const blueMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e3a8a,
    roughness: 0.3,
    metalness: 0.25,
    clearcoat: 0.8,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.35,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.22, metalness: 0.88 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.78, metalness: 0.25 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.22,
    opacity: 0.82,
    transparent: true,
    clearcoat: 1.0,
  });
  const clearWindshieldMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    opacity: 0.2,
    transparent: true,
    depthWrite: false,
  });

  // 1. Heavy touring chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.38, 7.9), darkMetalMat);
  chassis.position.set(0, 0.48, 0);
  chassis.castShadow = true;
  bodyTilt.add(chassis);

  // 2. Tall Lower Luggage Hull
  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(2.46, 1.35, 8.05), blueMat);
  lowerHull.position.set(0, 1.3, 0);
  lowerHull.castShadow = true;
  lowerHull.receiveShadow = true;
  bodyTilt.add(lowerHull);

  // Side livery panels ("FLOTA EXÓTICA · YUNGAS — SELVA")
  const sideLiveryMat = new THREE.MeshStandardMaterial({ map: textures.flotaSide, roughness: 0.42 });
  const leftSide = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 1.25), sideLiveryMat);
  leftSide.rotation.y = -Math.PI / 2;
  leftSide.position.set(-1.24, 1.3, 0);
  bodyTilt.add(leftSide);

  const rightSide = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 1.25), sideLiveryMat);
  rightSide.rotation.y = Math.PI / 2;
  rightSide.position.set(1.24, 1.3, 0);
  bodyTilt.add(rightSide);

  // Sculpted flat-front aerodynamic coach face (-Z)
  const frontFace = new THREE.Mesh(new THREE.BoxGeometry(2.44, 1.4, 0.32), blueMat);
  frontFace.position.set(0, 1.32, -4.02);
  frontFace.castShadow = true;
  bodyTilt.add(frontFace);

  const frontStripe = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.24, 0.34), goldMat);
  frontStripe.position.set(0, 1.72, -4.02);
  bodyTilt.add(frontStripe);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.42, 0.08), chromeMat);
  grille.position.set(0, 0.94, -4.18);
  bodyTilt.add(grille);

  // 3. Rear Artwork Group ("FLOTA EXÓTICA / YUNGAS · SELVA · MONTAÑA")
  const rearArtGroup = new THREE.Group();
  const rearBack = new THREE.Mesh(new THREE.BoxGeometry(2.44, 2.65, 0.14), blueMat);
  rearBack.position.set(0, 1.98, 4.0);
  rearArtGroup.add(rearBack);

  const rearPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.36, 2.55),
    new THREE.MeshStandardMaterial({ map: textures.flotaRear, roughness: 0.44 }),
  );
  rearPanel.position.set(0, 1.98, 4.08);
  rearArtGroup.add(rearPanel);
  bodyTilt.add(rearArtGroup);

  // 4. Panoramic Upper Passenger Cabin + Pillars
  for (const sx of [-1.2, 1.2]) {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 7.2), glassMat);
    sideGlass.position.set(sx, 2.55, 0.1);
    bodyTilt.add(sideGlass);
  }
  for (const pz of [-3.6, -2.0, -0.4, 1.2, 2.8, 3.9]) {
    for (const sx of [-1.19, 1.19]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.14), creamMat);
      pillar.position.set(sx, 2.55, pz);
      bodyTilt.add(pillar);
    }
  }

  // Tall panoramic split windshield (-Z)
  const centerMullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.22, 0.08), darkMetalMat);
  centerMullion.position.set(0, 2.55, -3.96);
  centerMullion.rotation.x = -0.14;
  bodyTilt.add(centerMullion);

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.16), clearWindshieldMat);
  windshield.position.set(0, 2.55, -3.98);
  windshield.rotation.x = -0.14;
  windshield.rotation.y = Math.PI;
  bodyTilt.add(windshield);

  // Passenger entry door (+X front)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.25, 0.95), redMat);
  door.position.set(1.24, 1.72, -3.05);
  bodyTilt.add(door);

  // 5. First-Person Driver Cockpit (positioned for tall coach view)
  const dash = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.45, 0.6), darkMetalMat);
  dash.position.set(0, 1.92, -3.65);
  bodyTilt.add(dash);

  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(-0.56, 2.12, -3.32);
  steeringWheel.rotation.x = -0.58;
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.032, 8, 20), darkMetalMat);
  steeringWheel.add(wheelRim);
  const spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.03), chromeMat);
  steeringWheel.add(spokeH);
  const spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.03), darkMetalMat);
  spokeV.position.y = -0.12;
  steeringWheel.add(spokeV);
  bodyTilt.add(steeringWheel);

  // 6. Roof Crown + AC Pods + Destination Board + Luggage Tarp
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.24, 7.95), creamMat);
  roof.position.set(0, 3.24, 0.05);
  roof.castShadow = true;
  bodyTilt.add(roof);

  const routeMat = new THREE.MeshStandardMaterial({
    map: textures.flotaRouteBoard,
    emissive: 0xfef08a,
    emissiveMap: textures.flotaRouteBoard,
    emissiveIntensity: 0.4,
    roughness: 0.3,
  });
  const frontRouteBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.42, 0.22),
    [creamMat, creamMat, creamMat, creamMat, routeMat, routeMat],
  );
  frontRouteBox.position.set(0, 3.45, -3.72);
  bodyTilt.add(frontRouteBox);

  // AC unit + Roof luggage bundle
  const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.28, 1.4), creamMat);
  acUnit.position.set(0, 3.48, -1.5);
  bodyTilt.add(acUnit);

  const tarpBundle = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.42, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.8 }),
  );
  tarpBundle.position.set(0, 3.55, 1.3);
  tarpBundle.castShadow = true;
  bodyTilt.add(tarpBundle);

  const spare = createWheel(0.38, 0.22);
  spare.rotation.z = Math.PI / 2;
  spare.position.set(0.35, 3.45, 3.1);
  bodyTilt.add(spare);

  // 7. Bumpers, Twin Exhaust, Lights, Chrome Mirrors
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 0.24), darkMetalMat);
  frontBumper.position.set(0, 0.52, -4.16);
  bodyTilt.add(frontBumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 0.24), darkMetalMat);
  rearBumper.position.set(0, 0.52, 4.08);
  bodyTilt.add(rearBumper);

  const tailpipeGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.4, 10);
  tailpipeGeo.rotateX(Math.PI / 2);
  for (const tx of [-0.92, -0.74]) {
    const tp = new THREE.Mesh(tailpipeGeo, chromeMat);
    tp.position.set(tx, 0.36, 4.1);
    bodyTilt.add(tp);
  }

  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfde047,
    emissiveIntensity: 1.5,
  });
  const brakeLights = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x991b1b,
    emissiveIntensity: 0.85,
  });
  for (const sx of [-0.92, 0.92]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), hlMat);
    hl.position.set(sx, 0.88, -4.16);
    bodyTilt.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.1), brakeLights);
    tl.position.set(sx, 0.82, 4.08);
    bodyTilt.add(tl);
  }

  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.05), chromeMat);
    stalk.position.set(side * 1.36, 2.48, -3.95);
    bodyTilt.add(stalk);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.18), darkMetalMat);
    mirror.position.set(side * 1.5, 2.38, -3.95);
    bodyTilt.add(mirror);
  }

  // 8. Heavy-Duty 6-Wheel Coach Setup (Dual Rear Axles)
  const wheels: THREE.Object3D[] = [];
  for (const [wx, wy, wz] of [
    [-1.15, 0.46, -2.55],
    [1.15, 0.46, -2.55],
    [-1.15, 0.46, 1.55],
    [1.15, 0.46, 1.55],
    [-1.15, 0.46, 2.68],
    [1.15, 0.46, 2.68],
  ] as [number, number, number][]) {
    const w = createWheel(0.46, 0.32);
    w.position.set(wx, wy, wz);
    root.add(w);
    wheels.push(w);
  }

  return {
    root,
    bodyTilt,
    steeringWheel,
    wheels,
    brakeLights,
    rearArtGroup,
    primaryMat: blueMat,
    secondaryMat: creamMat,
    stripeMat: redMat,
  };
}

/**
 * Steep ("Stiff") Multi-Tiered Andean / Yungas Mountain Cliff Wall
 */
export function createMountainCliff(
  textures: ProceduralTextures,
  height: number,
  width: number,
  depth: number,
  seed = 0,
): THREE.Group {
  const cliff = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({
    map: textures.cliffRock,
    roughness: 0.94,
    metalness: 0.04,
  });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.9 });

  // Main steep tiered cliff mass
  const baseGeo = new THREE.CylinderGeometry(width * 0.34, width * 0.62, height, 7);
  baseGeo.scale(1, 1, depth / width);
  const mainRock = new THREE.Mesh(baseGeo, rockMat);
  mainRock.position.set(0, height * 0.48, 0);
  mainRock.rotation.y = (seed % 5) * 0.4;
  mainRock.castShadow = true;
  mainRock.receiveShadow = true;
  cliff.add(mainRock);

  // Secondary craggy rock buttresses jutting toward roadside
  for (let i = 0; i < 3; i++) {
    const h2 = height * (0.45 + ((seed + i) % 3) * 0.16);
    const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(width * 0.34, 0), rockMat);
    crag.scale.set(0.85, h2 / (width * 0.42), 1.15);
    crag.position.set(
      (i - 1) * width * 0.18,
      h2 * 0.4,
      (i - 1) * (depth * 0.28),
    );
    crag.rotation.set(0.15 * i, seed + i, 0.1);
    crag.castShadow = true;
    crag.receiveShadow = true;
    cliff.add(crag);
  }

  // Mossy/grassy highland ridge cap on top
  const cap = new THREE.Mesh(
    new THREE.DodecahedronGeometry(width * 0.32, 0),
    mossMat,
  );
  cap.scale.set(1.1, 0.35, depth / width);
  cap.position.set(0, height * 0.92, 0);
  cliff.add(cap);

  return cliff;
}

/**
 * Dense Tropical Jungle Tree (Buttress Trunk + Layered Broadleaf Canopies + Hanging Vines)
 */
export function createJungleTree(scale = 1, seed = 0): THREE.Group {
  const tree = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.94 });
  const canopyA = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
  const canopyB = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.84 });
  const canopyC = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.8 });
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.85 });

  const trunkH = 5.4 + (seed % 3) * 1.1;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.56, trunkH, 7), barkMat);
  trunk.position.y = trunkH / 2;
  trunk.rotation.z = ((seed % 3) - 1) * 0.06;
  trunk.castShadow = true;
  tree.add(trunk);

  // Layered lush broadleaf crown clusters
  const crownCoords: [number, number, number, number, THREE.Material][] = [
    [0, trunkH + 0.6, 0, 2.35, canopyA],
    [-1.4, trunkH - 0.1, 0.9, 1.75, canopyB],
    [1.35, trunkH + 0.2, -0.85, 1.85, canopyC],
    [0.2, trunkH + 1.55, 0.4, 1.6, canopyA],
  ];
  for (const [cx, cy, cz, r, mat] of crownCoords) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
    puff.scale.set(1.2, 0.68, 1.15);
    puff.position.set(cx, cy, cz);
    puff.castShadow = true;
    tree.add(puff);
  }

  // Hanging jungle vines
  for (let v = 0; v < 2; v++) {
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 2.2, 5), vineMat);
    vine.position.set((v === 0 ? -1.1 : 1.0), trunkH - 1.2, v === 0 ? 0.6 : -0.5);
    tree.add(vine);
  }

  tree.scale.setScalar(scale);
  return tree;
}

/**
 * Dense Jungle Roadside Ferns & Broadleaf Banana Plants
 */
export function createJungleUndergrowth(scale = 1): THREE.Group {
  const bush = new THREE.Group();
  const leafMatA = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.78, side: THREE.DoubleSide });
  const leafMatB = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.8, side: THREE.DoubleSide });

  const frondGeo = new THREE.ConeGeometry(0.48, 2.2, 4);
  frondGeo.scale(1, 1, 0.14);
  frondGeo.translate(0, 1.05, 0);

  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(frondGeo, i % 2 === 0 ? leafMatA : leafMatB);
    frond.rotation.y = (i / 7) * Math.PI * 2;
    frond.rotation.x = 0.72 + (i % 3) * 0.18;
    frond.castShadow = true;
    bush.add(frond);
  }

  bush.scale.setScalar(scale);
  return bush;
}

/**
 * Mountain Dirt-Road Wooden Guardrail & Warning Bollard
 */
export function createWoodGuardPost(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.92 });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.25,
    roughness: 0.5,
  });

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.05, 0.22), woodMat);
  post.position.y = 0.52;
  post.castShadow = true;
  g.add(post);

  const reflector = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.24), stripeMat);
  reflector.position.y = 0.88;
  g.add(reflector);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 4.8), woodMat);
  rail.position.set(0, 0.65, 0);
  g.add(rail);

  return g;
}

/**
 * Overhanging Jungle Canopy Vine Arch spanning across the Dirt Road
 */
export function createJungleCanopyArch(roadWidth: number): THREE.Group {
  const arch = new THREE.Group();
  const branchMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });

  const spanX = roadWidth / 2 + 2.2;
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-spanX, 5.5, 0),
    new THREE.Vector3(0, 9.2, 0.6),
    new THREE.Vector3(spanX, 5.5, 0),
  );
  const limb = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.24, 6, false), branchMat);
  limb.castShadow = true;
  arch.add(limb);

  for (let i = -3; i <= 3; i++) {
    const t = (i + 3.5) / 7;
    const pt = curve.getPoint(t);
    const cluster = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 1), leafMat);
    cluster.scale.set(1.2, 0.72, 1.1);
    cluster.position.copy(pt);
    cluster.castShadow = true;
    arch.add(cluster);

    if (i % 2 === 0) {
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 2.3, 5), leafMat);
      vine.position.set(pt.x, pt.y - 1.3, pt.z);
      arch.add(vine);
    }
  }

  return arch;
}

/**
 * Player Sport Radio Taxi Sedan (for Taxi Express Mode)
 * Built with BusRig compatibility for seamless Chase & First-Person Driver views.
 */
export function createPlayerTaxi(textures: ProceduralTextures): BusRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.35, 4.95, 0.58);

  const bodyTilt = new THREE.Group();
  root.add(bodyTilt);

  const taxiYellowMat = new THREE.MeshPhysicalMaterial({
    color: 0xfacc15,
    roughness: 0.2,
    metalness: 0.32,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.45,
  });
  const blackTrimMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65, metalness: 0.25 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.18, metalness: 0.9 });
  const clearWindshieldMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    opacity: 0.22,
    transparent: true,
    depthWrite: false,
  });
  const sideGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    opacity: 0.72,
    transparent: true,
    clearcoat: 1.0,
  });

  // 1. Sleek lower sporty sedan body (hood + fenders + trunk)
  const lowerBodyGeo = extrudeCarProfile(
    [
      [-2.32, 0.28],
      [-2.32, 0.74],
      [-1.12, 0.92],
      [1.45, 0.96],
      [2.28, 0.88],
      [2.3, 0.3],
    ],
    1.88,
    0.06,
  );
  const lowerBody = new THREE.Mesh(lowerBodyGeo, taxiYellowMat);
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  bodyTilt.add(lowerBody);

  // Checkered Radio Taxi door livery decals on left & right sides
  const doorMat = new THREE.MeshStandardMaterial({ map: textures.taxiDoor, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const doorDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 0.42), doorMat);
    doorDecal.position.set(side * 0.955, 0.64, 0.08);
    doorDecal.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    bodyTilt.add(doorDecal);
  }

  // 2. Open Roof & Pillars (so First-Person Driver view looks cleanly out the windshield!)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.1, 1.48), taxiYellowMat);
  roof.position.set(0, 1.46, 0.14);
  roof.castShadow = true;
  bodyTilt.add(roof);

  for (const sx of [-0.76, 0.76]) {
    // Front A-pillars
    const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.09), blackTrimMat);
    aPillar.position.set(sx, 1.18, -0.82);
    aPillar.rotation.x = 0.68;
    bodyTilt.add(aPillar);
    // Rear C-pillars
    const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.16), taxiYellowMat);
    cPillar.position.set(sx, 1.18, 1.1);
    cPillar.rotation.x = -0.62;
    bodyTilt.add(cPillar);
    // Side glass
    const sGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.46, 1.35), sideGlassMat);
    sGlass.position.set(sx * 1.02, 1.18, 0.14);
    bodyTilt.add(sGlass);
  }

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.68), clearWindshieldMat);
  windshield.position.set(0, 1.18, -0.8);
  windshield.rotation.x = -0.82;
  windshield.rotation.y = Math.PI;
  bodyTilt.add(windshield);

  // 3. Interior Dashboard & Turning Steering Wheel
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.24, 0.42), blackTrimMat);
  dash.position.set(0, 0.96, -0.88);
  bodyTilt.add(dash);

  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(-0.42, 1.06, -0.62);
  steeringWheel.rotation.x = -0.45;
  steeringWheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 18), blackTrimMat));
  steeringWheel.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.02), chromeMat));
  bodyTilt.add(steeringWheel);

  // 4. Illuminated Roof TAXI Sign + Sport Rear Wing
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.05,
    roughness: 0.2,
  });
  const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.2, 0.26), signMat);
  taxiSign.position.set(0, 1.6, -0.05);
  bodyTilt.add(taxiSign);

  const rearArtGroup = new THREE.Group();
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.07, 0.26), blackTrimMat);
  wing.position.set(0, 1.08, 2.08);
  rearArtGroup.add(wing);
  for (const sx of [-0.62, 0.62]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.14), blackTrimMat);
    strut.position.set(sx, 0.98, 2.08);
    rearArtGroup.add(strut);
  }
  bodyTilt.add(rearArtGroup);

  // 5. Front Grille, Sport Splitter, Dual Exhaust, Headlights & Taillights
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.14, 0.18), blackTrimMat);
  splitter.position.set(0, 0.34, -2.35);
  bodyTilt.add(splitter);

  const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.16, 0.16), blackTrimMat);
  rearDiffuser.position.set(0, 0.36, 2.3);
  bodyTilt.add(rearDiffuser);

  const tpGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.28, 10);
  tpGeo.rotateX(Math.PI / 2);
  for (const tx of [-0.62, 0.62]) {
    const tp = new THREE.Mesh(tpGeo, chromeMat);
    tp.position.set(tx, 0.34, 2.34);
    bodyTilt.add(tp);
  }

  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 1.6,
  });
  const brakeLights = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.9,
  });
  for (const sx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.08), hlMat);
    hl.position.set(sx, 0.64, -2.33);
    bodyTilt.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.08), brakeLights);
    tl.position.set(sx, 0.74, 2.29);
    bodyTilt.add(tl);

    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), taxiYellowMat);
    mirror.position.set(sx * 1.46, 0.98, -0.78);
    bodyTilt.add(mirror);
  }

  const stickerMat = new THREE.MeshBasicMaterial({
    map: textures.stickerDecal,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const hoodSticker = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.45), stickerMat);
  hoodSticker.rotation.x = -Math.PI / 2;
  hoodSticker.position.set(0, 0.89, -1.62);
  bodyTilt.add(hoodSticker);

  const trunkSticker = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.41), stickerMat);
  trunkSticker.position.set(0, 0.62, 2.31);
  rearArtGroup.add(trunkSticker);

  // 6. Four Sport Alloy Wheels
  const wheels: THREE.Object3D[] = [];
  for (const [wx, wz] of [
    [-0.92, -1.42],
    [0.92, -1.42],
    [-0.92, 1.42],
    [0.92, 1.42],
  ]) {
    const w = createWheel(0.35, 0.24, 0xfef08a);
    w.position.set(wx, 0.35, wz);
    root.add(w);
    wheels.push(w);
  }

  return {
    root,
    bodyTilt,
    steeringWheel,
    wheels,
    brakeLights,
    rearArtGroup,
    primaryMat: taxiYellowMat,
    stickerMeshes: [hoodSticker, trunkSticker],
  };
}

/**
 * Rugged 4x4 Expedition Jungle Jeep (for Jungle Expedition Mode)
 * Built with BusRig compatibility for Chase & First-Person Driver views.
 */
export function createJungleJeep(textures: ProceduralTextures): BusRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.45, 4.9, 0.6);

  const bodyTilt = new THREE.Group();
  root.add(bodyTilt);

  const oliveMat = new THREE.MeshPhysicalMaterial({
    color: 0xc26d27, // Expedition terracotta-amber & safari bronze so it pops sharply against lush green jungle!
    roughness: 0.36,
    metalness: 0.24,
    clearcoat: 0.65,
    envMapIntensity: 1.3,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.75, metalness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.25, metalness: 0.85 });
  const clearWindshieldMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    opacity: 0.22,
    transparent: true,
    depthWrite: false,
  });

  // 1. High-clearance chassis frame + flared fender arches
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.26, 4.4), darkSteelMat);
  chassis.position.set(0, 0.46, 0);
  chassis.castShadow = true;
  bodyTilt.add(chassis);

  // Main boxy Jeep tub & long hood
  const hullGeo = extrudeCarProfile(
    [
      [-2.18, 0.48],
      [-2.18, 1.18],
      [-0.85, 1.24],
      [2.05, 1.26],
      [2.12, 0.48],
    ],
    1.88,
    0.05,
  );
  const hull = new THREE.Mesh(hullGeo, oliveMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  bodyTilt.add(hull);

  // Matte black flared wheel fenders
  for (const sx of [-0.98, 0.98]) {
    for (const fz of [-1.42, 1.36]) {
      const flare = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.96), darkSteelMat);
      flare.position.set(sx, 0.88, fz);
      bodyTilt.add(flare);
    }
  }

  // Hood louvers & side snorkel intake
  const jeepStripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.04, 1.1), jeepStripeMat);
  hoodStripe.position.set(0, 1.26, -1.52);
  bodyTilt.add(hoodStripe);

  const snorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 8), darkSteelMat);
  snorkel.position.set(0.98, 1.48, -0.78);
  bodyTilt.add(snorkel);

  // 2. Open Roll Cage + Safari Roof Rack + 4 Expedition Floodlights
  for (const sx of [-0.84, 0.84]) {
    const aPost = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.86, 8), darkSteelMat);
    aPost.position.set(sx, 1.62, -0.78);
    aPost.rotation.x = 0.28;
    bodyTilt.add(aPost);

    const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.86, 8), darkSteelMat);
    bPost.position.set(sx, 1.64, 0.55);
    bodyTilt.add(bPost);

    const cPost = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.86, 8), darkSteelMat);
    cPost.position.set(sx, 1.64, 1.88);
    bodyTilt.add(cPost);

    const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.75, 8), darkSteelMat);
    topRail.rotation.x = Math.PI / 2;
    topRail.position.set(sx, 2.04, 0.58);
    bodyTilt.add(topRail);
  }

  // Canvas safari roof canopy
  const jeepRoofMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.88 });
  const canvasRoof = new THREE.Mesh(
    new THREE.BoxGeometry(1.74, 0.12, 2.65),
    jeepRoofMat,
  );
  canvasRoof.position.set(0, 2.08, 0.58);
  canvasRoof.castShadow = true;
  bodyTilt.add(canvasRoof);

  // Clear angled windshield
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.58, 0.72), clearWindshieldMat);
  windshield.position.set(0, 1.58, -0.78);
  windshield.rotation.x = -0.28;
  windshield.rotation.y = Math.PI;
  bodyTilt.add(windshield);

  // Lightbar with 4 glowing floodlights
  const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 0.14), darkSteelMat);
  lightBar.position.set(0, 2.18, -0.66);
  bodyTilt.add(lightBar);

  const floodMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.8,
  });
  for (const fx of [-0.56, -0.19, 0.19, 0.56]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 10), floodMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(fx, 2.25, -0.68);
    bodyTilt.add(pod);
  }

  // 3. Interior Dashboard & Turning Steering Wheel
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.28, 0.42), darkSteelMat);
  dash.position.set(0, 1.24, -0.65);
  bodyTilt.add(dash);

  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(-0.44, 1.38, -0.4);
  steeringWheel.rotation.x = -0.48;
  steeringWheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 8, 18), darkSteelMat));
  steeringWheel.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.02), chromeMat));
  bodyTilt.add(steeringWheel);

  // 4. Heavy Steel Bullbar + Winch + Slotted Grille + Headlights + Rear Spare Tire
  const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.36, 0.24), darkSteelMat);
  bullbar.position.set(0, 0.62, -2.28);
  bodyTilt.add(bullbar);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.42, 0.08), darkSteelMat);
  grille.position.set(0, 0.94, -2.21);
  bodyTilt.add(grille);

  const hlGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12);
  hlGeo.rotateX(Math.PI / 2);
  const brakeLights = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.95,
  });
  for (const sx of [-0.74, 0.74]) {
    const hl = new THREE.Mesh(hlGeo, floodMat);
    hl.position.set(sx, 0.94, -2.2);
    bodyTilt.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.08), brakeLights);
    tl.position.set(sx * 1.12, 0.9, 2.13);
    bodyTilt.add(tl);
  }

  const rearArtGroup = new THREE.Group();
  const spare = createWheel(0.42, 0.28, 0xd6d3d1);
  spare.rotation.y = Math.PI / 2;
  spare.position.set(0, 1.02, 2.26);
  rearArtGroup.add(spare);
  bodyTilt.add(rearArtGroup);

  // 5. Four Tall Knobby Off-Road Wheels
  const wheels: THREE.Object3D[] = [];
  for (const [wx, wz] of [
    [-0.98, -1.42],
    [0.98, -1.42],
    [-0.98, 1.36],
    [0.98, 1.36],
  ]) {
    const w = createWheel(0.45, 0.3, 0xf59e0b);
    w.position.set(wx, 0.45, wz);
    root.add(w);
    wheels.push(w);
  }

  // 6. Roof-Mounted Heavy Machine Gun Turret (for blasting Jungle obstacles & Raiders!)
  const turretGroup = new THREE.Group();
  turretGroup.position.set(0.18, 2.2, -0.05);
  const gunSteelMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.35,
    metalness: 0.85,
  });
  const ammoGreenMat = new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.72 });

  const swivelBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.22, 10), gunSteelMat);
  turretGroup.add(swivelBase);

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.72), gunSteelMat);
  receiver.position.set(0, 0.2, -0.15);
  receiver.castShadow = true;
  turretGroup.add(receiver);

  const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.28), ammoGreenMat);
  ammoBox.position.set(-0.22, 0.18, -0.08);
  turretGroup.add(ammoBox);

  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.56, 10), darkSteelMat);
  shroud.rotation.x = Math.PI / 2;
  shroud.position.set(0, 0.21, -0.76);
  turretGroup.add(shroud);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.85, 8), chromeMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.21, -1.1);
  turretGroup.add(barrel);

  const muzzleFlash = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.65, 6),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.92 }),
  );
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.21, -1.68);
  muzzleFlash.visible = false;
  turretGroup.add(muzzleFlash);

  const jeepStickerMat = new THREE.MeshBasicMaterial({
    map: textures.stickerDecal,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const spareSticker = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.36), jeepStickerMat);
  spareSticker.position.set(0, 1.02, 2.41);
  rearArtGroup.add(spareSticker);

  const leftDoorSticker = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.44), jeepStickerMat);
  leftDoorSticker.rotation.y = -Math.PI / 2;
  leftDoorSticker.position.set(-0.96, 0.9, 0.15);
  bodyTilt.add(leftDoorSticker);

  const rightDoorSticker = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.44), jeepStickerMat);
  rightDoorSticker.rotation.y = Math.PI / 2;
  rightDoorSticker.position.set(0.96, 0.9, 0.15);
  bodyTilt.add(rightDoorSticker);

  bodyTilt.add(turretGroup);

  return {
    root,
    bodyTilt,
    steeringWheel,
    wheels,
    brakeLights,
    rearArtGroup,
    turretGroup,
    muzzleFlash,
    primaryMat: oliveMat,
    secondaryMat: jeepRoofMat,
    stripeMat: jeepStripeMat,
    stickerMeshes: [spareSticker, leftDoorSticker, rightDoorSticker],
  };
}

/**
 * Taxi Express Destination Finish Arch ("DESTINO · META")
 */
export function createDestinationArch(textures: ProceduralTextures): THREE.Group {
  const arch = new THREE.Group();
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    roughness: 0.35,
    metalness: 0.3,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.28,
  });

  for (const sx of [-7.9, 7.9]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 6.4, 0.85), pillarMat);
    pillar.position.set(sx, 3.2, 0);
    pillar.castShadow = true;
    arch.add(pillar);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), goldMat);
    beacon.position.set(sx, 6.6, 0);
    arch.add(beacon);
  }

  const bannerMat = new THREE.MeshStandardMaterial({
    map: textures.finishBanner,
    emissive: 0xffffff,
    emissiveMap: textures.finishBanner,
    emissiveIntensity: 0.25,
    roughness: 0.35,
  });
  const topSpan = new THREE.Mesh(new THREE.BoxGeometry(16.4, 2.0, 0.65), [
    pillarMat,
    pillarMat,
    pillarMat,
    pillarMat,
    bannerMat,
    bannerMat,
  ]);
  topSpan.position.set(0, 5.5, 0);
  topSpan.castShadow = true;
  arch.add(topSpan);

  // Glowing emerald finish strip across road
  const lineGeo = new THREE.PlaneGeometry(15.2, 2.2);
  lineGeo.rotateX(-Math.PI / 2);
  const line = new THREE.Mesh(
    lineGeo,
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    }),
  );
  line.position.y = 0.05;
  arch.add(line);

  return arch;
}

/**
 * Cinematic Jungle Obstacle 1: Craggy Mossy Granite Boulder
 */
export function createJungleBoulder(textures: ProceduralTextures): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, textures.contactShadow, 2.4, 2.4, 0.58);

  const rockMat = new THREE.MeshStandardMaterial({
    map: textures.cliffRock,
    roughness: 0.92,
    metalness: 0.05,
  });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.88 });

  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), rockMat);
  rock.scale.set(1.12, 0.96, 1.05);
  rock.position.y = 1.08;
  rock.castShadow = true;
  rock.receiveShadow = true;
  g.add(rock);

  for (let i = 0; i < 3; i++) {
    const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), mossMat);
    cap.position.set((i - 1) * 0.42, 1.65 - Math.abs(i - 1) * 0.15, (i % 2 === 0 ? 0.28 : -0.26));
    cap.scale.set(1.2, 0.55, 1.1);
    g.add(cap);
  }
  return g;
}

/**
 * Cinematic Jungle Obstacle 2: Toppling Giant Rainforest Tree
 */
export function createFallingJungleTree(textures: ProceduralTextures): FallingTreeRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.2, 2.2, 0.48);

  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.95 });
  const leafA = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
  const leafB = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.82 });

  // Splintered stump anchored at ground
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.65, 1.25, 8), barkMat);
  stump.position.y = 0.62;
  stump.castShadow = true;
  root.add(stump);

  // Hinged trunk that topples dramatically across the trail!
  const hinge = new THREE.Group();
  hinge.position.set(0, 1.05, 0);
  root.add(hinge);

  const trunkLen = 7.4;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, trunkLen, 9), barkMat);
  trunk.position.y = trunkLen / 2;
  trunk.castShadow = true;
  hinge.add(trunk);

  // Mossy branches & leafy crown
  for (let i = 0; i < 4; i++) {
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.55 - i * 0.16, 1),
      i % 2 === 0 ? leafA : leafB,
    );
    crown.scale.set(1.3, 0.72, 1.2);
    crown.position.set((i % 2 === 0 ? 0.55 : -0.55), trunkLen - 0.9 + i * 0.45, (i - 1.5) * 0.5);
    crown.castShadow = true;
    hinge.add(crown);
  }

  return { root, hinge };
}

/**
 * Cinematic Jungle Obstacle 3: Flooded River Puddle + Armored Jungle Caiman
 */
export function createJungleCaiman(textures: ProceduralTextures): CaimanRig {
  const root = new THREE.Group();

  // Shimmering muddy river puddle on trail
  const puddleGeo = new THREE.CircleGeometry(2.3, 18);
  puddleGeo.rotateX(-Math.PI / 2);
  puddleGeo.scale(1.35, 1, 0.75);
  const puddle = new THREE.Mesh(
    puddleGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0x3b4d2b,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85,
    }),
  );
  puddle.position.y = 0.035;
  root.add(puddle);

  const body = new THREE.Group();
  root.add(body);

  const scaleMat = new THREE.MeshStandardMaterial({ color: 0x2f4f24, roughness: 0.72 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0x84a955, roughness: 0.78 });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
  });

  // Armored torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 1.85), scaleMat);
  torso.position.set(0, 0.28, 0);
  torso.castShadow = true;
  body.add(torso);

  // Dorsal osteoderm ridge spikes
  for (let i = -3; i <= 3; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), bellyMat);
    spike.position.set(0, 0.49, i * 0.24);
    body.add(spike);
  }

  // Head & Snapping Jaw (-Z forward in local space)
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.78), scaleMat);
  skull.position.set(0, 0.32, -1.25);
  skull.castShadow = true;
  body.add(skull);

  for (const sx of [-0.18, 0.18]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeMat);
    eye.position.set(sx, 0.44, -1.04);
    body.add(eye);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, 0.2, -0.92);
  const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.72), bellyMat);
  lowerJaw.position.set(0, -0.02, -0.34);
  jaw.add(lowerJaw);
  body.add(jaw);

  // Articulated Whipping Tail (+Z)
  const tail = new THREE.Group();
  tail.position.set(0, 0.24, 0.92);
  const tailSeg = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.55, 6), scaleMat);
  tailSeg.rotation.x = Math.PI / 2;
  tailSeg.position.z = 0.78;
  tailSeg.castShadow = true;
  tail.add(tailSeg);
  body.add(tail);

  // 4 sprawling legs
  for (const [lx, lz] of [
    [-0.44, -0.62],
    [0.44, -0.62],
    [-0.44, 0.62],
    [0.44, 0.62],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.22), scaleMat);
    leg.position.set(lx, 0.16, lz);
    body.add(leg);
  }

  return { root, body, tail, jaw };
}

/**
 * Cinematic Jungle Obstacle 4: Collapsing Ancient Temple Stone Totem Pillar
 */
export function createAncientRuinObstacle(textures: ProceduralTextures): RuinPillarRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.2, 2.2, 0.52);

  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.stoneRuin,
    roughness: 0.9,
    metalness: 0.05,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.32,
    metalness: 0.72,
  });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 1.5), stoneMat);
  plinth.position.y = 0.38;
  plinth.castShadow = true;
  root.add(plinth);

  const column = new THREE.Group();
  column.position.y = 0.75;
  root.add(column);

  const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.05, 4.4, 1.05), stoneMat);
  shaft.position.y = 2.2;
  shaft.castShadow = true;
  column.add(shaft);

  const goldBand = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.34, 1.14), goldTrimMat);
  goldBand.position.y = 3.6;
  column.add(goldBand);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.6, 1.38), stoneMat);
  crown.position.y = 4.6;
  crown.castShadow = true;
  column.add(crown);

  return { root, column };
}

/**
 * Glossy Jungle Trail Mud Puddle (environmental surface detail)
 */
export function createJungleMudPuddle(width: number, length: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(1, 16);
  geo.rotateX(-Math.PI / 2);
  geo.scale(width, 1, length);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color: 0x3b2c1a,
      roughness: 0.1,
      metalness: 0.18,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.82,
    }),
  );
  mesh.position.y = 0.032;
  return mesh;
}

/**
 * Overgrown Ancient Stone Temple Ruins on Jungle Trail Perimeter
 */
export function createAncientRuinsBackdrop(textures: ProceduralTextures): THREE.Group {
  const ruin = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.stoneRuin,
    roughness: 0.92,
  });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.9 });

  for (const sx of [-1.4, 1.4]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.8, 1.1), stoneMat);
    col.position.set(sx, 2.4, 0);
    col.castShadow = true;
    ruin.add(col);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.95, 1.35), stoneMat);
  lintel.position.set(0, 5.1, 0);
  lintel.castShadow = true;
  ruin.add(lintel);

  const vineCap = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), mossMat);
  vineCap.scale.set(1.6, 0.45, 0.9);
  vineCap.position.set(0.4, 5.65, 0);
  ruin.add(vineCap);

  return ruin;
}

/**
 * Rival 4x4 Off-Road Chaser SUV (hunts the Jungle Jeep after 3 minutes!)
 */
export function createJungleChaser(textures: ProceduralTextures): PoliceRig {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.5, 5.1, 0.62);

  const bodyTilt = new THREE.Group();
  root.add(bodyTilt);

  const gunmetalMat = new THREE.MeshPhysicalMaterial({
    color: 0x18181b,
    roughness: 0.28,
    metalness: 0.55,
    clearcoat: 0.75,
    envMapIntensity: 1.4,
  });
  const crimsonMat = new THREE.MeshPhysicalMaterial({
    color: 0xb91c1c,
    roughness: 0.3,
    metalness: 0.35,
    clearcoat: 0.8,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.78, metalness: 0.4 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x090d16, roughness: 0.1, clearcoat: 1.0 });

  // Aggressive lifted 4x4 Interceptor SUV body
  const hullGeo = extrudeCarProfile(
    [
      [-2.28, 0.48],
      [-2.28, 1.18],
      [-1.2, 1.32],
      [-0.58, 1.92],
      [1.75, 1.9],
      [2.22, 1.3],
      [2.24, 0.48],
    ],
    1.96,
    0.055,
  );
  const hull = new THREE.Mesh(hullGeo, gunmetalMat);
  hull.castShadow = true;
  bodyTilt.add(hull);

  // Crimson racing / hunter stripes along flanks & hood
  const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.06, 1.15), crimsonMat);
  hoodStripe.position.set(0, 1.3, -1.65);
  bodyTilt.add(hoodStripe);

  for (const sx of [-0.99, 0.99]) {
    const flankStripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 3.6), crimsonMat);
    flankStripe.position.set(sx, 0.96, 0);
    bodyTilt.add(flankStripe);
  }

  // Tinted armored cabin windows
  const glassGeo = extrudeCarProfile(
    [
      [-1.1, 1.34],
      [-0.55, 1.84],
      [1.65, 1.82],
      [2.08, 1.34],
    ],
    1.98,
    0.01,
  );
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.scale.set(1.01, 0.92, 0.92);
  bodyTilt.add(glass);

  // Heavy spiked steel ramming bullbar
  const bullBar = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.44, 0.28), darkSteelMat);
  bullBar.position.set(0, 0.7, -2.42);
  bodyTilt.add(bullBar);

  // Fierce amber-white headlights
  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfde047,
    emissiveIntensity: 1.8,
  });
  for (const sx of [-0.72, 0.72]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), hlMat);
    hl.position.set(sx, 0.92, -2.31);
    bodyTilt.add(hl);
  }

  // Flashing Crimson & Amber Chase Beacon Lightbar
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.09, 0.26), darkSteelMat);
  barBase.position.set(0, 1.96, -0.15);
  bodyTilt.add(barBase);

  const redBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0xff0000,
    emissiveIntensity: 2.8,
  });
  const blueBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.2,
  });

  const redPod = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.24), redBeaconMat);
  redPod.position.set(-0.34, 2.04, -0.15);
  bodyTilt.add(redPod);

  const bluePod = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.24), blueBeaconMat);
  bluePod.position.set(0.34, 2.04, -0.15);
  bodyTilt.add(bluePod);

  const redLight = new THREE.PointLight(0xff2222, 4.0, 15);
  redLight.position.set(-0.45, 2.35, -0.15);
  bodyTilt.add(redLight);

  const blueLight = new THREE.PointLight(0xf59e0b, 0, 15);
  blueLight.position.set(0.45, 2.35, -0.15);
  bodyTilt.add(blueLight);

  const wheels: THREE.Object3D[] = [];
  for (const [wx, wz] of [
    [-1.02, -1.44],
    [1.02, -1.44],
    [-1.02, 1.4],
    [1.02, 1.4],
  ]) {
    const w = createWheel(0.44, 0.3, 0xdc2626);
    w.position.set(wx, 0.44, wz);
    root.add(w);
    wheels.push(w);
  }

  return { root, bodyTilt, wheels, redBeaconMat, blueBeaconMat, redLight, blueLight };
}

/**
 * Glowing Bioluminescent Crystal / Flora Cluster (for Night Jungle Realm)
 */
export function createBioluminescentCluster(seed: number): THREE.Group {
  const g = new THREE.Group();
  const palette = [0x22d3ee, 0x34d399, 0xa855f7];
  const glowHex = palette[Math.abs(seed) % palette.length];
  const crystalMat = new THREE.MeshStandardMaterial({
    color: glowHex,
    emissive: glowHex,
    emissiveIntensity: 1.65,
    roughness: 0.2,
  });

  for (let i = 0; i < 3; i++) {
    const h = 0.8 + ((seed + i) % 3) * 0.45;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.24, h, 5), crystalMat);
    shard.position.set((i - 1) * 0.35, h * 0.45, (i % 2 === 0 ? 0.18 : -0.18));
    shard.rotation.z = (i - 1) * 0.25;
    g.add(shard);
  }
  return g;
}

/**
 * Tropical Avenue Streetlight (illuminates Sunset & Neon Night Urban Realms)
 */
export function createStreetLamp(): THREE.Group {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.35 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.9,
  });

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.4, 8), poleMat);
  post.position.y = 2.7;
  g.add(post);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), poleMat);
  arm.position.set(0.7, 5.35, 0);
  g.add(arm);

  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.24), bulbMat);
  lamp.position.set(1.32, 5.26, 0);
  g.add(lamp);

  return g;
}

/**
 * Rolling Giant Jungle Timber Log (spin-ready composite log with bark, rings, moss & branch stubs)
 */
export function createRollingLog(textures: ProceduralTextures): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 3.4, 1.8, 0.55);

  const logBody = new THREE.Group();
  logBody.position.y = 0.68;
  root.add(logBody);

  const barkMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1b, roughness: 0.94, metalness: 0.02 });
  const woodEndMat = new THREE.MeshStandardMaterial({ color: 0xd6b07c, roughness: 0.78 });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.88 });

  const trunkGeo = new THREE.CylinderGeometry(0.62, 0.68, 3.2, 12);
  trunkGeo.rotateZ(Math.PI / 2);
  const trunk = new THREE.Mesh(trunkGeo, barkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  logBody.add(trunk);

  for (const sx of [-1.61, 1.61]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.04, 12), woodEndMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = sx;
    logBody.add(cap);
  }

  for (const [mx, my, mz] of [
    [-0.7, 0.56, 0.2],
    [0.55, -0.52, -0.25],
    [0.1, 0.48, -0.38],
  ]) {
    const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), mossMat);
    moss.scale.set(1.5, 0.45, 0.9);
    moss.position.set(mx, my, mz);
    logBody.add(moss);
  }

  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.55, 6), barkMat);
  stub.position.set(0.45, 0.74, 0.18);
  stub.rotation.x = 0.45;
  logBody.add(stub);

  return root;
}

/**
 * Broken-Down / Wrecked Car Obstacle (rusted/overgrown in jungle, blinking hazards in city/taxi/flota)
 */
export function createWreckedCar(textures: ProceduralTextures, isJungle: boolean): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.35, 4.7, 0.6);

  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.z = isJungle ? 0.14 : 0.05;
  tiltGroup.rotation.y = isJungle ? 0.28 : -0.14;
  root.add(tiltGroup);

  const hullMat = new THREE.MeshStandardMaterial({
    color: isJungle ? 0x7c4a2d : 0x64748b,
    roughness: isJungle ? 0.88 : 0.52,
    metalness: 0.35,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85, metalness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, opacity: 0.72, transparent: true });

  const hullGeo = extrudeCarProfile(
    [
      [-2.1, 0.24],
      [-2.1, 0.72],
      [-1.12, 0.84],
      [-0.48, 1.38],
      [0.72, 1.38],
      [1.36, 0.88],
      [2.05, 0.82],
      [2.08, 0.26],
    ],
    1.76,
    0.05,
  );
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.castShadow = true;
  tiltGroup.add(hull);

  const winGeo = extrudeCarProfile(
    [
      [-1.02, 0.88],
      [-0.44, 1.32],
      [0.66, 1.32],
      [1.26, 0.9],
    ],
    1.78,
    0.01,
  );
  const glass = new THREE.Mesh(winGeo, glassMat);
  glass.scale.set(1.01, 0.9, 0.9);
  tiltGroup.add(glass);

  // Propped-open crooked hood revealing engine block
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.08, 0.96), hullMat);
  hood.position.set(0, 1.16, -1.42);
  hood.rotation.x = -0.58;
  hood.castShadow = true;
  tiltGroup.add(hood);

  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.36, 0.75), darkMat);
  engine.position.set(0, 0.84, -1.62);
  tiltGroup.add(engine);

  // Hazard blinker lights (or vines in jungle)
  if (isJungle) {
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.9 });
    const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), vineMat);
    moss.scale.set(1.6, 0.38, 2.2);
    moss.position.set(0.2, 1.42, 0.1);
    tiltGroup.add(moss);
  } else {
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
    });
    for (const sx of [-0.66, 0.66]) {
      const hLight = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.08), hazardMat);
      hLight.position.set(sx, 0.68, 2.1);
      tiltGroup.add(hLight);
    }
  }

  // 3 wheels (one front wheel missing/sunk for broken-down silhouette)
  for (const [wx, wz] of [
    [-0.84, -1.3],
    [-0.84, 1.3],
    [0.84, 1.3],
  ]) {
    const w = createWheel(0.32, 0.2, 0x52525b);
    w.position.set(wx, 0.32, wz);
    tiltGroup.add(w);
  }

  return root;
}

/**
 * Deep Mud Bog / Flooded Street Slick Obstacle (slows vehicle & splashes mud!)
 */
export function createMudPit(textures: ProceduralTextures, isUrbanSlick: boolean): THREE.Group {
  const g = new THREE.Group();

  const rimMat = new THREE.MeshStandardMaterial({
    color: isUrbanSlick ? 0x52525b : 0x5c3a21,
    roughness: 0.94,
  });
  const poolMat = new THREE.MeshPhysicalMaterial({
    color: isUrbanSlick ? 0x1e293b : 0x3a2614,
    roughness: 0.08,
    metalness: 0.22,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.9,
  });

  const rimGeo = new THREE.CylinderGeometry(2.15, 2.45, 0.14, 14);
  rimGeo.scale(1.05, 1, 1.42);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 0.04;
  rim.receiveShadow = true;
  g.add(rim);

  const poolGeo = new THREE.CircleGeometry(1.92, 16);
  poolGeo.rotateX(-Math.PI / 2);
  poolGeo.scale(1.02, 1, 1.38);
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.position.y = 0.115;
  g.add(pool);

  if (isUrbanSlick) {
    // Warning traffic cone on rim
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.58, 8), coneMat);
    cone.position.set(1.65, 0.32, 0.8);
    cone.castShadow = true;
    g.add(cone);
  } else {
    // Half-submerged jungle driftwood & muddy stones
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.92 });
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.8, 7), woodMat);
    stick.rotation.z = Math.PI / 2;
    stick.rotation.y = 0.45;
    stick.position.set(-0.35, 0.16, 0.4);
    g.add(stick);

    const rockMat = new THREE.MeshStandardMaterial({ map: textures.cliffRock, roughness: 0.9 });
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), rockMat);
    stone.position.set(0.95, 0.18, -0.75);
    g.add(stone);
  }

  return g;
}

/**
 * Roadblock Barricade (Tribal Spiked Log Barricade in Jungle; Roadwork Sawhorse + Cones in Urban/Taxi)
 */
export function createBarricade(textures: ProceduralTextures, isJungle: boolean): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, textures.contactShadow, 3.0, 1.4, 0.5);

  if (isJungle) {
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.92 });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 });

    // Crossed wooden stakes + heavy crossbar + supply crate
    for (const sx of [-1.05, 0, 1.05]) {
      const s1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.55, 6), logMat);
      s1.position.set(sx, 0.68, -0.1);
      s1.rotation.x = 0.35;
      s1.castShadow = true;
      g.add(s1);

      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 6), redMat);
      tip.position.set(sx, 1.28, 0.14);
      tip.rotation.x = 0.35;
      g.add(tip);
    }

    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.26, 0.24), crateMat);
    beam.position.set(0, 0.62, 0);
    beam.castShadow = true;
    g.add(beam);

    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 0.75), crateMat);
    crate.position.set(-0.55, 0.36, 0.25);
    crate.castShadow = true;
    g.add(crate);
  } else {
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });

    const block = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.82, 0.52), barrierMat);
    block.position.set(0, 0.41, 0);
    block.castShadow = true;
    g.add(block);

    for (const sx of [-0.75, 0, 0.75]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.84, 0.55), darkMat);
      stripe.position.set(sx, 0.41, 0);
      g.add(stripe);
    }

    for (const sx of [-1.45, 1.45]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.56, 8), coneMat);
      cone.position.set(sx, 0.28, 0.28);
      cone.castShadow = true;
      g.add(cone);
    }
  }

  return g;
}

/**
 * Armed Jungle Raider Buggy (weaves ahead of the Jeep and shoots flaming arrows!)
 */
export function createRaiderBuggy(textures: ProceduralTextures): {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  turret: THREE.Group;
} {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 2.25, 4.2, 0.55);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x7f1d1d,
    roughness: 0.42,
    metalness: 0.35,
    clearcoat: 0.45,
  });
  const cageMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.7, metalness: 0.45 });
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.75 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.34, 3.65), cageMat);
  chassis.position.y = 0.52;
  chassis.castShadow = true;
  root.add(chassis);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.46, 1.35), bodyMat);
  hood.position.set(0, 0.88, -0.98);
  hood.castShadow = true;
  root.add(hood);

  const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.44, 1.5), bodyMat);
  rearDeck.position.set(0, 0.9, 0.98);
  rearDeck.castShadow = true;
  root.add(rearDeck);

  // Roll cage & spiky bullbar
  for (const sx of [-0.74, 0.74]) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 6), cageMat);
    bar.position.set(sx, 1.48, 0.08);
    root.add(bar);
  }
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.08, 1.1), cageMat);
  topBar.position.set(0, 1.94, 0.12);
  root.add(topBar);

  // Rear mounted crossbow / arrow launcher turret aimed backward (+Z) at player!
  const turret = new THREE.Group();
  turret.position.set(0, 1.28, 1.15);
  const bowMount = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.28, 8), cageMat);
  turret.add(bowMount);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.95), cageMat);
  rail.position.set(0, 0.18, 0.25);
  turret.add(rail);
  const bowLimb = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.1), boneMat);
  bowLimb.position.set(0, 0.18, 0.62);
  turret.add(bowLimb);
  root.add(turret);

  const wheels: THREE.Object3D[] = [];
  for (const [wx, wz] of [
    [-0.92, -1.25],
    [0.92, -1.25],
    [-0.92, 1.22],
    [0.92, 1.22],
  ]) {
    const w = createWheel(0.4, 0.26, 0xf97316);
    w.position.set(wx, 0.4, wz);
    root.add(w);
    wheels.push(w);
  }

  return { root, wheels, turret };
}

/**
 * Feathered Flaming Raider Arrow Projectile
 */
export function createArrowMesh(): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 1.45, 6),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 }),
  );
  shaft.rotation.x = Math.PI / 2;
  g.add(shaft);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.34, 6),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xef4444,
      emissiveIntensity: 1.9,
    }),
  );
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 0.82;
  g.add(tip);

  const fletch = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.04, 0.32),
    new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xf59e0b, emissiveIntensity: 0.7 }),
  );
  fletch.position.z = -0.6;
  g.add(fletch);

  return g;
}

/**
 * Glowing Machine Gun Tracer Bullet
 */
export function createBulletMesh(): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.055, 0.055, 0.95, 6);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  return new THREE.Mesh(geo, mat);
}

/**
 * Trapezoidal UV-aligned Road Quad for seamless Fork Splits & Merges
 */
export function createRoadQuadMesh(
  xBackL: number,
  xBackR: number,
  xFrontL: number,
  xFrontR: number,
  length: number,
  mat: THREE.Material,
  uScale = 1,
  vScale = 2,
): THREE.Mesh {
  const hz = length / 2;
  const positions = new Float32Array([
    xBackL, 0, hz,
    xBackR, 0, hz,
    xFrontR, 0, -hz,
    xFrontL, 0, -hz,
  ]);
  const normals = new Float32Array([
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
  ]);
  const uvs = new Float32Array([
    0, 0,
    uScale, 0,
    uScale, vScale,
    0, vScale,
  ]);
  const indices = [0, 1, 2, 0, 2, 3];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Overhead Dual-Path Fork Junction Sign Arch ("← LEFT PATH | RIGHT PATH →")
 */
export function createForkSignArch(
  leftLabel: string,
  leftBonus: string,
  rightLabel: string,
  rightBonus: string,
  accentHex = 0x10b981,
): THREE.Group {
  const arch = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.72, roughness: 0.35 });

  for (const sx of [-10.4, 10.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 6.2, 8), postMat);
    post.position.set(sx, 3.1, 0);
    post.castShadow = true;
    arch.add(post);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 1024, 192);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 1012, 180);

  // Center divider
  ctx.fillStyle = '#facc15';
  ctx.fillRect(508, 12, 8, 168);

  // Left half
  ctx.fillStyle = '#065f46';
  ctx.fillRect(16, 16, 484, 160);
  ctx.fillStyle = '#fde047';
  ctx.font = '900 34px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`← ${leftLabel}`, 258, 68);
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(leftBonus, 258, 126);

  // Right half
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(524, 16, 484, 160);
  ctx.fillStyle = '#fde047';
  ctx.font = '900 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${rightLabel} →`, 766, 68);
  ctx.fillStyle = '#bfdbfe';
  ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(rightBonus, 766, 126);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.chunkLocal = true;
  const boardMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.3,
    roughness: 0.35,
  });
  const sideMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.45 });

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(20.6, 2.35, 0.55),
    [sideMat, sideMat, sideMat, sideMat, boardMat, boardMat],
  );
  board.position.set(0, 5.5, 0);
  board.castShadow = true;
  arch.add(board);

  return arch;
}

/**
 * High-visibility Collectible Road Pickups:
 * - fuelCan: Red Jerrycan (+Fuel)
 * - nitro: Twin Cyan NOS Booster (Overdrive Speed + Turbo)
 * - shield: Gold/Emerald Armor Core (Repair + Impact Shield)
 * - magnet: Magenta Electromagnet Coil (Auto-pull Fuel/Boosters + Cooldown/Time Bonus)
 */
export function createRoadPickupMesh(
  textures: ProceduralTextures,
  kind: RoadPickupKind,
): { root: THREE.Group; spinGroup: THREE.Group; ringMat: THREE.MeshBasicMaterial } {
  const root = new THREE.Group();
  addContactShadow(root, textures.contactShadow, 1.85, 1.85, 0.45);

  const ringColor =
    kind === 'fuelCan'
      ? 0xf59e0b
      : kind === 'nitro'
        ? 0x38bdf8
        : kind === 'shield'
          ? 0xfacc15
          : 0xe879f9;

  const ringMat = new THREE.MeshBasicMaterial({
    color: ringColor,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const baseRing = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.94, 24), ringMat);
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.05;
  root.add(baseRing);

  const spinGroup = new THREE.Group();
  spinGroup.position.y = 0.85;
  root.add(spinGroup);

  if (kind === 'fuelCan') {
    const redMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      roughness: 0.34,
      metalness: 0.25,
      clearcoat: 0.45,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.3,
    });
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      roughness: 0.4,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.65, metalness: 0.4 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.92, 0.44), redMat);
    body.castShadow = true;
    spinGroup.add(body);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.79, 0.22, 0.46), yellowMat);
    stripe.position.y = 0.04;
    spinGroup.add(stripe);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.16), redMat);
    handle.position.set(-0.1, 0.52, 0);
    spinGroup.add(handle);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 10), darkMat);
    cap.position.set(0.24, 0.5, 0);
    spinGroup.add(cap);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.065, 0.34, 8), yellowMat);
    nozzle.position.set(0.35, 0.62, 0);
    nozzle.rotation.z = -0.55;
    spinGroup.add(nozzle);
  } else if (kind === 'nitro') {
    const cyanMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.22,
      metalness: 0.72,
      clearcoat: 0.75,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.45,
    });
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });

    for (const sx of [-0.21, 0.21]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.86, 12), cyanMat);
      tank.position.set(sx, 0, 0);
      tank.castShadow = true;
      spinGroup.add(tank);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), cyanMat);
      dome.position.set(sx, 0.43, 0);
      spinGroup.add(dome);

      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.16, 8), brassMat);
      valve.position.set(sx, 0.64, 0);
      spinGroup.add(valve);
    }

    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.4), bandMat);
    strap.position.y = 0.05;
    spinGroup.add(strap);
  } else if (kind === 'shield') {
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      roughness: 0.22,
      metalness: 0.8,
      clearcoat: 0.8,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x34d399,
      emissiveIntensity: 0.9,
      roughness: 0.28,
    });

    const outer = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.11, 10, 18), goldMat);
    outer.castShadow = true;
    spinGroup.add(outer);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), coreMat);
    spinGroup.add(core);

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.12, 0.12), goldMat);
    spinGroup.add(crossbar);
  } else {
    // Magnet / Overcharge Booster
    const magRedMat = new THREE.MeshPhysicalMaterial({
      color: 0xdb2777,
      roughness: 0.28,
      metalness: 0.6,
      emissive: 0xa21caf,
      emissiveIntensity: 0.45,
    });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xf0abfc });

    const uCurve = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.12, 10, 16, Math.PI), magRedMat);
    uCurve.rotation.z = Math.PI;
    uCurve.position.y = 0.08;
    uCurve.castShadow = true;
    spinGroup.add(uCurve);

    for (const sx of [-0.34, 0.34]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.36, 10), magRedMat);
      arm.position.set(sx, 0.24, 0);
      spinGroup.add(arm);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.16, 10), tipMat);
      pole.position.set(sx, 0.48, 0);
      spinGroup.add(pole);
    }

    const sparkRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 6, 20), auraMat);
    sparkRing.rotation.x = Math.PI / 2;
    spinGroup.add(sparkRing);
  }

  return { root, spinGroup, ringMat };
}

/**
 * Exotic Terrain Props: Volcanic Lava Caldera, Futuristic Alien Grid, and Martian Red Canyon
 */
export function createLavaVolcanoSpire(seed: number): THREE.Group {
  const g = new THREE.Group();
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.92,
    metalness: 0.08,
  });
  const charMat = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.85,
  });
  const magmaMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.85,
    roughness: 0.35,
  });

  const h = 7.5 + (seed % 5) * 2.2;
  const r = 2.4 + (seed % 3) * 0.55;

  const base = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1, false), basaltMat);
  base.position.y = h / 2;
  base.rotation.y = (seed * 0.7) % Math.PI;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  const craterGlow = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.32, r * 0.42, 0.45, 7), magmaMat);
  craterGlow.position.y = h * 0.84;
  g.add(craterGlow);

  for (let v = 0; v < 3; v++) {
    const angle = (v / 3) * Math.PI * 2 + (seed % 4);
    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.28, h * 0.65, 0.24), magmaMat);
    vein.position.set(Math.cos(angle) * (r * 0.44), h * 0.36, Math.sin(angle) * (r * 0.44));
    vein.rotation.z = Math.cos(angle) * 0.24;
    vein.rotation.x = -Math.sin(angle) * 0.24;
    g.add(vein);

    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65 + (v % 2) * 0.3, 0), charMat);
    boulder.position.set(Math.cos(angle + 0.7) * (r * 0.92), 0.45, Math.sin(angle + 0.7) * (r * 0.92));
    boulder.castShadow = true;
    g.add(boulder);
  }

  return g;
}

export function createLavaFlowPool(width = 4.2, length = 14): THREE.Group {
  const g = new THREE.Group();
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.92 });
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xfb923c,
    emissive: 0xf97316,
    emissiveIntensity: 1.9,
    roughness: 0.28,
  });
  const crustMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.88 });

  const rim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.7, 0.14, length + 0.7), rimMat);
  rim.position.y = 0.07;
  g.add(rim);

  const core = new THREE.Mesh(new THREE.PlaneGeometry(width, length), lavaMat);
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.16;
  g.add(core);

  for (let i = -1; i <= 1; i++) {
    const island = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), crustMat);
    island.scale.set(1.3, 0.35, 1.1);
    island.position.set(i * 0.45, 0.2, i * (length * 0.24));
    g.add(island);
  }

  return g;
}

export function createAlienMonolith(seed: number): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    metalness: 0.78,
    roughness: 0.26,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: seed % 2 === 0 ? 0x22d3ee : 0xe879f9,
    emissive: seed % 2 === 0 ? 0x06b6d4 : 0xd946ef,
    emissiveIntensity: 1.7,
    roughness: 0.2,
  });

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.05, 0.4, 6), hullMat);
  pad.position.y = 0.2;
  pad.receiveShadow = true;
  g.add(pad);

  const spireH = 8.5 + (seed % 4) * 2.1;
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.15, spireH, 6), hullMat);
  spire.position.y = spireH / 2 + 0.3;
  spire.castShadow = true;
  g.add(spire);

  for (let r = 0; r < 2; r++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35 + r * 0.32, 0.08, 8, 20), neonMat);
    ring.rotation.x = Math.PI / 2 + (r === 0 ? 0.18 : -0.18);
    ring.position.y = spireH * (0.48 + r * 0.24);
    g.add(ring);
  }

  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), neonMat);
  orb.position.y = spireH + 1.15;
  g.add(orb);

  return g;
}

export function createAlienCrystalCluster(seed: number): THREE.Group {
  const g = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.75, metalness: 0.3 });
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: seed % 2 === 0 ? 0x38bdf8 : 0xf472b6,
    emissive: seed % 2 === 0 ? 0x0284c7 : 0xc026d3,
    emissiveIntensity: 1.15,
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 0.9,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.45, 0.28, 7), padMat);
  base.position.y = 0.14;
  g.add(base);

  for (let i = 0; i < 4; i++) {
    const h = 1.6 + ((seed + i) % 3) * 0.75;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.28 + (i % 2) * 0.1, h, 5), crystalMat);
    const a = (i / 4) * Math.PI * 2 + seed * 0.4;
    shard.position.set(Math.cos(a) * 0.42, h / 2 + 0.15, Math.sin(a) * 0.42);
    shard.rotation.z = Math.cos(a) * 0.25;
    shard.rotation.x = -Math.sin(a) * 0.25;
    shard.castShadow = true;
    g.add(shard);
  }

  return g;
}

export function createMarsButte(seed: number): THREE.Group {
  const g = new THREE.Group();
  const redRockMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.92 });
  const ochreMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.88 });
  const dustMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.95 });

  const h = 9 + (seed % 5) * 2.8;
  const rBottom = 4.2 + (seed % 3) * 0.8;
  const rTop = rBottom * 0.56;

  const lower = new THREE.Mesh(new THREE.CylinderGeometry(rBottom * 0.78, rBottom, h * 0.55, 7), dustMat);
  lower.position.y = h * 0.275;
  lower.rotation.y = seed * 0.5;
  lower.castShadow = true;
  lower.receiveShadow = true;
  g.add(lower);

  const upper = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom * 0.76, h * 0.45, 7), redRockMat);
  upper.position.y = h * 0.775;
  upper.rotation.y = seed * 0.5 + 0.2;
  upper.castShadow = true;
  g.add(upper);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(rTop * 0.9, rTop * 1.05, 0.65, 7), ochreMat);
  cap.position.y = h + 0.25;
  g.add(cap);

  for (let b = 0; b < 3; b++) {
    const ang = (b / 3) * Math.PI * 2 + seed;
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 + (b % 2) * 0.3, 0), ochreMat);
    boulder.position.set(Math.cos(ang) * (rBottom * 0.95), 0.5, Math.sin(ang) * (rBottom * 0.95));
    boulder.castShadow = true;
    g.add(boulder);
  }

  return g;
}

export function createMarsHabitatDome(): THREE.Group {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.35 });
  const domeMat = new THREE.MeshPhysicalMaterial({
    color: 0xfef3c7,
    roughness: 0.18,
    metalness: 0.1,
    clearcoat: 0.8,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    metalness: 0.75,
    roughness: 0.22,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xf97316,
    emissiveIntensity: 1.5,
  });

  const foundation = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.6, 12), baseMat);
  foundation.position.y = 0.3;
  foundation.receiveShadow = true;
  g.add(foundation);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.75, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.position.y = 0.55;
  dome.castShadow = true;
  g.add(dome);

  const airlock = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.35, 1.6), baseMat);
  airlock.position.set(-2.9, 0.75, 0);
  airlock.castShadow = true;
  g.add(airlock);

  const solarWing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 3.8), solarMat);
  solarWing.position.set(3.4, 1.25, 0);
  solarWing.rotation.z = -0.32;
  g.add(solarWing);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6), baseMat);
  mast.position.set(0, 3.8, 0);
  g.add(mast);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), beaconMat);
  beacon.position.set(0, 4.95, 0);
  g.add(beacon);

  return g;
}




