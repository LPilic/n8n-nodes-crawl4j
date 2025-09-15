# Testing Crawl4AI LLM Extractor Node in n8n

## 🔗 Using pnpm link (Development Mode)

### Step 1: Link the Package (Already Done ✅)
```bash
pnpm link --global
```

### Step 2: Link in Your n8n Installation
```bash
# Navigate to your n8n installation directory
cd /path/to/your/n8n/installation

# Link the package
pnpm link n8n-nodes-crawl4ai
```

### Step 3: Restart n8n
```bash
# Restart your n8n instance
# If using Docker: docker restart n8n-container
# If using npm: npm restart
# If using systemd: sudo systemctl restart n8n
```

## 🧪 Testing the LLM Extractor Node

### Test Case 1: Multiple Job Listings Extraction

#### Workflow Setup
1. **Open n8n UI**
2. **Create New Workflow**
3. **Add Nodes**:
   - Manual Trigger
   - Crawl4AI: Content Extractor

#### Node Configuration
```
Operation: LLM Extractor
URL: https://chp.jobs.personio.de/
Extraction Instructions: Extract all job listings with their titles, locations, and URLs from this page.

Schema Fields:
- Field Name: jobTitle
  Type: String
  Required: true
  Description: The job title

- Field Name: location  
  Type: String
  Required: true
  Description: Job location

- Field Name: url
  Type: String
  Required: true
  Description: Job application URL

- Field Name: error
  Type: Boolean
  Required: false
  Description: Error flag

Options:
- Extract Multiple Items: true ✅
- Cache Mode: Enabled (Read/Write)
- Include Original Text: false

LLM Options:
- Override LLM Provider: true
- LLM Provider: openai (or your preferred provider)
- Model: gpt-4o (or available model)
- Temperature: 0.7
- Max Tokens: 2000
```

#### Expected Results
```json
[
  {
    "jobTitle": "Accounting Specialist / Finanzbuchhalter...",
    "location": "München",
    "url": "https://chp.jobs.personio.de/job/1789182?language=en",
    "error": false,
    "itemIndex": 0,
    "totalItems": 10
  },
  {
    "jobTitle": "Associate (m/w/d) Steuerberater",
    "location": "München",
    "url": "https://chp.jobs.personio.de/job/1182240?language=en", 
    "error": false,
    "itemIndex": 1,
    "totalItems": 10
  }
  // ... more job listings
]
```

### Test Case 2: Single Item Extraction

#### Configuration
```
Operation: LLM Extractor
URL: https://example.com/single-product-page
Extraction Instructions: Extract the product name, price, and description from this page.

Schema Fields:
- Field Name: productName
  Type: String
  Required: true

- Field Name: price
  Type: String
  Required: true

- Field Name: description
  Type: String
  Required: false

Options:
- Extract Multiple Items: false ❌
```

#### Expected Results
```json
[
  {
    "productName": "Sample Product",
    "price": "$99.99",
    "description": "Product description here"
  }
]
```

## 🔧 Testing Different Scenarios

### Scenario 1: Test Model Selection
1. **Enable "Override LLM Provider"**
2. **Select different providers**:
   - OpenAI (GPT-4o, GPT-3.5)
   - Groq (Llama, Mixtral)
   - Anthropic (Claude)
   - Ollama (Local models)
3. **Verify models load** in the dropdown
4. **Test extraction** with each provider

### Scenario 2: Test LLM Parameters
1. **Temperature**: Test 0.0 (deterministic) vs 0.7 (creative)
2. **Max Tokens**: Test with 1000 vs 2000 tokens
3. **Top P**: Test different values (0.1, 0.9)
4. **Penalties**: Test frequency and presence penalties

### Scenario 3: Test Error Handling
1. **Invalid URL**: Use `https://invalid-url-test.com`
2. **Empty Instructions**: Leave instructions blank
3. **No Schema Fields**: Remove all schema fields
4. **Invalid API Key**: Use wrong API key

## 🐛 Troubleshooting

### Common Issues

#### Issue 1: Node Not Appearing
```bash
# Check if package is linked
pnpm list -g | grep crawl4ai

# Re-link if needed
cd /path/to/n8n-nodes-crawl4j
pnpm link --global

cd /path/to/n8n
pnpm link n8n-nodes-crawl4ai
```

#### Issue 2: Build Errors
```bash
# Fix TypeScript errors first
cd /path/to/n8n-nodes-crawl4j
pnpm run build

# If build fails, check for:
# - Missing imports
# - Type errors
# - Syntax errors
```

#### Issue 3: LLM API Errors
- **Check API Key**: Verify your OpenAI/Groq/Anthropic API key
- **Check Credits**: Ensure you have API credits available
- **Check Rate Limits**: Wait if hitting rate limits
- **Check Model Availability**: Some models may be temporarily unavailable

#### Issue 4: Single Item Instead of Multiple
- **Verify "Extract Multiple Items"** is set to `true`
- **Check Instructions**: Ensure instructions mention "all items"
- **Check Schema**: Verify schema is array-based
- **Check LLM Response**: Look at raw LLM response in logs

### Debug Mode

#### Enable Debug Logging
1. **In n8n settings**, enable debug mode
2. **Check console logs** for:
   - Schema generation
   - LLM API calls
   - Result processing
   - Error messages

#### Check Raw Responses
```javascript
// In n8n workflow, add a "Code" node after the extractor
// to inspect the raw response
console.log('Raw LLM Response:', $input.all());
```

## 📊 Success Criteria

### ✅ Multiple Items Test Passes When:
- [ ] Multiple job listings are extracted
- [ ] Each item has correct fields (jobTitle, location, url, error)
- [ ] Items have metadata (itemIndex, totalItems)
- [ ] No duplicate items
- [ ] All visible jobs on page are captured

### ✅ Single Item Test Passes When:
- [ ] One item is extracted
- [ ] Item has all specified fields
- [ ] No array wrapper
- [ ] Correct data types

### ✅ Error Handling Test Passes When:
- [ ] Graceful error messages
- [ ] No crashes or timeouts
- [ ] Error details in output
- [ ] Workflow continues (if continueOnFail enabled)

## 🚀 Quick Test Commands

### Test Schema Generation
```bash
cd /path/to/n8n-nodes-crawl4j
node -e "
const { createLlmExtractionStrategy } = require('./nodes/Crawl4aiContentExtractor/helpers/utils');
const schema = { title: 'Test', type: 'object', properties: { items: { name: 'items', type: 'array' } }, required: ['items'] };
const strategy = createLlmExtractionStrategy(schema, 'test instruction', 'openai/gpt-4o', 'test-key');
console.log('✅ Schema test passed:', strategy.type === 'LLMExtractionStrategy');
"
```

### Test Model Fetching
```bash
node -e "
const { getModelsForProvider } = require('./nodes/Crawl4aiContentExtractor/helpers/modelFetchers');
getModelsForProvider('openai', 'your-api-key').then(result => {
  console.log('✅ Models fetched:', result.models.length > 0 ? 'Success' : 'Failed');
}).catch(err => console.log('❌ Error:', err.message));
"
```

## 📝 Test Checklist

- [ ] Node appears in n8n UI
- [ ] Credentials can be configured
- [ ] Multiple item extraction works
- [ ] Single item extraction works
- [ ] Model selection works
- [ ] LLM parameters work
- [ ] Error handling works
- [ ] Performance is acceptable
- [ ] Results are accurate
- [ ] No memory leaks

## 🎯 Next Steps After Testing

1. **Document any issues** found during testing
2. **Optimize performance** if needed
3. **Add more test cases** for edge scenarios
4. **Update documentation** based on findings
5. **Prepare for production** deployment

