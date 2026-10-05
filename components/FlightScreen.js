import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { RouteDiagram } from './RouteDiagram';
import { ErrorBanner } from './ErrorBanner';
import { ErrorBoundary } from './ErrorBoundary';
import { SunTrackerDisplay } from './SunTrackerDisplay';
import { useTheme } from '../hooks/useTheme';
import { formatKm, formatMinutes, plannedMinutes, CRUISE_KMH } from '../utils/narrator';

const SIDE = {
  left: { label: 'LEFT WINDOW', arrow: '◀', color: '#ffb74d' },
  right: { label: 'RIGHT WINDOW', arrow: '▶', color: '#b388ff' },
  below: { label: 'LOOK DOWN', arrow: '▼', color: '#00d4ff' },
};

export function FlightScreen({ pack, session, voiceEnabled, onToggleVoice, onChangeFlight }) {
  const { colors, isDark } = useTheme();
  const running = session.status === 'running';
  const finished = session.status === 'finished';
  const cardBg = isDark ? 'rgba(255,255,255,0.07)' : '#ffffff';

  const location = useMemo(() => {
    const p = session.position;
    if (!p) return null;
    return {
      coords: {
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude,
        speed: p.speedKmh != null ? p.speedKmh / 3.6 : null,
        heading: p.heading,
      },
    };
  }, [session.position]);

  const remainingKm = Math.max(0, pack.totalKm - session.progressKm);
  const clockMode = session.mode !== 'gps';
  // Minutes until a point `alongKm` along the route, from now.
  const minutesUntil = (alongKm) =>
    clockMode
      ? plannedMinutes(alongKm) - session.elapsedMin
      : ((alongKm - session.progressKm) / CRUISE_KMH) * 60;
  const etaMin = running
    ? clockMode
      ? Math.max(0, pack.durationMin - session.elapsedMin)
      : (remainingKm / CRUISE_KMH) * 60 + 8
    : null;

  const statusText = finished
    ? 'Landed'
    : !running
      ? 'Ready'
      : session.mode === 'gps'
        ? 'Following your GPS'
        : session.mode === 'clock'
          ? 'Following the flight clock'
          : 'Starting…';

  const upcoming = useMemo(() => {
    return pack.checkpoints
      .filter(c => !session.triggeredIds.has(c.id))
      .filter(c => !running || c.alongKm >= session.progressKm - 40);
  }, [pack.checkpoints, session.triggeredIds, session.progressKm, running]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Route header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={onChangeFlight}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Change flight"
        >
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Change flight</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onToggleVoice}
          style={[styles.voiceButton, { backgroundColor: colors.buttonBackground, borderColor: colors.border }]}
          accessibilityRole="switch"
          accessibilityState={{ checked: voiceEnabled }}
          accessibilityLabel={voiceEnabled ? 'Voice on. Tap to mute' : 'Voice off. Tap to turn on'}
        >
          <Text style={styles.voiceIcon}>{voiceEnabled ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.routeTitle}>
        <Text style={[styles.code, { color: colors.text }]}>{pack.origin.code}</Text>
        <Text style={[styles.arrow, { color: colors.primary }]}>✈</Text>
        <Text style={[styles.code, { color: colors.text }]}>{pack.destination.code}</Text>
      </View>
      <Text style={[styles.routeSub, { color: colors.textSecondary }]}>
        {pack.origin.city} to {pack.destination.city}
        {pack.flightNumber ? ` · ${pack.flightNumber}` : ''}
      </Text>
      <Text style={[styles.routeSub, { color: colors.textSecondary }]}>
        {Math.round(pack.totalKm).toLocaleString('en-US')} km · about {formatMinutes(pack.durationMin)}
      </Text>

      {/* Start / stop */}
      <TouchableOpacity
        style={[
          styles.primary,
          running
            ? { backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 2 }
            : { backgroundColor: colors.primary },
        ]}
        onPress={running ? session.stop : session.start}
        accessibilityRole="button"
        accessibilityLabel={running ? 'Stop flight' : finished ? 'Start again' : 'Start flight'}
      >
        <Text style={[styles.primaryText, { color: running ? colors.primary : colors.onPrimary }]}>
          {running ? 'Stop' : finished ? 'Fly it again' : 'Start flight'}
        </Text>
      </TouchableOpacity>

      <View style={styles.statusRow} accessibilityLiveRegion="polite">
        <View style={[styles.statusDot, { backgroundColor: running ? (session.mode === 'gps' ? colors.success : colors.warning) : colors.textMuted }]} />
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>{statusText}</Text>
      </View>

      {running && (session.mode === 'gps' || session.useClock) && (
        <TouchableOpacity
          onPress={() => session.setUseClock(!session.useClock)}
          style={styles.modeSwitch}
          accessibilityRole="button"
          accessibilityLabel={session.useClock ? 'Follow GPS instead of the flight clock' : 'Follow the flight clock instead of GPS'}
        >
          <Text style={[styles.modeSwitchText, { color: colors.primary }]}>
            {session.useClock ? 'Use GPS instead' : 'Use the flight clock instead'}
          </Text>
        </TouchableOpacity>
      )}

      {!running && !finished && (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Tap Start when the doors close. Window Seat follows your phone's GPS (it works in airplane mode, ideally at a window). If there is no GPS signal, it follows a flight clock instead.
        </Text>
      )}

      {!!session.notice && (
        <ErrorBanner
          message={session.notice.message}
          type={session.notice.type === 'warning' ? 'warning' : 'info'}
          onDismiss={session.dismissNotice}
          style={styles.banner}
        />
      )}

      {/* Now playing */}
      <NowPlaying
        current={session.current}
        speaking={session.speaking}
        running={running}
        finished={finished}
        pack={pack}
        onReplay={() => session.replay(session.current)}
        onSilence={session.silence}
        colors={colors}
        cardBg={cardBg}
      />

      {/* Progress */}
      {(running || finished) && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(10,22,40,0.1)' }]}>
            <View style={[styles.barFill, { width: `${Math.round(session.progress * 100)}%`, backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.statsRow}>
            <Stat label="Flown" value={formatKm(session.progressKm)} colors={colors} />
            <Stat label="To go" value={formatKm(remainingKm)} colors={colors} />
            <Stat label={etaMin != null ? 'Lands in ~' : 'Progress'} value={etaMin != null ? formatMinutes(etaMin) : `${Math.round(session.progress * 100)}%`} colors={colors} />
          </View>
          {session.position && session.position.altitude > 300 && (
            <Text style={[styles.telemetry, { color: colors.textMuted }]}>
              {`Altitude ${Math.round(session.position.altitude * 3.28084).toLocaleString('en-US')} ft`}
              {session.position.speedKmh > 60 ? ` · ${Math.round(session.position.speedKmh)} km/h` : ''}
            </Text>
          )}
        </View>
      )}

      {/* Diagram */}
      <ErrorBoundary>
        <RouteDiagram
          route={pack.route}
          checkpoints={pack.checkpoints}
          triggeredIds={session.triggeredIds}
          position={session.position}
          progress={session.progress}
          originCode={pack.origin.code}
          destinationCode={pack.destination.code}
        />
      </ErrorBoundary>

      {/* Live tools */}
      {running && (
        <View style={styles.tools}>
          <TouchableOpacity
            style={[styles.toolButton, styles.toolWide, { backgroundColor: colors.buttonBackground, borderColor: colors.border }]}
            onPress={session.scanNow}
            accessibilityRole="button"
            accessibilityLabel="What am I flying over?"
          >
            <Text style={[styles.toolText, { color: colors.primary }]}>What am I flying over?</Text>
          </TouchableOpacity>
          {session.mode !== 'gps' && (
            <View style={styles.clockRow}>
              <ClockButton label="−5 min" onPress={() => session.adjustClock(-5)} colors={colors} />
              <ClockButton label="Just took off" onPress={session.markTakeoff} colors={colors} wide />
              <ClockButton label="+5 min" onPress={() => session.adjustClock(5)} colors={colors} />
            </View>
          )}
          {session.mode !== 'gps' && (
            <Text style={[styles.tiny, { color: colors.textMuted }]}>
              The flight clock assumes a normal schedule. Use the buttons if the plane is ahead of or behind it.
            </Text>
          )}
        </View>
      )}

      {/* Sun */}
      {location && running && (
        <SunTrackerDisplay location={location} route={pack.route} style={styles.sun} />
      )}

      {/* Seat advice */}
      <SeatAdvice pack={pack} colors={colors} cardBg={cardBg} />

      {/* Upcoming */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>
        {running ? 'COMING UP' : 'WHAT YOU WILL SEE'}
      </Text>
      {upcoming.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {finished ? 'You have seen everything on this route.' : 'Nothing more on the list.'}
        </Text>
      ) : (
        upcoming.slice(0, running ? 6 : 40).map(cp => (
          <PlanRow
            key={cp.id}
            cp={cp}
            when={running ? `in ~${formatMinutes(Math.max(1, minutesUntil(cp.alongKm)))}` : `~${formatMinutes(plannedMinutes(cp.alongKm))} in`}
            onPlay={() => session.replay(cp)}
            colors={colors}
            cardBg={cardBg}
          />
        ))
      )}

      {/* Heard */}
      {session.heard.length > 0 && (
        <>
          <Text style={[styles.section, { color: colors.textSecondary }]}>ALREADY HEARD</Text>
          {[...session.heard].reverse().map((h, i) => (
            <PlanRow
              key={`${h.id}-${h.at}-${i}`}
              cp={h}
              when="replay"
              heard
              onPlay={() => session.replay(h)}
              colors={colors}
              cardBg={cardBg}
            />
          ))}
        </>
      )}

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Sights are planned from a built-in atlas along the direct route. Your real flight path may differ a little, so Window Seat also checks what is near you as you fly.
      </Text>
    </ScrollView>
  );
}

function NowPlaying({ current, speaking, running, finished, pack, onReplay, onSilence, colors, cardBg }) {
  if (!current) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {finished ? 'Welcome to ' + pack.destination.city : running ? 'Looking out the window…' : 'Ready when you are'}
        </Text>
        <Text style={[styles.cardText, { color: colors.textSecondary }]}>
          {running
            ? 'The first sights will be announced shortly after take-off.'
            : `${pack.checkpoints.filter(c => c.kind === 'landmark').length} sights planned along this route. Tap any of them below to preview.`}
        </Text>
      </View>
    );
  }
  const side = SIDE[current.side] || SIDE.below;
  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: side.color }]} accessibilityLiveRegion="polite">
      <View style={styles.nowHeader}>
        <View style={[styles.sideBadge, { backgroundColor: side.color }]}>
          <Text style={styles.sideBadgeText}>
            {current.side === 'left' ? `${side.arrow} ` : ''}{side.label}{current.side === 'right' ? ` ${side.arrow}` : ''}{current.side === 'below' ? ` ${side.arrow}` : ''}
          </Text>
        </View>
        {speaking && <Text style={[styles.speaking, { color: colors.primary }]}>● speaking</Text>}
      </View>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{current.name}</Text>
      <Text style={[styles.narration, { color: colors.text }]}>{current.narration}</Text>
      <View style={styles.nowActions}>
        <TouchableOpacity onPress={onReplay} style={styles.smallAction} accessibilityRole="button" accessibilityLabel="Read again">
          <Text style={[styles.smallActionText, { color: colors.primary }]}>▶ Read again</Text>
        </TouchableOpacity>
        {speaking && (
          <TouchableOpacity onPress={onSilence} style={styles.smallAction} accessibilityRole="button" accessibilityLabel="Stop speaking">
            <Text style={[styles.smallActionText, { color: colors.textSecondary }]}>■ Stop voice</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PlanRow({ cp, when, heard, onPlay, colors, cardBg }) {
  const [open, setOpen] = useState(false);
  const side = SIDE[cp.side] || SIDE.below;
  const kindIcon = cp.kind === 'departure' ? '🛫' : cp.kind === 'arrival' ? '🛬' : cp.kind === 'crossing' ? '🌐' : cp.kind === 'fact' ? '💡' : cp.kind === 'progress' ? '⏱' : null;
  return (
    <View style={[styles.row, { backgroundColor: cardBg, borderColor: colors.border, opacity: heard ? 0.8 : 1 }]}>
      <TouchableOpacity
        style={styles.rowMain}
        onPress={() => setOpen(o => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${cp.name}. ${SIDE[cp.side]?.label || ''}. ${when}`}
      >
        <View style={[styles.rowSide, { backgroundColor: side.color }]}>
          <Text style={styles.rowSideText}>{kindIcon || (cp.side === 'left' ? 'L' : cp.side === 'right' ? 'R' : '▼')}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={open ? 3 : 1}>{cp.name}</Text>
          <Text style={[styles.rowWhen, { color: colors.textSecondary }]}>{when}</Text>
        </View>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.rowBody}>
          <Text style={[styles.rowNarration, { color: colors.textSecondary }]}>{cp.narration}</Text>
          <TouchableOpacity onPress={onPlay} style={styles.smallAction} accessibilityRole="button" accessibilityLabel="Listen">
            <Text style={[styles.smallActionText, { color: colors.primary }]}>▶ Listen</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SeatAdvice({ pack, colors, cardBg }) {
  const { leftCount, rightCount, betterSide } = pack;
  if (leftCount + rightCount === 0) return null;
  const text =
    betterSide === 'left'
      ? `Choose a window on the LEFT side of the aircraft. ${leftCount} of the sights are on the left, ${rightCount} on the right.`
      : betterSide === 'right'
        ? `Choose a window on the RIGHT side of the aircraft. ${rightCount} of the sights are on the right, ${leftCount} on the left.`
        : `Either side works. The sights are about evenly split: ${leftCount} left, ${rightCount} right.`;
  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Best seat</Text>
      <Text style={[styles.cardText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

function Stat({ label, value, colors }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function ClockButton({ label, onPress, colors, wide }) {
  return (
    <TouchableOpacity
      style={[styles.clockButton, wide && styles.clockButtonWide, { backgroundColor: colors.buttonBackground, borderColor: colors.border }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.clockText, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 56 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 16, fontWeight: '600' },
  voiceButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  voiceIcon: { fontSize: 20 },
  routeTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  code: { fontSize: 40, fontWeight: '800', letterSpacing: 2 },
  arrow: { fontSize: 26, marginHorizontal: 16 },
  routeSub: { fontSize: 14, textAlign: 'center', marginTop: 2 },
  primary: { marginTop: 18, borderRadius: 30, paddingVertical: 18, alignItems: 'center', minHeight: 58 },
  primaryText: { fontSize: 18, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: '600' },
  modeSwitch: { alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 12 },
  modeSwitchText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  banner: { marginTop: 12 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 16 },
  cardTitle: { fontSize: 19, fontWeight: '700' },
  cardText: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  narration: { fontSize: 17, lineHeight: 26, marginTop: 10 },
  nowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sideBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  sideBadgeText: { color: '#0a1628', fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  speaking: { fontSize: 12, fontWeight: '700' },
  nowActions: { flexDirection: 'row', marginTop: 12 },
  smallAction: { paddingVertical: 8, paddingRight: 20, minHeight: 40, justifyContent: 'center' },
  smallActionText: { fontSize: 14, fontWeight: '700' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', marginTop: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  telemetry: { fontSize: 12, textAlign: 'center', marginTop: 12 },
  tools: { marginBottom: 6 },
  toolButton: { borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  toolWide: { paddingHorizontal: 16 },
  toolText: { fontSize: 16, fontWeight: '700' },
  clockRow: { flexDirection: 'row', marginTop: 10 },
  clockButton: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center', marginRight: 8, minHeight: 46, justifyContent: 'center' },
  clockButtonWide: { flex: 1.6 },
  clockText: { fontSize: 14, fontWeight: '600' },
  tiny: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  sun: { marginBottom: 6 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginTop: 26, marginBottom: 10 },
  empty: { fontSize: 14, lineHeight: 21 },
  row: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  rowMain: { flexDirection: 'row', alignItems: 'center', padding: 12, minHeight: 60 },
  rowSide: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowSideText: { color: '#0a1628', fontSize: 14, fontWeight: '800' },
  rowText: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600' },
  rowWhen: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 14, marginLeft: 8 },
  rowBody: { paddingHorizontal: 14, paddingBottom: 10 },
  rowNarration: { fontSize: 14, lineHeight: 21 },
  footer: { fontSize: 12, lineHeight: 18, marginTop: 28, textAlign: 'center' },
});

export default FlightScreen;
