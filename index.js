const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = 9801;

app.use(express.json());

app.post('/', async (req, res) => {
  try {
    const { threadLink } = req.body;

    if (!threadLink) {
      return res.status(400).json({ error: 'Missing threadLink parameter' });
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Enable the request interception
    await page.setRequestInterception(true);

    // Array to store XHR network calls
    const xhrCalls = [];

    // Listen for network requests
    page.on('request', (request) => {
      if (request.resourceType() === 'xhr') {
        // Intercept and store the XHR network calls
        if (request.url() === 'https://www.threads.net/api/graphql') {
          const xhrCall = {
            url: request.url(),
            method: request.method(),
            headers: request.headers()
          };
          xhrCalls.push(xhrCall);
        }
      }
      request.continue();
    });

    // Listen for network responses
    page.on('response', async (response) => {
      const xhrCall = xhrCalls.find((call) => call.url === response.url());
      if (xhrCall) {
        xhrCall.response = {
          status: response.status(),
          headers: response.headers(),
          body: await response.json()
        };
      }
    });

    // Navigate to the specified URL
    await page.goto(threadLink);

    // Wait for the XHR calls to be made (adjust the timeout as needed)
    await page.waitForTimeout(5000);

    // Close the browser
    await browser.close();

    // Filter and extract the response body
    const responseBody = xhrCalls
      .filter(call => call.url === 'https://www.threads.net/api/graphql')
      .map(call => call.response.body);

    // Return the response body as JSON
    res.json(responseBody);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
