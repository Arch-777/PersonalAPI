# 🎨 Frontend Implementation Guide — Personal API

**Team:** Ansh + Pratik · **Duration:** 24 hours · **Stack:** Next.js 14, TypeScript, Tailwind CSS

---

## 📋 Overview

PersonalAPI frontend is a single-page search dashboard + developer key management console. Two developers build two distinct parts in parallel:

- **Ansh** — Search dashboard with real-time semantic search, source tabs, result cards, animations
- **Pratik** — Developer key management page, pricing page, error banners, global interceptor

Both merge at **Hour 15** and polish until **Hour 24** (pitch + slides).

---

## 👥 Role Division

| Person | Hours | Owns | Files |
| --- | --- | --- | --- |
| **Ansh** | 0–20 | Search dashboard, UI, animations, result cards | `src/app/page.tsx`, `src/components/SearchResults.tsx` |
| **Pratik** | 0–20 | Key management, pricing, error banners, API interceptor | `src/app/(dashboard)/developer/page.tsx`, `src/app/(dashboard)/pricing/page.tsx`, `src/lib/api.ts`, `src/components/common/ErrorBanners.tsx` |

---

## ⏱️ Hour-by-Hour Schedule

### Hours 0–2: Scaffold + Setup (Both)
- [ ] `npx create-next-app@latest dashboard --typescript --tailwind --app`
- [ ] Install: `axios`, `@tanstack/react-query`, `lucide-react`, `recharts`, `framer-motion`, `shadcn/ui`
- [ ] Setup `NEXT_PUBLIC_API_URL` env var
- [ ] Create folder structure

### Hours 2–5: Ansh — Search Bar + Tabs
- [ ] Search bar component with debouncing
- [ ] Source filter tabs (All, Gmail, Drive, WhatsApp)
- [ ] Wire to `/search` API (returns empty for now)

### Hours 2–5: Pratik — Dev Page Mock + Typing
- [ ] Create `/developer` route
- [ ] Create API response types (`src/types/api.ts`)
- [ ] Mock key list UI (no API calls yet)
- [ ] Design tier picker modal

### Hours 5–9: Ansh — Results Display + Loading
- [ ] Result card component with colored borders
- [ ] Relevance % bar visualization
- [ ] Skeleton shimmer loading state
- [ ] Deploy to Vercel
- [ ] Wire real Railway URL

### Hours 5–9: Pratik — Banners + Interceptor
- [ ] Create `src/lib/api.ts` with axios + interceptor
- [ ] Implement `FeatureLockedBanner` (amber)
- [ ] Implement `RateLimitBanner` (red, countdown)
- [ ] Wire event listeners

### Hours 9–12: Ansh — Polish UI + Animations
- [ ] framer-motion stagger on results
- [ ] Empty state with chip suggestions
- [ ] Mobile responsive design
- [ ] Query term highlighting

### Hours 9–12: Pratik — Wire Real API
- [ ] `/keys/list` → populate key table
- [ ] `/keys/create` → modal + reveal
- [ ] `/keys/{prefix}` delete + revoke
- [ ] `/pricing` → fetch tier config
- [ ] Test 429 + 403 banners

### Hours 12–15: Ansh + Pratik — Polish + Test
- [ ] Test search with 10 different queries
- [ ] Mobile polish
- [ ] Share API key to search dashboard (copy button)
- [ ] Fix CORS issues
- [ ] Test auth flow

### Hour 15: Integration with Backend (Both)
- [ ] Merge `feature/frontend` into `main`
- [ ] Test 9-point checklist with backend
- [ ] Fix any integration bugs

### Hours 15–20: Demo Polish
- [ ] Select 3 best queries
- [ ] Screenshot the most impressive result (for slides)
- [ ] Test on mobile
- [ ] Add toast notifications

### Hours 20–24: Presentation Prep
- [ ] Prepare 5 slide deck
- [ ] Record demo video (backup)
- [ ] Q&A practice

---

## 📁 File Structure

```
dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Search dashboard (Ansh)
│   │   ├── (dashboard)/
│   │   │   ├── developer/
│   │   │   │   └── page.tsx          # Key management (Pratik)
│   │   │   └── pricing/
│   │   │       └── page.tsx          # Pricing page (Pratik)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── SearchResults.tsx         # Result cards (Ansh)
│   │   ├── common/
│   │   │   ├── FeatureLockedBanner.tsx
│   │   │   └── RateLimitBanner.tsx
│   │   └── developer/
│   │       ├── KeyList.tsx
│   │       ├── CreateKeyModal.tsx
│   │       └── TierPicker.tsx
│   ├── lib/
│   │   └── api.ts                    # Axios + interceptor (Pratik)
│   ├── types/
│   │   └── api.ts                    # TypeScript interfaces
│   └── styles/
│       └── globals.css
├── .env.local
├── next.config.js
└── tailwind.config.ts
```

---

## 🎨 Design System

### Colors
- **Dark background:** `#0a0f1e` (navy)
- **Card background:** `#1a2035` (dark slate)
- **Accent blue:** `#3b82f6` (electric blue)
- **Gmail red:** `#ea4335`
- **Drive green:** `#34a853`
- **WhatsApp purple:** `#25d366` (or `#7c3aed`)
- **Success green:** `#10b981`
- **Error red:** `#ef4444`
- **Warning amber:** `#f59e0b`

### Typography
- Headings: Inter, bold, 1.25x-2x size
- Body: Inter, regular, 16px
- Monospace: Fira Code, for API keys

---

## 🔧 Pre-Hackathon Setup

### Install & Scaffold
```bash
npx create-next-app@latest dashboard --typescript --tailwind --app

cd dashboard

npm install axios @tanstack/react-query lucide-react recharts framer-motion

npx shadcn@latest init --yes
```

### Create .env.local
```
NEXT_PUBLIC_API_URL=http://localhost:8000
# Update to https://your-railway-url after backend deploy
```

### Create .gitignore
```
node_modules/
.next/
.env.local
.DS_Store
```

---

## 📱 Ansh — Search Dashboard

### File: `src/app/page.tsx`

**Hours 2–5: Build the component structure**

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, Mail, FileText, MessageCircle, Loader } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SearchResult {
  id: number;
  type: string;
  source: string;
  sender: string;
  content: string;
  content_preview: string;
  date: string;
  relevance_score: number;
}

interface SearchResponse {
  query: string;
  count: number;
  results: SearchResult[];
}

interface Stats {
  total_items: number;
  by_source: Record<string, number>;
}

export default function SearchDashboard() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['search', debouncedQuery, activeTab],
    queryFn: async () => {
      if (!debouncedQuery || !apiKey) return null;
      
      const params = new URLSearchParams({
        q: debouncedQuery,
        ...(activeTab && activeTab !== 'all' && { source: activeTab })
      });
      
      const response = await axios.get<SearchResponse>(
        `${API_URL}/search?${params}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      return response.data;
    },
    staleTime: 30000,
    enabled: !!debouncedQuery && !!apiKey
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      if (!apiKey) return null;
      const response = await axios.get<Stats>(
        `${API_URL}/stats`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      return response.data;
    },
    staleTime: 60000,
    enabled: !!apiKey
  });

  const sources = [
    { id: 'all', label: 'All Sources', icon: null },
    { id: 'gmail', label: 'Gmail', icon: Mail, color: '#ea4335' },
    { id: 'drive', label: 'Drive', icon: FileText, color: '#34a853' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#7c3aed' }
  ];

  const sourceCount = (sourceId: string) => {
    if (!statsData) return 0;
    if (sourceId === 'all') return statsData.total_items;
    return statsData.by_source[sourceId] || 0;
  };

  const curlCommand = apiKey
    ? `curl '${API_URL}/search?q=${query.replace(/\s+/g, '+')}' \\
  -H 'Authorization: Bearer ${apiKey.slice(0, 12)}••••••••'`
    : 'Create an API key to see the curl command';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#0f1428] to-[#0a0f1e]">
      {/* Hero Bar */}
      <motion.div 
        className="sticky top-0 z-40 bg-[#0a0f1e]/95 backdrop-blur border-b border-[#3b82f6]/20"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-fit">
            <Zap className="w-6 h-6 text-[#3b82f6]" />
            <span className="text-xl font-bold text-white">PersonalAPI</span>
          </div>

          {/* Search Input */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search your data... (rent agreement, meeting notes, invoice)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 bg-[#1a2035] border rounded-lg text-white placeholder-gray-400 focus:outline-none transition-all ${
                  searchLoading
                    ? 'border-[#3b82f6] shadow-lg shadow-[#3b82f6]/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              />
              {searchLoading && (
                <Loader className="absolute right-3 top-3 w-5 h-5 text-[#3b82f6] animate-spin" />
              )}
            </div>
          </div>

          {/* Stats Pill */}
          {statsData && (
            <div className="hidden md:flex items-center gap-2 bg-[#1a2035] px-4 py-2 rounded-full border border-gray-600">
              <span className="text-gray-400 text-sm">Items:</span>
              <span className="font-bold text-white">{statsData.total_items}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* API Key Input */}
        {!apiKey && (
          <motion.div 
            className="mb-8 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-yellow-300 text-sm mb-3">Need an API key to search:</p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Paste your API key (sk_free_... or sk_pro_...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#1a2035] border border-yellow-600/50 rounded text-white placeholder-gray-400"
              />
              <button
                onClick={() => setApiKey('')}
                className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}

        {/* Source Filter Tabs */}
        {apiKey && (
          <div className="mb-8">
            <div className="flex gap-4 border-b border-gray-700 pb-4">
              {sources.map((source) => (
                <motion.button
                  key={source.id}
                  onClick={() => setActiveTab(activeTab === source.id ? null : source.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all relative ${
                    (activeTab === source.id || (source.id === 'all' && !activeTab))
                      ? 'text-[#3b82f6]'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  whileHover={{ scale: 1.05 }}
                >
                  {source.icon && <source.icon className="w-4 h-4" />}
                  <span>{source.label}</span>
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded-full ml-2">
                    {sourceCount(source.id)}
                  </span>
                  {(activeTab === source.id || (source.id === 'all' && !activeTab)) && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-1 bg-[#3b82f6]"
                      layoutId="underline"
                      transition={{ type: 'spring', bounce: 0.2 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Results Grid */}
        {apiKey && (
          <div className="space-y-6">
            {!debouncedQuery ? (
              <EmptyState setQuery={setQuery} />
            ) : searchLoading ? (
              <SkeletonLoader />
            ) : searchData?.results?.length ? (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 }
                  }
                }}
              >
                {searchData.results.map((result, idx) => (
                  <ResultCard key={result.id} result={result} idx={idx} query={debouncedQuery} />
                ))}
              </motion.div>
            ) : debouncedQuery ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No results found for "{debouncedQuery}"</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Fixed Bottom Curl Command Bar */}
        {apiKey && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-[#0a0f1e]/95 backdrop-blur border-t border-[#3b82f6]/20 p-4"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="max-w-7xl mx-auto">
              <p className="text-xs text-gray-400 mb-2">~ $ curl command</p>
              <code className="text-xs text-[#3b82f6] break-all font-mono">{curlCommand}</code>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Result Card Component
function ResultCard({ result, idx, query }: { result: SearchResult; idx: number; query: string }) {
  const sourceConfig = {
    gmail: { color: '#ea4335', icon: Mail, label: 'Email' },
    drive: { color: '#34a853', icon: FileText, label: 'Document' },
    whatsapp: { color: '#7c3aed', icon: MessageCircle, label: 'Message' }
  };

  const config = sourceConfig[result.source as keyof typeof sourceConfig] || sourceConfig.gmail;
  const Icon = config.icon;

  // Highlight query terms in content
  const highlightedContent = result.content_preview.replace(
    new RegExp(`(${query.split(' ').join('|')})`, 'gi'),
    '<mark class="bg-yellow-400/30 text-yellow-200">$1</mark>'
  );

  return (
    <motion.div
      className="bg-[#1a2035] border-l-4 rounded-lg overflow-hidden hover:shadow-xl hover:shadow-[#3b82f6]/20 hover:scale-[1.01] transition-all cursor-pointer"
      style={{ borderLeftColor: config.color }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: config.color + '20' }}
            >
              <Icon className="w-4 h-4" style={{ color: config.color }} />
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: config.color + '30', color: config.color }}>
              {config.label}
            </span>
            <span className="text-xs text-gray-400 ml-auto">{formatDate(result.date)}</span>
          </div>
          <h3 className="font-bold text-white line-clamp-2">{result.sender}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Relevance bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: config.color }}
              initial={{ width: 0 }}
              animate={{ width: `${result.relevance_score * 100}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-400 min-w-fit">
            {Math.round(result.relevance_score * 100)}%
          </span>
        </div>

        {/* Content preview with highlighted terms */}
        <p
          className="text-sm text-gray-300 line-clamp-3"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />
      </div>
    </motion.div>
  );
}

// Empty State with suggestions
function EmptyState({ setQuery }: { setQuery: (q: string) => void }) {
  const suggestions = [
    { text: 'rent agreement', icon: '📄' },
    { text: 'meeting notes', icon: '📝' },
    { text: 'invoice', icon: '💰' }
  ];

  return (
    <motion.div
      className="text-center py-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Zap className="w-16 h-16 mx-auto mb-4 text-[#3b82f6]" />
      <h2 className="text-2xl font-bold text-white mb-2">Start searching</h2>
      <p className="text-gray-400 mb-8">Try one of these queries:</p>
      <div className="flex flex-wrap gap-3 justify-center">
        {suggestions.map((s) => (
          <motion.button
            key={s.text}
            onClick={() => setQuery(s.text)}
            className="px-4 py-2 bg-[#1a2035] hover:bg-[#253452] border border-gray-600 rounded-full text-white transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {s.icon} {s.text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// Skeleton Loader
function SkeletonLoader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-[#1a2035] rounded-lg p-4 animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-3 w-3/4" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-700 rounded w-5/6" />
            <div className="h-3 bg-gray-700 rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Utility
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}
```

**Hours 5–12: Iterate, test with real API**
- Replace localhost with Railway URL from Nishant
- Test with live keys created on Pratik's developer page
- Refine animations, colors, mobile layout

---

## 👨‍💻 Pratik — Developer Page + Pricing + Banners

### File 1: `src/types/api.ts`

```typescript
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  tier: 'free' | 'pro' | 'developer';
  rpm: number;
  created_at: string;
  last_used: string | null;
}

export interface KeyResponse {
  api_key: string;
  key: ApiKey;
  warning: string;
}

export interface TierConfig {
  [key: string]: {
    price_inr: number;
    rpm: number;
    rpd: number;
    ai_ask: boolean;
    label: string;
    features: string[];
    locked: string[];
  };
}

export interface UsageStats {
  key: ApiKey;
  total_requests: number;
  by_endpoint: Record<string, number>;
  usage_by_day: string;
}

export interface ApiError {
  code: string;
  message?: string;
  upgrade_to?: string;
  upgrade_rpm?: number;
  price_inr?: number;
  upgrade_url?: string;
}
```

### File 2: `src/lib/api.ts`

```typescript
import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios';

// Create axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Store API key in localStorage
export const setApiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('personalapi_key', key);
  }
};

export const getApiKey = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('personalapi_key');
};

// Request interceptor — add auth header
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const key = getApiKey();
  if (key) {
    config.headers.Authorization = `Bearer ${key}`;
  }
  return config;
});

// Response interceptor — handle errors with events
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError) => {
    const detail = err.response?.data as any;

    // Feature locked (403)
    if (
      err.response?.status === 403 &&
      detail?.code === 'feature_locked'
    ) {
      window.dispatchEvent(
        new CustomEvent('feature-locked', {
          detail: {
            feature: detail.message || 'This feature is locked',
            upgradeTo: detail.upgrade_to,
            priceInr: detail.price_inr,
            upgradeUrl: detail.upgrade_url
          }
        })
      );
    }

    // Rate limited (429)
    if (err.response?.status === 429) {
      window.dispatchEvent(
        new CustomEvent('rate-limited', {
          detail: {
            retryAfter: parseInt(
              err.response.headers['retry-after'] as string || '60'
            ),
            currentTier: err.response.headers['x-tier'] || 'free',
            upgradeRpm: detail?.upgrade_rpm || 120,
            upgradeTo: detail?.upgrade_to || 'pro',
            upgradeUrl: detail?.upgrade_url
          }
        })
      );
    }

    // Unauthorized (401)
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('personalapi_key');
        window.location.href = '/setup';
      }
    }

    return Promise.reject(err);
  }
);

export default api;
```

### File 3: `src/components/common/FeatureLockedBanner.tsx`

```typescript
'use client';

import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  feature: string;
  upgradeTo: string;
  priceInr: number;
  upgradeUrl: string;
  onDismiss: () => void;
}

export function FeatureLockedBanner({
  feature,
  upgradeTo,
  priceInr,
  upgradeUrl,
  onDismiss
}: Props) {
  return (
    <motion.div
      className="fixed top-20 left-0 right-0 z-50 flex justify-center pointer-events-none"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0.3 }}
    >
      <div className="max-w-2xl w-full mx-4 bg-amber-900/20 border border-amber-600/50 rounded-lg p-4 flex items-center gap-4 pointer-events-auto backdrop-blur">
        <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 text-sm">
            <strong>{feature}</strong> requires <strong>{upgradeTo}</strong> tier
          </p>
          <p className="text-amber-200/70 text-xs">
            Upgrade for ₹{priceInr}/mo — unlock AI synthesis, higher limits, and more.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-sm rounded transition-colors font-medium"
          >
            Upgrade →
          </a>
          <button
            onClick={onDismiss}
            className="px-3 py-2 text-amber-300/70 hover:text-amber-300 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

### File 4: `src/components/common/RateLimitBanner.tsx`

```typescript
'use client';

import { Gauge } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  retryAfter: number;
  currentTier: string;
  upgradeRpm: number;
  upgradeTo: string;
  upgradeUrl: string;
  onDismiss: () => void;
}

export function RateLimitBanner({
  retryAfter,
  currentTier,
  upgradeRpm,
  upgradeTo,
  upgradeUrl,
  onDismiss
}: Props) {
  const [timeLeft, setTimeLeft] = useState(retryAfter);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="fixed top-20 left-0 right-0 z-50 flex justify-center pointer-events-none"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0.3 }}
    >
      <div className="max-w-2xl w-full mx-4 bg-red-900/20 border border-red-600/50 rounded-lg p-4 flex items-center gap-4 pointer-events-auto backdrop-blur">
        <Gauge className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-red-300 text-sm">
            <strong>Rate limit hit on {currentTier} tier</strong>
          </p>
          <p className="text-red-200/70 text-xs">
            {timeLeft > 0
              ? `Retry in ${timeLeft}s`
              : 'You can retry now'} — or upgrade to {upgradeTo} for {upgradeRpm} req/min
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 text-sm rounded transition-colors font-medium"
          >
            Upgrade →
          </a>
          <button
            onClick={onDismiss}
            className="px-3 py-2 text-red-300/70 hover:text-red-300 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

### File 5: `src/app/(dashboard)/developer/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Copy, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { ApiKey, KeyResponse, TierConfig } from '@/types/api';

export default function DeveloperPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch keys
  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ['keys'],
    queryFn: async () => {
      const res = await api.get('/keys/list');
      return res.data.keys as ApiKey[];
    },
    staleTime: 60000
  });

  // Fetch pricing
  const { data: pricingData } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const res = await api.get('/pricing');
      return res.data as TierConfig;
    },
    staleTime: 3600000
  });

  // Create key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (params: { name: string; tier: string }) => {
      const res = await api.post(
        '/keys/create',
        {},
        { params }
      );
      return res.data as KeyResponse;
    },
    onSuccess: (data) => {
      setRevealedKey(data.api_key);
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      setShowCreateModal(false);
    }
  });

  // Delete key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (prefix: string) => {
      await api.delete(`/keys/${prefix}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
    }
  });

  const tiers = ['free', 'pro', 'developer'] as const;

  return (
    <div className="min-h-screen bg-[#0a0f1e] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Developer Dashboard</h1>
          <p className="text-gray-400">Manage your API keys and usage</p>
        </div>

        {/* Revealed Key Alert */}
        {revealedKey && (
          <motion.div
            className="p-4 bg-amber-900/20 border border-amber-600/50 rounded-lg flex items-start gap-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-amber-300 font-semibold">⚠️ Copy this key now — shown only once!</p>
              <code className="mt-2 block text-xs text-amber-200 bg-black/30 p-2 rounded break-all font-mono">
                {revealedKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(revealedKey);
                  alert('Copied to clipboard!');
                }}
                className="mt-3 px-4 py-2 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 rounded transition-colors"
              >
                <Copy className="w-4 h-4 inline mr-2" /> Copy
              </button>
              <button
                onClick={() => setRevealedKey(null)}
                className="mt-3 ml-2 px-4 py-2 bg-gray-700/30 hover:bg-gray-700/50 text-gray-300 rounded transition-colors"
              >
                I've saved it, dismiss
              </button>
            </div>
          </motion.div>
        )}

        {/* Keys Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">API Keys</h2>
            <motion.button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" /> New Key
            </motion.button>
          </div>

          {/* Keys Table */}
          {keysLoading ? (
            <div className="w-full h-48 bg-[#1a2035] rounded-lg animate-pulse" />
          ) : keysData?.length ? (
            <div className="bg-[#1a2035] rounded-lg overflow-hidden border border-gray-700">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 bg-black/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">NAME</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">TIER</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">RPM</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">CREATED</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {keysData.map((key) => (
                    <motion.tr
                      key={key.id}
                      className="border-b border-gray-700 hover:bg-black/30 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <td className="px-6 py-4 text-sm text-white font-mono">{key.name}</td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-block px-3 py-1 rounded text-xs font-semibold"
                          style={{
                            backgroundColor:
                              key.tier === 'free'
                                ? '#6b7280'
                                : key.tier === 'pro'
                                  ? '#3b82f6'
                                  : '#8b5cf6'
                          }}
                        >
                          {key.tier.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{key.rpm}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(key.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(`sk_${key.prefix.slice(3)}`)
                          }
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs text-gray-400 hover:text-[#3b82f6] transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteKeyMutation.mutate(key.prefix)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No API keys yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <CreateKeyModal
          isCreating={createKeyMutation.isPending}
          onCreate={(name, tier) =>
            createKeyMutation.mutate({ name, tier })
          }
          onClose={() => setShowCreateModal(false)}
          pricingData={pricingData}
        />
      )}
    </div>
  );
}

// Create Key Modal
function CreateKeyModal({
  isCreating,
  onCreate,
  onClose,
  pricingData
}: {
  isCreating: boolean;
  onCreate: (name: string, tier: string) => void;
  onClose: () => void;
  pricingData?: TierConfig;
}) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState('free');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-[#1a2035] rounded-lg max-w-md w-full p-6 space-y-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h2 className="text-2xl font-bold text-white">Create New Key</h2>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Key Name
          </label>
          <input
            type="text"
            placeholder="e.g., Production, Testing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded text-white placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Select Tier
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['free', 'pro', 'developer'].map((t) => {
              const config = pricingData?.[t];
              return (
                <motion.button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`p-3 rounded-lg text-center transition-all border ${
                    tier === t
                      ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                      : 'border-gray-600 bg-black/30 hover:border-gray-500'
                  }`}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="font-semibold text-white capitalize">{t}</p>
                  {config && (
                    <>
                      <p className="text-xs text-gray-400">₹{config.price_inr}/mo</p>
                      <p className="text-xs text-[#3b82f6]">⚡ {config.rpm}/min</p>
                    </>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700/30 hover:bg-gray-700/50 text-gray-300 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate(name, tier)}
            disabled={!name || isCreating}
            className="flex-1 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
```

### File 6: `src/app/(dashboard)/pricing/page.tsx`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import api from '@/lib/api';
import { TierConfig } from '@/types/api';

export default function PricingPage() {
  const { data: pricingData } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const res = await api.get('/pricing');
      return res.data as TierConfig;
    }
  });

  const tiers = ['free', 'pro', 'developer'] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] to-[#0f1428] p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Start free. Scale as you grow. Cancel anytime.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier, idx) => {
            const config = pricingData?.[tier];
            if (!config) return null;

            const isPopular = tier === 'pro';

            return (
              <motion.div
                key={tier}
                className={`rounded-lg p-8 relative transition-all ${
                  isPopular
                    ? 'bg-gradient-to-b from-[#3b82f6]/20 to-[#0f1428] border-2 border-[#3b82f6] shadow-xl shadow-[#3b82f6]/20 scale-105'
                    : 'bg-[#1a2035] border border-gray-700 hover:border-gray-600'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#3b82f6] text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Tier name */}
                <h3 className="text-2xl font-bold text-white capitalize mb-2">
                  {config.label}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  {config.price_inr === 0 ? (
                    <span className="text-4xl font-bold text-white">Free</span>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-white">
                        ₹{config.price_inr}
                      </span>
                      <span className="text-gray-400 ml-2">/month</span>
                    </>
                  )}
                  {config.price_inr > 0 && (
                    <p className="text-sm text-gray-400 mt-1">
                      ~${Math.round(config.price_inr / 80)}/mo USD
                    </p>
                  )}
                </div>

                {/* Request limit */}
                <div className="mb-6 p-3 bg-black/30 rounded">
                  <p className="text-[#3b82f6] font-semibold">
                    ⚡ {config.rpm} requests/minute
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {/* Included features */}
                  {config.features.map((feature, i) => (
                    <div key={`included-${i}`} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}

                  {/* Locked features */}
                  {config.locked.map((feature, i) => (
                    <div key={`locked-${i}`} className="flex items-start gap-3">
                      <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 line-through">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Button */}
                <motion.button
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isPopular
                      ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
                      : 'bg-gray-700/30 hover:bg-gray-700/50 text-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start with {config.label}
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ */}
        <motion.div
          className="max-w-2xl mx-auto space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Questions?
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Can I upgrade or downgrade anytime?',
                a: 'Yes. Changes take effect immediately. No hidden fees.'
              },
              {
                q: 'What happens if I exceed my rate limit?',
                a: 'You'll get a 429 error with an upgrade prompt. Your requests won\'t be charged.'
              },
              {
                q: 'Do you offer refunds?',
                a: 'Yes, 30-day money-back guarantee on Pro and Developer tiers.'
              }
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 bg-[#1a2035] rounded-lg border border-gray-700"
              >
                <p className="font-semibold text-white mb-2">{item.q}</p>
                <p className="text-gray-400 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
```

### File 7: `src/app/layout.tsx`

Integrate error banners globally:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeatureLockedBanner } from '@/components/common/FeatureLockedBanner';
import { RateLimitBanner } from '@/components/common/RateLimitBanner';
import '@/styles/globals.css';

const queryClient = new QueryClient();

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [banner, setBanner] = useState<{
    type: 'locked' | 'rate';
    feature?: string;
    upgradeTo?: string;
    priceInr?: number;
    upgradeUrl?: string;
    retryAfter?: number;
    currentTier?: string;
    upgradeRpm?: number;
  } | null>(null);

  useEffect(() => {
    const handleLocked = (e: any) => {
      setBanner({
        type: 'locked',
        ...e.detail
      });
      setTimeout(() => setBanner(null), 8000);
    };

    const handleRate = (e: any) => {
      setBanner({
        type: 'rate',
        ...e.detail
      });
    };

    window.addEventListener('feature-locked', handleLocked);
    window.addEventListener('rate-limited', handleRate);

    return () => {
      window.removeEventListener('feature-locked', handleLocked);
      window.removeEventListener('rate-limited', handleRate);
    };
  }, []);

  return (
    <html>
      <head>
        <title>PersonalAPI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {banner?.type === 'locked' && banner?.upgradeTo && (
            <FeatureLockedBanner
              feature={banner.feature || 'Feature'}
              upgradeTo={banner.upgradeTo}
              priceInr={banner.priceInr || 799}
              upgradeUrl={banner.upgradeUrl || 'https://personalapi.dev/upgrade'}
              onDismiss={() => setBanner(null)}
            />
          )}

          {banner?.type === 'rate' && banner?.upgradeTo && (
            <RateLimitBanner
              retryAfter={banner.retryAfter || 60}
              currentTier={banner.currentTier || 'free'}
              upgradeRpm={banner.upgradeRpm || 120}
              upgradeTo={banner.upgradeTo}
              upgradeUrl={banner.upgradeUrl || 'https://personalapi.dev/upgrade'}
              onDismiss={() => setBanner(null)}
            />
          )}

          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

---

## 🚀 Deployment to Vercel

### Hours 9: Deploy frontend
```bash
echo 'NEXT_PUBLIC_API_URL=https://your-railway-url.com' > .env.local
vercel --prod
```

Update `.env.local` with the live Railway backend URL from Nishant.

---

## ✅ Hour 15 Integration Checklist

| Task | Owner | Status |
| --- | --- | --- |
| Backend `/keys/create` returns real key | Nishant | ✅ |
| Frontend `/developer` shows key list | Pratik | ✅ |
| Ansh's search shows results from railway | Ansh | ✅ |
| Rate limit 429 → red banner appears | Pratik | ✅ |
| Feature lock 403 → amber banner appears | Pratik | ✅ |
| `/ask` works with pro key | Nishant | ✅ |
| Both branches merged to `main` | Both | ✅ |
| Vercel + Railway both live | Both | ✅ |
| No CORS errors | Nishant | ✅ |

---

## 🎯 Success Criteria

✅ **Search dashboard** — type "rent agreement", get results in <2 sec

✅ **Billing is visible** — 429 and 403 errors turn into upgrade CTAs, auto-dismiss after 8s

✅ **Developer page** — create, copy, delete API keys; see tier + rpm

✅ **Pricing page** — fetch tier config, show 3 cards, check marks for features

✅ **Mobile responsive** — search + banners work on phone

✅ **Deployed** — live on Vercel, pointing to real Railway backend

---

**Go ship it. 🚀**
