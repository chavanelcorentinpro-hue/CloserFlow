export const languages = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands'
} as const;

export type LanguageCode = keyof typeof languages;

export function detectLanguage(): LanguageCode {
  const saved = localStorage.getItem('closerflow.language');
  if (saved && saved in languages) return saved as LanguageCode;
  const browser = navigator.language.slice(0,2);
  return browser in languages ? browser as LanguageCode : 'fr';
}

export function setLanguage(language: LanguageCode) {
  localStorage.setItem('closerflow.language', language);
}
