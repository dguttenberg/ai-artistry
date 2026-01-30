import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
// API key is read from ANTHROPIC_API_KEY environment variable
const anthropic = new Anthropic();

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { system, prompt, max_tokens = 8000 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt in request body' });
    }

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: max_tokens,
      system: system || '',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text content from response
    const content = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return res.status(200).json({
      content: content,
      usage: message.usage,
      model: message.model
    });

  } catch (error) {
    console.error('API Error:', error);

    // Handle specific Anthropic errors
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    return res.status(500).json({
      error: 'Failed to generate response',
      details: error.message
    });
  }
}
