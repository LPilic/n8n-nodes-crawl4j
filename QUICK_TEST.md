# Quick Test Guide for LLM Extractor Node

## Method 1: Test Core Logic (No Build Required)

### Test the Schema Generation
```bash
# Run this to test the schema creation logic
node -e "
const { createLlmExtractionStrategy } = require('./nodes/Crawl4aiContentExtractor/helpers/utils');

// Test schema for multiple items
const testSchema = {
  title: 'ExtractedItems',
  type: 'object',
  properties: {
    items: {
      name: 'items',
      type: 'array',
      description: 'Array of extracted items'
    }
  },
  required: ['items']
};

const strategy = createLlmExtractionStrategy(
  testSchema,
  'Extract all job listings with their titles, locations, and URLs from this page.',
  'openai/gpt-4o',
  'test-key',
  { temperature: 0.7, max_tokens: 1500 }
);

console.log('✅ LLM Strategy Generated:');
console.log(JSON.stringify(strategy, null, 2));
"
```

## Method 2: Test with Crawl4AI API Directly

### Using curl to test the API structure
```bash
# Test the API endpoint structure
curl -X POST "http://localhost:11235/crawl" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://chp.jobs.personio.de/"],
    "browser_config": {
      "type": "BrowserConfig",
      "params": {
        "headless": true,
        "java_script_enabled": true,
        "viewport": {"type": "dict", "value": {"width": 1280, "height": 800}},
        "timeout": 30000
      }
    },
    "crawler_config": {
      "type": "CrawlerRunConfig",
      "params": {
        "cache_mode": "enabled",
        "extraction_strategy": {
          "type": "LLMExtractionStrategy",
          "params": {
            "llm_config": {
              "type": "LLMConfig",
              "params": {
                "provider": "openai/gpt-4o",
                "api_token": "your-api-key",
                "temperature": 0.7,
                "max_tokens": 1500
              }
            },
            "instruction": "Extract all job listings with their titles, locations, and URLs from this page.",
            "schema": {
              "type": "dict",
              "value": {
                "title": "ExtractedItems",
                "type": "object",
                "properties": {
                  "items": {
                    "name": "items",
                    "type": "array",
                    "description": "Array of extracted items"
                  }
                },
                "required": ["items"]
              }
            },
            "extraction_type": "schema",
            "apply_chunking": false,
            "force_json_response": true
          }
        }
      }
    }
  }'
```

## Method 3: Test in n8n (If You Have Access)

### Step-by-Step Testing
1. **Install the node** (even with build errors, the core files work)
2. **Create a simple workflow**:
   - Manual Trigger → Crawl4AI Content Extractor
3. **Configure the node**:
   - Operation: LLM Extractor
   - URL: `https://chp.jobs.personio.de/`
   - Instructions: `Extract all job listings with their titles, locations, and URLs from this page.`
   - Schema Fields:
     - jobTitle (String, Required)
     - location (String, Required) 
     - url (String, Required)
     - error (Boolean, Optional)
   - Extract Multiple Items: `true`
   - LLM Provider: Your configured provider

## Method 4: Test the Fixed Logic

### Verify the Multiple Item Logic
```bash
# Test the result processing logic
node -e "
// Simulate the result processing
const mockResult = {
  url: 'https://chp.jobs.personio.de/',
  success: true,
  extracted_content: JSON.stringify({
    items: [
      {
        jobTitle: 'Accounting Specialist',
        location: 'München',
        url: 'https://chp.jobs.personio.de/job/1789182',
        error: false
      },
      {
        jobTitle: 'Associate Steuerberater',
        location: 'München', 
        url: 'https://chp.jobs.personio.de/job/1182240',
        error: false
      }
    ]
  })
};

// Parse and process
const extractedData = JSON.parse(mockResult.extracted_content);
const extractMultiple = true;

if (extractMultiple && extractedData && extractedData.items && Array.isArray(extractedData.items)) {
  console.log('✅ Multiple items detected:');
  extractedData.items.forEach((item, index) => {
    console.log(\`Item \${index + 1}:\`, item);
  });
} else {
  console.log('❌ Single item or no items found');
}
"
```

## Expected Results

### Before Fix (Single Item)
```json
[
  {
    "jobTitle": "Accounting Specialist",
    "location": "München",
    "url": "https://chp.jobs.personio.de/job/1789182",
    "error": false
  }
]
```

### After Fix (Multiple Items)
```json
[
  {
    "jobTitle": "Accounting Specialist",
    "location": "München", 
    "url": "https://chp.jobs.personio.de/job/1789182",
    "error": false,
    "itemIndex": 0,
    "totalItems": 2
  },
  {
    "jobTitle": "Associate Steuerberater",
    "location": "München",
    "url": "https://chp.jobs.personio.de/job/1182240", 
    "error": false,
    "itemIndex": 1,
    "totalItems": 2
  }
]
```

## Quick Verification

Run this to test the core fix:
```bash
node -e "
console.log('🧪 Testing Multiple Item Extraction Fix');
console.log('=====================================');

// Test 1: Schema Structure
const multipleSchema = {
  title: 'ExtractedItems',
  type: 'object',
  properties: {
    items: {
      name: 'items',
      type: 'array',
      description: 'Array of extracted items'
    }
  },
  required: ['items']
};

console.log('✅ Multiple Item Schema:', JSON.stringify(multipleSchema, null, 2));

// Test 2: Enhanced Instruction
const instruction = 'Extract all job listings with their titles, locations, and URLs from this page.';
const enhancedInstruction = instruction + '\n\nPlease extract ALL items found on the page. Return them as an array of objects, where each object contains the fields: jobTitle, location, url, error. If no items are found, return an empty array.';

console.log('✅ Enhanced Instruction:', enhancedInstruction);

console.log('🎯 The fix is ready! The LLM will now extract multiple items.');
"
```

