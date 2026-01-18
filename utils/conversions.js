// Altitude conversions
export function metersToFeet(meters) {
  if (meters == null) return null;
  return meters * 3.28084;
}

export function feetToMeters(feet) {
  if (feet == null) return null;
  return feet / 3.28084;
}

// Speed conversions
export function mpsToKnots(mps) {
  if (mps == null) return null;
  return mps * 1.94384;
}

export function knotsToMps(knots) {
  if (knots == null) return null;
  return knots / 1.94384;
}

export function mpsToMph(mps) {
  if (mps == null) return null;
  return mps * 2.23694;
}

export function mpsToKph(mps) {
  if (mps == null) return null;
  return mps * 3.6;
}

// Distance conversions
export function metersToMiles(meters) {
  if (meters == null) return null;
  return meters / 1609.344;
}

export function metersToKm(meters) {
  if (meters == null) return null;
  return meters / 1000;
}

export function metersToNauticalMiles(meters) {
  if (meters == null) return null;
  return meters / 1852;
}

// Formatting helpers
export function formatAltitude(meters, unit = 'ft') {
  if (meters == null) return '---';
  const feet = Math.round(metersToFeet(meters));
  return feet.toLocaleString();
}

export function formatSpeed(mps, unit = 'kts') {
  if (mps == null) return '---';
  const knots = Math.round(mpsToKnots(mps));
  return knots.toString();
}

export function formatDistance(meters, unit = 'km') {
  if (meters == null) return '---';

  if (unit === 'km') {
    const km = metersToKm(meters);
    if (km < 1) {
      return `${Math.round(meters)}m`;
    }
    return `${km.toFixed(1)}km`;
  }

  if (unit === 'mi') {
    const miles = metersToMiles(meters);
    if (miles < 0.1) {
      const feet = Math.round(meters * 3.28084);
      return `${feet}ft`;
    }
    return `${miles.toFixed(1)}mi`;
  }

  if (unit === 'nm') {
    const nm = metersToNauticalMiles(meters);
    return `${nm.toFixed(1)}nm`;
  }

  return `${Math.round(meters)}m`;
}

export function formatCoordinate(value, isLatitude) {
  if (value == null) return '---';

  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutes = ((absolute - degrees) * 60).toFixed(3);

  const direction = isLatitude
    ? value >= 0 ? 'N' : 'S'
    : value >= 0 ? 'E' : 'W';

  return `${degrees}°${minutes}'${direction}`;
}

export function formatCoordinateDecimal(value, decimals = 4) {
  if (value == null) return '---';
  return value.toFixed(decimals);
}
