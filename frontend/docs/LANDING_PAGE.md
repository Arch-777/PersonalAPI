# Landing Page Design & Structure

The landing page located at `/` serves as the entry point for new users. It features "pop models" (modals) for authentication.

## 1. Sections Overview

The page should scroll through the following sections:

1.  **Hero Section**
    *   **Headline**: "Your Personal Digital Brain, Unified."
    *   **Subheadline**: "Connect Notion, Slack, Telegram, and Google Drive into one searchable knowledge base."
    *   **CTA Buttons**: "Get Started" (Triggers Sign-up Modal), "View Demo".
    *   **Visual**: Abstract representation of data streams converging into a chat interface.

2.  **Features Grid**
    *   **Search**: Semantic search across all connected apps.
    *   **RAG AI**: Chat with your data using LLMs.
    *   **Privacy**: Emphasis on self-hosted / local-first security.

3.  **Integrations Carousel**
    *   Infinite scrolling logos of supported apps (Notion, Slack, Telegram, Google, Spotify).

4.  **Pricing Preview**
    *   Simple 3-column pricing cards (Free, Pro, Enterprise).

5.  **Footer**
    *   Links to Docs, GitHub, Twitter.

## 2. Authentication Flow ("Pop Models")

Instead of separate `/login` and `/signup` pages, we use **Dialog Modals**.

*   **Trigger**: Clicking "Login" or "Sign Up" buttons.
*   **Implementation**:
    *   Uses `shadcn/ui` Dialog component.
    *   State can be managed via URL query params (`?auth=login`) to allow bookmarking, or simple React state.
    *   **Login Form**: Email/Password + "Continue with Google".
    *   **Sign-up Form**: Name, Email, Password.
*   **Behavior**:
    *   On success -> Redirect to `/dashboard`.
    *   On failure -> Show inline error message (red alert).

## 3. Aesthetic Direction

*   **Theme**: Clean, modern, heavily utilizing whitespace.
*   **Typography**: Inter or similar sans-serif.
*   **Colors**: Primary brand color (e.g., Indigo/Violet) for CTAs.
*   **Motion**: Subtle fade-in animations on scroll (using `framer-motion`).
