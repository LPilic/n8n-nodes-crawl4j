// Re-export from BasicCrawler for consistency
export {
  getCrawl4aiClient,
  createBrowserConfig,
  createCrawlerRunConfig,
  safeJsonParse,
  cleanText,
  isValidUrl
} from '../../Crawl4aiBasicCrawler/helpers/utils';

import { IDataObject } from 'n8n-workflow';
import { CssSelectorSchema, LlmSchema } from './interfaces';
import { cleanText } from '../../Crawl4aiBasicCrawler/helpers/utils';

/**
 * Create a CSS selector extraction strategy
 * @param schema CSS selector schema
 * @returns Extraction strategy for CSS selectors
 */
export function createCssSelectorExtractionStrategy(schema: CssSelectorSchema): any {
  return {
    type: 'JsonCssExtractionStrategy',
    params: {
      schema: {
        type: 'dict',
        value: {
          name: schema.name,
          baseSelector: schema.baseSelector,
          fields: schema.fields.map(field => ({
            name: field.name,
            selector: field.selector,
            type: field.type,
            attribute: field.attribute,
          })),
        },
      },
    },
  };
}

/**
 * Create an LLM extraction strategy
 * @param schema LLM extraction schema
 * @param instruction Instructions for LLM extraction
 * @param provider LLM provider name
 * @param apiKey API key for LLM provider
 * @param extraArgs Additional LLM parameters (temperature, max_tokens, etc.)
 * @returns Extraction strategy for LLM
 */
export function createLlmExtractionStrategy(
  schema: LlmSchema,
  instruction: string,
  provider: string,
  apiKey?: string,
  extraArgs?: any,
  ollamaUrl?: string,
  model?: string,
): any {
  // Build LLM config parameters
  const llmParams: any = {};

  // Handle authentication based on provider type
  if (provider === 'ollama') {
    // For Ollama, use ollama/model format
    const fullProvider = model ? `ollama/${model}` : 'ollama/gemma3:1b';
    llmParams.provider = fullProvider;

    // Use the Ollama URL as base_url (only this parameter)
    if (ollamaUrl) {
      console.log('Setting Ollama base_url:', ollamaUrl);
      console.log('Full LLM params for Ollama:', JSON.stringify(llmParams, null, 2));
      llmParams.base_url = ollamaUrl;
    } else {
      console.warn('Ollama provider specified but no ollamaUrl provided');
    }
  } else {
    // For other providers, use provider/model format
    const fullProvider = model ? `${provider}/${model}` : provider;
    llmParams.provider = fullProvider || 'openai/gpt-4o';

    // Only set API key if provided (let Crawl4AI use .env for OpenAI)
    if (apiKey && apiKey !== 'none' && apiKey.trim() !== '') {
      llmParams.api_token = apiKey;
    }

    // Note: SSL verification issues with Groq may need to be resolved at the environment level
    // or by using alternative providers like Ollama
  }

  // Add extra parameters if provided
  if (extraArgs) {
    if (extraArgs.temperature !== undefined) {
      llmParams.temperature = extraArgs.temperature;
    }
    if (extraArgs.max_tokens !== undefined) {
      llmParams.max_tokens = extraArgs.max_tokens;
    }
    if (extraArgs.top_p !== undefined) {
      llmParams.top_p = extraArgs.top_p;
    }
    if (extraArgs.frequency_penalty !== undefined) {
      llmParams.frequency_penalty = extraArgs.frequency_penalty;
    }
    if (extraArgs.presence_penalty !== undefined) {
      llmParams.presence_penalty = extraArgs.presence_penalty;
    }
  }

  const extractionStrategy = {
    type: 'LLMExtractionStrategy',
    params: {
      llm_config: {
        type: 'LLMConfig',
        params: llmParams,
      },
      instruction,
      schema: {
        type: 'dict',
        value: schema,
      },
      extraction_type: 'schema',
      apply_chunking: false,
      force_json_response: true,
    },
  };

  console.log('Final extraction strategy:', JSON.stringify(extractionStrategy, null, 2));
  return extractionStrategy;
}

/**
 * Clean extracted data by removing extra whitespace
 */
export function cleanExtractedData(data: IDataObject): IDataObject {
  if (!data) return {};

  const cleanedData: IDataObject = {};

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string') {
      cleanedData[key] = cleanText(value);
    } else if (Array.isArray(value)) {
      cleanedData[key] = value.map(item => {
        if (typeof item === 'string') {
          return cleanText(item);
        } else if (typeof item === 'object' && item !== null) {
          return cleanExtractedData(item as IDataObject);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      cleanedData[key] = cleanExtractedData(value as IDataObject);
    } else {
      cleanedData[key] = value;
    }
  });

  return cleanedData;
}
