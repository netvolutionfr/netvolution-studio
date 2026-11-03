import { getLocale, isLocale, LOCALES, setLocale, t } from '@ns/core';
import { Languages } from 'lucide-react';
import { Menu } from '../ui/index.ts';

/** Interface language (ADR-0024): languages are listed by their own name; changing one reloads the page. */
export function LanguageMenu() {
  return (
    <Menu
      label={t('language.label')}
      icon={Languages}
      align="end"
      items={Object.entries(LOCALES).map(([code, { name }]) => ({
        label: code === getLocale() ? `${name} ✓` : name,
        onSelect: () => {
          if (!isLocale(code) || code === getLocale()) return;
          setLocale(code);
          location.reload();
        },
      }))}
    />
  );
}
