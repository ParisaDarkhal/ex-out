# Ex-Out: Privacy-First Photo Person Removal

Ex-Out is a privacy-first web application that uses AI to remove people from photos while generating photo-realistic backgrounds. All processing is done on-demand with immediate data deletion.

## Features

- 🔒 **Privacy First**: Images processed in-memory, immediately deleted
- 🎯 **Smart Detection**: AI-powered face detection and matching across photos
- 🖼️ **Photo-Realistic**: Uses Google Gemini 2.5 Flash for seamless background generation
- 📱 **PWA Ready**: Works on desktop and mobile devices
- ⚡ **Fast Processing**: Client-side face detection, server-side AI inpainting

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI Models**: face-api.js, TensorFlow.js, BodyPix, Google Gemini 2.5 Flash
- **Backend**: Next.js API routes (Vercel serverless functions)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Google Gemini API key

### Installation

1. **Clone the repository**

```bash
   git clone <repository-url>
   cd ex-out
```
