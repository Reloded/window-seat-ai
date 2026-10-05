import { Landmark } from './types';
import { EUROPE } from './europe';
import { ASIA } from './asia';
import { AFRICA } from './africa';
import { AMERICAS } from './americas';
import { OCEANIA } from './oceania';
import { MORE } from './more';

export type { Landmark, FeatureType } from './types';

export const LANDMARKS: Landmark[] = [...EUROPE, ...ASIA, ...AFRICA, ...AMERICAS, ...OCEANIA, ...MORE];

// In-flight facts used to fill long stretches with no landmark in range
// (typically ocean crossings). Each is spoken as-is.
export const FLIGHT_FACTS: { id: string; text: string }[] = [
  { id: 'altitude', text: "Did you know? At cruising altitude, around 11,000 metres or 36,000 feet, the outside air is about minus 55 degrees Celsius and far too thin to breathe. The cabin is pressurised to feel like an altitude of roughly 2,000 metres." },
  { id: 'speed', text: "Did you know? A typical airliner cruises at about 900 kilometres an hour. Yet from the window, at this height, you seem to crawl. There is nothing nearby to give the eye a sense of speed." },
  { id: 'horizon', text: "Did you know? From this height the horizon is about 400 kilometres away. On a clear day, a passenger can see much farther than a person on a mountain top, and the curve of the Earth is just visible." },
  { id: 'contrails', text: "Did you know? The white trails behind aircraft are called contrails, short for condensation trails. Hot, humid engine exhaust freezes into ice crystals in the frigid air, just like your breath on a winter day." },
  { id: 'jet-stream', text: "Did you know? Jet streams are fast rivers of air high in the atmosphere, sometimes blowing at over 300 kilometres an hour. Flying east with one can shave an hour or more off a transatlantic flight, so eastbound flights are usually quicker." },
  { id: 'window-shape', text: "Did you know? Aircraft windows are rounded because sharp corners concentrate stress. Early jetliners with square windows suffered fatal cracks in the 1950s, and rounded windows have been the standard ever since." },
  { id: 'tiny-hole', text: "Did you know? The small hole at the bottom of your window is a breather hole. It balances the pressure between the panes, and keeps the outer window carrying the load, so the inner pane stays clear." },
  { id: 'clouds', text: "Did you know? A single cumulus cloud can weigh as much as several hundred tonnes, yet it floats because the droplets are tiny and spread across a huge volume. Below us, clouds are drifting like giant cotton islands." },
  { id: 'gps', text: "Did you know? Your phone's GPS works in airplane mode, because it only receives signals from satellites about 20,000 kilometres up. It never transmits anything, which is why this app can follow your flight without any internet." },
  { id: 'sunrise', text: "Did you know? On an overnight flight heading east, the night feels short, because you are racing toward the sunrise at about 900 kilometres an hour. Dawn reaches you hours earlier than your body clock expects." },
  { id: 'stars', text: "Did you know? Far from city lights, the sky at cruising altitude can be an astonishing sight. With less air above you, stars look brighter and steadier than they do from the ground, and the Milky Way can be seen right across the night sky." },
  { id: 'fuel', text: "Did you know? On a long flight, a large share of an airliner's weight at takeoff is fuel. A large twin-engine jet can burn about 6 tonnes an hour, and it keeps getting lighter, so pilots step up to a higher, more efficient altitude as the flight goes on." },
  { id: 'wings', text: "Did you know? Airliner wings flex noticeably in turbulence and are designed to. In tests, manufacturers bend them upwards by several metres without breaking. The flexing is a sign of good design, and not a cause for alarm." },
  { id: 'time-zones', text: "Did you know? There are 24 time zones, but flying across the Atlantic can cost you five or more hours. Your body clock takes about a day for each hour of difference to catch up, which is why flying east usually feels harder than flying west." },
  { id: 'great-circle', text: "Did you know? Long flights follow curved arcs called great circles, the shortest paths on a sphere. On a flat map they look strangely bent, which is why flights from Europe to the west coast of America pass near Greenland." },
  { id: 'ocean-depth', text: "Did you know? The average depth of the ocean is about 3,700 metres. At cruising height you are roughly three times higher above the surface than the average sea floor lies below it." },
  { id: 'lightning', text: "Did you know? Airliners are struck by lightning about once a year, on average. The metal skin carries the current around the passengers, and you are safe inside, like being in a cage." },
  { id: 'ocean-ships', text: "Did you know? Around 50,000 merchant ships are at sea at any time. From high up they are usually invisible, but on a calm day you may see the white wake of a ship stretching kilometres behind it." },
];
