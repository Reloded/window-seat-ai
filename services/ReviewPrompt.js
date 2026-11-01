// Asks for a Google Play / App Store rating, but only after a flight that
// actually delivered something (enough minutes and several sights heard),
// and at most once every few months. The OS decides whether the dialog is
// really shown, and it never leaves the app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';
import { shouldAskForReview, REVIEW_MIN_FLIGHT_MIN, REVIEW_MIN_SIGHTS } from '../utils/reviewRule';

const KEY = '@window_seat_review_v1';
const ANDROID_PACKAGE = 'com.stonku.windowseat';

async function load() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { goodFlights: 0, lastAskedAt: 0 };
  } catch (e) {
    return { goodFlights: 0, lastAskedAt: 0 };
  }
}

async function save(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // ignore
  }
}

/** Call when a flight ends (landed or stopped by the user). */
export async function maybeAskForReview({ minutes, sightsHeard }) {
  if (Platform.OS === 'web') return false;
  if (minutes < REVIEW_MIN_FLIGHT_MIN || sightsHeard < REVIEW_MIN_SIGHTS) return false;
  const state = await load();
  state.goodFlights = (state.goodFlights || 0) + 1;
  const now = Date.now();
  const ask = shouldAskForReview({ minutes, sightsHeard, lastAskedAt: state.lastAskedAt, now });
  if (ask) state.lastAskedAt = now;
  await save(state);
  if (!ask) return false;
  try {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      return true;
    }
  } catch (e) {
    // ignore: a rating prompt must never break the app
  }
  return false;
}

/** "Rate Window Seat" button in Settings: opens the store page. */
export async function openStorePage() {
  const url = Platform.OS === 'android'
    ? `market://details?id=${ANDROID_PACKAGE}`
    : StoreReview.storeUrl();
  const fallback = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
  try {
    if (url && (await Linking.canOpenURL(url))) return Linking.openURL(url);
  } catch (e) {
    // fall through
  }
  return Linking.openURL(fallback);
}
