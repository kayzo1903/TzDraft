import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { colors } from "../../theme/colors";

interface PulseDotProps {
  online: boolean;
  size?: number;
}

export const PulseDot: React.FC<PulseDotProps> = ({ online, size = 12 }) => {
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (online) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      opacity.value = 1;
      scale.value = 1;
    }
  }, [online]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    backgroundColor: online ? colors.success : colors.textDisabled,
  }));

  const coreStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: online ? colors.success : colors.textDisabled,
  };

  return (
    <View style={[styles.container, { width: size * 1.5, height: size * 1.5 }]}>
      {online && <Animated.View style={[styles.pulse, coreStyle, pulseStyle]} />}
      <View style={[styles.core, coreStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
  },
  core: {
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
