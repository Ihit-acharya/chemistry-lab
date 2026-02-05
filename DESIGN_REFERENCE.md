# Visual Design Reference Guide

## Component Specifications

---

## FLOATING ACTION BUTTONS (FABs)

### Dimensions
- **Size**: 56px × 56px (circular)
- **Border**: 1.5px solid rgba(200, 190, 255, 0.6)
- **Border-radius**: 50%

### Colors
- **Default Background**: 
  ```css
  linear-gradient(135deg, rgba(80, 90, 130, 0.72), rgba(35, 40, 65, 0.65))
  ```
- **Hover Background**:
  ```css
  linear-gradient(135deg, rgba(110, 125, 165, 0.85), rgba(50, 60, 90, 0.8))
  ```
- **Icon Color**: #faf8ff

### Shadows
- **Default**:
  ```css
  0 16px 32px rgba(0,0,0,0.55),
  0 0 20px rgba(160, 140, 255, 0.35),
  inset 0 1px 2px rgba(255,255,255,0.3),
  inset 0 -1px 2px rgba(0,0,0,0.4)
  ```
- **Hover**:
  ```css
  0 22px 48px rgba(0,0,0,0.65),
  0 0 28px rgba(160, 140, 255, 0.45)
  ```

### Animations
- **Hover**: `translateY(-6px) scale(1.08)` (0.3s cubic-bezier)
- **Active**: `translateY(-2px) scale(0.98)`
- **Drag**: `scale(1.15)` with enhanced shadows

### Cursor
- Default: `grab`
- Dragging: `grabbing`

---

## DRAWERS

### Container
- **Width**: 360px
- **Max-height**: calc(100vh - 180px)
- **Position**: fixed, top 140px, right 20px
- **Border-radius**: 18px

### Colors & Styling
- **Background**:
  ```css
  linear-gradient(135deg, rgba(44, 48, 80, 0.65), rgba(28, 30, 48, 0.58))
  ```
- **Border**: 1px solid rgba(180, 170, 255, 0.5)
- **Backdrop Filter**: blur(20px) saturate(170%)

### Shadows
- **Closed**:
  ```css
  0 24px 60px rgba(0,0,0,0.55),
  0 0 0 1px rgba(160, 140, 255, 0.35),
  0 0 28px rgba(160, 140, 255, 0.2),
  inset 0 1px 0 rgba(255,255,255,0.2)
  ```
- **Open**:
  ```css
  0 32px 80px rgba(0,0,0,0.7),
  0 0 0 1px rgba(160, 140, 255, 0.5),
  0 0 48px rgba(160, 140, 255, 0.35),
  inset 0 1px 0 rgba(255,255,255,0.3)
  ```

### Animations
- **Open/Close**: 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)
- **Default**: translateY(-12px) scale(0.96), opacity 0
- **Open**: translateY(0) scale(1), opacity 1

---

## DRAWER HEADERS

### Styling
- **Background**:
  ```css
  linear-gradient(135deg, rgba(60, 50, 100, 0.4), rgba(40, 35, 70, 0.35))
  ```
- **Padding**: 14px 16px
- **Border-bottom**: 1.5px solid rgba(160, 140, 255, 0.3)
- **Border-radius**: 16px 16px 0 0
- **Font-weight**: 700
- **Text-transform**: uppercase
- **Letter-spacing**: 0.5px

### Hover State
- **Background**:
  ```css
  linear-gradient(135deg, rgba(75, 60, 115, 0.5), rgba(50, 42, 80, 0.45))
  ```
- **Border-color**: rgba(180, 160, 255, 0.4)

### Cursor
- Default: `grab`
- Dragging: `grabbing`

---

## ICON BUTTONS

### Dimensions
- **Minimum Width**: 32px
- **Minimum Height**: 32px
- **Padding**: 8px 10px
- **Border-radius**: 10px

### Colors & Styling
- **Border**: 1.5px solid rgba(160, 140, 255, 0.35)
- **Background**:
  ```css
  linear-gradient(135deg, rgba(50, 45, 85, 0.5), rgba(35, 32, 60, 0.45))
  ```
- **Color**: #d7c7ff
- **Backdrop Filter**: blur(8px)

### Hover State
- **Background**:
  ```css
  linear-gradient(135deg, rgba(75, 65, 115, 0.65), rgba(50, 45, 80, 0.6))
  ```
- **Border-color**: rgba(180, 160, 255, 0.5)
- **Color**: #f1edff
- **Transform**: translateY(-2px)
- **Box-shadow**: 0 6px 16px rgba(138, 43, 226, 0.25)

### Focus-visible
- **Outline**: 2px solid rgba(160, 140, 255, 0.5)
- **Outline-offset**: 2px

---

## ACTION BUTTONS

### Full-width Variant
- **Width**: 100%
- **Padding**: 12px
- **Margin**: 6px 0
- **Border-radius**: 10px
- **Font-weight**: 600

### Compact Variant (in control-row)
- **Width**: auto
- **Padding**: 8px 12px
- **Min-width**: 80px
- **Font-size**: 0.85rem

### Default Colors
- **Border**: 1.5px solid rgba(160, 140, 255, 0.4)
- **Background**:
  ```css
  linear-gradient(135deg, rgba(80, 60, 150, 0.6), rgba(60, 45, 120, 0.55))
  ```
- **Color**: #f1edff
- **Box-shadow**: 0 8px 20px rgba(0,0,0,0.4), 0 0 12px rgba(138, 43, 226, 0.2)

### Danger Variant
- **Border-color**: rgba(255, 80, 80, 0.4)
- **Background**:
  ```css
  linear-gradient(135deg, rgba(150, 40, 40, 0.6), rgba(120, 30, 30, 0.55))
  ```

### Success Variant
- **Border-color**: rgba(80, 200, 120, 0.4)
- **Background**:
  ```css
  linear-gradient(135deg, rgba(40, 120, 80, 0.6), rgba(30, 100, 65, 0.55))
  ```

### Hover State
- **Transform**: translateY(-3px) scale(1.02)
- **Box-shadow**: 0 12px 28px rgba(0,0,0,0.5), 0 0 16px rgba(138, 43, 226, 0.35)
- **Background intensifies** with richer gradient

---

## RANGE SLIDERS

### Track
- **Height**: 6px
- **Background**:
  ```css
  linear-gradient(90deg, rgba(100, 80, 180, 0.4), rgba(80, 60, 150, 0.35))
  ```
- **Border-radius**: 4px

### Thumb (WebKit)
- **Width**: 18px
- **Height**: 18px
- **Border-radius**: 50%
- **Background**:
  ```css
  linear-gradient(135deg, rgba(160, 140, 255, 0.8), rgba(140, 120, 255, 0.75))
  ```
- **Border**: 2px solid rgba(200, 180, 255, 0.6)
- **Box-shadow**: 0 4px 12px rgba(138, 43, 226, 0.3)

### Thumb Hover
- **Transform**: scale(1.2)
- **Box-shadow**: 0 6px 16px rgba(138, 43, 226, 0.45)

### Firefox Support
- Same styling with `-moz-range-` prefixes

---

## FLOATING WINDOWS

### Container
- **Width**: 320px
- **Max-width**: calc(100vw - 48px)
- **Position**: fixed, top 160px, right 24px
- **Z-index**: 980
- **Background**: transparent

### Closed State
- **Opacity**: 0
- **Pointer-events**: none
- **Transform**: translateY(-8px) scale(0.96)

### Open State
- **Opacity**: 1
- **Pointer-events**: auto
- **Transform**: translateY(0) scale(1)
- **Animation**: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)

---

## WINDOW HEADERS

### Styling
- **Background**:
  ```css
  linear-gradient(135deg, rgba(30, 32, 50, 0.5), rgba(20, 22, 40, 0.45))
  ```
- **Border**: 1px solid rgba(160, 140, 255, 0.4)
- **Border-radius**: 12px 12px 0 0
- **Padding**: 10px 12px
- **Font-size**: 0.85rem
- **Font-weight**: 600
- **Text-transform**: uppercase
- **Letter-spacing**: 0.5px
- **Color**: #e7e2ff

### Hover
- **Background**:
  ```css
  linear-gradient(135deg, rgba(40, 42, 60, 0.6), rgba(25, 28, 45, 0.55))
  ```
- **Border-color**: rgba(180, 160, 255, 0.5)

### Cursor: `move`

---

## WINDOW BODIES

### Styling
- **Padding**: 12px
- **Background**:
  ```css
  linear-gradient(135deg, rgba(25, 28, 48, 0.5), rgba(20, 22, 40, 0.45))
  ```
- **Border**: 1px solid rgba(160, 140, 255, 0.3)
- **Border-top**: none
- **Border-radius**: 0 0 12px 12px
- **Backdrop Filter**: blur(12px) saturate(150%)
- **Box-shadow**: 0 8px 24px rgba(0,0,0,0.4)

---

## MESSAGE BUBBLES

### Default
- **Padding**: 12px 14px
- **Border**: 1.5px solid rgba(138, 43, 226, 0.35)
- **Background**:
  ```css
  linear-gradient(135deg, rgba(40, 30, 70, 0.4), rgba(30, 25, 50, 0.35))
  ```
- **Color**: #e7e2ff
- **Border-radius**: 12px
- **Box-shadow**: 0 4px 12px rgba(0,0,0,0.25)

### Hover
- **Border-color**: rgba(138, 43, 226, 0.5)
- **Background**:
  ```css
  linear-gradient(135deg, rgba(50, 35, 85, 0.5), rgba(35, 30, 60, 0.45))
  ```
- **Box-shadow**: 0 6px 16px rgba(0,0,0,0.35)

### Warning
- **Border-color**: rgba(255, 153, 0, 0.55)
- **Background**:
  ```css
  linear-gradient(135deg, rgba(100, 70, 20, 0.35), rgba(80, 55, 15, 0.3))
  ```
- **Color**: #ffd699

### Danger
- **Border-color**: rgba(255, 51, 51, 0.6)
- **Background**:
  ```css
  linear-gradient(135deg, rgba(100, 30, 30, 0.35), rgba(80, 25, 25, 0.3))
  ```
- **Color**: #ffb3b3

### Success
- **Border-color**: rgba(0, 204, 102, 0.55)
- **Background**:
  ```css
  linear-gradient(135deg, rgba(20, 70, 40, 0.35), rgba(15, 55, 35, 0.3))
  ```
- **Color**: #b3f0d9

---

## SCROLLBARS

### Track
- **Background**: rgba(20, 22, 34, 0.3)
- **Border-radius**: 999px
- **Margin**: 8px 0

### Thumb
- **Width**: 10px
- **Background**:
  ```css
  linear-gradient(180deg, rgba(160, 140, 255, 0.6), rgba(140, 120, 255, 0.5))
  ```
- **Border-radius**: 999px
- **Border**: 2px solid transparent
- **Background-clip**: padding-box

### Thumb Hover
- **Background**:
  ```css
  linear-gradient(180deg, rgba(180, 160, 255, 0.8), rgba(160, 140, 255, 0.7))
  ```

---

## ANIMATIONS & EASING

### Primary Easing
```css
cubic-bezier(0.34, 1.56, 0.64, 1)  /* Springy, responsive feel */
```

### Duration Guidelines
- **Opening/Closing Animations**: 0.35s
- **Hover States**: 0.25s
- **Interactive Feedback**: 0.2-0.3s
- **State Changes**: 0.25s

### Performance
- Use `will-change: transform` during drag states
- Use `transform: translate3d(0, 0, 0)` for GPU acceleration
- Remove `will-change` after animation completes
- Set `transition: none` during drag for responsiveness

---

## RESPONSIVE BREAKPOINTS

### Drawer Sizing
```css
max-width: calc(100vw - 40px)  /* Mobile consideration */
max-height: calc(100vh - 180px) /* Viewport-aware */
```

### Touch Targets
- Minimum: 32px × 32px
- Recommended: 48px × 48px for mobile

### FAB Positioning
- Right margin: 20px (desktop), 12px (minimum)
- Top offset: 90px from top
- Bottom offset: 12px from bottom

---

## Color Palette Reference

### Primary Colors
- **Primary Accent**: #8a2be2 (Blueviolet)
- **Light Accent**: rgba(160, 140, 255, 0.6) - 60% opacity
- **Dark Accent**: rgba(44, 48, 80) - Dark purple-gray

### Text Colors
- **Primary Text**: #f1edff (Near white)
- **Secondary Text**: #d7c7ff (Light purple)
- **Tertiary Text**: #9988cc (Muted purple)

### State Colors
- **Danger**: #ff3333 / rgba(255, 51, 51)
- **Success**: #00cc66 / rgba(0, 204, 102)
- **Warning**: #ff9900 / rgba(255, 153, 0)

### Background Colors
- **Darkest**: rgba(20, 22, 34)
- **Dark**: rgba(28, 30, 48)
- **Medium Dark**: rgba(40, 45, 70)
- **Medium**: rgba(60, 50, 100)

---

## Implementation Notes

1. All gradients use `135deg` for consistency
2. All transitions smoothed with cubic-bezier easing
3. All borders include accent colors at 0.3-0.6 opacity
4. All interactive elements include hover state
5. All draggable elements support visual feedback
6. All buttons include focus-visible states
7. All animations target 60fps with GPU acceleration

---

*Last Updated: UI/UX Refinement Complete*
*Design Standard: Professional Glass-Morphism with Spring Animations*
