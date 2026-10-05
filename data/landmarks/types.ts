export type FeatureType =
  | 'city'
  | 'mountain'
  | 'volcano'
  | 'sea'
  | 'ocean'
  | 'lake'
  | 'river'
  | 'delta'
  | 'desert'
  | 'coast'
  | 'island'
  | 'glacier'
  | 'forest'
  | 'canyon'
  | 'plain'
  | 'strait'
  | 'landmark';

export interface Landmark {
  id: string;
  name: string;
  type: FeatureType;
  latitude: number;
  longitude: number;
  /** Rough radius (km) of the feature: how far from its centre you are still "over" it. */
  radiusKm: number;
  /** 1 = nice to know, 2 = notable, 3 = iconic (wins when several sights compete). */
  importance: 1 | 2 | 3;
  /** Narration. Always starts with the feature's name so it reads well on its own. */
  text: string;
}

export const L = (
  id: string,
  name: string,
  type: FeatureType,
  latitude: number,
  longitude: number,
  radiusKm: number,
  importance: 1 | 2 | 3,
  text: string
): Landmark => ({ id, name, type, latitude, longitude, radiusKm, importance, text });
