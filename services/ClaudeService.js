import { API_CONFIG, isApiKeyConfigured } from '../config/api';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

class ClaudeService {
  constructor() {
    this.config = API_CONFIG.claude;
    this.narrationPreferences = {
      contentFocus: 'mixed', // geological, historical, cultural, mixed
      length: 'medium',      // short, medium, long
    };
  }

  updateNarrationPreferences(prefs) {
    this.narrationPreferences = {
      ...this.narrationPreferences,
      ...prefs,
    };
  }

  getNarrationPreferences() {
    return { ...this.narrationPreferences };
  }

  isConfigured() {
    return isApiKeyConfigured('claude');
  }

  async generateNarration(latitude, longitude, altitude, context = {}) {
    if (!this.isConfigured()) {
      throw new Error('Claude API key not configured');
    }

    const prompt = this.buildNarrationPrompt(latitude, longitude, altitude, context);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Claude API request failed');
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }

  buildNarrationPrompt(latitude, longitude, altitude, context) {
    const altitudeFeet = altitude ? Math.round(altitude * 3.28084) : null;
    const altitudeContext = altitudeFeet
      ? `The observer is at approximately ${altitudeFeet.toLocaleString()} feet altitude.`
      : '';

    // Build content focus instruction
    const focusInstructions = {
      geological: 'Focus primarily on geological features, rock formations, and natural landscape evolution.',
      historical: 'Focus primarily on historical events, ancient sites, and human history of the region.',
      cultural: 'Focus primarily on cultural landmarks, modern cities, and contemporary human activity.',
      mixed: 'Include a balanced mix of geological, historical, and cultural information.',
    };
    const focusInstruction = focusInstructions[this.narrationPreferences.contentFocus] || focusInstructions.mixed;

    // Build length instruction
    const lengthInstructions = {
      short: 'Write 1-2 sentences that take about 10 seconds to read aloud.',
      medium: 'Write 2-3 sentences that take about 20 seconds to read aloud.',
      long: 'Write 3-4 sentences that take about 30 seconds to read aloud.',
    };
    const lengthInstruction = lengthInstructions[this.narrationPreferences.length] || lengthInstructions.medium;

    return `You are a knowledgeable flight narrator for the "Window Seat" app. Generate an engaging, informative narration about what a passenger would see looking out their airplane window at these coordinates.

Location: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°
${altitudeContext}
${context.flightInfo ? `Flight: ${context.flightInfo}` : ''}
${context.checkpoint ? `Landmark: ${context.checkpoint.name}` : ''}

Guidelines:
- ${lengthInstruction}
- ${focusInstruction}
- Be specific about what's visible (rivers, mountains, cities, coastlines)
- Use vivid but concise language suitable for audio narration
- Don't mention the coordinates directly - describe what's there
- If over ocean, describe maritime features, shipping routes, or underwater geography

Respond with ONLY the narration text, no additional commentary.`;
  }

  async generateCheckpointNarrations(checkpoints, flightInfo = '') {
    const narrations = [];

    for (const checkpoint of checkpoints) {
      try {
        const narration = await this.generateNarration(
          checkpoint.latitude,
          checkpoint.longitude,
          checkpoint.altitude || 35000 / 3.28084, // Default cruise altitude
          { flightInfo, checkpoint }
        );

        narrations.push({
          ...checkpoint,
          narration,
        });
      } catch (error) {
        console.error(`Failed to generate narration for ${checkpoint.name}:`, error);
        narrations.push({
          ...checkpoint,
          narration: `Approaching ${checkpoint.name}.`,
        });
      }
    }

    return narrations;
  }

  async generateRouteNarrations(routePoints, numCheckpoints = 20, flightInfo = '') {
    // Sample points along the route for narration
    const step = Math.floor(routePoints.length / numCheckpoints);
    const checkpoints = [];

    for (let i = 0; i < routePoints.length; i += step) {
      if (checkpoints.length >= numCheckpoints) break;

      const point = routePoints[i];
      checkpoints.push({
        id: `checkpoint_${checkpoints.length}`,
        latitude: point.latitude,
        longitude: point.longitude,
        altitude: point.altitude,
        radius: 5000, // 5km trigger radius
        name: `Checkpoint ${checkpoints.length + 1}`,
      });
    }

    return this.generateCheckpointNarrations(checkpoints, flightInfo);
  }
}

export const claudeService = new ClaudeService();
export { ClaudeService };
