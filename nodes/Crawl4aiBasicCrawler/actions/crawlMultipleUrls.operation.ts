import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Import helpers and types
import type { Crawl4aiNodeOptions } from '../helpers/interfaces';
import {
  getCrawl4aiClient,
  createBrowserConfig,
  createCrawlerRunConfig,
  isValidUrl
} from '../helpers/utils';
import { formatCrawlResult } from '../helpers/formatters';

// --- UI Definition ---
export const description: INodeProperties[] = [
  {
    displayName: 'URLs',
    name: 'urls',
    type: 'string',
    required: true,
    default: '',
    placeholder: 'https://example.com, https://example.org',
    description: 'Comma-separated list of URLs to crawl',
    displayOptions: {
      show: {
        operation: ['crawlMultipleUrls'],
      },
    },
  },
  {
    displayName: 'Browser Options',
    name: 'browserOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        operation: ['crawlMultipleUrls'],
      },
    },
    options: [
      {
        displayName: 'Browser Type',
        name: 'browserType',
        type: 'options',
        options: [
          { name: 'Chromium', value: 'chromium' },
          { name: 'Firefox', value: 'firefox' },
          { name: 'WebKit', value: 'webkit' },
        ],
        default: 'chromium',
        description: 'Underlying engine to launch',
      },
      {
        displayName: 'Cookies (JSON)',
        name: 'cookies',
        type: 'json',
        default: '',
        description: 'Array of cookie objects: [{ name, value, domain, path }]',
      },
      {
        displayName: 'Enable JavaScript',
        name: 'javaScriptEnabled',
        type: 'boolean',
        default: true,
        description: 'Whether to enable JavaScript execution',
      },
      {
        displayName: 'Enable Stealth',
        name: 'enableStealth',
        type: 'boolean',
        default: false,
        description: 'Whether to apply stealth mode to evade basic bot detection',
      },
      {
        displayName: 'Extra Browser Args (CSV)',
        name: 'extraArgs',
        type: 'string',
        default: '',
        placeholder: '--disable-extensions, --no-sandbox',
        description: 'Comma-separated list of extra launch flags',
      },
      {
        displayName: 'Headers (JSON)',
        name: 'headers',
        type: 'json',
        default: '',
        description: 'Object of headers to set for all requests',
      },
      {
        displayName: 'Headless Mode',
        name: 'headless',
        type: 'boolean',
        default: true,
        description: 'Whether to run browser in headless mode',
      },
      {
        displayName: 'Light Mode',
        name: 'lightMode',
        type: 'boolean',
        default: false,
        description: 'Whether to turn off background features for performance',
      },
      {
        displayName: 'Proxy Password',
        name: 'proxyPassword',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        description: 'Password for proxy authentication',
      },
      {
        displayName: 'Proxy Server',
        name: 'proxyServer',
        type: 'string',
        default: '',
        placeholder: 'http://proxy.example.com:8080',
        description: 'HTTP proxy including protocol and port',
      },
      {
        displayName: 'Proxy Username',
        name: 'proxyUsername',
        type: 'string',
        default: '',
        description: 'Username for proxy authentication',
      },
      {
        displayName: 'Text Mode (Disable Images)',
        name: 'textMode',
        type: 'boolean',
        default: false,
        description: 'Whether to disable images for faster text-only crawls',
      },
      {
        displayName: 'Timeout (Ms)',
        name: 'timeout',
        type: 'number',
        default: 30000,
        description: 'Maximum time to wait for the browser to load the page',
      },
      {
        displayName: 'Use Persistent Context',
        name: 'usePersistentContext',
        type: 'boolean',
        default: false,
        description: 'Whether to persist browser state across runs (set user data dir)',
      },
      {
        displayName: 'User Agent',
        name: 'userAgent',
        type: 'string',
        default: '',
        placeholder: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
        description: 'The user agent to use (leave empty for default)',
      },
      {
        displayName: 'User-Agent Mode',
        name: 'userAgentMode',
        type: 'options',
        options: [
          { name: 'Default', value: 'default' },
          { name: 'Random', value: 'random' },
        ],
        default: 'default',
        description: 'Control user-agent selection',
      },
      {
        displayName: 'User Data Directory',
        name: 'userDataDir',
        type: 'string',
        default: '',
        description: 'Path to a directory for persistent browser context',
      },
      {
        displayName: 'Verbose Browser Logs',
        name: 'verbose',
        type: 'boolean',
        default: false,
        description: 'Whether to enable verbose logs for debugging browser',
      },
      {
        displayName: 'Viewport Height',
        name: 'viewportHeight',
        type: 'number',
        default: 800,
        description: 'The height of the browser viewport',
      },
      {
        displayName: 'Viewport Width',
        name: 'viewportWidth',
        type: 'number',
        default: 1280,
        description: 'The width of the browser viewport',
      },
    ],
  },
  {
    displayName: 'Crawler Options',
    name: 'crawlerOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        operation: ['crawlMultipleUrls'],
      },
    },
    options: [
      {
        displayName: 'Cache Mode',
        name: 'cacheMode',
        type: 'options',
        options: [
          {
            name: 'Enabled (Read/Write)',
            value: 'enabled',
            description: 'Use cache if available, save new results to cache',
          },
          {
            name: 'Bypass (Force Fresh)',
            value: 'bypass',
            description: 'Ignore cache, always fetch fresh content',
          },
          {
            name: 'Only (Read Only)',
            value: 'only',
            description: 'Only use cache, do not make new requests',
          },
        ],
        default: 'enabled',
        description: 'How to use the cache when crawling',
      },
      {
        displayName: 'Capture MHTML',
        name: 'captureMhtml',
        type: 'boolean',
        default: false,
      },
      {
        displayName: 'Check Robots.txt',
        name: 'checkRobotsTxt',
        type: 'boolean',
        default: false,
        description: 'Whether to respect robots.txt rules',
      },
      {
        displayName: 'CSS Selector',
        name: 'cssSelector',
        type: 'string',
        default: '',
        placeholder: 'article.content',
        description: 'CSS selector to focus on specific content (leave empty for full page)',
      },
      {
        displayName: 'Display Mode',
        name: 'displayMode',
        type: 'options',
        options: [
          { name: 'Detailed', value: 'DETAILED' },
          { name: 'Brief', value: 'BRIEF' },
        ],
        default: 'DETAILED',
      },
      {
        displayName: 'Enable Rate Limiting',
        name: 'enableRateLimiting',
        type: 'boolean',
        default: false,
      },
      {
        displayName: 'Exclude External Links',
        name: 'excludeExternalLinks',
        type: 'boolean',
        default: false,
        description: 'Whether to exclude external links from the result',
      },
      {
        displayName: 'Excluded Tags',
        name: 'excludedTags',
        type: 'string',
        default: '',
        placeholder: 'nav,footer,aside',
        description: 'Comma-separated list of HTML tags to exclude from processing',
      },
      {
        displayName: 'Generate PDF',
        name: 'pdf',
        type: 'boolean',
        default: false,
      },
      {
        displayName: 'JavaScript Code',
        name: 'jsCode',
        type: 'string',
        typeOptions: {
          rows: 4,
        },
        default: '',
        placeholder: 'document.querySelector("button.load-more").click();',
        description: 'JavaScript code to execute on the page after load',
      },
      {
        displayName: 'JavaScript Only Mode',
        name: 'jsOnly',
        type: 'boolean',
        default: false,
        description: 'Whether to only execute JavaScript without crawling',
      },
      {
        displayName: 'Latitude',
        name: 'latitude',
        type: 'number',
        default: 0,
        description: 'Geolocation latitude',
      },
      {
        displayName: 'Locale',
        name: 'locale',
        type: 'string',
        default: '',
        placeholder: 'en-US',
      },
      {
        displayName: 'Longitude',
        name: 'longitude',
        type: 'number',
        default: 0,
        description: 'Geolocation longitude',
      },
      {
        displayName: 'Max Retries',
        name: 'maxRetries',
        type: 'number',
        default: 3,
        description: 'Maximum number of retries for failed requests',
      },
      {
        displayName: 'Max Session Permit',
        name: 'maxSessionPermit',
        type: 'number',
        default: 20,
      },
      {
        displayName: 'Memory Threshold %',
        name: 'memoryThresholdPercent',
        type: 'number',
        default: 70,
      },
      {
        displayName: 'Page Timeout (Ms)',
        name: 'pageTimeout',
        type: 'number',
        default: 30000,
        description: 'Maximum time to wait for the page to load',
      },
      {
        displayName: 'Rate Limit Config (JSON)',
        name: 'rateLimitConfig',
        type: 'json',
        default: '',
      },
      {
        displayName: 'Request Timeout (Ms)',
        name: 'requestTimeout',
        type: 'number',
        default: 30000,
        description: 'Maximum time to wait for network requests',
      },
      {
        displayName: 'Resource Check Interval (S)',
        name: 'checkInterval',
        type: 'number',
        default: 1,
      },
      {
        displayName: 'Screenshot',
        name: 'screenshot',
        type: 'boolean',
        default: false,
      },
      {
        displayName: 'Session ID',
        name: 'sessionId',
        type: 'string',
        default: '',
        placeholder: 'my-session-ID',
        description: 'ID to maintain browser state across multiple crawls (for multi-step crawling)',
      },
      {
        displayName: 'Stream Results',
        name: 'stream',
        type: 'boolean',
        default: false,
        description: 'Whether to enable streaming where supported',
      },
      {
        displayName: 'Timezone ID',
        name: 'timezoneId',
        type: 'string',
        default: '',
        placeholder: 'America/New_York',
      },
      {
        displayName: 'Wait For (Css: or js:)',
        name: 'waitFor',
        type: 'string',
        default: '',
        placeholder: 'css:.main-loaded or js:() => window.loaded === true',
        description: 'CSS or JS condition to wait for before extraction',
      },
      {
        displayName: 'Word Count Threshold',
        name: 'wordCountThreshold',
        type: 'number',
        default: 0,
        description: 'Minimum number of words for content to be included',
      },
    ],
  },
  {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        operation: ['crawlMultipleUrls'],
      },
    },
    options: [
      {
        displayName: 'Include Media Data',
        name: 'includeMedia',
        type: 'boolean',
        default: false,
        description: 'Whether to include media data in output (images, videos)',
      },
      {
        displayName: 'Verbose Response',
        name: 'verboseResponse',
        type: 'boolean',
        default: false,
        description: 'Whether to include detailed data in output (HTML, status codes, etc.)',
      },
      {
        displayName: 'Max Concurrent Crawls',
        name: 'maxConcurrent',
        type: 'number',
        default: 5,
        description: 'Maximum number of concurrent crawls',
      },
    ],
  },
];

// --- Execution Logic ---
export async function execute(
  this: IExecuteFunctions,
  items: INodeExecutionData[],
  nodeOptions: Crawl4aiNodeOptions,
): Promise<INodeExecutionData[]> {
  const allResults: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      // Get parameters for the current item
      const urlsString = this.getNodeParameter('urls', i, '') as string;
      const browserOptions = this.getNodeParameter('browserOptions', i, {}) as IDataObject;
      const crawlerOptions = this.getNodeParameter('crawlerOptions', i, {}) as IDataObject;
      const options = this.getNodeParameter('options', i, {}) as IDataObject;

      if (!urlsString) {
        throw new NodeOperationError(this.getNode(), 'URLs cannot be empty.', { itemIndex: i });
      }

      // Parse the URLs from the comma-separated string
      const urls = urlsString
        .split(',')
        .map(url => url.trim())
        .filter(url => url);

      if (urls.length === 0) {
        throw new NodeOperationError(this.getNode(), 'No valid URLs provided.', { itemIndex: i });
      }

      // Validate URLs
      const invalidUrls = urls.filter(url => !isValidUrl(url));
      if (invalidUrls.length > 0) {
        throw new NodeOperationError(
          this.getNode(),
          `Invalid URLs: ${invalidUrls.join(', ')}`,
          { itemIndex: i }
        );
      }

      // Create browser and crawler configuration
      const browserConfig = createBrowserConfig(browserOptions);
      const crawlerConfig = createCrawlerRunConfig({
        ...crawlerOptions,
        ...browserConfig, // Include browser options in crawler config
        maxConcurrent: options.maxConcurrent ? Number(options.maxConcurrent) : 5,
      });

      // Get crawler client
      const crawler = await getCrawl4aiClient(this);

      // Run the crawl for multiple URLs
      const results = await crawler.crawlMultipleUrls(urls, crawlerConfig);

      // Process and add each result
      for (const result of results) {
        // Format result
        const formattedResult = formatCrawlResult(
          result,
          options.includeMedia as boolean,
          options.verboseResponse as boolean
        );

        // Add the result to the output array
        allResults.push({
          json: formattedResult,
          pairedItem: { item: i },
        });
      }

    } catch (error) {
      // Handle continueOnFail or re-throw
      if (this.continueOnFail()) {
        const node = this.getNode();
        const errorItemIndex = (error as any).itemIndex ?? i;
        allResults.push({
          json: items[i].json,
          error: new NodeOperationError(node, (error as Error).message, { itemIndex: errorItemIndex }),
          pairedItem: { item: i },
        });
        continue;
      }
      // If not continueOnFail, re-throw the error
      throw error;
    }
  }

  return allResults;
}
