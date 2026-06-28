# Responsive Button Patterns - Reference Guide

## Tailwind Breakpoints
```
xs:  375px  (iPhone SE, small phones)
sm:  640px  (larger phones, small tablets)
md:  768px  (tablets)
lg:  1024px (small desktops)
xl:  1280px (desktops)
2xl: 1536px (large desktops)
```

## Pattern 1: Modal Action Buttons (Footer)

### Usage
For dialog and alert dialog footer buttons that need to stack on mobile.

### Classes
```tsx
<DialogFooter>
  <Button 
    variant="outline" 
    className="h-9 sm:h-10 px-3 sm:px-4"
  >
    Cancel
  </Button>
  <Button 
    className="h-9 sm:h-10 px-3 sm:px-4 w-full sm:w-auto"
  >
    <Icon className="mr-1 sm:mr-2 h-4 w-4" />
    <span className="hidden sm:inline">Full Text</span>
    <span className="sm:hidden text-xs">Short</span>
  </Button>
</DialogFooter>
```

### Behavior
- Mobile (< 640px): Buttons stack vertically, full width
- Tablet (640px+): Buttons arranged horizontally, auto width
- Touch target: 44px minimum height on mobile

### Applied To
- CreateInvoiceModal ✓
- EditInvoiceModal ✓
- CreateCreditNoteModal ✓
- CreateLPOModal ✓
- CreateQuotationModal ✓
- CreateCustomerModal ✓

---

## Pattern 2: Table Action Buttons (Delete)

### Usage
For inline table row action buttons (delete, edit, view, etc.).

### Classes
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
>
  <Icon className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
</Button>
```

### Behavior
- Mobile (< 640px): Smaller button (h-8 w-8), smaller icon (h-3.5)
- Tablet (640px+): Normal size button (h-9 w-9), normal icon (h-4)
- Touch target: 32px minimum on mobile (adequate for careful touch)

### Applied To
- CreateInvoiceModal table ✓
- EditInvoiceModal table ✓
- CreateCreditNoteModal table ✓
- CreateLPOModal table ✓
- CreateQuotationModal table ✓

---

## Pattern 3: Header Buttons

### Usage
For top navigation header buttons that need to stay compact.

### Classes
```tsx
// Responsive icon button
<Button 
  variant="ghost" 
  size="icon" 
  className="h-8 w-8 sm:h-10 sm:w-10"
>
  <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
</Button>

// Responsive text button with abbreviated text
<Button 
  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
>
  <Icon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
  <span className="hidden xs:inline">Sign In</span>
  <span className="xs:hidden">In</span>
</Button>
```

### Behavior
- Mobile (< 375px): Ultra-compact buttons, abbreviated text
- Small phone (375-640px): Small button height (h-8), icon text hidden
- Tablet (640px+): Normal height (h-9/h-10), full text shown

### Applied To
- Header navigation sign in button ✓
- Header notification bell ✓
- User menu button ✓

---

## Pattern 4: Button Groups (Semantic)

### Usage
For grouping multiple buttons with consistent spacing.

### ButtonGroup Component
```tsx
<ButtonGroup variant="modal">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</ButtonGroup>
```

### Variants
- `stack`: Vertical on mobile, horizontal on desktop (md:)
- `row`: Always horizontal, wraps naturally
- `compact`: Compact spacing for icon buttons
- `modal`: Specialized for dialog footers
- `header`: Spacing for header navigation
- `table`: Spacing for table row actions

---

## Key CSS Classes Reference

### Button Sizing
- `h-8 px-2 text-xs` - Compact mobile button
- `h-9 px-3 text-sm` - Standard mobile button
- `sm:h-10 sm:px-4 sm:text-base` - Standard desktop button
- `w-full sm:w-auto` - Full width mobile, auto on desktop

### Icon Sizing
- `h-3.5 w-3.5` - Compact mobile icon (28px)
- `sm:h-4 sm:w-4` - Standard icon (32px)
- `h-4 sm:h-5` - Icon that scales (32px → 40px)

### Spacing
- `gap-1` - Compact icon spacing
- `gap-2` - Standard mobile spacing
- `sm:gap-2` - Desktop icon spacing
- `sm:gap-3` - Standard desktop spacing
- `mr-1 sm:mr-2` - Icon-to-text spacing

### Text Handling
- `hidden sm:inline` - Hide text on mobile, show on desktop
- `sm:hidden` - Hide on desktop, show on mobile
- `text-xs sm:text-sm` - Scale text size

---

## Common Responsive Combinations

### Compact Mobile, Normal Desktop
```tsx
className="h-8 w-8 sm:h-10 sm:w-10"
className="h-3.5 sm:h-4 text-xs sm:text-sm"
```

### Full Width Mobile, Auto Desktop
```tsx
className="w-full sm:w-auto"
```

### Hide/Show Text Content
```tsx
<span className="hidden sm:inline">Full Text</span>
<span className="sm:hidden text-xs">Short</span>
```

### Responsive Gap Spacing
```tsx
className="gap-2 sm:gap-3 md:gap-4"
```

---

## Testing Checklist

### Mobile Views (375px - 480px)
- [ ] Buttons don't overflow container
- [ ] Touch targets are adequate (44px+)
- [ ] Text is abbreviated appropriately
- [ ] Icons are properly sized
- [ ] Spacing is compact but not cramped

### Tablet Views (640px - 1024px)
- [ ] Full text displays in buttons
- [ ] Buttons transition to normal size
- [ ] Layout switches to horizontal for modals
- [ ] Icons scale up properly

### Desktop Views (1024px+)
- [ ] Full button text displays
- [ ] Proper spacing between buttons
- [ ] Hover states work correctly
- [ ] Layout is balanced

---

## Migration Notes

### For Existing Buttons
When updating existing button groups:

1. **Dialog Footers**: Use the `h-9 sm:h-10 px-3 sm:px-4` pattern
2. **Table Actions**: Use the `h-8 w-8 sm:h-9 sm:w-9` pattern
3. **Header Buttons**: Use the `h-8 sm:h-10` pattern
4. **Text Abbreviation**: Wrap full/short text with hidden/shown classes

### For New Components
1. Start with `xs` breakpoint for ultra-small screens (375px)
2. Use `sm` for typical mobile threshold (640px)
3. Use `md` for tablet (768px)
4. Test at actual device sizes, not just breakpoints

---

## Resources

### Related Files
- Button component: `src/components/ui/button.tsx`
- Button group: `src/components/ui/button-group.tsx`
- Dialog footer: `src/components/ui/dialog.tsx`
- Alert dialog footer: `src/components/ui/alert-dialog.tsx`
- Tailwind config: `tailwind.config.ts`

### Breakpoints in Tailwind Config
```typescript
screens: {
  'xs': '375px',   // iPhone SE, small phones
  'sm': '640px',   // Larger phones, small tablets
  'md': '768px',   // Tablets
  'lg': '1024px',  // Small desktops
  'xl': '1280px',  // Desktops
  '2xl': '1536px', // Large desktops
}
```
