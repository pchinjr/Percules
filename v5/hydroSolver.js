// hydroSolver.js
// Minimal modular hydro solver and smoke-test suite

/**
 * stepHydro - simple incompressible 2D hydro solver stub
 * @param {number} pInlet - inlet pressure value
 * @param {Uint8Array[]} grid - mesh grid, unused in stub
 * @returns {number[][]} pressure field array [Nx][Ny]
 */
function stepHydro(pInlet, grid) {
    const Nx = grid.length;
    const Ny = grid[0].length;
    const pField = new Array(Nx);
    for (let i = 0; i < Nx; i++) {
        pField[i] = new Array(Ny);
        for (let j = 0; j < Ny; j++) {
            pField[i][j] = pInlet;
        }
    }
    return pField;
}

/**
 * runHydroTests - executes smoke tests for the hydro solver
 * @param {Uint8Array[]} grid - mesh grid for sizing
 */
function runHydroTests(grid) {
    const results = [];

    // Test 1: constant inlet pressure
    const pConst = 100;
    const fieldConst = stepHydro(pConst, grid);
    let maxDiff = 0;
    for (let i = 0; i < fieldConst.length; i++) {
        for (let j = 0; j < fieldConst[0].length; j++) {
            maxDiff = Math.max(maxDiff, Math.abs(fieldConst[i][j] - pConst));
        }
    }
    const maxDiffRel = pConst !== 0
        ? maxDiff / pConst
        : maxDiff;
    const tol = 0.01;  // 1%
    const passed = maxDiffRel <= tol;
    console.log(`Constant inlet: maxRelError=${(maxDiffRel * 100).toFixed(2)}% → ${passed ? 'PASS' : 'FAIL'}`);
    results.push({ test: 'Constant inlet', passed: maxDiff < 1e-6, detail: `maxDiff=${maxDiff}` });

    // Test 2: linear ramp
    const pressures = [0, 50, 100, 150, 200];
    let rampPass = true;
    for (const p of pressures) {
        const field = stepHydro(p, grid);
        for (let i = 0; i < field.length; i++) {
            for (let j = 0; j < field[0].length; j++) {
                if (field[i][j] !== p) {
                    rampPass = false;
                    break;
                }
            }
            if (!rampPass) break;
        }
        if (!rampPass) break;
    }
    results.push({ test: 'Linear ramp', passed: rampPass });

    // Log results
    results.forEach(r => {
        console.log(`${r.test}: ${r.passed ? 'PASS' : 'FAIL'}` + (r.detail ? ` (${r.detail})` : ''));
    });
}

// Expose functions globally
window.stepHydro = stepHydro;
window.runHydroTests = runHydroTests;
