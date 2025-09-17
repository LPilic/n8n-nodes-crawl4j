import { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { Crawl4aiApiCredentials, BrowserConfig, CrawlerRunConfig } from './interfaces';
import { createCrawlerInstance } from './apiClient';

/**
 * Get Crawl4AI client instance from context
 */
export async function getCrawl4aiClient(
  executeFunctions: IExecuteFunctions,
): Promise<any> {
  // Get credentials
  const credentials = await executeFunctions.getCredentials('crawl4aiApi') as unknown as Crawl4aiApiCredentials;

  if (!credentials) {
    throw new Error('Crawl4AI credentials are not configured!');
  }

  // Create and return client instance
  return createCrawlerInstance(credentials);
}

/**
 * Convert n8n options to Crawl4AI browser configuration
 * @param options Node options from n8n
 * @returns Browser configuration for Crawl4AI
 */
export function createBrowserConfig(options: IDataObject): BrowserConfig {
  return {
    browserType: options.browserType as any,
    headless: options.headless !== false,
    javaScriptEnabled: options.javaScriptEnabled !== false,
    viewport: {
      width: options.viewportWidth ? Number(options.viewportWidth) : 1280,
      height: options.viewportHeight ? Number(options.viewportHeight) : 800,
    },
    userAgent: options.userAgent ? String(options.userAgent) : undefined,
    proxyConfig: options.proxyServer ? {
      server: String(options.proxyServer),
      username: options.proxyUsername ? String(options.proxyUsername) : undefined,
      password: options.proxyPassword ? String(options.proxyPassword) : undefined,
    } : null,
    headers: (() => {
      if (!options.headers) return undefined;
      if (typeof options.headers === 'string') return safeJsonParse(String(options.headers), undefined);
      if (typeof options.headers === 'object') return options.headers as Record<string, string>;
      return undefined;
    })(),
    cookies: (() => {
      if (!options.cookies) return undefined;
      if (typeof options.cookies === 'string') return safeJsonParse(String(options.cookies), undefined);
      if (Array.isArray(options.cookies)) return options.cookies as any;
      return undefined;
    })(),
    userAgentMode: options.userAgentMode as any,
    verbose: options.verbose === true,
    usePersistentContext: options.usePersistentContext === true,
    userDataDir: options.userDataDir ? String(options.userDataDir) : undefined,
    textMode: options.textMode === true,
    lightMode: options.lightMode === true,
    extraArgs: (() => {
      if (!options.extraArgs) return undefined;
      if (Array.isArray(options.extraArgs)) return (options.extraArgs as any[]).map(String);
      if (typeof options.extraArgs === 'string') return String(options.extraArgs).split(',').map(s => s.trim()).filter(Boolean);
      return undefined;
    })(),
    enableStealth: options.enableStealth === true,
  };
}

/**
 * Convert n8n options to Crawl4AI crawler run configuration
 * @param options Node options from n8n
 * @returns Crawler run configuration for Crawl4AI
 */
export function createCrawlerRunConfig(options: IDataObject): CrawlerRunConfig {
  // Process excluded tags (convert string to array)
  let excludedTags: string[] = [];
  if (options.excludedTags) {
    if (typeof options.excludedTags === 'string') {
      excludedTags = (options.excludedTags as string)
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
    } else if (Array.isArray(options.excludedTags)) {
      excludedTags = options.excludedTags as string[];
    }
  }

  return {
    cacheMode: options.cacheMode as 'enabled' | 'bypass' | 'only' || 'enabled',
    streamEnabled: options.streamEnabled === true,
    stream: options.stream === true || options.streamEnabled === true,
    pageTimeout: options.pageTimeout ? Number(options.pageTimeout) : 30000,
    jsCode: options.jsCode ? String(options.jsCode) : undefined,
    jsOnly: options.jsOnly === true,
    cssSelector: options.cssSelector ? String(options.cssSelector) : undefined,
    excludedTags,
    excludeExternalLinks: options.excludeExternalLinks === true,
    checkRobotsTxt: options.checkRobotsTxt === true,
    wordCountThreshold: options.wordCountThreshold ? Number(options.wordCountThreshold) : 0,
    sessionId: options.sessionId ? String(options.sessionId) : undefined,
    // Advanced
    waitFor: options.waitFor ? String(options.waitFor) : undefined,
    screenshot: options.screenshot === true,
    pdf: options.pdf === true,
    captureMhtml: options.captureMhtml === true,
    locale: options.locale ? String(options.locale) : undefined,
    timezoneId: options.timezoneId ? String(options.timezoneId) : undefined,
    geolocation: (() => {
      // accept either an object or separate latitude/longitude numeric fields
      if (options.geolocation && typeof options.geolocation === 'object') return options.geolocation as any;
      const lat = options.latitude !== undefined ? Number(options.latitude) : undefined;
      const lon = options.longitude !== undefined ? Number(options.longitude) : undefined;
      if (lat !== undefined && lon !== undefined && !Number.isNaN(lat) && !Number.isNaN(lon)) return { latitude: lat, longitude: lon };
      return undefined;
    })(),
    enableRateLimiting: options.enableRateLimiting === true,
    rateLimitConfig: (() => {
      if (!options.rateLimitConfig) return undefined;
      if (typeof options.rateLimitConfig === 'string') return safeJsonParse(String(options.rateLimitConfig), undefined);
      if (typeof options.rateLimitConfig === 'object') return options.rateLimitConfig as Record<string, any>;
      return undefined;
    })(),
    memoryThresholdPercent: options.memoryThresholdPercent ? Number(options.memoryThresholdPercent) : undefined,
    checkInterval: options.checkInterval ? Number(options.checkInterval) : undefined,
    maxSessionPermit: options.maxSessionPermit ? Number(options.maxSessionPermit) : undefined,
    displayMode: options.displayMode ? String(options.displayMode) : undefined,
  };
}

/**
 * Safely parse JSON
 */
export function safeJsonParse(jsonString: string, defaultValue: any = null): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Clean text by removing extra whitespace and normalizing
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}
