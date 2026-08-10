/**
 * Public surface of the Tứ Sắc core engine.
 *
 * Everything exported here is platform-agnostic (no DOM / Node / framework
 * APIs) and can be consumed from any UI: web, React Native, Capacitor, or a
 * server. See README "Porting to iOS / Android".
 */

export * from './types';
export * from './rng';
export * from './melds';
export * from './scoring';
export * from './engine';
export * from './ai';
export * from './replay';
