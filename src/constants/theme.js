// CEA palette — see src/features/canvas/CLAUDE.md for usage notes.
export const CEA_PURPLE = '#AC6080';
export const PATHWAY_PRIMARY = '#1470AF';
export const ERROR_RED = '#f04d5b';

// Warning / error surfaces, from the CEA palette in
// `cea/visualisation/format/plot_colours.py`, so the GUI matches the plots. Exported rather
// than written inline because they are needed in two places that cannot share a value
// otherwise: antd's theme tokens, and plain CSS (Tabulator rows are not antd components).
// `publishPaletteCssVariables` bridges the second case.
export const WARNING_YELLOW = '#ffd11d'; // yellow
export const WARNING_YELLOW_LIGHTEST = '#fff9e9'; // yellow_lightest rgb(255,249,233)
export const ERROR_RED_LIGHTEST = '#fdece9'; // red_lightest    rgb(253,236,233)

/**
 * Palette colours that stylesheets need, as CSS custom properties.
 *
 * Anything rendered outside antd -- a Tabulator row, a deck.gl overlay -- cannot read a theme
 * token, and hardcoding the hex in CSS means the same colour lives in two files and drifts.
 * Call once at startup; a stylesheet then refers to `var(--cea-error-red-lightest)`.
 *
 * Only what a stylesheet actually uses. Add a line when one needs another colour -- publishing
 * the whole palette ahead of demand just moves the guesswork.
 */
const CSS_VARIABLES = {
  '--cea-error-red': ERROR_RED,
  '--cea-error-red-lightest': ERROR_RED_LIGHTEST,
};

export const publishPaletteCssVariables = () => {
  const root = document.documentElement;
  Object.entries(CSS_VARIABLES).forEach(([name, value]) =>
    root.style.setProperty(name, value),
  );
};

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
