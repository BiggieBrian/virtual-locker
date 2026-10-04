import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';

interface Props {
  color?: string;
  tilt?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export default function Sticker({
  color = colors.white,
  tilt = 0,
  onPress,
  onLongPress,
  style,
  faceStyle,
  children,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.wrap, { transform: [{ rotate: `${tilt}deg` }] }, style]}
    >
      {({ pressed }) => (
        <>
          <View style={styles.shadow} />
          <View
            style={[
              styles.face,
              { backgroundColor: color },
              pressed && { transform: [{ translateX: 3 }, { translateY: 3 }] },
              faceStyle,
            ]}
          >
            {children}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingRight: 4, paddingBottom: 4 },
  shadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
    borderRadius: 14,
  },
  face: {
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 14,
  },
});
