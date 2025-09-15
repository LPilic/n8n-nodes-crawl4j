import axios from 'axios';

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export interface ModelFetcherResult {
  models: ModelInfo[];
  error?: string;
}

/**
 * Fetch available models from OpenAI
 */
export async function fetchOpenAIModels(apiKey: string): Promise<ModelFetcherResult> {
  try {
    const client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const response = await client.get('/models');
    const models: ModelInfo[] = response.data.data
      .filter((model: any) => model.id.includes('gpt'))
      .map((model: any) => ({
        id: model.id,
        name: model.id.replace('gpt-', 'GPT-').replace(/-/g, ' '),
        description: `Context length: ${model.context_length || 'Unknown'}`,
        context_length: model.context_length,
      }))
      .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));

    return { models };
  } catch (error: any) {
    return {
      models: [],
      error: `Failed to fetch OpenAI models: ${error.response?.data?.error?.message || error.message}`,
    };
  }
}

/**
 * Fetch available models from Groq
 */
export async function fetchGroqModels(apiKey: string): Promise<ModelFetcherResult> {
  try {
    const client = axios.create({
      baseURL: 'https://api.groq.com/openai/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const response = await client.get('/models');
    const models: ModelInfo[] = response.data.data
      .map((model: any) => ({
        id: model.id,
        name: model.id.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        description: `Context length: ${model.context_length || 'Unknown'}`,
        context_length: model.context_length,
      }))
      .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));

    return { models };
  } catch (error: any) {
    return {
      models: [],
      error: `Failed to fetch Groq models: ${error.response?.data?.error?.message || error.message}`,
    };
  }
}

/**
 * Fetch available models from Ollama (local)
 */
export async function fetchOllamaModels(ollamaUrl: string = 'http://localhost:11434'): Promise<ModelFetcherResult> {
  try {
    const client = axios.create({
      baseURL: ollamaUrl,
      timeout: 10000,
    });

    const response = await client.get('/api/tags');
    const models: ModelInfo[] = response.data.models
      .map((model: any) => ({
        id: model.name,
        name: model.name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        description: `Size: ${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB`,
      }))
      .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));

    return { models };
  } catch (error: any) {
    return {
      models: [],
      error: `Failed to fetch Ollama models: ${error.message}`,
    };
  }
}

/**
 * Fetch available models from Anthropic
 */
export async function fetchAnthropicModels(apiKey: string): Promise<ModelFetcherResult> {
  try {
    // Anthropic doesn't have a public models endpoint, so we return known models
    const models: ModelInfo[] = [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Most capable model for complex tasks',
        context_length: 200000,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        description: 'Fast and efficient for simple tasks',
        context_length: 200000,
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most powerful model for complex reasoning',
        context_length: 200000,
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and speed',
        context_length: 200000,
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fast and cost-effective',
        context_length: 200000,
      },
    ];

    return { models };
  } catch (error: any) {
    return {
      models: [],
      error: `Failed to fetch Anthropic models: ${error.message}`,
    };
  }
}

/**
 * Get models for a specific provider
 */
export async function getModelsForProvider(
  provider: string,
  apiKey?: string,
  ollamaUrl?: string
): Promise<ModelFetcherResult> {
  switch (provider) {
    case 'openai':
      if (!apiKey) {
        return { models: [], error: 'OpenAI API key is required' };
      }
      return await fetchOpenAIModels(apiKey);

    case 'groq':
      if (!apiKey) {
        return { models: [], error: 'Groq API key is required' };
      }
      return await fetchGroqModels(apiKey);

    case 'ollama':
      return await fetchOllamaModels(ollamaUrl);

    case 'anthropic':
      if (!apiKey) {
        return { models: [], error: 'Anthropic API key is required' };
      }
      return await fetchAnthropicModels(apiKey);

    default:
      return { models: [], error: `Unknown provider: ${provider}` };
  }
}

/**
 * Get default models for a provider (fallback when API is unavailable)
 */
export function getDefaultModelsForProvider(provider: string): ModelInfo[] {
  switch (provider) {
    case 'openai':
      return [
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Faster and cheaper' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient' },
      ];

    case 'groq':
      return [
        { id: 'llama3-70b-8192', name: 'Llama 3 70B', description: 'Most capable' },
        { id: 'llama3-8b-8192', name: 'Llama 3 8B', description: 'Fast and efficient' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'High performance' },
        { id: 'gemma-7b-it', name: 'Gemma 7B', description: 'Lightweight' },
      ];

    case 'ollama':
      return [
        { id: 'llama3', name: 'Llama 3', description: 'Meta Llama 3' },
        { id: 'llama3.1', name: 'Llama 3.1', description: 'Meta Llama 3.1' },
        { id: 'mistral', name: 'Mistral', description: 'Mistral AI' },
        { id: 'codellama', name: 'Code Llama', description: 'Code generation' },
      ];

    case 'anthropic':
      return [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most capable' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and efficient' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced' },
      ];

    default:
      return [];
  }
}
