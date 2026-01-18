/**
 * EventEmitter - Base class for services that need pub/sub functionality
 *
 * Provides consistent listener management with error isolation.
 * Listeners that throw errors won't affect other listeners.
 */
class EventEmitter {
  constructor() {
    this._listeners = [];
  }

  /**
   * Subscribe to events
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('EventEmitter.subscribe requires a function');
    }

    this._listeners.push(callback);

    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Emit event to all listeners
   * @param {...any} args - Arguments to pass to listeners
   */
  emit(...args) {
    this._listeners.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.warn(`${this.constructor.name} listener error:`, error);
      }
    });
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this._listeners = [];
  }

  /**
   * Get count of registered listeners
   */
  get listenerCount() {
    return this._listeners.length;
  }
}

export { EventEmitter };
