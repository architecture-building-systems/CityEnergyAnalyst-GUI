/**
 * Void-deck height, in metres, for a zone feature.
 *
 * A void deck is the open, unenclosed portion at the *bottom* of a building.
 *
 * `height_vd` (metres) is authoritative. `void_deck` (legacy, whole floors) is converted at
 * the building's own storey height -- `height_ag / floors_ag` -- which is what CEA does in
 * `cea/datamanagement/utils/resolve_void_height`. Neither column present means no void deck.
 *
 * This replaces a hardcoded 3 m per void-deck floor, which drew every building whose real
 * storey height was not 3 m at the wrong elevation.
 */
export const voidDeckHeight = (properties) => {
  const props = properties || {};

  const heightVd = Number(props.height_vd);
  if (Number.isFinite(heightVd)) return Math.max(heightVd, 0);

  const voidDeckFloors = Number(props.void_deck);
  if (!Number.isFinite(voidDeckFloors) || voidDeckFloors <= 0) return 0;

  const heightAg = Number(props.height_ag);
  const floorsAg = Number(props.floors_ag);
  if (!Number.isFinite(heightAg) || !Number.isFinite(floorsAg) || floorsAg <= 0) return 0;

  return Math.max(voidDeckFloors * (heightAg / floorsAg), 0);
};

/**
 * Storeys of enclosed (non-void) building above ground.
 *
 * The two columns count `floors_ag` differently, and this is where that is resolved:
 *
 *   - `void_deck` (legacy): `floors_ag` spans the whole height, void storeys included, so the
 *     enclosed count is `floors_ag - void_deck`.
 *   - `height_vd`: `floors_ag` already counts only the enclosed storeys; the void deck sits
 *     beneath them, measured in metres and independent of the storey grid.
 *
 * Mirrors `resolve_enclosed_floors_ag` in `cea/datamanagement/utils`.
 */
export const enclosedFloorsAg = (properties) => {
  const props = properties || {};
  const floorsAg = Number(props.floors_ag);
  if (!Number.isFinite(floorsAg) || floorsAg <= 0) return 0;

  if (Number.isFinite(Number(props.height_vd))) return floorsAg;

  const voidDeckFloors = Number(props.void_deck);
  if (!Number.isFinite(voidDeckFloors) || voidDeckFloors <= 0) return floorsAg;

  return Math.max(floorsAg - voidDeckFloors, 0);
};
