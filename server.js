/**
 * LOCAL AUTOMATION SERVER
 * 
 * Run with: node server.js
 * Dependencies: npm install express cors playwright playwright-extra puppeteer-extra-plugin-stealth
 */

const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');

chromium.use(stealth());

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'online' });
});

app.post('/api/scrape', async (req, res) => {
  const { sessionToken, keyword } = req.body;

  if (!sessionToken || !keyword) {
    return res.status(400).json({ error: 'Missing sessionToken or keyword' });
  }

  // Set headers for streaming response (Real-time logs)
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const chunk = JSON.stringify({ type: 'log', data: { timestamp, message, type } }) + '\n';
    res.write(chunk);
  };

  const sendResult = (data) => {
    const chunk = JSON.stringify({ type: 'result', data }) + '\n';
    res.write(chunk);
  };

  const sendError = (message) => {
    const chunk = JSON.stringify({ type: 'error', message }) + '\n';
    res.write(chunk);
  };

  let browser = null;

  try {
    log('🚀 Initializing Local Playwright Agent...', 'info');
    
    browser = await chromium.launch({ headless: false }); // Show browser so user sees it working
    const context = await browser.newContext();

    log('🔐 Injecting Session Cookie...', 'warning');
    await context.addCookies([{
      name: '__Secure-next-auth.session-token',
      value: sessionToken,
      domain: 'chatgpt.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    const page = await context.newPage();
    const extractedQueries = new Set();

    // Network Sniffing
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/backend-api/conversation') && response.status() === 200) {
        try {
            // Clone the response so we don't consume the stream for the page
            const buffer = await response.body(); 
            const text = buffer.toString('utf-8');
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    const jsonStr = line.substring(6);
                    try {
                        const data = JSON.parse(jsonStr);
                        
                        // Check for Search Tool calls
                        if (data.message?.content?.parts) {
                            data.message.content.parts.forEach(part => {
                                if (part.content_type === 'tool_use' && part.name === 'browser') {
                                    try {
                                        const args = JSON.parse(part.args || '{}');
                                        if (args.query && !extractedQueries.has(args.query)) {
                                            log(`🔎 Intercepted Query: "${args.query}"`, 'success');
                                            extractedQueries.add(args.query);
                                        }
                                    } catch(e) {}
                                }
                            });
                        }
                        
                        // Check for Metadata Search Results
                        const metadata = data.message?.metadata;
                        if (metadata?.search_result?.query && !extractedQueries.has(metadata.search_result.query)) {
                            log(`🔎 Intercepted Query (Meta): "${metadata.search_result.query}"`, 'success');
                            extractedQueries.add(metadata.search_result.query);
                        }

                    } catch (e) { }
                }
            }
        } catch (err) {
            // Ignore body read errors on stream
        }
      }
    });

    log('🌐 Navigating to ChatGPT...', 'info');
    await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });

    // Login Check
    try {
        await page.waitForSelector('#prompt-textarea', { timeout: 10000 });
        log('✅ Authenticated successfully.', 'success');
    } catch (e) {
        throw new Error('Could not find text input. Session token might be invalid.');
    }

    log(`✍️ Sending Prompt: "Search for ${keyword}..."`, 'info');
    const textareaSelector = '#prompt-textarea';
    await page.fill(textareaSelector, `Search the web for "${keyword}" and list the top results.`);
    await page.keyboard.press('Enter');

    log('⏳ Waiting for response stream (max 20s)...', 'warning');
    
    // Wait for either extraction or timeout
    let waited = 0;
    while (waited < 20000) {
        if (extractedQueries.size >= 3) break; // Optimistic early exit
        await page.waitForTimeout(1000);
        waited += 1000;
    }

    const queries = Array.from(extractedQueries);
    
    if (queries.length === 0) {
        log('⚠️ No specific search queries found. Model might have answered from training data.', 'warning');
    } else {
        log(`🎉 Extraction Complete. Found ${queries.length} unique queries.`, 'success');
    }

    sendResult({
        keyword,
        extracted_queries: queries
    });

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'error');
    sendError(error.message);
  } finally {
    if (browser) await browser.close();
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Local Automation Server running on http://localhost:${PORT}`);
});