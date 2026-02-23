/**
 * Liquid Glass stub.
 * @callstack/liquid-glass removed — its TurboModule crashes on iOS < 26.
 * LiquidGlassView is just a plain View; isLiquidGlassSupported is always false.
 */
import { View } from 'react-native';

const LiquidGlassView = View;
const isLiquidGlassSupported = false;

export { LiquidGlassView, isLiquidGlassSupported };
