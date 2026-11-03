---
title: "Appendix A. Tatsu / Elementor → Studio equivalences"
---

This table helps you find a habit again. The Tatsu and Elementor columns give the usual name; the last column says where to find it in the Studio.

## Vocabulary and gestures

| Tatsu | Elementor | Netvolution Studio |
|---|---|---|
| Section | Section / Container | **Section** (composition) or **Container** |
| Row, Column | Inner Section, Column | [**Stack (Flex)** or **Grid**](03-building-a-page.md); compositions **Row, 2 columns**, **Row, 3 columns** |
| Module | Widget | **Component** |
| Module tree | Navigator | **Layers** |
| Options panel | Editing panel (Content / Style / Advanced) | [**Inspector**](04-styling-and-responsive.md): Content, Style, Layout, Spacing, Position and effects, Advanced |
| Responsive modes | Responsive mode | **Desktop / Tablet / Mobile** in the toolbar; settings only apply to the displayed breakpoint |
| Hide on mobile | Responsive > Hide on Mobile | Advanced > **Hide on this breakpoint** |
| Global Colors / Typography | Site Settings, global colors and fonts | [**Design system**](05-design-system.md) |
| Google Fonts, custom fonts | Google Fonts, Custom Fonts | **Font catalog** of the design system, or import of a WOFF2 file into the media library (fonts served by the site, without calling Google) |
| Global Sections | Global Widget | [**Reusable component**](08-reuse.md) (linked: a change propagates) |
| Saved templates | My Templates | **Sections** tab of the library |
| Header / Footer Builder | Theme Builder (header, footer) | **Header and footer**, in the Pages panel |
| Starter kits | Website Kits | **Site templates** (Projects screen) |
| Revisions | History, Revisions | **Undo / Redo** and **Operation log** (current session) |
| Preview | Preview | **Preview** (the eye) or **Site preview** (new tab) |
| Publish / Update | Publish / Update | **Save**, then **Export the site** when it is ready to publish |
| WordPress media library | WordPress media library | The project's **Media library** |
| WordPress pages | WordPress pages | **Pages** panel; the address is called the **slug** |
| WordPress menus | WordPress menus | **Menus** panel, shown by the **Navigation** component |
| Yoast, Rank Math | Yoast, Rank Math | Inspector, when nothing is selected: **Search and sharing** |
| Typography: Letter Spacing, Text Transform | Typography: Letter Spacing, Transform | Inspector, **Style** section: **Letter spacing**, **Case**, **Style** (italic) |
| "Sticky" column | Sticky, Motion Effects > Sticky | Inspector, **Position and effects**: **Sticky** position |
| Border, Box Shadow | Border, Box Shadow | Inspector, **Style** section: **Border**, **Shadow** |
| Background image, Overlay, gradient | Background (Classic, Gradient), Background Overlay | Inspector, **Style** section: **Background image**, **Gradient** ("Dark veil" preset for the overlay) |
| Motion effects, entrance animations | Motion Effects, Entrance Animation | Inspector, [**Animations**](09-animations.md) section |
| Editing text in the page | Inline editing | Text of the inspector's **Content** section |

## Modules and widgets

| Tatsu / Elementor | Netvolution Studio |
|---|---|
| Heading | **Heading**, level H1 to H6 |
| Text (Text Editor) | **Text**: bold, italic, color and links; one or several paragraphs |
| Bulleted or numbered list (in the text editor) | **List**: bullets, numbers, letters or Roman numerals |
| Button | **Button**: primary, secondary or text link |
| Image | **Image**, optimized automatically at export |
| Gallery, masonry gallery, lightbox | **Gallery**: masonry or tiles, enlarge on click |
| Image carousel, slider | **Carousel**: images per view depending on the screen, previous/next buttons, optional autoplay |
| Marquee, scrolling band (texts or logos) | **Marquee** |
| Video | YouTube or Vimeo **Video** |
| Icon | **Icon** (about twenty pictograms) |
| Divider, Spacer | **Divider**, **Spacer** |
| Accordion, Toggle, FAQ | **Accordion**; **Accordion (FAQ)** composition |
| Tabs | **Tabs**; **Tab block** composition |
| Navigation menu | **Navigation** (one submenu level, collapsed on mobile) |
| Icon List, links | **Link list** |
| Call to Action | **Call to action** composition |
| Pricing Table | **Pricing** composition |
| Testimonial | **Testimonials** composition (static) |
| Team Member | **Team** composition |
| Icon Box, Feature Box | **Card** or **Features** composition |

## Without an equivalent

These elements do not exist in the Studio, often by choice:

| Tatsu / Elementor | Why, and what to do |
|---|---|
| HTML, shortcode, custom code | Excluded by design: they escape the quality, accessibility and security checks, and the fidelity between the Studio and the site. A recurring need is to be reported: it will become a component. |
| Custom CSS, CSS class of an element | **Project CSS** (design system) and **CSS classes** (inspector, Advanced): a checked stylesheet, without @import or external resources |
| Contact form | Not available yet (a static site has no server to receive the message). Meanwhile: a button to a `mailto:` address or to a hosted form. |
| Google Maps, external widgets | No embedding of third-party content: a button or a link to the map. |
| Counters, progress bars, parallax effects | Not available. The Studio's animations cover the entrance on scroll and hover. |
| Plugins | No plugins: the exported site needs nothing more than file hosting. |
| User roles and accounts | Not yet: the whole logged-in team has the same rights. |
