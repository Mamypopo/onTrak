# 🎨 Design System - OnTrak MDM Dashboard

## 📋 Overview

Design system สำหรับ OnTrak MDM Dashboard ที่ใช้ shadcn/ui, Radix UI, และ Tailwind CSS

---

## 🎨 Color Scheme

### Primary Color
- **Purple**: `262.1 83.3% 57.8%` (hsl)
- ใช้สำหรับ primary actions, links, และ accents

### Light Mode
- **Background**: Clean white (`0 0% 100%`)
- **Foreground**: Dark gray (`222.2 84% 4.9%`)

### Dark Mode (macOS-style)
- **Background**: Dark gray (`0 0% 11%`)
- **Foreground**: Light gray (`210 40% 98%`)

---

## 📝 Typography

### Font Stack
```
Prompt (Thai) → Inter → sans-serif
```

### Font Weights
- `400` - Normal
- `500` - Medium
- `600` - Semibold
- `700` - Bold

### Usage
```tsx
// Default (Prompt)
<p className="font-sans">Text</p>

// Explicit Prompt
<p className="font-prompt">Text</p>

// Explicit Inter
<p className="font-inter">Text</p>
```

---

## 🔲 Border Radius

### Base
- **Default**: `0.5rem` (8px) - `--radius`
- **Large**: `var(--radius)` - `rounded-lg`
- **Medium**: `calc(var(--radius) - 2px)` - `rounded-md`
- **Small**: `calc(var(--radius) - 4px)` - `rounded-sm`

---

## 🎭 Design Characteristics

### Modern & Clean
- Minimal design
- Card-based layout
- Subtle shadows และ borders
- Gradient backgrounds

### Interactive Elements
- **Hover Effects**: `hover:shadow-md`, `hover:border-primary/30`
- **Transitions**: `transition-all duration-300`
- **Ring Effects**: สำหรับ selected items
- **Pulse Animations**: สำหรับ processing states

### Responsive Design
- Mobile-first approach
- Breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Flexible layouts: `flex`, `grid`

---

## 🧩 UI Patterns

### Cards & Containers
```tsx
// Basic Card
<Card className="rounded-lg border-border/50">
  <CardContent>Content</CardContent>
</Card>

// Card with Hover Effect
<Card className="card-hover rounded-lg border-border/50">
  <CardContent>Content</CardContent>
</Card>

// Card with Backdrop Blur
<div className="rounded-lg border-border/50 backdrop-blur-sm bg-card/50">
  Content
</div>
```

### Badges & Status
```tsx
// Color-coded Badge
<Badge variant="outline" className="hover:border-primary/30">
  Status
</Badge>

// Small Badge
<Badge className="text-xs">Small</Badge>

// Extra Small Badge
<Badge className="text-[10px]">XS</Badge>
```

### Gradients
```tsx
// Vertical Gradient
<div className="bg-gradient-to-b from-primary/10 to-transparent">
  Content
</div>

// Horizontal Gradient
<div className="bg-gradient-to-r from-primary/10 to-transparent">
  Content
</div>
```

### Processing States
```tsx
// Pulse Animation
<div className="animate-pulse-subtle">
  Processing...
</div>
```

---

## 🌓 Dark Mode

### Setup
- ใช้ `next-themes` สำหรับ theme management
- ThemeProvider wrap ใน `layout.tsx`
- ใช้ `class` strategy สำหรับ dark mode

### Usage
```tsx
import { useTheme } from "next-themes";

function Component() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle Theme
    </button>
  );
}
```

---

## 🎯 Utility Classes

### Transitions
```tsx
// Default transition
<div className="transition-all duration-300">Content</div>

// Hover transition
<button className="hover:transition-all hover:duration-300">
  Button
</button>
```

### Shadows
```tsx
// Subtle shadow
<div className="shadow-sm">Content</div>

// Medium shadow (hover)
<div className="hover:shadow-md">Content</div>

// Large shadow
<div className="shadow-lg">Content</div>
```

### Borders
```tsx
// Default border
<div className="border border-border">Content</div>

// Border with opacity
<div className="border border-border/50">Content</div>

// Hover border
<div className="border border-border hover:border-primary/30">
  Content
</div>
```

---

## 📦 Component Library

### shadcn/ui
- ใช้ Radix UI เป็นฐาน
- Components: Button, Card, Input, Dialog, Select, Tabs, Popover, etc.

### Icons
- **lucide-react**: Icon library

### Tooltips
- **@tippyjs/react**: Global tooltip system
- ใช้ `<Tooltip>` component จาก `@/components/ui/tippy`

---

## 🚀 Best Practices

### 1. Use Design Tokens
```tsx
// ✅ Good
<div className="bg-primary text-primary-foreground">

// ❌ Bad
<div className="bg-purple-500 text-white">
```

### 2. Consistent Spacing
```tsx
// ✅ Good
<div className="space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// ❌ Bad
<div>
  <div className="mb-4">Item 1</div>
  <div className="mb-4">Item 2</div>
</div>
```

### 3. Responsive Design
```tsx
// ✅ Good
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  Content
</div>

// ❌ Bad
<div className="grid grid-cols-3">
  Content
</div>
```

### 4. Dark Mode Support
```tsx
// ✅ Good
<div className="bg-card text-card-foreground">
  Content
</div>

// ❌ Bad
<div className="bg-white text-black dark:bg-black dark:text-white">
  Content
</div>
```

---

## 📚 Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [next-themes Documentation](https://github.com/pacocoursey/next-themes)

