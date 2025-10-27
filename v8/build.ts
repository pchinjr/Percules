/// <reference lib="deno.ns" />
/**
 * Build script to bundle the application for the browser
 */

// Read all source files and bundle them together
const physicsCode = await Deno.readTextFile("./src/physics.ts");
const audioCode = await Deno.readTextFile("./src/audio.ts");
const mainCode = await Deno.readTextFile("./src/main.ts");

// Simple TypeScript stripping (for basic types)
function stripTypes(code: string): string {
  return code
    // Remove export interface declarations (multiline)
    .replace(/export\s+interface\s+\w+\s*\{[^}]*\}/gs, '')
    // Remove Promise<Type> return types
    .replace(/\):\s*Promise<\w+>/g, ')')
    // Remove array type annotations like BiquadFilterNode[]
    .replace(/:\s*\w+\[\]/g, '')
    // Remove function return types: ): Type {
    .replace(/\):\s*\w+\s*\{/g, ') {')
    // Remove : Type annotations
    .replace(/:\s*(string|number|boolean|void|any|BongState|BongParams|AudioEngine|Bubble|Float64Array|AudioContext|AudioWorkletNode|ScriptProcessorNode|GainNode|AnalyserNode|AudioBuffer|BiquadFilterNode|OfflineAudioContext|Uint8Array|AudioProcessingEvent|HTMLButtonElement|HTMLInputElement|HTMLCanvasElement|Request|Response)\b/g, '')
    // Remove complex object type annotations
    .replace(/:\s*\{[^}]+\}/g, '')
    // Remove arrow function type annotations
    .replace(/:\s*\([^)]*\)\s*=>\s*\w+/g, '')
    // Remove | null type unions
    .replace(/\s*\|\s*null/g, '')
    // Remove as Type assertions
    .replace(/\s+as\s+(HTMLButtonElement|HTMLInputElement|HTMLCanvasElement|any)\b/g, '')
    // Remove ! non-null assertions (after ) or identifiers, but not != or !==)
    .replace(/([)\w])\s*!(?!=)/g, '$1')
    // Remove import statements (we'll inline everything)
    .replace(/import\s+\{[^}]+\}\s+from\s+["'][^"']+["'];?\n?/g, '')
    .replace(/import\s+\*\s+as\s+\w+\s+from\s+["'][^"']+["'];?\n?/g, '')
    // Remove export keyword
    .replace(/export\s+/g, '')
    // Remove async function signature types
    .replace(/async\s+function\s+(\w+)\([^)]*\):\s*Promise<\w+>/g, 'async function $1()')
    .trim();
}

const bundled = `
// Bundled Bong Simulator
// Generated at ${new Date().toISOString()}

(function() {
  'use strict';

  // ============= PHYSICS ENGINE =============
  ${stripTypes(physicsCode)}

  // ============= AUDIO ENGINE =============
  ${stripTypes(audioCode)}

  // ============= MAIN APPLICATION =============
  ${stripTypes(mainCode)}

})();
`;

await Deno.writeTextFile("./dist/bundle.js", bundled);
console.log("✅ Bundle created at ./dist/bundle.js");
