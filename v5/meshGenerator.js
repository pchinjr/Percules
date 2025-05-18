// Percules v4: 2D Mesh Generator (vanilla JS)
// Generates a 2D grid of cells marking SOLID vs. FLUID, including percolator carving.

// Constants for cell types
const SOLID = 0;
const FLUID = 1;

/**
 * Initialize a 2D array of given width (Nx) and height (Ny), filled with SOLID.
 * @param {number} Nx - Number of cells in x (columns)
 * @param {number} Ny - Number of cells in y (rows)
 * @returns {Uint8Array[]} - 2D array mesh[Nx][Ny]
 */
function initMesh(Nx, Ny) {
  const mesh = [];
  for (let i = 0; i < Nx; i++) {
    mesh[i] = new Uint8Array(Ny);
    mesh[i].fill(SOLID);
  }
  return mesh;
}

/**
 * Carve a circular cylinder of fluid in the mesh.
 * @param {Uint8Array[]} mesh
 * @param {number} tubeRadius - in cells
 */
function carveCylinder(mesh, tubeRadius) {
  const Nx = mesh.length;
  const Ny = mesh[0].length;
  const cx = Math.floor(Nx / 2);
  for (let i = 0; i < Nx; i++) {
    for (let j = 0; j < Ny; j++) {
      const dx = i - cx;
      const dy = j;
      if (dx*dx + dy*dy <= tubeRadius * tubeRadius) {
        mesh[i][j] = FLUID;
      }
    }
  }
}

/**
 * Carve percolator holes or solid posts based on config.
 * Supports 'tree', 'honeycomb', or 'custom'.
 * @param {Uint8Array[]} mesh
 * @param {object} config
 * @param {number} config.jPlate - height index for percolator row
 */
function carvePercolator(mesh, config) {
  const { type, jPlate } = config;
  const Nx = mesh.length;
  if (type === 'tree') {
    const { trunkCount, trunkWidth, spacing } = config;
    const start = Math.floor((Nx - (trunkCount*trunkWidth + (trunkCount-1)*spacing)) / 2);
    let idx = start;
    for (let t = 0; t < trunkCount; t++) {
      for (let wi = 0; wi < trunkWidth; wi++) {
        mesh[idx + wi][jPlate] = SOLID;
      }
      idx += trunkWidth + spacing;
    }
  } else if (type === 'honeycomb') {
    const { holeRadius, rowSpacing, colSpacing } = config;
    const offsetX = holeRadius;
    for (let j = jPlate - holeRadius; j <= jPlate + holeRadius; j += rowSpacing) {
      const shift = ((j - jPlate) / rowSpacing) % 2 ? colSpacing/2 : 0;
      for (let i = offsetX + shift; i < Nx - offsetX; i += colSpacing) {
        for (let di = -holeRadius; di <= holeRadius; di++) {
          for (let dj = -holeRadius; dj <= holeRadius; dj++) {
            if (di*di + dj*dj <= holeRadius*holeRadius) {
              mesh[Math.floor(i+di)][j + dj] = FLUID;
            }
          }
        }
      }
    }
  } else if (type === 'custom') {
    config.holes.forEach(({ i, j }) => {
      const R = config.holeRadius || 1;
      for (let di = -R; di <= R; di++) {
        for (let dj = -R; dj <= R; dj++) {
          if (di*di + dj*dj <= R*R) {
            mesh[i + di][j + dj] = FLUID;
          }
        }
      }
    });
  }
}

/**
 * Build the mesh based on parameters.
 * @param {object} params
 * @param {number} params.tubeLengthCm
 * @param {number} params.tubeRadiusCm
 * @param {object} params.percolatorConfig
 * @param {number} params.cellSizeMm
 * @returns {{mesh: Uint8Array[], probes: object}}
 */
function buildMesh(params) {
  const dx = params.cellSizeMm / 10; // convert mm to cm
  const Nx = Math.round((2 * params.tubeRadiusCm) / dx);
  const Ny = Math.round(params.tubeLengthCm / dx);
  const tubeRadiusCells = Math.floor(params.tubeRadiusCm / dx);
  const mesh = initMesh(Nx, Ny);
  carveCylinder(mesh, tubeRadiusCells);

  // carve percolator
  const jPlate = Math.floor(params.percolatorConfig.heightCm / dx);
  const config = Object.assign({}, params.percolatorConfig, { jPlate });
  carvePercolator(mesh, config);

  // define probes
  const probes = {
    inlet: { i: Math.floor(Nx/2), j: 0 },
    bubble: { i: Math.floor(Nx/2), j: jPlate + 5 },
    mic:    { i: Math.floor(Nx/2), j: Ny - 1 }
  };

  return { mesh, probes };  
}

let mesh = buildMesh({ tubeLengthCm:10, tubeRadiusCm:2, cellSizeMm:1, percolatorConfig:{type:'honeycomb', heightCm:3, holeRadius:1, rowSpacing:4, colSpacing:3}})
console.log(mesh.mesh[0].length)