import { IDataObject } from 'n8n-workflow';

// Credentials interface
export interface Crawl4aiApiCredentials {
  connectionMode: 'direct' | 'docker';
  // Docker settings
  dockerUrl?: string;
  authenticationType?: 'none' | 'token' | 'basic';
  apiToken?: string;
  username?: string;
  password?: string;
  // LLM settings
  enableLlm?: boolean;
  llmProvider?: string;
  apiKey?: string;
  ollamaUrl?: string;
  customProvider?: string;
  customApiKey?: string;
  // Cache settings
  cacheDir?: string;
}

// Node options interface
export interface Crawl4aiNodeOptions extends IDataObject {
  bypassCache?: boolean;
  includeMedia?: boolean;
  verboseResponse?: boolean;
  cacheMode?: 'enabled' | 'bypass' | 'only';
}

// Browser configuration interface
export interface BrowserConfig {
  // Core
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  javaScriptEnabled?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  // Network & identity
  proxyConfig?: {
    server: string;
    username?: string;
    password?: string;
  } | null;
  headers?: Record<string, string>;
  cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
  userAgentMode?: 'default' | 'random';
  // Behavior
  verbose?: boolean;
  usePersistentContext?: boolean;
  userDataDir?: string;
  textMode?: boolean;
  lightMode?: boolean;
  extraArgs?: string[];
  enableStealth?: boolean;
}

// Crawler run configuration interface
export interface CrawlerRunConfig {
  cacheMode?: 'enabled' | 'bypass' | 'only';
  streamEnabled?: boolean; // legacy flag kept for backward compat
  stream?: boolean; // aligns with Crawl4AI docs
  pageTimeout?: number;
  jsCode?: string | string[];
  jsOnly?: boolean;
  cssSelector?: string;
  excludedTags?: string[];
  excludeExternalLinks?: boolean;
  checkRobotsTxt?: boolean;
  wordCountThreshold?: number;
  sessionId?: string;
  // Additional options
  viewport?: {
    width: number;
    height: number;
  };
  headless?: boolean;
  javaScriptEnabled?: boolean;
  timeout?: number;
  userAgent?: string;
  // Extraction strategy
  extractionStrategy?: any;
  // Advanced from docs
  waitFor?: string; // e.g., "css:.main-loaded" or "js:() => window.loaded === true"
  screenshot?: boolean;
  pdf?: boolean;
  captureMhtml?: boolean;
  locale?: string; // e.g., "en-US"
  timezoneId?: string; // e.g., "America/New_York"
  geolocation?: { latitude: number; longitude: number } | null;
  enableRateLimiting?: boolean;
  rateLimitConfig?: Record<string, any> | null;
  memoryThresholdPercent?: number;
  checkInterval?: number;
  maxSessionPermit?: number;
  displayMode?: 'DETAILED' | 'BRIEF' | string;
}

// Crawl result interface
export interface CrawlResult {
  url: string;
  success: boolean;
  statusCode?: number;
  title?: string;
  markdown?: string;
  html?: string;
  cleaned_html?: string;
  text?: string;
  links?: {
    internal: Link[];
    external: Link[];
  };
  media?: {
    images: Media[];
    videos: Media[];
  };
  extracted_content?: string;
  error_message?: string;
  crawl_time?: number;
  metadata?: Record<string, any>;
}

// Link interface
export interface Link {
  href: string;
  text: string;
  title?: string;
}

// Media interface
export interface Media {
  src: string;
  alt?: string;
  title?: string;
  type?: string;
}

// CSS Selector Schema Field (for Content Extractor)
export interface CssSelectorField {
  name: string;
  selector: string;
  type: 'text' | 'attribute' | 'html';
  attribute?: string;
}

// CSS Selector Schema (for Content Extractor)
export interface CssSelectorSchema {
  name: string;
  baseSelector: string;
  fields: CssSelectorField[];
}

// LLM Extraction Schema Field (for Content Extractor)
export interface LlmSchemaField {
  name: string;
  type: string;
  description?: string;
}

// LLM Extraction Schema (for Content Extractor)
export interface LlmSchema {
  title?: string;
  type: 'object';
  properties: Record<string, LlmSchemaField>;
  required?: string[];
}
