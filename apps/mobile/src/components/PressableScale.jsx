import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ReduceMotion,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Apple describes springs with damping ratio + response (not duration) — a
// spring has no fixed duration, its settle time emerges from the parameters.
// Reanimated's { dampingRatio, duration } maps onto exactly those two.
//
// dampingRatio 1.0 = critically damped, no overshoot. That's the default for
// UI the user did not physically throw; bounce is reserved for momentum
// gestures (flicks/drags), which a tap is not.
//
// reduceMotion: System makes the spring collapse to an instant value change
// when the OS "Reduce Motion" setting is on, without us branching manually.
const PRESS_SPRING = {
  dampingRatio: 1,
  duration: 300,
  reduceMotion: ReduceMotion.System,
};

/**
 * A Pressable that gives Apple-style press feedback: it reacts on press-*in*
 * (not on release), springs rather than tweens, and is interruptible — a
 * spring always animates from the current on-screen value, so tapping again
 * mid-release picks up from where it actually is instead of jumping.
 */
export default function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  dimTo = 0.9,
  ...props
}) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: 1 - pressed.value * (1 - dimTo),
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        pressed.value = withSpring(1, PRESS_SPRING);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, PRESS_SPRING);
      }}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
