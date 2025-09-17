import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Import helpers and types
import type { Crawl4aiNodeOptions, Crawl4aiApiCredentials, LlmSchema, LlmSchemaField } from '../helpers/interfaces';
import {
	getCrawl4aiClient,
	createBrowserConfig,
	createLlmExtractionStrategy,
	isValidUrl
} from '../helpers/utils';
import { parseExtractedJson, formatExtractionResult } from '../../Crawl4aiBasicCrawler/helpers/formatters';

// --- UI Definition ---
export const description: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com',
		description: 'The URL to extract content from',
		displayOptions: {
			show: {
				operation: ['llmExtractor'],
			},
		},
	},
	{
		displayName: 'Extraction Instructions',
		name: 'instruction',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		placeholder: 'Extract all job listings with their titles, locations, and URLs from this page.',
		description: 'Instructions for the LLM on what to extract from the page. For multiple items, specify that you want ALL items found.',
		displayOptions: {
			show: {
				operation: ['llmExtractor'],
			},
		},
	},
	{
		displayName: 'Schema Type',
		name: 'schemaType',
		type: 'options',
		options: [
			{
				name: 'From Attribute Descriptions',
				value: 'attributeDescriptions',
				description: 'Extract specific attributes from the text based on types and descriptions',
			},
			{
				name: 'Generate From JSON Example',
				value: 'jsonExample',
				description: 'Generate a schema from an example JSON object',
			},
			{
				name: 'Define using JSON Schema',
				value: 'jsonSchema',
				description: 'Define the JSON schema manually',
			},
		],
		default: 'attributeDescriptions',
		required: true,
		description: 'Choose how to define the extraction schema',
		displayOptions: {
			show: {
				operation: ['llmExtractor'],
			},
		},
	},
	{
		displayName: 'Schema Fields',
		name: 'schemaFields',
		placeholder: 'Add Schema Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		required: true,
		displayOptions: {
			show: {
				operation: ['llmExtractor'],
				schemaType: ['attributeDescriptions'],
			},
		},
		options: [
			{
				name: 'fieldsValues',
				displayName: 'Fields',
				values: [
					{
						displayName: 'Field Name',
						name: 'name',
						type: 'string',
						required: true,
						default: '',
						placeholder: 'title',
						description: 'Name of the field to extract',
					},
					{
						displayName: 'Field Type',
						name: 'fieldType',
						type: 'options',
						options: [
							{
								name: 'String',
								value: 'string',
								description: 'Plain text string',
							},
							{
								name: 'Number',
								value: 'number',
								description: 'Numeric value',
							},
							{
								name: 'Boolean',
								value: 'boolean',
								description: 'True/false value',
							},
							{
								name: 'Array',
								value: 'array',
								description: 'Array of values',
							},
						],
						default: 'string',
						description: 'Type of the field',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						placeholder: 'The main title of the product',
						description: 'Description of the field to help the LLM understand what to extract',
					},
					{
						displayName: 'Required',
						name: 'required',
						type: 'boolean',
						default: true,
						description: 'Whether this field is required',
					},
				],
			},
		],
	},
	{
		displayName: 'JSON Example',
		name: 'jsonExample',
		type: 'string',
		typeOptions: {
			rows: 8,
		},
		required: true,
		default: '',
		placeholder: '{\n  "JobInfo": {\n    "jobCount": {\n      "hasJobs": "true",\n      "total": 0,\n      "unique": 0,\n      "duplicate": 0,\n      "timestamp": "{{ $now }}"\n    },\n    "countries": [\n      {\n        "country": "Germany",\n        "countryCode": "DE",\n        "countryJobCount": 0\n      }\n    ]\n  },\n  "jobs": [\n    {\n      "title": "Retail Sales Associate",\n      "location": "Berlin",\n      "country": "Germany",\n      "category": "Retail",\n      "type": "Apprenticeship",\n      "duplicate": "true"\n    }\n  ]\n}',
		description: 'Example JSON object that defines the structure you want to extract. The LLM will generate a schema from this example.',
		displayOptions: {
			show: {
				operation: ['llmExtractor'],
				schemaType: ['jsonExample'],
			},
		},
	},
	{
		displayName: 'JSON Schema',
		name: 'jsonSchema',
		type: 'string',
		typeOptions: {
			rows: 8,
		},
		required: true,
		default: '',
		placeholder: '{\n  "type": "object",\n  "properties": {\n    "title": {\n      "type": "string",\n      "description": "The job title"\n    },\n    "location": {\n      "type": "string",\n      "description": "The job location"\n    },\n    "salary": {\n      "type": "number",\n      "description": "The salary amount"\n    }\n  },\n  "required": ["title", "location"]\n}',
		description: 'JSON Schema definition that specifies the exact structure and validation rules for the extracted data.',
		displayOptions: {
			show: {
				operation: ['llmExtractor'],
				schemaType: ['jsonSchema'],
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
				operation: ['llmExtractor'],
			},
		},
		options: [
			{
				displayName: 'Enable JavaScript',
				name: 'javaScriptEnabled',
				type: 'boolean',
				default: true,
				description: 'Whether to enable JavaScript execution',
			},
			{
				displayName: 'Headless Mode',
				name: 'headless',
				type: 'boolean',
				default: true,
				description: 'Whether to run browser in headless mode',
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
				description: 'JavaScript code to execute before extraction (e.g., to click buttons, scroll)',
			},
			{
				displayName: 'Timeout (MS)',
				name: 'timeout',
				type: 'number',
				default: 180000, // 3 minutes timeout for LLM extraction
				description: 'Maximum time to wait for the browser to load the page',
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
		displayName: 'LLM Options',
		name: 'llmOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['llmExtractor'],
			},
		},
		options: [
			{
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				type: 'number',
				typeOptions: {
					minValue: -2,
					maxValue: 2,
					numberPrecision: 1,
				},
				default: 0,
				description: 'Penalizes new tokens based on frequency in the text so far',
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				default: 2000,
				description: 'Maximum number of tokens for the LLM response',
			},
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'string',
				default: '',
				placeholder: 'gpt-4o-mini, claude-3-sonnet-20240229, llama3.1:8b',
				description: 'The model to use for extraction. Leave empty to use default model for the provider configured in credentials. Examples: gpt-4o-mini, claude-3-sonnet-20240229, llama3.1:8b',
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				type: 'number',
				typeOptions: {
					minValue: -2,
					maxValue: 2,
					numberPrecision: 1,
				},
				default: 0,
				description: 'Penalizes new tokens based on whether they appear in the text so far',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 1,
				},
				default: 0,
				description: 'Controls randomness: 0 for deterministic results, higher for more creativity',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
				default: 1,
				description: 'Controls diversity via nucleus sampling: 0.1 means only top 10% probability mass',
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
				operation: ['llmExtractor'],
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
				displayName: 'Extract Multiple Items',
				name: 'extractMultiple',
				type: 'boolean',
				default: true,
				description: 'Whether to extract multiple items (e.g., job listings, product cards) or just a single item',
			},
			{
				displayName: 'Include Original Text',
				name: 'includeFullText',
				type: 'boolean',
				default: false,
				description: 'Whether to include the original webpage text in output',
			},
			{
				displayName: 'CSS Selector',
				name: 'cssSelector',
				type: 'string',
				default: '',
				placeholder: 'article.content',
				description: 'CSS selector to focus extraction on a specific part of the page (leave empty for full page)',
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

	// Get credentials
	const credentials = (await this.getCredentials('crawl4aiApi')) as unknown as Crawl4aiApiCredentials;

	// Check if LLM features are enabled in credentials
	if (!credentials.enableLlm) {
		throw new NodeOperationError(
			this.getNode(),
			'LLM features are not enabled in Crawl4AI credentials. Please enable them and configure an LLM provider.'
		);
	}

	for (let i = 0; i < items.length; i++) {
		try {
			// Get parameters for the current item
			const url = this.getNodeParameter('url', i, '') as string;
			const instruction = this.getNodeParameter('instruction', i, '') as string;
			const schemaType = this.getNodeParameter('schemaType', i, 'attributeDescriptions') as string;
			const schemaFieldsValues = this.getNodeParameter('schemaFields.fieldsValues', i, []) as IDataObject[];
			const jsonExample = this.getNodeParameter('jsonExample', i, '') as string;
			const jsonSchema = this.getNodeParameter('jsonSchema', i, '') as string;
			const browserOptions = this.getNodeParameter('browserOptions', i, {}) as IDataObject;
			const llmOptions = this.getNodeParameter('llmOptions', i, {}) as IDataObject;
			const options = this.getNodeParameter('options', i, {}) as IDataObject;

			if (!url) {
				throw new NodeOperationError(this.getNode(), 'URL cannot be empty.');
			}

			if (!isValidUrl(url)) {
				throw new NodeOperationError(this.getNode(), `Invalid URL: ${url}`);
			}

			if (!instruction) {
				throw new NodeOperationError(this.getNode(), 'Extraction instructions cannot be empty.');
			}

			// Validate schema based on type
			if (schemaType === 'attributeDescriptions') {
				if (!schemaFieldsValues || schemaFieldsValues.length === 0) {
					throw new NodeOperationError(this.getNode(), 'At least one schema field must be defined when using "From Attribute Descriptions".');
				}
			} else if (schemaType === 'jsonExample') {
				if (!jsonExample || jsonExample.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'JSON Example cannot be empty when using "Generate From JSON Example".');
				}
			} else if (schemaType === 'jsonSchema') {
				if (!jsonSchema || jsonSchema.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'JSON Schema cannot be empty when using "Define using JSON Schema".');
				}
			}

			// Validate model selection
			const selectedModel = llmOptions.model as string;
			if (selectedModel && !credentials.enableLlm) {
				throw new NodeOperationError(this.getNode(), 'LLM features must be enabled in credentials to use custom model.');
			}

			// Create schema based on schema type
			const extractMultiple = options.extractMultiple !== false; // Default to true
			let schema: LlmSchema;

			if (schemaType === 'attributeDescriptions') {
				// Prepare LLM schema from attribute descriptions
				const schemaProperties: Record<string, LlmSchemaField> = {};
				const requiredFields: string[] = [];

				schemaFieldsValues.forEach(field => {
					const fieldName = field.name as string;
					schemaProperties[fieldName] = {
						name: fieldName,
						type: field.fieldType as string,
						description: field.description as string || undefined,
					};

					if (field.required === true) {
						requiredFields.push(fieldName);
					}
				});

				if (extractMultiple) {
					// Schema for multiple items (array)
					schema = {
						title: 'ExtractedItems',
						type: 'object',
						properties: {
							items: {
								name: 'items',
								type: 'array',
								description: 'Array of extracted items',
							},
						},
						required: ['items'],
					};
				} else {
					// Schema for single item
					schema = {
						title: 'ExtractedData',
						type: 'object',
						properties: schemaProperties,
						required: requiredFields.length > 0 ? requiredFields : undefined,
					};
				}
			} else if (schemaType === 'jsonExample') {
				// For JSON example, we'll use a simplified schema and let the LLM handle the structure
				// This is more flexible than trying to parse the example into a strict schema
				if (extractMultiple) {
					schema = {
						title: 'ExtractedItems',
						type: 'object',
						properties: {
							items: {
								name: 'items',
								type: 'array',
								description: 'Array of extracted items matching the example structure',
							},
						},
						required: ['items'],
					};
				} else {
					schema = {
						title: 'ExtractedData',
						type: 'object',
						properties: {
							data: {
								name: 'data',
								type: 'object',
								description: 'Extracted data matching the example structure',
							},
						},
						required: ['data'],
					};
				}
			} else if (schemaType === 'jsonSchema') {
				// For JSON schema, we need to validate it's a proper schema
				try {
					const parsedSchema = JSON.parse(jsonSchema);
					// Basic validation - ensure it has required properties
					if (!parsedSchema.type || !parsedSchema.properties) {
						throw new Error('JSON Schema must have "type" and "properties" fields');
					}
					schema = parsedSchema as LlmSchema;
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `Invalid JSON Schema: ${(error as Error).message}`);
				}
			} else {
				throw new NodeOperationError(this.getNode(), `Unknown schema type: ${schemaType}`);
			}

			// Determine LLM provider and model from credentials
			let provider = credentials.llmProvider || 'openai';
			let model = (llmOptions.model as string || 'gpt-4o').trim(); // Trim any whitespace
			let apiKey = credentials.apiKey;
			let ollamaUrl = credentials.ollamaUrl;

			// Ensure Ollama URL has proper protocol
			if (provider === 'ollama' && ollamaUrl) {
				ollamaUrl = ollamaUrl.trim();
				if (!ollamaUrl.startsWith('http://') && !ollamaUrl.startsWith('https://')) {
					ollamaUrl = `http://${ollamaUrl}`;
				}
			}

			// Format provider/model for Crawl4AI based on provider type
			let fullModelName: string;
			if (provider === 'ollama') {
				// For Ollama, try just the model name first
				fullModelName = model;
			} else {
				// For other providers, use provider/model format
				fullModelName = `${provider}/${model}`;
			}

			// Create browser config
			const browserConfig = createBrowserConfig(browserOptions);

			// Prepare extra arguments for LLM
			const extraArgs: any = {};
			if (llmOptions.temperature !== undefined) {
				extraArgs.temperature = llmOptions.temperature;
			}
			if (llmOptions.maxTokens !== undefined) {
				extraArgs.max_tokens = llmOptions.maxTokens;
			}
			if (llmOptions.topP !== undefined) {
				extraArgs.top_p = llmOptions.topP;
			}
			if (llmOptions.frequencyPenalty !== undefined) {
				extraArgs.frequency_penalty = llmOptions.frequencyPenalty;
			}
			if (llmOptions.presencePenalty !== undefined) {
				extraArgs.presence_penalty = llmOptions.presencePenalty;
			}

			// Enhance instruction based on schema type
			let enhancedInstruction = instruction;
			
			if (schemaType === 'attributeDescriptions') {
				if (extractMultiple) {
					enhancedInstruction = `${instruction}\n\nPlease extract ALL items found on the page. Return them as an array of objects, where each object contains the fields: ${schemaFieldsValues.map(f => f.name).join(', ')}. If no items are found, return an empty array.`;
				}
			} else if (schemaType === 'jsonExample') {
				if (extractMultiple) {
					enhancedInstruction = `${instruction}\n\nPlease extract ALL items found on the page and return them in the same structure as the provided JSON example. If no items are found, return an empty array or empty object as appropriate.`;
				} else {
					enhancedInstruction = `${instruction}\n\nPlease extract the data and return it in the same structure as the provided JSON example.`;
				}
			} else if (schemaType === 'jsonSchema') {
				if (extractMultiple) {
					enhancedInstruction = `${instruction}\n\nPlease extract ALL items found on the page and return them according to the provided JSON schema. If no items are found, return an empty array or empty object as appropriate.`;
				} else {
					enhancedInstruction = `${instruction}\n\nPlease extract the data and return it according to the provided JSON schema.`;
				}
			}

			// Create LLM extraction strategy with extra arguments
			console.log('Creating LLM extraction strategy with:', {
				provider: provider,
				model: model,
				fullModelName: fullModelName,
				ollamaUrl: ollamaUrl,
				apiKey: apiKey ? '***' : 'none'
			});

			const extractionStrategy = createLlmExtractionStrategy(
				schema,
				enhancedInstruction,
				provider,
				apiKey,
				extraArgs,
				ollamaUrl,
				model
			);

			// Get crawler instance
			const crawler = await getCrawl4aiClient(this);

			// Run the extraction
			const result = await crawler.arun(url, {
				browserConfig,
				extractionStrategy,
				cacheMode: options.cacheMode || 'enabled',
				jsCode: browserOptions.jsCode,
				cssSelector: options.cssSelector,
			});

			// Parse extracted JSON
			const extractedData = parseExtractedJson(result);

			// Process the result based on extraction type
			if (extractMultiple && extractedData && extractedData.items && Array.isArray(extractedData.items)) {
				// Multiple items: create separate result for each item
				const items = extractedData.items as any[];
				items.forEach((item, index) => {
					const formattedResult = formatExtractionResult(
						result,
						item,
						options.includeFullText as boolean
					);

					// Add item index to distinguish multiple items
					formattedResult.itemIndex = index;
					formattedResult.totalItems = items.length;

					allResults.push({
						json: formattedResult,
						pairedItem: { item: i },
					});
				});
			} else {
				// Single item or fallback
				const formattedResult = formatExtractionResult(
					result,
					extractedData,
					options.includeFullText as boolean
				);

				allResults.push({
					json: formattedResult,
					pairedItem: { item: i },
				});
			}

		} catch (error) {
			// Handle continueOnFail or re-throw
			if (this.continueOnFail()) {
				const node = this.getNode();
				allResults.push({
					json: items[i].json,
					error: new NodeOperationError(node, (error as Error).message),
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
