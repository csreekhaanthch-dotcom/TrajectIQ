# TrajectIQ Web UI

Next.js 15 web dashboard for TrajectIQ - AI-powered recruitment intelligence platform.

## Features

- **Modern Dashboard UI** - Clean, professional interface with real-time updates
- **TrajectIQ Branding** - Custom logo, icons, and color scheme
- **Responsive Design** - Works on desktop and mobile devices
- **Evaluation Dialog** - Candidate evaluation with AI-powered insights
- **Loading States** - Smooth loading animations and error handling

## Tech Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- shadcn/ui components

## Getting Started

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build
```

## File Structure

```
web-ui/
├── public/
│   ├── favicon-new.png      # App favicon
│   ├── favicon.svg          # SVG favicon
│   ├── trajectiq-icon.svg   # App icon
│   └── trajectiq-logo.svg   # Full logo
├── src/
│   ├── components/
│   │   ├── TrajectIQLogo.tsx        # Logo component
│   │   └── dashboard/
│   │       └── EvaluationDialog.tsx # Evaluation modal
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main dashboard page
├── next.config.ts           # Next.js configuration
└── package.json             # Dependencies
```

## License

Part of TrajectIQ v3.0.0 - Demo License: TRAJECTIQ-DEMO-2024-FULL-ACCESS
