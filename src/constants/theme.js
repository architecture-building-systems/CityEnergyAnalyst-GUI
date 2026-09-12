// CEA palette — see src/features/canvas/CLAUDE.md for usage notes.
export const CEA_PURPLE = '#AC6080';
export const PATHWAY_PRIMARY = '#1470AF';

// `uuen_blue` from `cea/visualisation/format/plot_colours.py` (rgb(20,113,176)). Note this is
// *not* the `#1470AF` used for `colorPrimary` and PATHWAY_PRIMARY -- they differ by one step
// per channel. Use this one wherever the UUEN brand blue is meant.
export const UUEN_BLUE = '#1471B0';
export const ERROR_RED = '#f04d5b';

// The tint behind warning *and* error surfaces alike -- they deliberately share one background,
// with the icon carrying the severity. From the CEA palette in
// `cea/visualisation/format/plot_colours.py`, so the GUI matches the plots. Exported rather
// than written inline because it is needed in two places that cannot share a value otherwise:
// antd's theme tokens, and plain CSS (Tabulator rows are not antd components).
// `publishPaletteCssVariables` bridges the second case.
export const ERROR_RED_LIGHTEST = '#fdece9'; // red_lightest rgb(253,236,233)

// Warning icons. Now that warning and error share a background, the icon is the only thing
// separating them at a glance -- black against the red tint reads as "look" without competing
// with the red of a real error.
export const WARNING_ICON_BLACK = '#000000';

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
  '--cea-uuen-blue': UUEN_BLUE,
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
