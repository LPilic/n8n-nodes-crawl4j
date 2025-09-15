# Testing the Crawl4AI LLM Extractor Node

## Method 1: Test in n8n UI (Recommended)

### Step 1: Build and Install the Node
```bash
# Build the node package
npm run build

# Install in your n8n instance
npm install -g ./dist/n8n-nodes-crawl4j.tgz
```

### Step 2: Create Test Workflow
1. Open n8n UI
2. Create new workflow
3. Add "Crawl4AI: Content Extractor" node
4. Configure credentials (Crawl4AI API)

### Step 3: Configure LLM Extractor
- **Operation**: LLM Extractor
- **URL**: `https://chp.jobs.personio.de/` (or any job listing page)
- **Extraction Instructions**: `Extract all job listings with their titles, locations, and URLs from this page.`
- **Schema Fields**:
  - Field Name: `jobTitle`, Type: `String`, Required: `true`
  - Field Name: `location`, Type: `String`, Required: `true` 
  - Field Name: `url`, Type: `String`, Required: `true`
  - Field Name: `error`, Type: `Boolean`, Required: `false`
- **Extract Multiple Items**: `true` (default)
- **LLM Options**: Configure your provider and model

### Step 4: Test Execution
1. Click "Execute Node"
2. Check the output - you should see multiple job listings
3. Verify each item has the correct fields

## Method 2: Test with Sample Data

### Create Test Workflow with Manual Trigger
1. Add "Manual Trigger" node
2. Add "Crawl4AI: Content Extractor" node
3. Connect them
4. Configure the extractor as above
5. Execute and verify results

## Method 3: Test Different Scenarios

### Test Case 1: Multiple Items (Job Listings)
- URL: Job board page
- Expected: Array of job objects
- Verify: Each job has title, location, url, error fields

### Test Case 2: Single Item Extraction
- Set "Extract Multiple Items" to `false`
- URL: Single product page
- Expected: Single object with fields
- Verify: Single output item

### Test Case 3: Error Handling
- URL: Invalid/non-existent page
- Expected: Error message in output
- Verify: Graceful error handling

## Method 4: Debug Mode Testing

### Enable Debug Output
1. In n8n settings, enable debug mode
2. Run the node
3. Check console logs for:
   - Schema generation
   - LLM API calls
   - Result processing
   - Error messages

## Expected Output Format

### Multiple Items (Default)
```json
[
  {
    "jobTitle": "Accounting Specialist...",
    "location": "München",
    "url": "https://chp.jobs.personio.de/job/1789182",
    "error": false,
    "itemIndex": 0,
    "totalItems": 10
  },
  {
    "jobTitle": "Associate (m/w/d)...",
    "location": "München", 
    "url": "https://chp.jobs.personio.de/job/1182240",
    "error": false,
    "itemIndex": 1,
    "totalItems": 10
  }
  // ... more items
]
```

### Single Item
```json
[
  {
    "jobTitle": "Single Job Title",
    "location": "Location",
    "url": "https://example.com/job/123",
    "error": false
  }
]
```

## Troubleshooting

### Common Issues
1. **No items returned**: Check if "Extract Multiple Items" is enabled
2. **Single item only**: Verify instruction mentions "all items"
3. **Schema errors**: Ensure field names match exactly
4. **LLM errors**: Check API key and provider configuration

### Debug Steps
1. Check n8n execution logs
2. Verify Crawl4AI API connectivity
3. Test with simpler schema first
4. Try different LLM providers

