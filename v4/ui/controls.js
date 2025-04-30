/* File: ui/controls.js */
export function setupControls(container, core, source, resonator) {
  // Find sliders by ID, bind input events
  const bind = (id, callback) => {
    const slider = container.querySelector(`#${id}`);
    const display = container.querySelector(`#${id}Val`);
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      display.textContent = v;
      callback(v);
    });
  };

  bind('leakRate', v => core.setParams({ leakRate: v / 1000 }));
  bind('ventRate', v => core.setParams({ ventRate: v / 1000 }));
  bind('bubbleVol', v => core.setParams({ bubbleVol: v / 1000 }));
  bind('suction', v => core.setParams({ suctionFlowRate: v / 1000 }));
  bind('waterDepthCm', v => core.setParams({ waterDepthCm: v }));
  bind('tubeLengthCm', v => resonator.update({ tubeLengthCm: v }));
}