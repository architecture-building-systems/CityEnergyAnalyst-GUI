import { PLOT_GROUPS } from 'features/plots/constants';

/**
 * Walk PLOT_GROUPS to find the group/subgroup that owns a given
 * feature key. Used by Plot/KPI cards to label their title rows.
 * Subgroups inherit their parent group's icon.
 */
export function findFamilyForFeature(feature) {
  if (!feature) return null;
  for (const group of PLOT_GROUPS) {
    if (group.keys?.includes(feature)) {
      return { label: group.label, keys: group.keys, icon: group.icon };
    }
    if (group.subgroups) {
      for (const sub of group.subgroups) {
        if (sub.keys?.includes(feature)) {
          return { label: sub.label, keys: sub.keys, icon: group.icon };
        }
      }
    }
  }
  return null;
}

export const sectionDividerStyle = {
  borderTop: '1px solid #f0f0f0',
};
