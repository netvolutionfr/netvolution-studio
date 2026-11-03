import { createRegistry } from '@ns/core';
import { accordion } from './accordion/definition.ts';
import { accordionItem } from './accordion-item/definition.ts';
import { button } from './button/definition.ts';
import { carousel } from './carousel/definition.ts';
import { container } from './container/definition.ts';
import { divider } from './divider/definition.ts';
import { gallery } from './gallery/definition.ts';
import { grid } from './grid/definition.ts';
import { heading } from './heading/definition.ts';
import { icon } from './icon/definition.ts';
import { image } from './image/definition.ts';
import { links } from './links/definition.ts';
import { list } from './list/definition.ts';
import { marquee } from './marquee/definition.ts';
import { nav } from './nav/definition.ts';
import { spacer } from './spacer/definition.ts';
import { stack } from './stack/definition.ts';
import { tab } from './tab/definition.ts';
import { tabs } from './tabs/definition.ts';
import { text } from './text/definition.ts';
import { video } from './video/definition.ts';

// Single list of built-in components; one line per component.
export const definitions = {
  container,
  stack,
  grid,
  heading,
  text,
  list,
  button,
  icon,
  nav,
  links,
  divider,
  spacer,
  image,
  gallery,
  carousel,
  marquee,
  video,
  accordion,
  'accordion-item': accordionItem,
  tabs,
  tab,
};

export const registry = createRegistry(Object.values(definitions));
