# Jewelry Shop Color Palette

## Primary Colors
- **Main color**: `#7f2257` (Deep Magenta)
- **Dark variant**: `#661a45` (Darker Magenta)
- **Light variant**: `#9a3a6e` (Lighter Magenta)

## Accent Colors
- **Accent color**: `#c3996b` (Gold/Bronze)
- **Dark variant**: `#a37e54` (Darker Gold)
- **Light variant**: `#d0ad87` (Lighter Gold)

## Neutral Colors
- **Text dark**: `#333333` (Nearly Black)
- **Text medium**: `#666666` (Dark Gray)
- **Text light**: `#999999` (Medium Gray)

## Background Colors
- **Background primary**: `#ffffff` (White)
- **Background secondary**: `#f8f5f2` (Off-White)
- **Background tertiary**: `#f0eae5` (Light Beige)

## State Colors
- **Success**: `#4caf50` (Green)
- **Warning**: `#ff9800` (Orange)
- **Error**: `#f44336` (Red)
- **Info**: `#2196f3` (Blue)

## Usage Guidelines

### Primary Color
The primary color (`#7f2257`) should be used for:
- Main buttons
- Headers
- Links
- Primary actions
- Brand identity elements

### Accent Color
The accent color (`#c3996b`) should be used for:
- Secondary buttons
- Highlights
- Decorative elements
- Call-to-action elements that don't require the primary color

### Text Colors
- **Dark text** (`#333333`) for main content and headers
- **Medium text** (`#666666`) for secondary content and descriptions
- **Light text** (`#999999`) for tertiary content, placeholders, and disabled states

### Background Colors
- **White** (`#ffffff`) for main content areas
- **Off-white** (`#f8f5f2`) for secondary backgrounds and section differentiators
- **Light beige** (`#f0eae5`) for tertiary backgrounds, cards, and form elements

### Component Examples
- **Primary Button**: Background `#7f2257`, Text `white`
- **Accent Button**: Background `#c3996b`, Text `white`
- **Outline Button**: Border `#7f2257`, Text `#7f2257`, Hover: Background `#7f2257`, Text `white`
- **Card**: Background `white`, Border/Shadow: light gray
- **Form Field**: Border `#ddd`, Focus Border `#7f2257`

## Implementation
These colors are defined as CSS variables in the `styles.scss` file and can be accessed using the `var()` function:

```scss
color: var(--primary);
background-color: var(--accent-light);
``` 
