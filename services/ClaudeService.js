import { API_CONFIG, isApiKeyConfigured } from '../config/api';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// User-friendly error messages
const ERROR_MESSAGES = {
  API_KEY_MISSING: 'Claude API key not configured. Add your key in Settings to enable AI narrations.',
  NETWORK_ERROR: 'Unable to connect to AI service. Check your internet connection.',
  RATE_LIMITED: 'AI service is busy. Narrations will retry automatically.',
  INVALID_KEY: 'Claude API key is invalid. Please check your key in Settings.',
  SERVER_ERROR: 'AI service is temporarily unavailable. Using fallback narrations.',
  UNKNOWN: 'Unable to generate narration. Using fallback.',
};

class ClaudeService {
  constructor() {
    this.config = API_CONFIG.claude;
    this.lastError = null;
    this.narrationPreferences = {
      contentFocus: 'mixed', // geological, historical, cultural, mixed
      length: 'medium',      // short, medium, long
    };
  }

  getLastError() {
    return this.lastError;
  }

  clearError() {
    this.lastError = null;
  }

  _setError(code, details = null) {
    this.lastError = {
      code,
      message: ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN,
      details,
      timestamp: new Date().toISOString(),
    };
    console.warn(`ClaudeService error [${code}]:`, this.lastError.message, details || '');
    return this.lastError;
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
      this._setError('API_KEY_MISSING');
      return null;
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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || '';

        if (response.status === 401) {
          this._setError('INVALID_KEY', errorMessage);
        } else if (response.status === 429) {
          this._setError('RATE_LIMITED', errorMessage);
        } else if (response.status >= 500) {
          this._setError('SERVER_ERROR', errorMessage);
        } else {
          this._setError('UNKNOWN', errorMessage);
        }
        return null;
      }

      const data = await response.json();
      this.clearError();
      return data.content[0].text;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        this._setError('NETWORK_ERROR', error.message);
      } else {
        this._setError('UNKNOWN', error.message);
      }
      return null;
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

    // Build landmark context if available
    const landmarkContext = this.buildLandmarkContext(context);

    return `You are a knowledgeable flight narrator for the "Window Seat" app. Generate an engaging, informative narration about what a passenger would see looking out their airplane window at these coordinates.

Location: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°
${altitudeContext}
${context.flightInfo ? `Flight: ${context.flightInfo}` : ''}
${landmarkContext}

Guidelines:
- ${lengthInstruction}
- ${focusInstruction}
- Be specific about what's visible (rivers, mountains, cities, coastlines)
- Use vivid but concise language suitable for audio narration
- Don't mention the coordinates directly - describe what's there
- If over ocean, describe maritime features, shipping routes, or underwater geography

Respond with ONLY the narration text, no additional commentary.`;
  }

  /**
   * Build landmark context string for the prompt
   */
  buildLandmarkContext(context) {
    const checkpoint = context.checkpoint;
    if (!checkpoint) return '';

    // If checkpoint has rich landmark data, use it
    if (checkpoint.landmark) {
      const landmark = checkpoint.landmark;
      const parts = [`Location: ${checkpoint.name}`];

      if (landmark.type) {
        parts.push(`Type: ${landmark.type.replace(/_/g, ' ')}`);
      }

      if (landmark.region || landmark.country) {
        const regionParts = [landmark.region, landmark.country].filter(Boolean);
        parts.push(`Region: ${regionParts.join(', ')}`);
      }

      if (landmark.nearbyFeatures?.length > 0) {
        const namedFeatures = landmark.nearbyFeatures
          .filter(f => f.name && f.name !== 'Unknown')
          .map(f => f.name);
        if (namedFeatures.length > 0) {
          parts.push(`Nearby: ${namedFeatures.join(', ')}`);
        }
      }

      return parts.join('\n');
    }

    // Fall back to simple landmark name if no rich data
    if (checkpoint.name) {
      return `Landmark: ${checkpoint.name}`;
    }

    return '';
  }

  async generateCheckpointNarrations(checkpoints, flightInfo = '') {
    const narrations = [];

    for (const checkpoint of checkpoints) {
      const narration = await this.generateNarration(
        checkpoint.latitude,
        checkpoint.longitude,
        checkpoint.altitude || 35000 / 3.28084, // Default cruise altitude
        { flightInfo, checkpoint }
      );

      if (narration) {
        narrations.push({
          ...checkpoint,
          narration,
        });
      } else {
        // Use fallback narration when API fails
        console.warn(`Using fallback narration for ${checkpoint.name}`);
        narrations.push({
          ...checkpoint,
          narration: `Approaching ${checkpoint.name}.`,
          fallback: true,
        });
      }
    }

    return { narrations, error: this.lastError };
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
