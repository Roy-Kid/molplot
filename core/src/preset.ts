import {
  DEFAULT_PRESET,
  PRESETS,
  type Preset,
  type PresetMode,
  type PresetName,
} from "./presets/generated";

export type { Preset, PresetMode, PresetName };
export { DEFAULT_PRESET, PRESETS };

/**
 * Resolve a preset by name, falling back to the default. This is the single
 * bridge between the canonical `presets/*.json` tokens and every chart — the
 * same tokens the Python `molplot` package injects into matplotlib, so a
 * figure rendered in the browser and one rendered by scienceplots share
 * palette, type scale, and grid styling.
 */
export function getPreset(name: string = DEFAULT_PRESET): Preset {
  return PRESETS[name as PresetName] ?? PRESETS[DEFAULT_PRESET];
}

/** Names of every registered preset. */
export function presetNames(): PresetName[] {
  return Object.keys(PRESETS) as PresetName[];
}
