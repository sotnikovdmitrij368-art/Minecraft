import * as THREE from 'three';

// Atlas dimensions
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 8;
const TILE_SIZE = 32; // 32x32 pixels per tile for detail

// Block IDs mapping
export const BLOCK_IDS = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  COBBLESTONE: 4,
  BEDROCK: 5,
  SAND: 6,
  GRAVEL: 7,
  WOOD: 8,
  LEAVES: 9,
  GLASS: 10,
  BRICK: 11,
  DIAMOND_ORE: 12,
  GOLD_ORE: 13,
  COAL_ORE: 14,
  WATER: 15,
  PLANKS: 16,
};

// Texture details
export interface BlockConfig {
  id: number;
  name: string;
  color: string; // fallback color
  isSolid: boolean;
  isTransparent: boolean;
  faces: {
    top: [number, number]; // [col, row] in atlas
    bottom: [number, number];
    side: [number, number];
  };
}

export const BLOCK_CONFIGS: Record<number, BlockConfig> = {
  [BLOCK_IDS.AIR]: {
    id: 0,
    name: 'Air',
    color: 'transparent',
    isSolid: false,
    isTransparent: true,
    faces: { top: [0, 0], bottom: [0, 0], side: [0, 0] },
  },
  [BLOCK_IDS.GRASS]: {
    id: 1,
    name: 'Grass',
    color: '#557a2b',
    isSolid: true,
    isTransparent: false,
    faces: { top: [0, 0], bottom: [2, 0], side: [1, 0] },
  },
  [BLOCK_IDS.DIRT]: {
    id: 2,
    name: 'Dirt',
    color: '#866043',
    isSolid: true,
    isTransparent: false,
    faces: { top: [2, 0], bottom: [2, 0], side: [2, 0] },
  },
  [BLOCK_IDS.STONE]: {
    id: 3,
    name: 'Stone',
    color: '#737373',
    isSolid: true,
    isTransparent: false,
    faces: { top: [3, 0], bottom: [3, 0], side: [3, 0] },
  },
  [BLOCK_IDS.COBBLESTONE]: {
    id: 4,
    name: 'Cobblestone',
    color: '#656565',
    isSolid: true,
    isTransparent: false,
    faces: { top: [4, 0], bottom: [4, 0], side: [4, 0] },
  },
  [BLOCK_IDS.BEDROCK]: {
    id: 5,
    name: 'Bedrock',
    color: '#1a1a1a',
    isSolid: true,
    isTransparent: false,
    faces: { top: [5, 0], bottom: [5, 0], side: [5, 0] },
  },
  [BLOCK_IDS.SAND]: {
    id: 6,
    name: 'Sand',
    color: '#dbcd9d',
    isSolid: true,
    isTransparent: false,
    faces: { top: [6, 0], bottom: [6, 0], side: [6, 0] },
  },
  [BLOCK_IDS.GRAVEL]: {
    id: 7,
    name: 'Gravel',
    color: '#5e5a57',
    isSolid: true,
    isTransparent: false,
    faces: { top: [7, 0], bottom: [7, 0], side: [7, 0] },
  },
  [BLOCK_IDS.WOOD]: {
    id: 8,
    name: 'Oak Wood',
    color: '#6d5332',
    isSolid: true,
    isTransparent: false,
    faces: { top: [1, 1], bottom: [1, 1], side: [0, 1] },
  },
  [BLOCK_IDS.LEAVES]: {
    id: 9,
    name: 'Leaves',
    color: '#345e22',
    isSolid: true,
    isTransparent: true, // transparent block
    faces: { top: [2, 1], bottom: [2, 1], side: [2, 1] },
  },
  [BLOCK_IDS.GLASS]: {
    id: 10,
    name: 'Glass',
    color: '#e2f4ff',
    isSolid: true,
    isTransparent: true,
    faces: { top: [3, 1], bottom: [3, 1], side: [3, 1] },
  },
  [BLOCK_IDS.BRICK]: {
    id: 11,
    name: 'Brick',
    color: '#b0493b',
    isSolid: true,
    isTransparent: false,
    faces: { top: [4, 1], bottom: [4, 1], side: [4, 1] },
  },
  [BLOCK_IDS.DIAMOND_ORE]: {
    id: 12,
    name: 'Diamond Ore',
    color: '#7f9c9f',
    isSolid: true,
    isTransparent: false,
    faces: { top: [5, 1], bottom: [5, 1], side: [5, 1] },
  },
  [BLOCK_IDS.GOLD_ORE]: {
    id: 13,
    name: 'Gold Ore',
    color: '#8b8359',
    isSolid: true,
    isTransparent: false,
    faces: { top: [6, 1], bottom: [6, 1], side: [6, 1] },
  },
  [BLOCK_IDS.COAL_ORE]: {
    id: 14,
    name: 'Coal Ore',
    color: '#555555',
    isSolid: true,
    isTransparent: false,
    faces: { top: [7, 1], bottom: [7, 1], side: [7, 1] },
  },
  [BLOCK_IDS.WATER]: {
    id: 15,
    name: 'Water',
    color: '#4466cc',
    isSolid: false, // can pass through
    isTransparent: true,
    faces: { top: [0, 2], bottom: [0, 2], side: [0, 2] },
  },
  [BLOCK_IDS.PLANKS]: {
    id: 16,
    name: 'Wooden Planks',
    color: '#a07a4a',
    isSolid: true,
    isTransparent: false,
    faces: { top: [1, 2], bottom: [1, 2], side: [1, 2] },
  },
};

// Returns a procedural pixel-art canvas of the entire atlas
export function generateAtlasCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE_SIZE;
  canvas.height = ATLAS_ROWS * TILE_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Fill with black transparent background initially
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw 16x16 logical pixels onto 32x32 physical pixel cell
  const size = 16;
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Let's generate sprites row-by-row
  for (let r = 0; r < ATLAS_ROWS; r++) {
    for (let c = 0; c < ATLAS_COLS; c++) {
      const xOffset = c * TILE_SIZE;
      const yOffset = r * TILE_SIZE;

      // Draw textures based on col & row
      if (c === 0 && r === 0) {
        // --- Grass Top ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const greenVal = rand(90, 160);
            const redVal = rand(50, 75);
            ctx.fillStyle = `rgb(${redVal}, ${greenVal}, 35)`;
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 1 && r === 0) {
        // --- Grass Side ---
        for (let x = 0; x < size; x++) {
          // Calculate grass overhang height (approx. 4 to 7 pixels from top)
          const grassHeight = 4 + (Math.sin(x * 1.5) * 1.5 + Math.cos(x * 0.7) * 1.0 + rand(-1, 1));
          for (let y = 0; y < size; y++) {
            if (y < grassHeight) {
              // Grass part
              const greenVal = rand(90, 150);
              const redVal = rand(50, 75);
              ctx.fillStyle = `rgb(${redVal}, ${greenVal}, 35)`;
            } else {
              // Dirt part
              const dirtVal = rand(50, 85);
              ctx.fillStyle = `rgb(${dirtVal}, ${Math.floor(dirtVal * 0.7)}, ${Math.floor(dirtVal * 0.5)})`;
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 2 && r === 0) {
        // --- Dirt ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const dirtVal = rand(50, 85);
            ctx.fillStyle = `rgb(${dirtVal}, ${Math.floor(dirtVal * 0.7)}, ${Math.floor(dirtVal * 0.5)})`;
            // Add occasional lighter stone speckle
            if (rand(0, 40) === 0) {
              ctx.fillStyle = '#8f857d';
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 3 && r === 0) {
        // --- Stone ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const stoneVal = rand(100, 130);
            ctx.fillStyle = `rgb(${stoneVal}, ${stoneVal}, ${stoneVal})`;
            // Add darker spots
            if (rand(0, 12) === 0) {
              const dark = stoneVal - 30;
              ctx.fillStyle = `rgb(${dark}, ${dark}, ${dark})`;
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 4 && r === 0) {
        // --- Cobblestone ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            // Draw a bricky/pebbly cobblestone pattern
            const isBorder = (x % 5 === 0 || y % 5 === 0 || (x + y) % 6 === 0);
            if (isBorder) {
              const borderVal = rand(50, 75);
              ctx.fillStyle = `rgb(${borderVal}, ${borderVal}, ${borderVal})`;
            } else {
              const stoneVal = rand(100, 140);
              ctx.fillStyle = `rgb(${stoneVal}, ${stoneVal}, ${stoneVal})`;
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 5 && r === 0) {
        // --- Bedrock ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const val = rand(0, 10) === 0 ? rand(60, 90) : rand(10, 40);
            ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 6 && r === 0) {
        // --- Sand ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const sandVal = rand(210, 235);
            ctx.fillStyle = `rgb(${sandVal}, ${Math.floor(sandVal * 0.9)}, ${Math.floor(sandVal * 0.7)})`;
            if (rand(0, 15) === 0) {
              ctx.fillStyle = `rgb(${sandVal - 25}, ${Math.floor((sandVal - 25) * 0.85)}, ${Math.floor((sandVal - 25) * 0.65)})`;
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 7 && r === 0) {
        // --- Gravel ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const rVal = rand(100, 130);
            const gVal = rVal - rand(5, 12);
            const bVal = gVal - rand(5, 12);
            ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
            if (rand(0, 10) === 0) {
              ctx.fillStyle = '#4c4947';
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 0 && r === 1) {
        // --- Wood Log Side ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            // vertical stripes for wood bark
            const isStripe = (x % 4 === 0 || x % 4 === 1 || rand(0, 10) === 0);
            if (isStripe) {
              const barkVal = rand(60, 80);
              ctx.fillStyle = `rgb(${barkVal}, ${Math.floor(barkVal * 0.75)}, ${Math.floor(barkVal * 0.5)})`;
            } else {
              const innerVal = rand(95, 115);
              ctx.fillStyle = `rgb(${innerVal}, ${Math.floor(innerVal * 0.78)}, ${Math.floor(innerVal * 0.55)})`;
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 1 && r === 1) {
        // --- Wood Log Top ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const dx = x - 7.5;
            const dy = y - 7.5;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 6.5) {
              // outer dark bark
              const barkVal = rand(60, 80);
              ctx.fillStyle = `rgb(${barkVal}, ${Math.floor(barkVal * 0.75)}, ${Math.floor(barkVal * 0.5)})`;
            } else if (dist > 4.5 || (dist > 2.0 && dist < 3.2)) {
              // darker inner rings
              const ringVal = rand(150, 170);
              ctx.fillStyle = `rgb(${ringVal}, ${Math.floor(ringVal * 0.82)}, ${Math.floor(ringVal * 0.62)})`;
            } else {
              // lighter wood rings
              const woodVal = rand(180, 205);
              ctx.fillStyle = `rgb(${woodVal}, ${Math.floor(woodVal * 0.85)}, ${Math.floor(woodVal * 0.68)})`;
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 2 && r === 1) {
        // --- Leaves ---
        // Leaf texture: green with random transparent pixels
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(xOffset, yOffset, TILE_SIZE, TILE_SIZE);
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            // 20% transparent holes
            if ((x + y * 3) % 7 === 0 && rand(0, 2) !== 0) {
              continue; // transparent hole
            }
            const greenVal = rand(70, 130);
            ctx.fillStyle = `rgb(${Math.floor(greenVal * 0.25)}, ${greenVal}, ${Math.floor(greenVal * 0.15)})`;
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 3 && r === 1) {
        // --- Glass ---
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(xOffset, yOffset, TILE_SIZE, TILE_SIZE);
        // Draw white frame
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(xOffset, yOffset, TILE_SIZE, 2); // Top
        ctx.fillRect(xOffset, yOffset + TILE_SIZE - 2, TILE_SIZE, 2); // Bottom
        ctx.fillRect(xOffset, yOffset, 2, TILE_SIZE); // Left
        ctx.fillRect(xOffset + TILE_SIZE - 2, yOffset, 2, TILE_SIZE); // Right
        // Diagonal highlight strokes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(xOffset + 4, yOffset + 4, 4, 2);
        ctx.fillRect(xOffset + 6, yOffset + 6, 2, 4);
        ctx.fillRect(xOffset + 20, yOffset + 20, 6, 2);
        ctx.fillRect(xOffset + 24, yOffset + 22, 2, 4);
      } else if (c === 4 && r === 1) {
        // --- Brick ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            // Brick layout: 4 horizontal rows of height 4.
            // Verticals shift on odd rows.
            const isBorderY = (y % 4 === 0);
            const rowIdx = Math.floor(y / 4);
            const isBorderX = (rowIdx % 2 === 0) ? (x % 8 === 0) : ((x + 4) % 8 === 0);

            if (isBorderY || isBorderX) {
              ctx.fillStyle = '#dfdcd6'; // mortar lines
            } else {
              const brickVal = rand(130, 175);
              ctx.fillStyle = `rgb(${brickVal}, ${Math.floor(brickVal * 0.4)}, ${Math.floor(brickVal * 0.35)})`;
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 5 && r === 1) {
        // --- Diamond Ore ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const stoneVal = rand(100, 130);
            ctx.fillStyle = `rgb(${stoneVal}, ${stoneVal}, ${stoneVal})`;
            if (rand(0, 12) === 0) {
              const dark = stoneVal - 30;
              ctx.fillStyle = `rgb(${dark}, ${dark}, ${dark})`;
            }
            // Draw diamond gem particles
            if (
              (x === 3 && y === 4) || (x === 4 && y === 3) || (x === 4 && y === 4) ||
              (x === 10 && y === 12) || (x === 11 && y === 11) || (x === 11 && y === 12) ||
              (x === 12 && y === 5) || (x === 5 && y === 10)
            ) {
              ctx.fillStyle = '#55e3dd'; // cyan glowing diamond
            } else if (
              (x === 2 && y === 4) || (x === 4 && y === 5) ||
              (x === 9 && y === 12) || (x === 12 && y === 11) ||
              (x === 13 && y === 4) || (x === 4 && y === 9)
            ) {
              ctx.fillStyle = '#2db8b2'; // darker cyan outline
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 6 && r === 1) {
        // --- Gold Ore ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const stoneVal = rand(100, 130);
            ctx.fillStyle = `rgb(${stoneVal}, ${stoneVal}, ${stoneVal})`;
            if (rand(0, 12) === 0) {
              const dark = stoneVal - 30;
              ctx.fillStyle = `rgb(${dark}, ${dark}, ${dark})`;
            }
            // Gold particles
            if (
              (x === 3 && y === 4) || (x === 4 && y === 3) || (x === 4 && y === 4) ||
              (x === 10 && y === 12) || (x === 11 && y === 11) || (x === 11 && y === 12) ||
              (x === 12 && y === 5) || (x === 5 && y === 10)
            ) {
              ctx.fillStyle = '#f3ca3e'; // gold yellow
            } else if (
              (x === 2 && y === 4) || (x === 4 && y === 5) ||
              (x === 9 && y === 12) || (x === 12 && y === 11) ||
              (x === 13 && y === 4) || (x === 4 && y === 9)
            ) {
              ctx.fillStyle = '#bfa11b'; // darker outline
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 7 && r === 1) {
        // --- Coal Ore ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const stoneVal = rand(100, 130);
            ctx.fillStyle = `rgb(${stoneVal}, ${stoneVal}, ${stoneVal})`;
            if (rand(0, 12) === 0) {
              const dark = stoneVal - 30;
              ctx.fillStyle = `rgb(${dark}, ${dark}, ${dark})`;
            }
            // Coal particles
            if (
              (x === 3 && y === 4) || (x === 4 && y === 3) || (x === 4 && y === 4) ||
              (x === 10 && y === 12) || (x === 11 && y === 11) || (x === 11 && y === 12) ||
              (x === 12 && y === 5) || (x === 5 && y === 10) || (x === 6 && y === 9) || (x === 9 && y === 3)
            ) {
              ctx.fillStyle = '#222222'; // coal dark grey/black
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 0 && r === 2) {
        // --- Water ---
        // Blue translucent animated water
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const isWave = (x + y * 2) % 6 === 0;
            ctx.fillStyle = isWave ? 'rgba(80, 140, 255, 0.7)' : 'rgba(30, 80, 220, 0.7)';
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (c === 1 && r === 2) {
        // --- Planks ---
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const isLineY = (y % 4 === 0);
            const isLineX = (y % 4 !== 0 && (x === 0 || x === 8));
            if (isLineY || isLineX) {
              ctx.fillStyle = '#654b2d'; // plank outlines
            } else {
              const woodVal = rand(150, 185);
              ctx.fillStyle = `rgb(${woodVal}, ${Math.floor(woodVal * 0.75)}, ${Math.floor(woodVal * 0.5)})`;
            }
            ctx.fillRect(xOffset + x * 2, yOffset + y * 2, 2, 2);
          }
        }
      } else if (r === 2 && c >= 2 && c <= 6) {
        // --- Breaking cracks stages 1 to 5 ---
        const stage = c - 1; // 1 to 5
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(xOffset, yOffset, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (stage >= 1) {
          ctx.moveTo(xOffset + 2, yOffset + 12);
          ctx.lineTo(xOffset + 14, yOffset + 6);
          ctx.lineTo(xOffset + 24, yOffset + 18);
        }
        if (stage >= 2) {
          ctx.moveTo(xOffset + 12, yOffset + 30);
          ctx.lineTo(xOffset + 22, yOffset + 16);
          ctx.lineTo(xOffset + 30, yOffset + 4);
        }
        if (stage >= 3) {
          ctx.moveTo(xOffset + 2, yOffset + 20);
          ctx.lineTo(xOffset + 16, yOffset + 20);
          ctx.lineTo(xOffset + 28, yOffset + 26);
        }
        if (stage >= 4) {
          ctx.moveTo(xOffset + 6, yOffset + 2);
          ctx.lineTo(xOffset + 14, yOffset + 14);
          ctx.lineTo(xOffset + 4, yOffset + 28);
        }
        if (stage >= 5) {
          ctx.moveTo(xOffset + 16, yOffset + 0);
          ctx.lineTo(xOffset + 16, yOffset + 32);
          ctx.moveTo(xOffset + 0, yOffset + 16);
          ctx.lineTo(xOffset + 32, yOffset + 16);
        }
        ctx.stroke();
      }
    }
  }

  return canvas;
}

// Generate UV array for a specific block's face in the atlas.
// faceType can be 'top', 'bottom', or 'side'
export function getFaceUVs(blockId: number, faceType: 'top' | 'bottom' | 'side'): number[] {
  const config = BLOCK_CONFIGS[blockId] || BLOCK_CONFIGS[BLOCK_IDS.STONE];
  const [col, row] = config.faces[faceType];

  // Convert (col, row) to UV coordinates (0 to 1)
  // We add a tiny inset of 0.002 to prevent texture bleeding artifacts.
  const inset = 0.005;
  const uMin = (col + inset) / ATLAS_COLS;
  const uMax = (col + 1 - inset) / ATLAS_COLS;
  // Canvas y goes downwards, WebGL v goes upwards
  const vMin = (ATLAS_ROWS - 1 - row + inset) / ATLAS_ROWS;
  const vMax = (ATLAS_ROWS - row - inset) / ATLAS_ROWS;

  // UV coordinates for the vertices of a quad:
  // We want to map:
  // Bottom-Left  (uMin, vMin) -> vertex index 0
  // Bottom-Right (uMax, vMin) -> vertex index 1
  // Top-Left     (uMin, vMax) -> vertex index 2
  // Top-Right    (uMax, vMax) -> vertex index 3
  return [
    uMin, vMin, // BL
    uMax, vMin, // BR
    uMin, vMax, // TL
    uMax, vMax  // TR
  ];
}

// Generates the Crack texture canvas dynamically for custom overlay rendering
export function getCrackTexture(stage: number): THREE.Texture {
  // stage: 1 to 5
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 32, 32);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  if (stage >= 1) {
    ctx.moveTo(2, 12); ctx.lineTo(14, 6); ctx.lineTo(24, 18);
  }
  if (stage >= 2) {
    ctx.moveTo(12, 30); ctx.lineTo(22, 16); ctx.lineTo(30, 4);
  }
  if (stage >= 3) {
    ctx.moveTo(2, 20); ctx.lineTo(16, 20); ctx.lineTo(28, 26);
    ctx.moveTo(8, 6); ctx.lineTo(12, 12);
  }
  if (stage >= 4) {
    ctx.moveTo(6, 2); ctx.lineTo(14, 14); ctx.lineTo(4, 28);
    ctx.moveTo(20, 25); ctx.lineTo(26, 30);
  }
  if (stage >= 5) {
    ctx.moveTo(16, 0); ctx.lineTo(16, 32);
    ctx.moveTo(0, 16); ctx.lineTo(32, 16);
    ctx.moveTo(25, 5); ctx.lineTo(5, 25);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}
