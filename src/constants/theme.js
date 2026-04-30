// CEA palette — see src/features/canvas/CLAUDE.md for usage notes.
export const CEA_PURPLE = '#AC6080';
export const PATHWAY_PRIMARY = '#1470AF';
export const ERROR_RED = '#f04d5b';

// Neutral text + surface tones used by error/empty-state cards. Mirror
// antd's neutral grayscale (gray-9 / gray-7 / gray-3) so anything
// rendered alongside antd primitives stays in family.
export const TEXT_PRIMARY = '#262626';
export const TEXT_SECONDARY = '#595959';
export const BORDER_SUBTLE = '#f0f0f0';

// System font stack used by HTML fragments rendered outside antd's
// component tree (e.g. backend-injected error HTML, deck.gl overlays).
export const SYSTEM_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
