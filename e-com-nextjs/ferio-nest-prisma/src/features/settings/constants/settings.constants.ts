/**
 * Settings Module Constants
 * Settings types for static content management
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 */

/**
 * Settings Type Enum
 * Types of static content that can be managed
 */
export enum SettingsType {
  /** About Us page content */
  aboutUs = 'aboutUs',

  /** Contact Us information */
  contactUs = 'contactUs',

  /** Privacy Policy content */
  privacyPolicy = 'privacyPolicy',

  /** Terms and Conditions content */
  termsAndConditions = 'termsAndConditions',

  /** Hero Showcase content */
  heroShowcase = 'heroShowcase',
}

/**
 * Allowed settings types for create/update operations
 */
export const ALLOWED_SETTINGS_TYPES = [
  SettingsType.aboutUs,
  SettingsType.contactUs,
  SettingsType.privacyPolicy,
  SettingsType.termsAndConditions,
  SettingsType.heroShowcase,
] as const;

/**
 * Settings type labels for UI display
 */
export const SETTINGS_TYPE_LABELS: Record<SettingsType, string> = {
  [SettingsType.aboutUs]: 'About Us',
  [SettingsType.contactUs]: 'Contact Us',
  [SettingsType.privacyPolicy]: 'Privacy Policy',
  [SettingsType.termsAndConditions]: 'Terms and Conditions',
  [SettingsType.heroShowcase]: 'Hero Showcase',
};

/**
 * Export legacy constants for backward compatibility
 */
export const settingsType = SettingsType;
