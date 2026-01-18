import L from 'leaflet';
import { COLORS, SIZES } from './mapStyles';

// Create SVG-based divIcon markers for different checkpoint types

const createSvgIcon = (svgContent, size = 24) => {
  return L.divIcon({
    html: svgContent,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Departure marker - green airplane icon
export const getDepartureIcon = () => {
  const svg = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${COLORS.departure}" stroke="${COLORS.background}" stroke-width="2"/>
      <path d="M12 6L16 12L12 10L8 12L12 6Z" fill="${COLORS.background}" transform="rotate(0 12 12)"/>
    </svg>
  `;
  return createSvgIcon(svg, 24);
};

// Arrival marker - green flag icon
export const getArrivalIcon = () => {
  const svg = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${COLORS.arrival}" stroke="${COLORS.background}" stroke-width="2"/>
      <path d="M9 7V17M9 7L15 10L9 13" fill="${COLORS.background}" stroke="${COLORS.background}" stroke-width="1.5"/>
    </svg>
  `;
  return createSvgIcon(svg, 24);
};

// Waypoint marker - dot that changes color based on triggered state
export const getWaypointIcon = (triggered = false) => {
  const color = triggered ? COLORS.checkpointTriggered : COLORS.checkpointUntriggered;
  const innerColor = triggered ? COLORS.background : COLORS.background;
  const checkmark = triggered ? `
    <path d="M8 12L10.5 14.5L16 9" stroke="${innerColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ` : '';

  const svg = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="${color}" stroke="${COLORS.background}" stroke-width="2"/>
      ${checkmark}
    </svg>
  `;
  return createSvgIcon(svg, 20);
};

// User location marker - white with cyan halo
export const getUserLocationIcon = () => {
  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${COLORS.userLocationHalo}" stroke="none"/>
      <circle cx="20" cy="20" r="10" fill="${COLORS.userLocationFill}" stroke="${COLORS.userLocationStroke}" stroke-width="3"/>
      <circle cx="20" cy="20" r="4" fill="${COLORS.userLocationStroke}"/>
    </svg>
  `;
  return createSvgIcon(svg, 40);
};

// Get appropriate icon based on checkpoint type and state
export const getCheckpointIcon = (checkpoint, isTriggered = false) => {
  const type = checkpoint?.type?.toLowerCase();

  if (type === 'departure' || type === 'origin') {
    return getDepartureIcon();
  }

  if (type === 'arrival' || type === 'destination') {
    return getArrivalIcon();
  }

  return getWaypointIcon(isTriggered);
};

// CSS for markers (to be injected into the page)
export const markerStyles = `
  .custom-marker {
    background: transparent;
    border: none;
  }
  .custom-marker svg {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
`;
