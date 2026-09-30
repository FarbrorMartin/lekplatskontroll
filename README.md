# Municipal Park Survey Mobile Web App

A lightweight, mobile-first static web app designed for municipal inspectors to conduct park safety and maintenance surveys directly from a phone browser.

## Features
- **25 Municipal Parks**: Pre-configured with distinct locations, districts, and specific feature sets.
- **5 Feature Types**:
  1. 🛝 **Playground Equipment** (structural parts, screws/fasteners, attachment points, loose parts, paint)
  2. 🪑 **Park Furniture & Amenities** (benches, fasteners, trash cans, signage, picnic tables)
  3. 🌳 **Greenery & Landscaping** (hazardous overhead branches, sightlines, lawn condition, flowerbeds, hedges)
  4. 💡 **Lighting & Electrical** (fixtures, pole alignment, locked junction boxes, wiring, sensors)
  5. 🛤️ **Walkways & Fencing** (pavement trip hazards, perimeter fence stability, gates, ramps, drainage)
- **Fast 1-Tap Control Points**: Toggle between `[✓ OK]` and `[⚠ Issue]` with instant problem description field expansion.
- **Progress Tracking & Offline Resilience**: Progress is saved to `localStorage` automatically so reloading or connection loss does not erase work.
- **One-Tap Email Dispatch**:
  - Automatically formats a structured text report.
  - Generates a `mailto:` link pre-populating recipient, subject, and the complete survey text body in the user's native email client (Gmail, Apple Mail, Outlook).
  - Includes a fallback 1-tap "Copy Report to Clipboard" button.
- **Configurable Settings**: Change the dispatch recipient address (default: `park-maintenance@municipality.gov`) and inspector name directly from the settings drawer (⚙️).

## How to Run & Test

### Option 1: Direct File Opening
Double-click `index.html` to open it in any desktop browser (Chrome, Edge, Safari, Firefox). Use browser DevTools (F12) to toggle Device Toolbar / Mobile View for the realistic phone experience.

### Option 2: Local Web Server (For testing on phone over Wi-Fi)
1. In this directory, start a local server:
   ```bash
   python -m http.server 8080
   ```
2. On your phone (connected to the same Wi-Fi), navigate to `http://<your-computer-ip>:8080`.
3. Add to Home Screen (iOS Safari or Android Chrome) for a full-screen, native-app feel.
