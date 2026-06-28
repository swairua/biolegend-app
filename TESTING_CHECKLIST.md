# Mobile Responsiveness Testing Checklist

## Screen Sizes to Test
- [ ] iPhone SE (375px width)
- [ ] iPhone 12 (390px width)  
- [ ] iPhone 14+ (428px width)
- [ ] Android phones (360px - 480px range)
- [ ] iPad / Tablets (768px+)
- [ ] Desktop (1024px+)

## Header Component
- [ ] Sign In button shows abbreviated text "In" on mobile
- [ ] Sign In button shows full text on tablet+
- [ ] Notification bell icon scales properly (smaller on mobile)
- [ ] User avatar button is responsive
- [ ] Overall header buttons don't overflow on small screens
- [ ] Proper spacing between header elements

## Modal/Dialog Buttons

### Footer Button Layout (All Modals)
- [ ] Buttons stack vertically on mobile (flex-col-reverse)
- [ ] Buttons arrange horizontally on tablet+ (sm:flex-row)
- [ ] Cancel button is full width on mobile
- [ ] Primary action button is full width on mobile
- [ ] Gap spacing is proper (gap-2 sm:gap-3)
- [ ] Touch targets are adequate (minimum 44px height)

### Modal Size
- [ ] Dialog is readable on small phones (width not too wide)
- [ ] Dialog content doesn't get cut off
- [ ] Padding is appropriate for small screens
- [ ] Form fields have good vertical spacing

### Updated Modals to Test
- [ ] Create Invoice Modal
  - Footer buttons responsive ✓
  - Table delete buttons responsive ✓
- [ ] Edit Invoice Modal
  - Footer buttons responsive ✓
  - Table delete buttons responsive ✓
- [ ] Create Credit Note Modal
  - Footer buttons responsive ✓
  - Table delete buttons responsive ✓
- [ ] Create LPO Modal
  - Footer buttons responsive ✓
  - Table delete buttons responsive ✓
- [ ] Create Quotation Modal
  - Footer buttons responsive ✓
  - Table delete buttons responsive ✓
- [ ] Create Customer Modal
  - Footer buttons responsive ✓

## Table Action Buttons (In Modals)
- [ ] Delete icons are visible and clickable on mobile
- [ ] Icon size scales properly (h-3.5 sm:h-4)
- [ ] Button size is adequate for touch (h-8 w-8 sm:h-9 sm:w-9)
- [ ] Hover state works properly
- [ ] Destructive styling is clear

## Text Content
- [ ] "Create Invoice" → "Create" (mobile)
- [ ] "Creating..." → "Creating" (mobile)
- [ ] Button labels are abbreviated appropriately
- [ ] Hidden/shown text transitions work smoothly (no layout shift)

## Spacing & Layout
- [ ] No horizontal overflow on mobile
- [ ] Buttons don't touch edges (proper padding)
- [ ] Gap between buttons is consistent
- [ ] Dialog padding works on small screens
- [ ] All content is readable without scrolling excessively

## Font Sizes
- [ ] Button text is readable on mobile
- [ ] Icon sizes don't make buttons too tall
- [ ] Consistent text sizing across devices

## Edge Cases
- [ ] Very long button text still fits (if applicable)
- [ ] Many buttons in a row wrap properly (modal variations)
- [ ] Loading states display properly on mobile
- [ ] Disabled states are visually distinct

## Browser/Device Testing
- [ ] Chrome DevTools mobile emulation (all sizes)
- [ ] Firefox mobile view
- [ ] Safari DevTools (if Mac)
- [ ] Actual device testing (if available)

## Performance
- [ ] No layout shifts during responsive transitions
- [ ] Smooth scaling of elements
- [ ] No jank when resizing viewport

## Accessibility
- [ ] Touch targets are >= 44px (WCAG 2.5.5)
- [ ] Button labels are clear on mobile abbreviations
- [ ] Color contrast still meets standards
- [ ] Focus states are visible
