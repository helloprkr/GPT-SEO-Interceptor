export const generateScraperCode = (sessionToken: string, keyword: string) => `/**
 * REAL PLAYWRIGHT INTERCEPTOR
 * Run this locally to scrape ChatGPT.
 * 
 * Usage:
 * 1. npm install
 * 2. node scraper.js
 */

const fs = require('fs');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');

chromium.use(stealth());

// CONFIGURATION
const SESSION_TOKEN = '${sessionToken}';
const KEYWORD = '${keyword}';

(async () => {
  console.log('🚀 Starting ChatGPT Interceptor...');
  console.log('Target Keyword:', KEYWORD);

  const browser = await chromium.launch({ headless: false }); // Headless: false so you can see it working
  const context = await browser.newContext();

  // 1. Session Injection
  await context.addCookies([{
    name: '__Secure-next-auth.session-token',
    value: SESSION_TOKEN,
    domain: 'chatgpt.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
  }]);

  const page = await context.newPage();
  const extractedQueries = new Set(); // Use Set to avoid duplicates

  // 2. Network Sniffing
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/backend-api/conversation') && response.status() === 200) {
      try {
        const buffer = await response.body();
        const text = buffer.toString('utf-8');
        const lines = text.split('\\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            const jsonStr = line.substring(6);
            try {
              const data = JSON.parse(jsonStr);
              
              // Strategy A: Metadata Search Result
              const metadata = data.message?.metadata;
              if (metadata?.search_result?.query) {
                 console.log('🔎 Found Query (Metadata):', metadata.search_result.query);
                 extractedQueries.add(metadata.search_result.query);
              }
              
              // Strategy B: Tool Calls
              if (data.message?.content?.parts) {
                 data.message.content.parts.forEach(part => {
                     if (part.content_type === 'tool_use' && part.name === 'browser') {
                         // Attempt to parse arguments if available in this chunk
                         try {
                            const args = JSON.parse(part.args || '{}');
                            if (args.query) {
                                console.log('🔎 Found Query (Tool Arg):', args.query);
                                extractedQueries.add(args.query);
                            }
                         } catch(e) {}
                     }
                 });
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        // Stream errors are common, ignore
      }
    }
  });

  try {
    console.log('🌐 Navigating to ChatGPT...');
    await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
    
    // Quick check for login success
    try {
        await page.waitForSelector('#prompt-textarea', { timeout: 10000 });
    } catch (e) {
        console.error('❌ Failed to locate text area. Session token might be invalid or expired.');
        process.exit(1);
    }

    console.log('✍️  Typing prompt...');
    const textareaSelector = '#prompt-textarea';
    await page.fill(textareaSelector, \`Search the web for "\${KEYWORD}" and list the top results.\`);
    await page.keyboard.press('Enter');

    console.log('⏳ Waiting for response stream (20s)...');
    await page.waitForTimeout(20000); 

    const results = Array.from(extractedQueries);
    console.log('✅ Extraction Complete. Found:', results.length, 'queries.');

    // Save to file
    const output = {
      keyword: KEYWORD,
      extracted_queries: results,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('chatgpt_results.json', JSON.stringify(output, null, 2));
    console.log('💾 Saved results to: chatgpt_results.json');
    console.log('👉 Upload this file to the Dashboard to generate your strategy.');

  } catch (error) {
    console.error('❌ Critical Error:', error);
  } finally {
    await browser.close();
  }
})();
`;

export const PACKAGE_JSON = `{
  "name": "chatgpt-interceptor-agent",
  "version": "1.0.0",
  "description": "Local agent for ChatGPT SEO Interceptor",
  "main": "scraper.js",
  "scripts": {
    "start": "node scraper.js"
  },
  "dependencies": {
    "playwright": "^1.40.0",
    "playwright-extra": "^4.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2"
  }
}`;