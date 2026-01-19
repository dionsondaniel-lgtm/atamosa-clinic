import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes intelligently.
 * Handles conditional classes and conflicting Tailwind classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a Hex color code (e.g., #3b82f6) to HSL format (e.g., 217 91% 60%).
 * Required for defining dynamic Tailwind CSS variables that support opacity modifiers.
 */
export function hexToHSL(hex: string): string {
  // Remove hash if present
  hex = hex.replace(/^#/, '');

  // Handle shorthand hex (e.g., "fff")
  if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%"; // Return black on error
    
  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);
  
  r /= 255; g /= 255; b /= 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// --- Date & Time Utilities ---

/**
 * Formats a date string into a readable format (e.g., "January 1, 2024").
 */
export const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Formats a time string or ISO string into AM/PM format (e.g., "08:30 AM").
 */
export const formatTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    // Check if it is an ISO string or just a time string
    if (dateString.includes('T') || dateString.includes('-')) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return dateString;
};

/**
 * Calculates age based on birthdate string (e.g., "2 yr. old" or "5 mo. old").
 */
export const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    
    if (isNaN(birth.getTime())) return '';

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
        years--;
        months += 12;
    }
    
    if (years === 0) return `${months} mo. old`;
    return `${years} yr. old`;
};