/**
 * SunPositionService - Calculate sunrise/sunset times and sun position
 * Uses astronomical algorithms to determine sun position relative to flight path
 */

class SunPositionService {
  /**
   * Calculate sunrise and sunset times for a given location and date
   * Based on NOAA solar calculations
   */
  calculateSunTimes(latitude, longitude, date = new Date()) {
    const dayOfYear = this.getDayOfYear(date);
    const hours = date.getHours() + date.getMinutes() / 60;

    // Fractional year (radians)
    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (hours - 12) / 24);

    // Equation of time (minutes)
    const eqTime = 229.18 * (
      0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma)
    );

    // Solar declination (radians)
    const decl = (
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma)
    );

    const latRad = latitude * Math.PI / 180;

    // Hour angle for sunrise/sunset (degrees)
    const zenith = 90.833 * Math.PI / 180; // Official zenith
    const cosHA = (Math.cos(zenith) / (Math.cos(latRad) * Math.cos(decl))) -
                  (Math.tan(latRad) * Math.tan(decl));

    // Check for polar day/night
    if (cosHA > 1) {
      return { polarNight: true, sunrise: null, sunset: null };
    }
    if (cosHA < -1) {
      return { polarDay: true, sunrise: null, sunset: null };
    }

    const ha = Math.acos(cosHA) * 180 / Math.PI;

    // Sunrise and sunset times (minutes from midnight UTC)
    const sunrise = 720 - 4 * (longitude + ha) - eqTime;
    const sunset = 720 - 4 * (longitude - ha) - eqTime;

    // Convert to local Date objects
    const timezoneOffset = date.getTimezoneOffset();

    const sunriseDate = new Date(date);
    sunriseDate.setHours(0, 0, 0, 0);
    sunriseDate.setMinutes(sunrise + timezoneOffset);

    const sunsetDate = new Date(date);
    sunsetDate.setHours(0, 0, 0, 0);
    sunsetDate.setMinutes(sunset + timezoneOffset);

    // Golden hour times (roughly 30 min after sunrise, 30 min before sunset)
    const goldenHourMorningEnd = new Date(sunriseDate.getTime() + 45 * 60 * 1000);
    const goldenHourEveningStart = new Date(sunsetDate.getTime() - 45 * 60 * 1000);

    return {
      sunrise: sunriseDate,
      sunset: sunsetDate,
      goldenHourMorning: { start: sunriseDate, end: goldenHourMorningEnd },
      goldenHourEvening: { start: goldenHourEveningStart, end: sunsetDate },
    };
  }

  /**
   * Calculate current sun azimuth (compass direction)
   */
  calculateSunAzimuth(latitude, longitude, date = new Date()) {
    const dayOfYear = this.getDayOfYear(date);
    const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

    // Fractional year
    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (hours - 12) / 24);

    // Equation of time
    const eqTime = 229.18 * (
      0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma)
    );

    // Solar declination
    const decl = (
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma)
    );

    // True solar time
    const timeOffset = eqTime + 4 * longitude;
    const tst = hours * 60 + timeOffset;

    // Hour angle
    const ha = (tst / 4) - 180;
    const haRad = ha * Math.PI / 180;

    const latRad = latitude * Math.PI / 180;

    // Solar zenith angle
    const cosZenith = Math.sin(latRad) * Math.sin(decl) +
                      Math.cos(latRad) * Math.cos(decl) * Math.cos(haRad);
    const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith)));

    // Solar azimuth
    let azimuth;
    const sinZenith = Math.sin(zenith);

    if (sinZenith === 0) {
      azimuth = 0;
    } else {
      const cosAzimuth = (Math.sin(latRad) * Math.cos(zenith) - Math.sin(decl)) /
                         (Math.cos(latRad) * sinZenith);
      azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * 180 / Math.PI;

      if (ha > 0) {
        azimuth = 360 - azimuth;
      }
    }

    // Solar elevation (altitude)
    const elevation = 90 - (zenith * 180 / Math.PI);

    return { azimuth, elevation };
  }

  /**
   * Determine which side of the plane the sun is on
   */
  getSunSide(sunAzimuth, flightHeading) {
    // Normalize both angles to 0-360
    sunAzimuth = ((sunAzimuth % 360) + 360) % 360;
    flightHeading = ((flightHeading % 360) + 360) % 360;

    // Calculate relative angle of sun to flight direction
    let relativeAngle = sunAzimuth - flightHeading;
    if (relativeAngle > 180) relativeAngle -= 360;
    if (relativeAngle < -180) relativeAngle += 360;

    // Positive = right side, negative = left side
    if (Math.abs(relativeAngle) < 30) {
      return 'ahead';
    } else if (Math.abs(relativeAngle) > 150) {
      return 'behind';
    } else if (relativeAngle > 0) {
      return 'right';
    } else {
      return 'left';
    }
  }

  /**
   * Get current sun phase
   */
  getSunPhase(latitude, longitude, date = new Date()) {
    const { elevation } = this.calculateSunAzimuth(latitude, longitude, date);
    const sunTimes = this.calculateSunTimes(latitude, longitude, date);

    if (sunTimes.polarNight) {
      return { phase: 'polar_night', label: 'Polar Night' };
    }
    if (sunTimes.polarDay) {
      return { phase: 'polar_day', label: 'Midnight Sun' };
    }

    const now = date.getTime();

    // Check golden hours
    if (sunTimes.goldenHourMorning &&
        now >= sunTimes.goldenHourMorning.start.getTime() &&
        now <= sunTimes.goldenHourMorning.end.getTime()) {
      return { phase: 'golden_hour', label: 'Golden Hour', period: 'morning' };
    }

    if (sunTimes.goldenHourEvening &&
        now >= sunTimes.goldenHourEvening.start.getTime() &&
        now <= sunTimes.goldenHourEvening.end.getTime()) {
      return { phase: 'golden_hour', label: 'Golden Hour', period: 'evening' };
    }

    // Check based on elevation
    if (elevation < -6) {
      return { phase: 'night', label: 'Night' };
    } else if (elevation < 0) {
      // Civil twilight
      if (now < sunTimes.sunrise?.getTime()) {
        return { phase: 'dawn', label: 'Dawn' };
      } else {
        return { phase: 'dusk', label: 'Dusk' };
      }
    } else {
      return { phase: 'day', label: 'Day' };
    }
  }

  /**
   * Get comprehensive sun info for display
   */
  getSunInfo(latitude, longitude, flightHeading = null, date = new Date()) {
    const sunTimes = this.calculateSunTimes(latitude, longitude, date);
    const { azimuth, elevation } = this.calculateSunAzimuth(latitude, longitude, date);
    const phase = this.getSunPhase(latitude, longitude, date);

    const now = date.getTime();
    let nextEvent = null;
    let timeToNextEvent = null;

    if (sunTimes.sunrise && sunTimes.sunset) {
      if (now < sunTimes.sunrise.getTime()) {
        nextEvent = 'sunrise';
        timeToNextEvent = sunTimes.sunrise.getTime() - now;
      } else if (now < sunTimes.sunset.getTime()) {
        nextEvent = 'sunset';
        timeToNextEvent = sunTimes.sunset.getTime() - now;
      } else {
        // After sunset, calculate tomorrow's sunrise
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowSunTimes = this.calculateSunTimes(latitude, longitude, tomorrow);
        if (tomorrowSunTimes.sunrise) {
          nextEvent = 'sunrise';
          timeToNextEvent = tomorrowSunTimes.sunrise.getTime() - now;
        }
      }
    }

    const sunSide = flightHeading !== null ? this.getSunSide(azimuth, flightHeading) : null;

    // Determine best viewing side
    let viewingAdvice = null;
    if (phase.phase === 'golden_hour' || phase.phase === 'dawn' || phase.phase === 'dusk') {
      if (sunSide === 'left') {
        viewingAdvice = 'Left side has the best golden light';
      } else if (sunSide === 'right') {
        viewingAdvice = 'Right side has the best golden light';
      } else if (sunSide === 'ahead') {
        viewingAdvice = 'Sun ahead - both sides have good light';
      } else {
        viewingAdvice = 'Sun behind - even lighting on both sides';
      }
    } else if (phase.phase === 'day') {
      if (sunSide === 'left') {
        viewingAdvice = 'Sun on left - right side has less glare';
      } else if (sunSide === 'right') {
        viewingAdvice = 'Sun on right - left side has less glare';
      }
    }

    return {
      ...sunTimes,
      azimuth,
      elevation,
      phase,
      sunSide,
      nextEvent,
      timeToNextEvent,
      viewingAdvice,
    };
  }

  /**
   * Helper: Get day of year
   */
  getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  /**
   * Format time remaining
   */
  formatTimeRemaining(ms) {
    if (!ms || ms < 0) return null;

    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }
}

export const sunPositionService = new SunPositionService();
export { SunPositionService };
