import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: '✈️',
    title: 'Your AI Flight Companion',
    subtitle: 'Window Seat AI narrates landmarks, cities, and geography as you fly over them.',
    detail: 'Turn every flight into a guided tour from your window seat.',
  },
  {
    id: '2',
    icon: '🔍',
    title: 'Set Up Your Flight',
    subtitle: 'Enter your flight number or search by route to download your flight pack before takeoff.',
    detail: 'AI generates narrations for every landmark along your route.',
  },
  {
    id: '3',
    icon: '🎧',
    title: 'Listen as You Fly',
    subtitle: 'Get automatic narrations when you pass landmarks, mountains, rivers, and cities.',
    detail: 'Choose your voice, language, and narration style in settings.',
  },
  {
    id: '4',
    icon: '📡',
    title: 'Works Offline',
    subtitle: 'Download everything before takeoff. No Wi-Fi needed at 35,000 feet.',
    detail: 'Maps, narrations, and audio all cached on your device.',
  },
];

export function OnboardingWalkthrough({ onComplete }) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({ item, index }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.backgroundTertiary }]}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
      <Text style={[styles.detail, { color: colors.textMuted }]}>{item.detail}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const dotOpacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity: dotOpacity,
                backgroundColor: colors.primary,
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {currentIndex < slides.length - 1 ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      {renderDots()}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skipButton: {
    padding: 8,
    minWidth: 50,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  detail: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 30,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
