import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LANDMARKS } from '../data/landmarks';
import { useTheme } from '../hooks/useTheme';

const SIDE_COLORS = { left: '#ffb74d', right: '#b388ff', below: '#00d4ff' };
const HEIGHT = 230;
const PAD = 26;

// Longitudes are unwrapped so that a route crossing the date line stays continuous.
function unwrap(route) {
  const out = [];
  let offset = 0;
  let prev = null;
  for (const p of route) {
    let lon = p.longitude + offset;
    if (prev != null) {
      while (lon - prev > 180) {
        offset -= 360;
        lon -= 360;
      }
      while (prev - lon > 180) {
        offset += 360;
        lon += 360;
      }
    }
    out.push({ ...p, lon });
    prev = lon;
  }
  return out;
}

function nearestLon(lon, ref) {
  let l = lon;
  while (l - ref > 180) l -= 360;
  while (ref - l > 180) l += 360;
  return l;
}

/**
 * A schematic, fully offline "flight radar": the route, the sights along it and the
 * aircraft. No map tiles, no API key, no network.
 */
export function RouteDiagram({ route = [], checkpoints = [], triggeredIds = new Set(), position = null, progress = 0, originCode, destinationCode }) {
  const { colors, isDark } = useTheme();
  const [width, setWidth] = useState(0);

  const geometry = useMemo(() => {
    if (route.length < 2) return null;
    const pts = unwrap(route);
    const lats = pts.map(p => p.latitude);
    const lons = pts.map(p => p.lon);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLon = Math.min(...lons);
    let maxLon = Math.max(...lons);
    // Keep some breathing room and a sane minimum span.
    const padLat = Math.max(2, (maxLat - minLat) * 0.12);
    const midLat = (minLat + maxLat) / 2;
    const k = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));
    const padLon = Math.max(2 / k, (maxLon - minLon) * 0.12);
    minLat -= padLat;
    maxLat += padLat;
    minLon -= padLon;
    maxLon += padLon;
    return { pts, minLat, maxLat, minLon, maxLon, k };
  }, [route]);

  const layout = useMemo(() => {
    if (!geometry || !width) return null;
    const { minLat, maxLat, minLon, maxLon, k } = geometry;
    const spanX = (maxLon - minLon) * k;
    const spanY = maxLat - minLat;
    const availW = width - PAD * 2;
    const availH = HEIGHT - PAD * 2;
    const scale = Math.min(availW / spanX, availH / spanY);
    const drawW = spanX * scale;
    const drawH = spanY * scale;
    const ox = (width - drawW) / 2;
    const oy = (HEIGHT - drawH) / 2;
    const project = (lat, lonUnwrapped) => ({
      x: ox + (lonUnwrapped - minLon) * k * scale,
      y: oy + (maxLat - lat) * scale,
    });
    return { project, scale, ox, oy, drawW, drawH };
  }, [geometry, width]);

  const drawn = useMemo(() => {
    if (!geometry || !layout) return null;
    const { pts, minLon, maxLon, minLat, maxLat } = geometry;
    const { project } = layout;
    const refLon = (minLon + maxLon) / 2;

    // Route segments (thinned so long routes stay cheap to draw)
    const stride = Math.max(1, Math.floor(pts.length / 90));
    const xy = [];
    for (let i = 0; i < pts.length; i += stride) xy.push({ ...project(pts[i].latitude, pts[i].lon), i });
    const last = pts.length - 1;
    if (xy[xy.length - 1].i !== last) xy.push({ ...project(pts[last].latitude, pts[last].lon), i: last });

    const segments = [];
    for (let s = 0; s < xy.length - 1; s++) {
      const a = xy[s];
      const b = xy[s + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.5) continue;
      segments.push({
        key: s,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        len,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
        fraction: (a.i + b.i) / 2 / last,
      });
    }

    // Faint dots for every known sight inside the frame: gives the map some geography.
    const dots = [];
    for (const l of LANDMARKS) {
      if (l.latitude < minLat || l.latitude > maxLat) continue;
      const lon = nearestLon(l.longitude, refLon);
      if (lon < minLon || lon > maxLon) continue;
      dots.push({ key: l.id, ...project(l.latitude, lon) });
    }

    // Planned sights
    const marks = checkpoints
      .filter(c => c.kind === 'landmark' || c.kind === 'crossing')
      .map(c => {
        const lon = nearestLon(c.longitude, refLon);
        return { key: c.id, side: c.side, heard: triggeredIds.has(c.id), ...project(c.latitude, lon) };
      });

    // Grid
    const span = Math.max(maxLat - minLat, maxLon - minLon);
    const step = span > 120 ? 30 : span > 60 ? 15 : span > 30 ? 10 : span > 12 ? 5 : 2;
    const gridLines = [];
    for (let lat = Math.ceil(minLat / step) * step; lat <= maxLat; lat += step) {
      gridLines.push({ key: `la${lat}`, horizontal: true, pos: project(lat, minLon).y });
    }
    for (let lon = Math.ceil(minLon / step) * step; lon <= maxLon; lon += step) {
      gridLines.push({ key: `lo${lon}`, horizontal: false, pos: project(minLat, lon).x });
    }

    const start = project(pts[0].latitude, pts[0].lon);
    const end = project(pts[last].latitude, pts[last].lon);

    // Aircraft
    let plane = null;
    const posLat = position ? position.latitude : null;
    if (posLat != null) {
      const lon = nearestLon(position.longitude, refLon);
      const p = project(position.latitude, lon);
      // Direction from the neighbouring part of the route, in screen space.
      const idx = Math.min(last - 1, Math.max(0, Math.floor(progress * last)));
      const a = project(pts[idx].latitude, pts[idx].lon);
      const b = project(pts[idx + 1].latitude, pts[idx + 1].lon);
      const angle = (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI;
      plane = { ...p, angle };
    }

    return { segments, dots, marks, gridLines, start, end, plane };
  }, [geometry, layout, checkpoints, triggeredIds, position, progress]);

  const lineDim = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(10,22,40,0.28)';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(10,22,40,0.07)';
  const dotColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(10,22,40,0.2)';

  return (
    <View
      style={[styles.frame, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(10,22,40,0.04)', borderColor: colors.border }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Route diagram from ${originCode || 'origin'} to ${destinationCode || 'destination'}${position ? `, ${Math.round(progress * 100)} percent flown` : ''}`}
    >
      {drawn && (
        <>
          {drawn.gridLines.map(g => (
            <View
              key={g.key}
              style={[
                styles.grid,
                { backgroundColor: gridColor },
                g.horizontal ? { top: g.pos, left: 0, right: 0, height: 1 } : { left: g.pos, top: 0, bottom: 0, width: 1 },
              ]}
            />
          ))}
          {drawn.dots.map(d => (
            <View key={d.key} style={[styles.dot, { left: d.x - 1.5, top: d.y - 1.5, backgroundColor: dotColor }]} />
          ))}
          {drawn.segments.map(s => (
            <View
              key={s.key}
              style={{
                position: 'absolute',
                left: s.cx - s.len / 2,
                top: s.cy - 1.25,
                width: s.len,
                height: 2.5,
                borderRadius: 2,
                backgroundColor: s.fraction <= progress ? colors.primary : lineDim,
                transform: [{ rotate: `${s.angle}deg` }],
              }}
            />
          ))}
          {drawn.marks.map(m => (
            <View
              key={m.key}
              style={[
                styles.mark,
                {
                  left: m.x - 5,
                  top: m.y - 5,
                  borderColor: SIDE_COLORS[m.side] || SIDE_COLORS.below,
                  backgroundColor: m.heard ? SIDE_COLORS[m.side] || SIDE_COLORS.below : 'transparent',
                },
              ]}
            />
          ))}
          <Airport x={drawn.start.x} y={drawn.start.y} code={originCode} colors={colors} />
          <Airport x={drawn.end.x} y={drawn.end.y} code={destinationCode} colors={colors} />
          {drawn.plane && (
            <View
              style={[styles.planeWrap, { left: drawn.plane.x - 14, top: drawn.plane.y - 14, transform: [{ rotate: `${drawn.plane.angle}deg` }], pointerEvents: 'none' }]}
            >
              <Text style={[styles.plane, { color: colors.primary }]}>▲</Text>
            </View>
          )}
        </>
      )}

      <View style={[styles.legend, { pointerEvents: 'none' }]}>
        <Legend color={SIDE_COLORS.left} label="Left" textColor={colors.textSecondary} />
        <Legend color={SIDE_COLORS.right} label="Right" textColor={colors.textSecondary} />
      </View>
    </View>
  );
}

function Airport({ x, y, code, colors }) {
  return (
    <>
      <View style={[styles.airportDot, { left: x - 6, top: y - 6, backgroundColor: colors.text }]} />
      {!!code && (
        <Text
          style={[styles.airportLabel, { left: x - 22, top: y + 8, color: colors.text }]}
          numberOfLines={1}
        >
          {code}
        </Text>
      )}
    </>
  );
}

function Legend({ color, label, textColor }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { borderColor: color }]} />
      <Text style={[styles.legendText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  grid: { position: 'absolute' },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 2 },
  mark: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  airportDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
  airportLabel: { position: 'absolute', width: 44, textAlign: 'center', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  planeWrap: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  plane: { fontSize: 22, lineHeight: 26 },
  legend: { position: 'absolute', right: 10, bottom: 8, flexDirection: 'row' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  legendDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, marginRight: 4 },
  legendText: { fontSize: 11 },
});

export default RouteDiagram;
