import locations from "./locations.json";

export const states = locations.states;

export const districtsByState: Record<string, string[]> = locations.districtsByState;

export function getDistrictsForState(state?: string) {
  if (!state) return [];
  return districtsByState[state] ?? [];
}

export function getStateTranslationKey(state: string) {
  return `locations.states.${state}`;
}
