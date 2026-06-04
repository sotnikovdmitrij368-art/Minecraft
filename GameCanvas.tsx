import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ImprovedNoise } from '../utils/noise';
import { BLOCK_IDS, BLOCK_CONFIGS, generateAtlasCanvas, getFaceUVs, getCrackTexture } from '../utils/texture';
import { sound } from '../utils/audio';

interface GameCanvasProps {
  activeBlockId: number;
  joystickMove: { x: number; y: number };
  isJumping: boolean;
  isFlying: boolean;
  onToggleFly: () => void;
  flyDirection: number;
  sensitivity: number;
  seed: number;
  isSoundEnabled: boolean;
  onSaveModificationsCount: (count: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  activeBlockId,
  joystickMove,
  isJumping,
  isFlying,
  onToggleFly,
  flyDirection,
  sensitivity,
  seed,
  isSoundEnabled,
  onSaveModificationsCount,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync props to refs to avoid recreating the ThreeJS loop
  const activeBlockIdRef = useRef(activeBlockId);
  const joystickMoveRef = useRef(joystickMove);
  const isJumpingRef = useRef(isJumping);
  const isFlyingRef = useRef(isFlying);
  const onToggleFlyRef = useRef(onToggleFly);
  const flyDirectionRef = useRef(flyDirection);
  const sensitivityRef = useRef(sensitivity);
  const seedRef = useRef(seed);

  // Interaction State Refs
  const isBreakingRef = useRef(false);
  const breakTargetRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const breakTimeRef = useRef(0);
  const lastDigSoundTimeRef = useRef(0);

  // Track user modifications (saved in localStorage)
  const userModificationsRef = useRef<Map<string, number>>(new Map());

  // Performance/Chunk variables
  const chunksRef = useRef<Map<string, Uint8Array>>(new Map());
  const chunkMeshesRef = useRef<Map<string, { opaque: THREE.Mesh; transparent: THREE.Mesh }>>(new Map());
  const chunksToRebuildRef = useRef<Set<string>>(new Set());

  // Keep track of the current chunk the player is in
  const lastPlayerChunkRef = useRef({ cx: 999, cz: 999 });

  // UI state for debug or breaking progress (Russian/English)
  const [debugInfo, setDebugInfo] = useState({ x: 0, y: 0, z: 0, fps: 60, chunkCount: 0 });

  useEffect(() => {
    activeBlockIdRef.current = activeBlockId;
  }, [activeBlockId]);

  useEffect(() => {
    joystickMoveRef.current = joystickMove;
  }, [joystickMove]);

  useEffect(() => {
    isJumpingRef.current = isJumping;
  }, [isJumping]);

  useEffect(() => {
    isFlyingRef.current = isFlying;
  }, [isFlying]);

  useEffect(() => {
    onToggleFlyRef.current = onToggleFly;
  }, [onToggleFly]);

  useEffect(() => {
    flyDirectionRef.current = flyDirection;
  }, [flyDirection]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    seedRef.current = seed;
  }, [seed]);

  useEffect(() => {
    sound.toggle(isSoundEnabled);
  }, [isSoundEnabled]);

  // Load user modifications from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`minecraft_world_mods_${seed}`);
      if (stored) {
        const parsed = JSON.parse(stored) as [string, number][];
        userModificationsRef.current = new Map(parsed);
        onSaveModificationsCount(userModificationsRef.current.size);
      } else {
        userModificationsRef.current = new Map();
        onSaveModificationsCount(0);
      }
    } catch (e) {
      console.error('Failed to load world modifications', e);
    }
  }, [seed]);

  // Main ThreeJS Setup Effect
  useEffect(() => {
    if (!containerRef.current) return;

    // --- Noise & World generation ---
    const noise = new ImprovedNoise(seedRef.current);

    // --- Three.js Components ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const scene = new THREE.Scene();
    
    // Sky color initially light blue
    scene.background = new THREE.Color('#7ec0ee');
    scene.fog = new THREE.FogExp2('#7ec0ee', 0.025);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2 for mobile performance
    containerRef.current.appendChild(renderer.domElement);

    // --- Texture Atlas ---
    const atlasCanvas = generateAtlasCanvas();
    const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
    atlasTexture.magFilter = THREE.NearestFilter;
    atlasTexture.minFilter = THREE.NearestFilter;
    atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
    atlasTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Materials
    const opaqueMaterial = new THREE.MeshLambertMaterial({
      map: atlasTexture,
      side: THREE.FrontSide,
    });

    const transparentMaterial = new THREE.MeshLambertMaterial({
      map: atlasTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      alphaTest: 0.05,
    });

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.75);
    sunLight.position.set(20, 60, 20);
    scene.add(sunLight);

    // --- Sky Box & Time Cycle Sun/Moon Visuals ---
    const skyGroup = new THREE.Group();
    scene.add(skyGroup);

    // Cute Sun box
    const sunGeom = new THREE.BoxGeometry(8, 8, 8);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff280 });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunMesh.position.set(0, 100, 0);
    skyGroup.add(sunMesh);

    // Cute Moon box
    const moonGeom = new THREE.BoxGeometry(6, 6, 6);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe0e8f0 });
    const moonMesh = new THREE.Mesh(moonGeom, moonMat);
    moonMesh.position.set(0, -100, 0);
    skyGroup.add(moonMesh);

    // --- Player Physics & Position ---
    const player = {
      position: new THREE.Vector3(0, 30, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      width: 0.6,
      height: 1.85,
      isOnGround: false,
      yaw: 0.0,
      pitch: 0.0,
    };

    // Find initial player terrain spawn height
    const initialH = getTerrainHeight(0, 0, noise);
    player.position.set(0.5, initialH + 2.0, 0.5);

    // Block highlight outline (wireframe cube)
    const highlightGeom = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const highlightMesh = new THREE.Mesh(highlightGeom, highlightMat);
    highlightMesh.visible = false;
    scene.add(highlightMesh);

    // Crack overlay mesh for breaking
    const crackGeom = new THREE.BoxGeometry(1.008, 1.008, 1.008);
    const crackMat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const crackMesh = new THREE.Mesh(crackGeom, crackMat);
    crackMesh.visible = false;
    scene.add(crackMesh);

    // --- World Voxel Helper Functions ---
    function getChunkKey(cx: number, cz: number): string {
      return `${cx},${cz}`;
    }

    function getTerrainHeight(wx: number, wz: number, noiseGen: ImprovedNoise): number {
      // Procedural height formula
      const n1 = noiseGen.fbm2D(wx * 0.015, wz * 0.015, 3);
      const n2 = noiseGen.fbm2D(wx * 0.05, wz * 0.05, 2) * 0.3;
      let h = Math.floor(16 + (n1 + n2) * 11);
      return Math.max(2, Math.min(60, h));
    }

    function generateChunkData(cx: number, cz: number): Uint8Array {
      const size = 16 * 64 * 16;
      const data = new Uint8Array(size);

      for (let lx = 0; lx < 16; lx++) {
        for (let lz = 0; lz < 16; lz++) {
          const wx = cx * 16 + lx;
          const wz = cz * 16 + lz;
          const heightLimit = getTerrainHeight(wx, wz, noise);

          for (let y = 0; y < 64; y++) {
            const idx = lx + 16 * y + 1024 * lz;
            if (y === 0) {
              data[idx] = BLOCK_IDS.BEDROCK;
            } else if (y < heightLimit - 3) {
              // Stone
              // Randomly spawn coal, gold, diamond inside stone
              const randOre = Math.random();
              if (y < 8 && randOre < 0.012) {
                data[idx] = BLOCK_IDS.DIAMOND_ORE;
              } else if (y < 16 && randOre < 0.025) {
                data[idx] = BLOCK_IDS.GOLD_ORE;
              } else if (y < 28 && randOre < 0.05) {
                data[idx] = BLOCK_IDS.COAL_ORE;
              } else {
                data[idx] = BLOCK_IDS.STONE;
              }
            } else if (y < heightLimit) {
              data[idx] = BLOCK_IDS.DIRT;
            } else if (y === heightLimit) {
              if (heightLimit < 12) {
                data[idx] = BLOCK_IDS.SAND;
              } else {
                data[idx] = BLOCK_IDS.GRASS;
              }
            } else if (y <= 12) {
              // Sea level
              data[idx] = BLOCK_IDS.WATER;
            } else {
              data[idx] = BLOCK_IDS.AIR;
            }
          }
        }
      }

      // Add trees within borders (lx [2..13], lz [2..13] to avoid complex boundaries)
      // This is fast and 100% bug-free
      const treeCount = Math.floor(Math.random() * 2) + 1; // 1-2 trees per chunk
      for (let t = 0; t < treeCount; t++) {
        const tx = Math.floor(Math.random() * 10) + 3;
        const tz = Math.floor(Math.random() * 10) + 3;
        const wx = cx * 16 + tx;
        const wz = cz * 16 + tz;
        const ty = getTerrainHeight(wx, wz, noise);

        // Only grow trees on Grass
        const grassIdx = tx + 16 * ty + 1024 * tz;
        if (data[grassIdx] === BLOCK_IDS.GRASS) {
          const trunkH = Math.floor(Math.random() * 3) + 4; // 4 to 6 tall
          
          // Trunk
          for (let y = 1; y <= trunkH; y++) {
            const trunkY = ty + y;
            if (trunkY < 64) {
              data[tx + 16 * trunkY + 1024 * tz] = BLOCK_IDS.WOOD;
            }
          }

          // Leaves
          const leavesCenterY = ty + trunkH - 1;
          for (let ly = -1; ly <= 2; ly++) {
            const leafY = leavesCenterY + ly;
            if (leafY >= 64 || leafY < 0) continue;

            let radius = 2;
            if (ly === 2) radius = 1; // crown
            if (ly === -1) radius = 1; // lower flare

            for (let dx = -radius; dx <= radius; dx++) {
              for (let dz = -radius; dz <= radius; dz++) {
                // Avoid placing on the trunk itself
                if (dx === 0 && dz === 0 && ly <= 1) continue;

                // Randomize leaf edges
                if (Math.abs(dx) === radius && Math.abs(dz) === radius && Math.random() < 0.4) {
                  continue;
                }

                const lIdx = (tx + dx) + 16 * leafY + 1024 * (tz + dz);
                // Ensure index is valid in 16x16 chunk
                if (tx + dx >= 0 && tx + dx < 16 && tz + dz >= 0 && tz + dz < 16) {
                  // Don't replace wood or stone, only replace air/water
                  if (data[lIdx] === BLOCK_IDS.AIR || data[lIdx] === BLOCK_IDS.WATER) {
                    data[lIdx] = BLOCK_IDS.LEAVES;
                  }
                }
              }
            }
          }
        }
      }

      return data;
    }

    function getBlockAt(x: number, y: number, z: number): number {
      if (y < 0) return BLOCK_IDS.BEDROCK;
      if (y >= 64) return BLOCK_IDS.AIR;

      const blockKey = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
      // Check user modifications first
      if (userModificationsRef.current.has(blockKey)) {
        return userModificationsRef.current.get(blockKey)!;
      }

      const cx = Math.floor(x / 16);
      const cz = Math.floor(z / 16);
      const key = getChunkKey(cx, cz);

      let chunkData = chunksRef.current.get(key);
      if (!chunkData) {
        chunkData = generateChunkData(cx, cz);
        chunksRef.current.set(key, chunkData);
      }

      const lx = ((x % 16) + 16) % 16;
      const lz = ((z % 16) + 16) % 16;
      return chunkData[lx + 16 * y + 1024 * lz];
    }

    function setBlockAt(x: number, y: number, z: number, blockId: number) {
      if (y < 0 || y >= 64) return;

      const blockKey = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
      userModificationsRef.current.set(blockKey, blockId);

      // Save to localStorage
      try {
        localStorage.setItem(
          `minecraft_world_mods_${seedRef.current}`,
          JSON.stringify(Array.from(userModificationsRef.current.entries()))
        );
        onSaveModificationsCount(userModificationsRef.current.size);
      } catch (e) {
        console.error('Failed to save chunk modification', e);
      }

      // Mark chunks for rebuild
      const cx = Math.floor(x / 16);
      const cz = Math.floor(z / 16);
      const key = getChunkKey(cx, cz);
      chunksToRebuildRef.current.add(key);

      // Rebuild neighbors if block is on border
      const lx = ((x % 16) + 16) % 16;
      const lz = ((z % 16) + 16) % 16;
      if (lx === 0) chunksToRebuildRef.current.add(getChunkKey(cx - 1, cz));
      if (lx === 15) chunksToRebuildRef.current.add(getChunkKey(cx + 1, cz));
      if (lz === 0) chunksToRebuildRef.current.add(getChunkKey(cx, cz - 1));
      if (lz === 15) chunksToRebuildRef.current.add(getChunkKey(cx, cz + 1));
    }

    function isBlockSolid(x: number, y: number, z: number): boolean {
      const id = getBlockAt(x, y, z);
      return BLOCK_CONFIGS[id]?.isSolid ?? false;
    }

    // --- Chunk Mesh Builder ---
    function buildChunkMesh(cx: number, cz: number) {
      const key = getChunkKey(cx, cz);
      
      // Ensure data exists
      let chunkData = chunksRef.current.get(key);
      if (!chunkData) {
        chunkData = generateChunkData(cx, cz);
        chunksRef.current.set(key, chunkData);
      }

      // Remove existing meshes
      const oldMeshes = chunkMeshesRef.current.get(key);
      if (oldMeshes) {
        scene.remove(oldMeshes.opaque);
        scene.remove(oldMeshes.transparent);
        oldMeshes.opaque.geometry.dispose();
        oldMeshes.transparent.geometry.dispose();
        chunkMeshesRef.current.delete(key);
      }

      // Buffers for accumulating faces
      // Opaque
      const opPositions: number[] = [];
      const opNormals: number[] = [];
      const opUvs: number[] = [];
      const opIndices: number[] = [];

      // Transparent/Water/Glass/Leaves
      const trPositions: number[] = [];
      const trNormals: number[] = [];
      const trUvs: number[] = [];
      const trIndices: number[] = [];

      // Loop through chunk
      for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
          for (let y = 0; y < 64; y++) {
            const wx = cx * 16 + x;
            const wz = cz * 16 + z;
            const blockId = getBlockAt(wx, y, wz);

            if (blockId === BLOCK_IDS.AIR) continue;

            const config = BLOCK_CONFIGS[blockId];
            if (!config) continue;

            const isTransparent = config.isTransparent;

            // Target arrays
            const posArr = isTransparent ? trPositions : opPositions;
            const normArr = isTransparent ? trNormals : opNormals;
            const uvArr = isTransparent ? trUvs : opUvs;
            const indArr = isTransparent ? trIndices : opIndices;

            // Check neighbors
            const neighbors = [
              { dx: 1,  dy: 0,  dz: 0,  faceIdx: 0, faceType: 'side' as const, normal: [1, 0, 0] },   // +X
              { dx: -1, dy: 0,  dz: 0,  faceIdx: 1, faceType: 'side' as const, normal: [-1, 0, 0] },  // -X
              { dx: 0,  dy: 1,  dz: 0,  faceIdx: 2, faceType: 'top' as const, normal: [0, 1, 0] },   // +Y
              { dx: 0,  dy: -1, dz: 0,  faceIdx: 3, faceType: 'bottom' as const, normal: [0, -1, 0] }, // -Y
              { dx: 0,  dy: 0,  dz: 1,  faceIdx: 4, faceType: 'side' as const, normal: [0, 0, 1] },   // +Z
              { dx: 0,  dy: 0,  dz: -1, faceIdx: 5, faceType: 'side' as const, normal: [0, 0, -1] },  // -Z
            ];

            for (const n of neighbors) {
              const nx = wx + n.dx;
              const ny = y + n.dy;
              const nz = wz + n.dz;

              const neighborId = getBlockAt(nx, ny, nz);
              const neighborConfig = BLOCK_CONFIGS[neighborId];

              // Face is drawn if neighbor is transparent
              // and if they are different block IDs (e.g. water blocks next to each other don't draw interior faces)
              let drawFace = false;
              if (neighborId === BLOCK_IDS.AIR) {
                drawFace = true;
              } else if (neighborConfig && neighborConfig.isTransparent) {
                // Opaque blocks draw against all transparent blocks
                if (!isTransparent) {
                  drawFace = true;
                } else {
                  // Transparent blocks only draw against air or different transparent blocks
                  if (blockId !== neighborId) {
                    drawFace = true;
                  }
                }
              }

              if (drawFace) {
                const startIndex = posArr.length / 3;

                // Add vertices
                let vertices: number[] = [];
                switch (n.faceIdx) {
                  case 0: // +X
                    vertices = [
                      wx + 1, y,     wz + 1, // BL
                      wx + 1, y,     wz,     // BR
                      wx + 1, y + 1, wz + 1, // TL
                      wx + 1, y + 1, wz,     // TR
                    ];
                    break;
                  case 1: // -X
                    vertices = [
                      wx,     y,     wz,     // BL
                      wx,     y,     wz + 1, // BR
                      wx,     y + 1, wz,     // TL
                      wx,     y + 1, wz + 1, // TR
                    ];
                    break;
                  case 2: // +Y (Top)
                    vertices = [
                      wx,     y + 1, wz + 1, // BL
                      wx + 1, y + 1, wz + 1, // BR
                      wx,     y + 1, wz,     // TL
                      wx + 1, y + 1, wz,     // TR
                    ];
                    break;
                  case 3: // -Y (Bottom)
                    vertices = [
                      wx,     y,     wz,     // BL
                      wx + 1, y,     wz,     // BR
                      wx,     y,     wz + 1, // TL
                      wx + 1, y,     wz + 1, // TR
                    ];
                    break;
                  case 4: // +Z
                    vertices = [
                      wx,     y,     wz + 1, // BL
                      wx + 1, y,     wz + 1, // BR
                      wx,     y + 1, wz + 1, // TL
                      wx + 1, y + 1, wz + 1, // TR
                    ];
                    break;
                  case 5: // -Z
                    vertices = [
                      wx + 1, y,     wz,     // BL
                      wx,     y,     wz,     // BR
                      wx + 1, y + 1, wz,     // TL
                      wx,     y + 1, wz,     // TR
                    ];
                    break;
                }

                posArr.push(...vertices);

                // Add normal
                for (let i = 0; i < 4; i++) {
                  normArr.push(...n.normal);
                }

                // Add UVs
                const uvs = getFaceUVs(blockId, n.faceType);
                uvArr.push(...uvs);

                // Add indices for 2 triangles
                indArr.push(
                  startIndex, startIndex + 1, startIndex + 3,
                  startIndex, startIndex + 3, startIndex + 2
                );
              }
            }
          }
        }
      }

      // Build geometries
      const opaqueGeom = new THREE.BufferGeometry();
      if (opPositions.length > 0) {
        opaqueGeom.setAttribute('position', new THREE.Float32BufferAttribute(opPositions, 3));
        opaqueGeom.setAttribute('normal', new THREE.Float32BufferAttribute(opNormals, 3));
        opaqueGeom.setAttribute('uv', new THREE.Float32BufferAttribute(opUvs, 2));
        opaqueGeom.setIndex(opIndices);
      }

      const transGeom = new THREE.BufferGeometry();
      if (trPositions.length > 0) {
        transGeom.setAttribute('position', new THREE.Float32BufferAttribute(trPositions, 3));
        transGeom.setAttribute('normal', new THREE.Float32BufferAttribute(trNormals, 3));
        transGeom.setAttribute('uv', new THREE.Float32BufferAttribute(trUvs, 2));
        transGeom.setIndex(trIndices);
      }

      // Create meshes
      const opaqueMesh = new THREE.Mesh(opaqueGeom, opaqueMaterial);
      const transparentMesh = new THREE.Mesh(transGeom, transparentMaterial);

      // Add to scene
      scene.add(opaqueMesh);
      scene.add(transparentMesh);

      // Save meshes
      chunkMeshesRef.current.set(key, { opaque: opaqueMesh, transparent: transparentMesh });
    }

    // --- Initial Terrain Generation Around Player ---
    const RENDER_RADIUS = 2; // load 5x5 chunks around player
    
    function loadChunksAroundPlayer(playerX: number, playerZ: number) {
      const pcx = Math.floor(playerX / 16);
      const pcz = Math.floor(playerZ / 16);

      if (pcx === lastPlayerChunkRef.current.cx && pcz === lastPlayerChunkRef.current.cz) {
        return; // still in the same chunk
      }
      lastPlayerChunkRef.current = { cx: pcx, cz: pcz };

      const activeKeys = new Set<string>();

      // Generate terrain data and load visible chunks
      for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
        for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
          const cx = pcx + dx;
          const cz = pcz + dz;
          const key = getChunkKey(cx, cz);
          activeKeys.add(key);

          // If chunk not built yet, queue it or build it
          if (!chunkMeshesRef.current.has(key)) {
            chunksToRebuildRef.current.add(key);
          }
        }
      }

      // Clean up far away meshes
      for (const [key, meshes] of chunkMeshesRef.current.entries()) {
        if (!activeKeys.has(key)) {
          scene.remove(meshes.opaque);
          scene.remove(meshes.transparent);
          meshes.opaque.geometry.dispose();
          meshes.transparent.geometry.dispose();
          chunkMeshesRef.current.delete(key);
        }
      }
    }

    // Trigger initial chunk loading
    loadChunksAroundPlayer(player.position.x, player.position.z);

    // --- Pointer Swipe Look Controls & Block Taps ---
    let isPointerDown = false;
    let pointerId = -1;
    let startPointerPos = { x: 0, y: 0 };
    let lastPointerPos = { x: 0, y: 0 };
    let pointerDownTime = 0;
    let hasMovedSignificantDistance = false;

    // Raycast target references
    let targetedBlockPos: THREE.Vector3 | null = null;
    let placementBlockPos: THREE.Vector3 | null = null;

    const raycaster = new THREE.Raycaster();
    raycaster.far = 7.5; // Max range for mobile crafting (~7 blocks)

    function updateTargetedBlock(screenX: number, screenY: number) {
      // Normalize mouse coordinates: [-1, 1]
      const mouse = new THREE.Vector2(
        (screenX / renderer.domElement.clientWidth) * 2 - 1,
        -(screenY / renderer.domElement.clientHeight) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);

      // Collect all meshes to test against
      const meshesToTest: THREE.Mesh[] = [];
      for (const meshes of chunkMeshesRef.current.values()) {
        if (meshes.opaque.geometry.index) meshesToTest.push(meshes.opaque);
        if (meshes.transparent.geometry.index) meshesToTest.push(meshes.transparent);
      }

      const intersects = raycaster.intersectObjects(meshesToTest);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const normal = hit.face?.normal;
        const point = hit.point;

        if (normal) {
          // Inside the block (subtract slightly from normal)
          const tx = Math.floor(point.x - normal.x * 0.08);
          const ty = Math.floor(point.y - normal.y * 0.08);
          const tz = Math.floor(point.z - normal.z * 0.08);

          targetedBlockPos = new THREE.Vector3(tx, ty, tz);

          // Place position (add to normal)
          const px = tx + Math.round(normal.x);
          const py = ty + Math.round(normal.y);
          const pz = tz + Math.round(normal.z);

          placementBlockPos = new THREE.Vector3(px, py, pz);

          // Update Highlight Box
          highlightMesh.position.set(tx + 0.5, ty + 0.5, tz + 0.5);
          highlightMesh.visible = true;
          return;
        }
      }

      // No hits
      targetedBlockPos = null;
      placementBlockPos = null;
      highlightMesh.visible = false;
    }

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore click on UI overlays
      if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;

      isPointerDown = true;
      pointerId = e.pointerId;
      startPointerPos = { x: e.clientX, y: e.clientY };
      lastPointerPos = { x: e.clientX, y: e.clientY };
      pointerDownTime = Date.now();
      hasMovedSignificantDistance = false;

      // Update targeted block
      updateTargetedBlock(e.clientX, e.clientY);

      if (targetedBlockPos) {
        // Start long-press break timer
        isBreakingRef.current = true;
        breakTargetRef.current = { x: targetedBlockPos.x, y: targetedBlockPos.y, z: targetedBlockPos.z };
        breakTimeRef.current = 0.0;
        lastDigSoundTimeRef.current = 0.0;

        // Position the crack overlay
        crackMesh.position.set(targetedBlockPos.x + 0.5, targetedBlockPos.y + 0.5, targetedBlockPos.z + 0.5);
        crackMesh.visible = true;
        
        // Initial tick sound
        sound.playDigTick();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDown || e.pointerId !== pointerId) return;

      const dx = e.clientX - lastPointerPos.x;
      const dy = e.clientY - lastPointerPos.y;

      lastPointerPos = { x: e.clientX, y: e.clientY };

      const dist = Math.sqrt(
        Math.pow(e.clientX - startPointerPos.x, 2) + Math.pow(e.clientY - startPointerPos.y, 2)
      );

      // Swipe sensitivity
      const sens = 0.003 * sensitivityRef.current;
      player.yaw -= dx * sens;
      player.pitch -= dy * sens;

      // Clamp vertical look
      const pitchLimit = Math.PI / 2.0 - 0.05;
      player.pitch = Math.max(-pitchLimit, Math.min(pitchLimit, player.pitch));

      if (dist > 18) {
        hasMovedSignificantDistance = true;
        // User is swiping to look around, cancel breaking/placing
        isBreakingRef.current = false;
        breakTargetRef.current = null;
        crackMesh.visible = false;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isPointerDown || e.pointerId !== pointerId) return;
      isPointerDown = false;
      pointerId = -1;

      const duration = Date.now() - pointerDownTime;

      // Reset breaking
      isBreakingRef.current = false;
      breakTargetRef.current = null;
      crackMesh.visible = false;

      // Handle Quick Tap for BLOCK PLACEMENT
      if (!hasMovedSignificantDistance && duration < 320) {
        if (placementBlockPos && targetedBlockPos) {
          // Check block collision with player to avoid placing a block inside yourself
          const pBox = getPlayerBoundingBox(player.position);
          const blockBox = {
            minX: placementBlockPos.x,
            maxX: placementBlockPos.x + 1,
            minY: placementBlockPos.y,
            maxY: placementBlockPos.y + 1,
            minZ: placementBlockPos.z,
            maxZ: placementBlockPos.z + 1,
          };

          const intersectsPlayer =
            pBox.minX < blockBox.maxX &&
            pBox.maxX > blockBox.minX &&
            pBox.minY < blockBox.maxY &&
            pBox.maxY > blockBox.minY &&
            pBox.minZ < blockBox.maxZ &&
            pBox.maxZ > blockBox.minZ;

          // Don't place solid blocks inside the player
          const activeConfig = BLOCK_CONFIGS[activeBlockIdRef.current];
          if (!intersectsPlayer || !activeConfig.isSolid) {
            // Cannot place bedrock
            if (activeBlockIdRef.current !== BLOCK_IDS.BEDROCK) {
              setBlockAt(placementBlockPos.x, placementBlockPos.y, placementBlockPos.z, activeBlockIdRef.current);
              sound.playBlockPlace();
              // Update raycast highlight immediately
              updateTargetedBlock(e.clientX, e.clientY);
            }
          }
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // --- Physics Collision Math ---
    function getPlayerBoundingBox(pos: THREE.Vector3) {
      const r = player.width / 2;
      return {
        minX: pos.x - r,
        maxX: pos.x + r,
        minY: pos.y,
        maxY: pos.y + player.height,
        minZ: pos.z - r,
        maxZ: pos.z + r,
      };
    }

    function checkCollision(pos: THREE.Vector3): boolean {
      const box = getPlayerBoundingBox(pos);

      // Check all blocks bounding box overlaps
      const startX = Math.floor(box.minX);
      const endX = Math.floor(box.maxX);
      const startY = Math.floor(box.minY);
      const endY = Math.floor(box.maxY);
      const startZ = Math.floor(box.minZ);
      const endZ = Math.floor(box.maxZ);

      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          for (let z = startZ; z <= endZ; z++) {
            if (isBlockSolid(x, y, z)) {
              // Detailed collision overlap
              const bMinX = x;
              const bMaxX = x + 1;
              const bMinY = y;
              const bMaxY = y + 1;
              const bMinZ = z;
              const bMaxZ = z + 1;

              const overlaps =
                box.minX < bMaxX &&
                box.maxX > bMinX &&
                box.minY < bMaxY &&
                box.maxY > bMinY &&
                box.minZ < bMaxZ &&
                box.maxZ > bMinZ;

              if (overlaps) return true;
            }
          }
        }
      }
      return false;
    }

    // Step Climbing / Auto-Jump (allows smooth climbing on 1-block steps)
    function attemptStepUp(currentPos: THREE.Vector3, targetPos: THREE.Vector3): boolean {
      const stepHeight = 1.05; // climb standard 1 block steps
      const elevatedPos = targetPos.clone().setY(currentPos.y + stepHeight);
      
      // Check if player fits at elevated position
      if (!checkCollision(elevatedPos)) {
        // Find if they are stepping on a solid block
        const blockBeneath = Math.floor(elevatedPos.y - 0.05);
        const bx = Math.floor(elevatedPos.x);
        const bz = Math.floor(elevatedPos.z);
        if (isBlockSolid(bx, blockBeneath, bz)) {
          // Adjust player Y to sit on top of the block
          player.position.copy(elevatedPos);
          // Snap Y to block top
          player.position.y = blockBeneath + 1.0;
          return true;
        }
      }
      return false;
    }

    // --- Game Main Loop ---
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;
    let isRunning = true;
    let accumulatedTime = 0;

    // Time cycle angle
    let skyCycleAngle = 4.0; // Morning initial state

    const loop = (time: number) => {
      if (!isRunning) return;
      requestAnimationFrame(loop);

      let dt = (time - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; // Cap dt to avoid teleporting bugs
      lastTime = time;

      frameCount++;
      fpsTimer += dt;
      if (fpsTimer >= 1.0) {
        setDebugInfo((prev) => ({
          ...prev,
          fps: Math.round(frameCount / fpsTimer),
          chunkCount: chunkMeshesRef.current.size,
        }));
        frameCount = 0;
        fpsTimer = 0;
      }

      // --- 1. Background non-blocking Chunk Builder ---
      // We process exactly ONE chunk mesh build per frame to avoid lag spikes
      if (chunksToRebuildRef.current.size > 0) {
        const nextKey = chunksToRebuildRef.current.values().next().value;
        if (nextKey) {
          const parts = nextKey.split(',');
          const cx = parseInt(parts[0], 10);
          const cz = parseInt(parts[1], 10);
          buildChunkMesh(cx, cz);
          chunksToRebuildRef.current.delete(nextKey);
        }
      }

      // --- 2. Day/Night sky cycle rotation ---
      // Slowly rotate sky sun/moon directional light
      skyCycleAngle += dt * 0.012; // slow day-night speed
      if (skyCycleAngle > Math.PI * 2) skyCycleAngle = 0;

      skyGroup.rotation.z = skyCycleAngle;
      sunLight.position.set(
        Math.sin(skyCycleAngle) * 50,
        Math.cos(skyCycleAngle) * 50,
        20
      );

      // Dynamically adjust sky color based on Sun position
      const sunHeight = Math.cos(skyCycleAngle); // ranges from -1 (midnight) to +1 (noon)
      if (sunHeight > 0.1) {
        // Daytime
        scene.background = new THREE.Color('#7ec0ee');
        scene.fog = new THREE.FogExp2('#7ec0ee', 0.025);
        sunLight.intensity = 0.8;
      } else if (sunHeight > -0.15) {
        // Sunset / Sunrise
        scene.background = new THREE.Color('#cc5522');
        scene.fog = new THREE.FogExp2('#cc5522', 0.028);
        sunLight.intensity = 0.3;
      } else {
        // Nighttime
        scene.background = new THREE.Color('#0c0f1d');
        scene.fog = new THREE.FogExp2('#0c0f1d', 0.035);
        sunLight.intensity = 0.05;
      }

      // --- 3. Hold-to-Break Block Logic (2 Seconds) ---
      if (isBreakingRef.current && breakTargetRef.current && targetedBlockPos) {
        // If target block changed during tap, reset breaking
        if (
          breakTargetRef.current.x !== targetedBlockPos.x ||
          breakTargetRef.current.y !== targetedBlockPos.y ||
          breakTargetRef.current.z !== targetedBlockPos.z
        ) {
          isBreakingRef.current = false;
          crackMesh.visible = false;
        } else {
          breakTimeRef.current += dt;

          // Visual crack progress overlay
          // 5 crack stages
          const progressRatio = breakTimeRef.current / 2.0; // 0 to 1
          const crackStage = Math.max(1, Math.min(5, Math.floor(progressRatio * 5) + 1));
          
          crackMat.map = getCrackTexture(crackStage);
          crackMat.needsUpdate = true;

          // Sound effect tick (every 250ms)
          if (time - lastDigSoundTimeRef.current > 240) {
            sound.playDigTick();
            lastDigSoundTimeRef.current = time;
          }

          // Trigger Block Break at 2 seconds!
          if (breakTimeRef.current >= 2.0) {
            const bx = breakTargetRef.current.x;
            const by = breakTargetRef.current.y;
            const bz = breakTargetRef.current.z;

            // Cannot break bedrock
            if (getBlockAt(bx, by, bz) !== BLOCK_IDS.BEDROCK) {
              setBlockAt(bx, by, bz, BLOCK_IDS.AIR);
              sound.playBlockBreak();
              
              // Vibration feedback (haptic) if mobile
              if ('vibrate' in navigator) {
                try {
                  navigator.vibrate(60);
                } catch(e) {}
              }
            }

            isBreakingRef.current = false;
            breakTargetRef.current = null;
            crackMesh.visible = false;
            highlightMesh.visible = false;
          }
        }
      }

      // --- 4. Camera & Orientation Setup ---
      camera.rotation.order = 'YXZ';
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;

      // --- 5. Movement Vector Calculation ---
      const moveDirection = new THREE.Vector3();
      const moveX = joystickMoveRef.current.x;
      const moveY = joystickMoveRef.current.y;

      if (moveX !== 0 || moveY !== 0) {
        // Forward/backward relative to camera yaw
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw).normalize();
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw).normalize();
        
        moveDirection.addScaledVector(right, moveX);
        moveDirection.addScaledVector(forward, moveY);
        moveDirection.normalize();
      }

      // --- 6. Physics Movement Loop ---
      const WALK_SPEED = 4.8;
      const FLY_SPEED = 9.0;
      const GRAVITY = -24.0;
      const JUMP_FORCE = 8.2;

      // Handle Swimming
      const inWater = getBlockAt(Math.floor(player.position.x), Math.floor(player.position.y + 0.5), Math.floor(player.position.z)) === BLOCK_IDS.WATER;

      if (isFlyingRef.current) {
        // --- Flying Creative Mode Controls ---
        const flySpeed = FLY_SPEED * dt;
        player.velocity.set(0, 0, 0);

        const flyMove = moveDirection.clone().multiplyScalar(flySpeed);
        player.position.add(flyMove);

        // Fly height control from buttons
        const fDir = flyDirectionRef.current;
        if (fDir !== 0) {
          player.position.y += fDir * flySpeed;
        } else if (isJumpingRef.current) {
          player.position.y += flySpeed;
        }

        // Clamp inside skybox boundaries
        player.position.y = Math.max(1, Math.min(62, player.position.y));

        // Quick position sync without wall collision checks for smooth creative flight
        // or simple clip collision
        if (checkCollision(player.position)) {
          // simple slide back
          player.position.sub(flyMove);
        }
      } else {
        // --- Walking Gravity Mode Controls ---
        const speed = inWater ? WALK_SPEED * 0.5 : WALK_SPEED;

        // Apply Horizontal Movement
        player.velocity.x = moveDirection.x * speed;
        player.velocity.z = moveDirection.z * speed;

        // Apply Gravity
        if (inWater) {
          player.velocity.y = Math.max(-2.5, player.velocity.y + GRAVITY * 0.3 * dt); // buoyancy
        } else {
          player.velocity.y += GRAVITY * dt;
        }

        // Apply Jump
        if (isJumpingRef.current) {
          if (player.isOnGround) {
            player.velocity.y = JUMP_FORCE;
            player.isOnGround = false;
            sound.playJump();
          } else if (inWater) {
            player.velocity.y = JUMP_FORCE * 0.45; // float up in water
            if (Math.random() < 0.15) sound.playSplash();
          }
        }

        // Solve Collision axis-by-axis to slide smoothly along walls
        const targetPos = player.position.clone();
        
        // 1. Move along X
        targetPos.x += player.velocity.x * dt;
        if (checkCollision(targetPos)) {
          // Attempt step up (auto-jump climb)
          const stepped = attemptStepUp(player.position, targetPos);
          if (!stepped) {
            targetPos.x = player.position.x; // collide X
            player.velocity.x = 0;
          }
        }

        // 2. Move along Z
        targetPos.z += player.velocity.z * dt;
        if (checkCollision(targetPos)) {
          const stepped = attemptStepUp(player.position, targetPos);
          if (!stepped) {
            targetPos.z = player.position.z; // collide Z
            player.velocity.z = 0;
          }
        }

        // 3. Move along Y (Gravity/Jumping)
        targetPos.y += player.velocity.y * dt;
        player.isOnGround = false;

        if (checkCollision(targetPos)) {
          if (player.velocity.y < 0) {
            // Landed on ground
            targetPos.y = Math.floor(player.position.y);
            // Snap to block top
            while (checkCollision(targetPos) && targetPos.y < 64) {
              targetPos.y += 0.02;
            }
            player.velocity.y = 0;
            player.isOnGround = true;
          } else {
            // Hit ceiling
            player.velocity.y = 0;
            targetPos.y = player.position.y;
          }
        }

        player.position.copy(targetPos);

        // Footstep tick sounds when walking on ground
        if (player.isOnGround && (moveX !== 0 || moveY !== 0)) {
          accumulatedTime += dt;
          if (accumulatedTime > 0.36) {
            sound.playFootstep();
            accumulatedTime = 0;
          }
        }
      }

      // Sync camera to player position (eye height offset)
      camera.position.copy(player.position);
      camera.position.y += player.height - 0.15;

      // Render Scene
      renderer.render(scene, camera);

      // Trigger Chunk dynamic loading around updated player coords
      loadChunksAroundPlayer(player.position.x, player.position.z);

      // Update state coordinates
      setDebugInfo((prev) => ({
        ...prev,
        x: Math.round(player.position.x),
        y: Math.round(player.position.y),
        z: Math.round(player.position.z),
      }));
    };

    requestAnimationFrame(loop);

    // --- Resize handler ---
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      // Dispose ThreeJS resource meshes
      for (const meshes of chunkMeshesRef.current.values()) {
        scene.remove(meshes.opaque);
        scene.remove(meshes.transparent);
        meshes.opaque.geometry.dispose();
        meshes.transparent.geometry.dispose();
      }
      
      highlightGeom.dispose();
      highlightMat.dispose();
      crackGeom.dispose();
      crackMat.dispose();
      opaqueMaterial.dispose();
      transparentMaterial.dispose();
      atlasTexture.dispose();
      sunGeom.dispose();
      sunMat.dispose();
      moonGeom.dispose();
      moonMat.dispose();
      
      renderer.dispose();
      try {
        containerRef.current?.removeChild(renderer.domElement);
      } catch (err) {}
    };
  }, [seed]);

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      {/* HUD overlay coordinates / debug */}
      <div className="absolute top-4 left-4 font-mono text-[10px] text-white bg-black/40 p-2 rounded-md border border-white/10 flex flex-col gap-0.5 z-20 pointer-events-none select-none">
        <div>Minecraft Phone Edition</div>
        <div>
          XYZ: <span className="text-[#ffff55]">{debugInfo.x}</span>,{' '}
          <span className="text-[#ffff55]">{debugInfo.y}</span>,{' '}
          <span className="text-[#ffff55]">{debugInfo.z}</span>
        </div>
        <div>
          Chunks: <span className="text-[#55ffff]">{debugInfo.chunkCount}</span>
        </div>
        <div>
          FPS: <span className="text-[#55ff55]">{debugInfo.fps}</span>
        </div>
        <div className="mt-1 text-[8px] text-white/50 leading-none">
          * Зажмите 2 сек чтобы сломать
          <br />* Нажмите 1 раз чтобы поставить
        </div>
      </div>

      {/* Target Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="relative">
          <div className="w-4 h-[2px] bg-white/70"></div>
          <div className="h-4 w-[2px] bg-white/70 absolute -top-[7px] left-[7px]"></div>
        </div>
      </div>
    </div>
  );
};
export default GameCanvas;
