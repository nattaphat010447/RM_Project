---
name: Lumina Manga
colors:
  surface: '#fcf8ff'
  surface-dim: '#dad6ff'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2ff'
  surface-container: '#efebff'
  surface-container-high: '#e9e5ff'
  surface-container-highest: '#e3dfff'
  on-surface: '#181445'
  on-surface-variant: '#4a4455'
  inverse-surface: '#2d2a5b'
  inverse-on-surface: '#f3eeff'
  outline: '#7b7486'
  outline-variant: '#ccc3d7'
  surface-tint: '#7331df'
  primary: '#5300b7'
  on-primary: '#ffffff'
  primary-container: '#6d28d9'
  on-primary-container: '#dac5ff'
  inverse-primary: '#d3bbff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#3f4049'
  on-tertiary: '#ffffff'
  tertiary-container: '#575761'
  on-tertiary-container: '#cfcdd9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ebddff'
  primary-fixed-dim: '#d3bbff'
  on-primary-fixed: '#250059'
  on-primary-fixed-variant: '#5b00c5'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#e3e1ed'
  tertiary-fixed-dim: '#c7c5d1'
  on-tertiary-fixed: '#1a1b23'
  on-tertiary-fixed-variant: '#46464f'
  background: '#fcf8ff'
  on-background: '#181445'
  surface-variant: '#e3dfff'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width: 1280px
---

## Brand & Style

The design system is built on a **Corporate Modern** foundation with **Minimalist** sensibilities, infused with a subtle technological edge to reflect its AI-driven core. The brand personality is friendly and premium, aiming to bridge the gap between a traditional hobby and a high-end digital service.

The aesthetic prioritizes clarity and whitespace to allow vibrant manga cover art to serve as the primary visual driver. It avoids the cluttered "otaku" tropes of legacy sites, instead opting for a sophisticated SaaS-like experience that feels trustworthy and efficient. The emotional response should be one of effortless discovery and professional reliability.

## Colors

The palette is anchored by a high-contrast relationship between **Deep Purple** and a crisp **Soft Off-White** background. This creates a premium, energetic feel without the visual fatigue of pure black.

- **Primary Accent (#6D28D9):** Used for primary actions, brand moments, and active states.
- **Secondary Accent (#0EA5E9):** Used for AI-driven features, information callouts, and secondary interactive elements.
- **Surface Palette:** Employs **Soft Lavender (#F5F3FF)** and **Light Blue (#E0F2FE)** for subtle sectioning and background containers to maintain a bright, airy feel.
- **Status System:** Highly semantic colors for manga availability. 
    - **Success (#10B981):** Available / Approved.
    - **Info (#3B82F6):** Requested / In-Transit.
    - **Warning (#F59E0B):** Pending / Reserved.
    - **Error (#EF4444):** Overdue / Unavailable.

## Typography

The typography system uses **Plus Jakarta Sans** as the primary typeface for its modern, friendly, and geometric characteristics. It provides excellent legibility for both Thai and English scripts, essential for international manga titles.

**Hierarchy Rules:**
- Use **Headline XL** only for main landing hero sections.
- **Headline LG** and **MD** should define the primary content structure.
- **Inter** is reserved for labels, data points, and technical UI elements (like status badges) to provide a systematic, precise contrast to the rounder headlines.
- Maintain generous line heights (1.5x for body) to ensure a comfortable reading experience for long manga descriptions.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a strictly defined max-width of 1280px to maintain readability on ultra-wide monitors. 

**Grid Architecture:**
- **Desktop:** 12-column grid with 24px gutters.
- **Tablet:** 8-column grid with 20px gutters.
- **Mobile:** 4-column grid with 16px gutters and 16px side margins.

**Rhythm:**
The system uses a 4px baseline. Spacing between related items should be `sm` (16px), while spacing between major sections should be `lg` (40px) or `xl` (64px) to emphasize the minimalist, airy intent of the brand.

## Elevation & Depth

This design system uses **Tonal Layers** combined with **Ambient Shadows** to create a structured sense of depth.

- **Level 0 (Base):** Soft Off-White (#FAFAFA). No shadow.
- **Level 1 (Cards/Cards):** White surface with a very soft, diffused shadow: `0px 4px 20px rgba(30, 27, 75, 0.05)`.
- **Level 2 (Popovers/Modals):** White surface with a more pronounced shadow: `0px 12px 32px rgba(30, 27, 75, 0.12)`.
- **Interaction Depth:** On hover, interactive cards should transition from Level 1 to a slightly "lifted" state with a subtle Primary color tint in the shadow to indicate focus.

Avoid heavy black shadows; always use the Dark Navy (#1E1B4B) with very low opacity to keep the shadows feeling "clean" and integrated with the brand colors.

## Shapes

The shape language is consistently **Rounded**, reflecting a friendly and modern personality.

- **Small elements (Buttons, Checkboxes):** 0.5rem (8px).
- **Medium elements (Cards, Input Fields):** 1rem (16px).
- **Large elements (Modals, Featured Hero Cards):** 1.5rem (24px).
- **Status Badges:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

This consistent radius creates a soft, approachable feel while maintaining the structural integrity required for a professional SaaS-style Admin interface.

## Components

### Buttons
- **Primary:** Solid Deep Purple with white text. High contrast.
- **Secondary:** Outlined Deep Purple or Solid Light Blue.
- **CTA Special:** "Reserve Online" buttons should use the Primary Accent with a subtle "In-Store Pay" icon or label adjacent to clarify the service model.

### Manga Cards
- Aspect ratio of 2:3 for the cover image.
- Title in **Headline SM**, Author in **Body SM**.
- Top-right corner overlay for status badges (e.g., "Available" in Green).
- Subtle scale-up animation on hover (1.02x).

### Admin UI Elements
- **Data Tables:** High density but with clear row separation using #F3F4F6 borders. Header rows use #F5F3FF background.
- **Charts:** Use Primary and Secondary accents for data visualization. Avoid complex gradients; stick to clean, flat lines and bars.

### Input Fields
- Background color #FFFFFF with a 1px border of #F3F4F6. 
- On focus: 2px border of Primary Accent with a soft purple outer glow.

### Reservation Indicators
- Since there is no online payment, the "Reserve" component must emphasize the **Store Location** and **Pickup Window**. Use a "Step Indicator" visual to show the flow: *1. Reserve Online -> 2. Receive Confirmation -> 3. Pay & Collect at Store.*