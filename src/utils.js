// Utility functions for the game

/**
 * Calculates the interpolated value between start and end based on alpha
 * @param {number} start - Start value
 * @param {number} end - End value 
 * @param {number} alpha - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, alpha) {
  return start * (1 - alpha) + end * alpha;
}

/**
 * Clamps a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Converts radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
export function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Converts degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
export function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Formats a distance value for display
 * @param {number} distance - Distance in meters
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted distance string
 */
export function formatDistance(distance, decimals = 1) {
  return (Math.floor(distance * 10 ** decimals) / 10 ** decimals).toFixed(decimals);
}