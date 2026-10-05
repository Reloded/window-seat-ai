import {
  greatCircleRoute,
  planFlight,
  Narrator,
  distanceKm,
  bearingDeg,
  positionAlongRoute,
  projectOnRoute,
  detectCrossing,
  estimateFlightMinutes,
  simulatedDistanceKm,
  seatAdvice,
  routeLengthKm,
} from '../utils/narrator';
import { getAirport, searchAirports, AIRPORTS } from '../data/airports';
import { LANDMARKS } from '../data/landmarks';

const route = (from: string, to: string) => {
  const a = getAirport(from)!;
  const b = getAirport(to)!;
  return { a, b, points: greatCircleRoute({ ...a, name: a.name }, { ...b, name: b.name }) };
};

describe('data integrity', () => {
  test('landmark ids are unique and coordinates valid', () => {
    const ids = new Set<string>();
    for (const l of LANDMARKS) {
      expect(ids.has(l.id)).toBe(false);
      ids.add(l.id);
      expect(l.latitude).toBeGreaterThanOrEqual(-90);
      expect(l.latitude).toBeLessThanOrEqual(90);
      expect(l.longitude).toBeGreaterThanOrEqual(-180);
      expect(l.longitude).toBeLessThanOrEqual(180);
      expect(l.radiusKm).toBeGreaterThan(0);
      expect(l.text.length).toBeGreaterThan(60);
      expect(l.text.length).toBeLessThan(700);
    }
    expect(LANDMARKS.length).toBeGreaterThan(250);
  });

  test('airport codes are unique and valid', () => {
    const codes = new Set<string>();
    for (const a of AIRPORTS) {
      expect(a.code).toMatch(/^[A-Z]{3}$/);
      expect(codes.has(a.code)).toBe(false);
      codes.add(a.code);
      expect(Math.abs(a.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(a.longitude)).toBeLessThanOrEqual(180);
    }
    expect(AIRPORTS.length).toBeGreaterThan(350);
  });

  test('airport search', () => {
    expect(searchAirports('vno')[0].code).toBe('VNO');
    expect(searchAirports('vilnius')[0].code).toBe('VNO');
    expect(searchAirports('london').map(a => a.code)).toContain('LHR');
    expect(searchAirports('zürich')[0].code).toBe('ZRH');
    expect(searchAirports('qwertyxx')).toHaveLength(0);
  });
});

describe('geometry', () => {
  test('distances match known values', () => {
    const lhr = getAirport('LHR')!;
    const jfk = getAirport('JFK')!;
    expect(distanceKm(lhr, jfk)).toBeGreaterThan(5500);
    expect(distanceKm(lhr, jfk)).toBeLessThan(5600);
    const vno = getAirport('VNO')!;
    const rix = getAirport('RIX')!;
    expect(distanceKm(vno, rix)).toBeGreaterThan(240);
    expect(distanceKm(vno, rix)).toBeLessThan(270);
  });

  test('route endpoints and length', () => {
    const { a, b, points } = route('LHR', 'JFK');
    expect(points[0].latitude).toBeCloseTo(a.latitude, 3);
    expect(points[points.length - 1].longitude).toBeCloseTo(b.longitude, 3);
    expect(routeLengthKm(points)).toBeCloseTo(distanceKm(a, b), -1);
    expect(points.length).toBeGreaterThan(50);
  });

  test('positionAlongRoute and projectOnRoute are consistent', () => {
    const { points } = route('LAX', 'SYD');
    const total = routeLengthKm(points);
    const p = positionAlongRoute(points, total / 2);
    const back = projectOnRoute(points, p);
    expect(Math.abs(back.alongKm - total / 2)).toBeLessThan(5);
    expect(back.offRouteKm).toBeLessThan(2);
    // A point 100 km off-track is reported as such
    const off = projectOnRoute(points, { latitude: p.latitude + 1, longitude: p.longitude });
    expect(off.offRouteKm).toBeGreaterThan(50);
  });

  test('crossing detection', () => {
    expect(detectCrossing({ latitude: -0.1, longitude: 10 }, { latitude: 0.1, longitude: 10 })?.id).toBe('equator');
    expect(detectCrossing({ latitude: 50, longitude: -0.1 }, { latitude: 50, longitude: 0.1 })?.id).toBe('prime-meridian');
    expect(detectCrossing({ latitude: 30, longitude: 179.9 }, { latitude: 30, longitude: -179.9 })?.id).toBe('date-line');
    expect(detectCrossing({ latitude: 30, longitude: 10 }, { latitude: 30.1, longitude: 10.2 })).toBeNull();
  });

  test('flight time estimate is sensible', () => {
    expect(estimateFlightMinutes(250)).toBeGreaterThan(30);
    expect(estimateFlightMinutes(250)).toBeLessThan(70);
    expect(estimateFlightMinutes(5540)).toBeGreaterThan(360);
    expect(estimateFlightMinutes(5540)).toBeLessThan(480);
    expect(simulatedDistanceKm(0, 1000)).toBe(0);
    expect(simulatedDistanceKm(10000, 1000)).toBe(1000);
  });
});

describe('planning', () => {
  const plans: Record<string, ReturnType<typeof planFlight>> = {};
  const cases: [string, string][] = [
    ['VNO', 'RIX'],
    ['VNO', 'LHR'],
    ['LHR', 'JFK'],
    ['LAX', 'SYD'],
    ['DXB', 'BKK'],
    ['SFO', 'HND'],
    ['FRA', 'JNB'],
    ['GRU', 'MAD'],
  ];

  for (const [from, to] of cases) {
    const { a, b, points } = route(from, to);
    plans[`${from}-${to}`] = planFlight(points, a, b);
  }

  test.each(cases)('%s → %s produces an ordered, sane plan', (from, to) => {
    const plan = plans[`${from}-${to}`];
    const cps = plan.checkpoints;
    expect(cps[0].kind).toBe('departure');
    expect(cps[cps.length - 1].kind).toBe('arrival');
    for (let i = 1; i < cps.length; i++) {
      expect(cps[i].alongKm).toBeGreaterThanOrEqual(cps[i - 1].alongKm);
    }
    // Every landmark is unique
    const ids = cps.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Not absurdly dense: on average one item per >= 40 km
    expect(cps.length).toBeLessThan(plan.totalKm / 40 + 6);
  });

  test('transatlantic flight has no huge silent gaps', () => {
    const plan = plans['LHR-JFK'];
    let maxGap = 0;
    for (let i = 1; i < plan.checkpoints.length; i++) {
      maxGap = Math.max(maxGap, plan.checkpoints[i].alongKm - plan.checkpoints[i - 1].alongKm);
    }
    expect(maxGap).toBeLessThan(700);
    expect(plan.checkpoints.length).toBeGreaterThan(8);
  });

  test('Vilnius to London passes recognisable sights', () => {
    const names = plans['VNO-LHR'].checkpoints.map(c => c.name).join(' | ');
    // The route crosses Poland / Germany / the Netherlands / the North Sea.
    expect(names).toMatch(/Baltic|Vistula|Warsaw|Berlin|Rhine|North Sea|Amsterdam|Masurian/);
  });

  test('Dubai to Bangkok goes over India', () => {
    const names = plans['DXB-BKK'].checkpoints.map(c => c.name).join(' | ');
    expect(names).toMatch(/Indus|Thar|Mumbai|Western Ghats|Ganges|Delhi|Sri Lanka|Bengal|Irrawaddy|Arabian/i);
  });

  test('window advice gives a side', () => {
    const adv = seatAdvice(plans['LHR-JFK']);
    expect(['left', 'right', 'either']).toContain(adv.better);
  });

  test('print plans for review', () => {
    const lines: string[] = [];
    for (const key of ['VNO-RIX', 'VNO-LHR', 'LHR-JFK', 'LAX-SYD']) {
      const p = plans[key];
      lines.push(`\n=== ${key}: ${Math.round(p.totalKm)} km, ${p.durationMin} min, ${p.checkpoints.length} items`);
      for (const c of p.checkpoints) {
        lines.push(`${String(c.alongKm).padStart(5)} km  ${c.kind.padEnd(9)} ${c.side.padEnd(5)} off=${String(Math.round(c.offsetKm)).padStart(4)}  ${c.name}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
  });
});

describe('live narrator', () => {
  test('announces sights from a real position and never repeats', () => {
    const { a, b, points } = route('VNO', 'LHR');
    const total = routeLengthKm(points);
    const n = new Narrator({ origin: a, destination: b, totalKm: total });
    const heard: string[] = [];
    for (let km = 5; km < total; km += 10) {
      const p = positionAlongRoute(points, km);
      const out = n.update(p, p.heading);
      if (out) heard.push(out.id);
    }
    expect(heard.length).toBeGreaterThan(2);
    expect(new Set(heard).size).toBe(heard.length);
  });

  test('stays correct when the aircraft is off the great circle', () => {
    const { a, b, points } = route('LHR', 'JFK');
    const total = routeLengthKm(points);
    // Same flight, shifted 150 km south of the planned line
    const n = new Narrator({ origin: a, destination: b, totalKm: total });
    let count = 0;
    for (let km = 5; km < total; km += 10) {
      const p = positionAlongRoute(points, km);
      const shifted = { latitude: p.latitude - 1.4, longitude: p.longitude };
      const out = n.update(shifted, null); // heading derived from movement
      if (out) count++;
    }
    expect(count).toBeGreaterThan(4);
  });

  test('derives heading from movement and needs no GPS heading', () => {
    const n = new Narrator({ totalKm: 500 });
    expect(n.update({ latitude: 54.6, longitude: 25.3 }, null)).toBeNull();
    // Second fix gives a heading; must not throw.
    expect(() => n.update({ latitude: 54.9, longitude: 25.0 }, null)).not.toThrow();
  });

  test('bearing helper', () => {
    expect(bearingDeg({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(0, 3);
    expect(bearingDeg({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(90, 3);
  });
});
