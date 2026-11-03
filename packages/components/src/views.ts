import type { ReactNode } from 'react';
import Accordion from './accordion/view.tsx';
import AccordionItem from './accordion-item/view.tsx';
import Button from './button/view.tsx';
import Carousel from './carousel/view.tsx';
import Container from './container/view.tsx';
import type { definitions } from './definitions.ts';
import Divider from './divider/view.tsx';
import Gallery from './gallery/view.tsx';
import Grid from './grid/view.tsx';
import Heading from './heading/view.tsx';
import Icon from './icon/view.tsx';
import Image from './image/view.tsx';
import Links from './links/view.tsx';
import List from './list/view.tsx';
import Marquee from './marquee/view.tsx';
import Nav from './nav/view.tsx';
import Spacer from './spacer/view.tsx';
import Stack from './stack/view.tsx';
import Tab from './tab/view.tsx';
import Tabs from './tabs/view.tsx';
import Text from './text/view.tsx';
import Video from './video/view.tsx';

export type View<P> = (p: { className: string; props: P; children?: ReactNode }) => ReactNode;
type Defs = typeof definitions;
/** A view receives the resolved props when the definition has `resolve`, the document props otherwise. */
type ViewPropsOf<D> = D extends { viewPropsType?: infer R } ? NonNullable<R> : never;

/** React views by type; the mapped type checks each view against its props. */
export const views: { [K in keyof Defs]: View<ViewPropsOf<Defs[K]>> } = {
  container: Container,
  stack: Stack,
  grid: Grid,
  heading: Heading,
  text: Text,
  list: List,
  button: Button,
  icon: Icon,
  links: Links,
  video: Video,
  accordion: Accordion,
  'accordion-item': AccordionItem,
  tabs: Tabs,
  tab: Tab,
  nav: Nav,
  divider: Divider,
  spacer: Spacer,
  image: Image,
  gallery: Gallery,
  carousel: Carousel,
  marquee: Marquee,
};
