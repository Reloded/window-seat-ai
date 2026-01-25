/**
 * Pre-written narrations for popular landmarks
 * These work offline without any API calls
 * Styled like National Geographic documentaries
 */

export const LANDMARK_NARRATIONS = {
  // Major Cities
  'london': {
    name: 'London',
    narration: "Below lies London, a city that has shaped world history for over two millennia. The serpentine Thames River winds through the urban landscape, passing landmarks that have witnessed the rise and fall of empires. From Roman Londinium to the modern financial district, every street tells a story of human ambition and resilience.",
  },
  'paris': {
    name: 'Paris',
    narration: "The City of Light emerges beneath us. Paris, where revolution met romance, where art movements were born in cramped cafés, and where the Eiffel Tower stands as a testament to human engineering. The geometric precision of Haussmann's boulevards radiates from the Arc de Triomphe like spokes of a great wheel.",
  },
  'new_york': {
    name: 'New York City',
    narration: "Manhattan rises from the waters like a forest of glass and steel. This narrow island became the gateway for millions seeking a new life, and grew into the city that never sleeps. The grid of streets below holds the dreams of countless generations, from the towering spires of Midtown to the historic streets of Lower Manhattan.",
  },
  'tokyo': {
    name: 'Tokyo',
    narration: "Tokyo sprawls beneath us, a metropolis where ancient temples stand in the shadows of neon-lit towers. This city has risen from earthquakes and war to become one of humanity's greatest urban achievements. The intricate rail networks threading through the city move more people daily than many countries' entire populations.",
  },
  'dubai': {
    name: 'Dubai',
    narration: "Rising from the Arabian desert, Dubai defies nature itself. Where Bedouin traders once crossed sand dunes, now stands a city of superlatives - home to the world's tallest building and artificial islands visible from space. It's a testament to human ambition transforming one of Earth's harshest environments.",
  },
  'rome': {
    name: 'Rome',
    narration: "The Eternal City unfolds below, where layers of history stack upon each other like pages of a book. The Colosseum, St. Peter's Basilica, and ancient forums speak of an empire that once ruled the known world. Every stone here has witnessed the march of centuries.",
  },
  'sydney': {
    name: 'Sydney',
    narration: "Sydney Harbour glistens below, its iconic Opera House and Bridge forming one of the world's most recognizable skylines. This harbor has welcomed voyagers for over 50,000 years, from the first Aboriginal Australians to the convict ships that would eventually build a nation.",
  },

  // Natural Landmarks
  'alps': {
    name: 'The Alps',
    narration: "The mighty Alps stretch below us, Europe's great spine. These peaks were formed when the African tectonic plate collided with Europe over 65 million years ago, pushing ancient seabeds toward the sky. Glaciers have carved these valleys over millennia, creating landscapes that have inspired artists and challenged mountaineers for centuries.",
  },
  'atlantic_ocean': {
    name: 'Atlantic Ocean',
    narration: "The vast Atlantic spreads beneath us, the ocean that connected—and separated—civilizations. These waters carried Vikings, conquistadors, and enslaved peoples. Beneath the waves lies the Mid-Atlantic Ridge, where tectonic plates pull apart and new ocean floor is born, continuing the drift that separated the Americas from Europe millions of years ago.",
  },
  'mediterranean': {
    name: 'Mediterranean Sea',
    narration: "The Mediterranean gleams below, the sea at the center of ancient history. Phoenicians, Greeks, Romans, and countless others sailed these waters, spreading ideas and building civilizations along its shores. This sea is slowly shrinking as Africa pushes northward, a process that will eventually close it entirely millions of years hence.",
  },
  'sahara': {
    name: 'Sahara Desert',
    narration: "The Sahara unfolds beneath us, Earth's largest hot desert. But this landscape of endless dunes was once green savanna, covered with lakes and forests just 10,000 years ago. Rock art in the mountains depicts swimming hippos and lush vegetation—a reminder of how dramatically our planet can transform.",
  },
  'amazon': {
    name: 'Amazon Rainforest',
    narration: "The Amazon basin stretches to the horizon, the lungs of our planet. This forest produces 20% of Earth's oxygen and holds one-tenth of all species on the planet. The river below carries more water than the next seven largest rivers combined, draining a basin nearly the size of the continental United States.",
  },
  'grand_canyon': {
    name: 'Grand Canyon',
    narration: "The Grand Canyon reveals itself below, a mile-deep gash in the Earth exposing nearly 2 billion years of geological history. Each colorful layer tells a story—ancient seas, vast deserts, mountain ranges that rose and eroded away, all recorded in stone.",
  },
  'himalayas': {
    name: 'The Himalayas',
    narration: "The Himalayas rise before us, the roof of the world. These peaks contain fossils of sea creatures from when this rock lay beneath an ancient ocean. The collision of India with Asia, still ongoing, pushes Everest higher by about a centimeter each year.",
  },

  // Rivers
  'thames': {
    name: 'River Thames',
    narration: "The Thames winds below like a silver ribbon through history. This river has witnessed Roman invasions, Viking raids, and the birth of parliamentary democracy. Its waters have carried everything from medieval cargo to the Great Fire's ashes.",
  },
  'seine': {
    name: 'River Seine',
    narration: "The Seine curves gracefully through the French countryside. This river has nourished Paris for over two thousand years and inspired countless Impressionist masterpieces. Its banks have witnessed revolutions that changed the course of history.",
  },
  'danube': {
    name: 'River Danube',
    narration: "The Danube flows below, Europe's second-longest river and a natural highway connecting East and West for millennia. Ten countries share its waters, and its banks have witnessed the rise and fall of empires from Roman times to the Cold War.",
  },
  'nile': {
    name: 'River Nile',
    narration: "The Nile stretches toward the horizon, the world's longest river and the lifeblood of ancient Egypt. This water sustained one of humanity's first great civilizations, its annual floods creating a ribbon of green through the desert for over 5,000 years.",
  },
  'mississippi': {
    name: 'Mississippi River',
    narration: "The mighty Mississippi winds below, draining 40% of the continental United States. This river has carried Native American canoes, French explorers, and Mark Twain's steamboats. Its delta grows and shifts constantly, building new land even as rising seas threaten its edges.",
  },

  // Generic narrations for unknown locations
  'coastal': {
    name: 'Coastline',
    narration: "The coastline traces the eternal battle between land and sea. These shores have been shaped by millions of years of waves, tides, and storms. The boundary you see below is constantly shifting—some coastlines retreat while others grow, a dynamic process that will continue long after we're gone.",
  },
  'mountains': {
    name: 'Mountain Range',
    narration: "Mountains rise below, monuments to the immense forces within our planet. These peaks were born from the collision of tectonic plates, pushed skyward over millions of years. Even now, they continue to rise imperceptibly while erosion works to wear them down.",
  },
  'farmland': {
    name: 'Agricultural Region',
    narration: "A patchwork of farmland spreads below, the geometric patterns of human cultivation transforming the natural landscape. These fields represent thousands of years of agricultural innovation, from the first domesticated crops to modern precision farming.",
  },
  'urban': {
    name: 'Urban Area',
    narration: "A city spreads below, one of humanity's great collective achievements. Each road, building, and park represents countless decisions made by generations of inhabitants. Cities are living organisms, constantly growing, adapting, and reimagining themselves.",
  },
  'forest': {
    name: 'Forest Region',
    narration: "Forests blanket the landscape below, ecosystems that have evolved over hundreds of millions of years. These trees are connected underground by vast fungal networks, sharing nutrients and information in ways scientists are only beginning to understand.",
  },
  'desert': {
    name: 'Desert Region',
    narration: "The desert stretches below, a landscape of extremes that supports remarkably adapted life. What appears barren is actually a complex ecosystem where every drop of water is precious and survival requires extraordinary adaptations.",
  },
  'ocean': {
    name: 'Open Ocean',
    narration: "The open ocean spreads to the horizon, covering more than 70% of our planet's surface. Beneath these waves lies a world more mysterious than outer space—95% of the ocean floor remains unexplored, hiding wonders we can only imagine.",
  },

  // Departure and Arrival
  'departure': {
    name: 'Departure',
    narration: "We've just departed, climbing through the atmosphere into the realm of flight. As the ground falls away, the world below transforms into a living map. The familiar becomes abstract, and our journey through the skies begins.",
  },
  'arrival': {
    name: 'Arrival',
    narration: "We're beginning our descent toward our destination. As we drop through the clouds, details emerge from the abstraction—roads become visible, buildings take shape, and the world returns to human scale. Our aerial journey draws to a close.",
  },
  'cruise': {
    name: 'Cruising Altitude',
    narration: "We're cruising at altitude, traveling at speeds that would have seemed magical to our ancestors. From up here, national boundaries disappear, and we see the Earth as it truly is—a single, interconnected world of stunning diversity and beauty.",
  },
};

/**
 * Get a narration for a landmark
 * @param {string} key - Landmark key or type
 * @returns {object|null} - Narration object or null
 */
export function getLandmarkNarration(key) {
  if (!key) return null;
  
  const normalizedKey = key.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return LANDMARK_NARRATIONS[normalizedKey] || null;
}

/**
 * Find best matching narration for a checkpoint
 * @param {object} checkpoint - Checkpoint with name, type, or landmark info
 * @returns {string} - Best matching narration text
 */
export function findNarrationForCheckpoint(checkpoint) {
  if (!checkpoint) {
    return LANDMARK_NARRATIONS.cruise.narration;
  }

  // Try exact name match
  const nameMatch = getLandmarkNarration(checkpoint.name);
  if (nameMatch) return nameMatch.narration;

  // Try landmark name
  if (checkpoint.landmark?.name) {
    const landmarkMatch = getLandmarkNarration(checkpoint.landmark.name);
    if (landmarkMatch) return landmarkMatch.narration;
  }

  // Try type-based match
  const type = checkpoint.type?.toLowerCase();
  if (type === 'departure') return LANDMARK_NARRATIONS.departure.narration;
  if (type === 'arrival') return LANDMARK_NARRATIONS.arrival.narration;

  // Try landmark type
  const landmarkType = checkpoint.landmark?.type?.toLowerCase();
  if (landmarkType?.includes('mountain')) return LANDMARK_NARRATIONS.mountains.narration;
  if (landmarkType?.includes('coast') || landmarkType?.includes('beach')) return LANDMARK_NARRATIONS.coastal.narration;
  if (landmarkType?.includes('city') || landmarkType?.includes('urban')) return LANDMARK_NARRATIONS.urban.narration;
  if (landmarkType?.includes('forest') || landmarkType?.includes('wood')) return LANDMARK_NARRATIONS.forest.narration;
  if (landmarkType?.includes('desert')) return LANDMARK_NARRATIONS.desert.narration;
  if (landmarkType?.includes('ocean') || landmarkType?.includes('sea')) return LANDMARK_NARRATIONS.ocean.narration;
  if (landmarkType?.includes('river')) return LANDMARK_NARRATIONS.danube.narration; // Generic river
  if (landmarkType?.includes('farm') || landmarkType?.includes('agriculture')) return LANDMARK_NARRATIONS.farmland.narration;

  // Default cruise narration
  return LANDMARK_NARRATIONS.cruise.narration;
}

export default LANDMARK_NARRATIONS;
