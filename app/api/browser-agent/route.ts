import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import { z } from 'zod'

// Define browser automation tools
const browserTools = {
  click: tool({
    description: 'Click on an element on the webpage. Use selector for precise targeting or coordinates for visual clicking.',
    inputSchema: z.object({
      selector: z.string().nullable().describe('CSS selector of the element to click (e.g., "button.submit", "#login-btn", "a[href*=search]")'),
      description: z.string().describe('Description of what you are clicking and why'),
    }),
    execute: async ({ selector, description }) => {
      return {
        action: 'click',
        selector,
        description,
        success: true,
        message: `Clicking: ${description}`,
      }
    },
  }),

  type: tool({
    description: 'Type text into an input field or textarea on the webpage.',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector of the input element (e.g., "input[name=email]", "#search-box", "textarea.comment")'),
      text: z.string().describe('The text to type into the element'),
      clear: z.boolean().default(false).describe('Whether to clear existing text before typing'),
      description: z.string().describe('Description of what you are typing and why'),
    }),
    execute: async ({ selector, text, clear, description }) => {
      return {
        action: 'type',
        selector,
        text,
        clear,
        description,
        success: true,
        message: `Typing "${text}" into ${selector}: ${description}`,
      }
    },
  }),

  scroll: tool({
    description: 'Scroll the webpage in a specific direction or to specific coordinates.',
    inputSchema: z.object({
      direction: z.enum(['up', 'down', 'left', 'right']).nullable().describe('Direction to scroll'),
      amount: z.number().default(300).describe('Amount to scroll in pixels'),
      description: z.string().describe('Why you are scrolling'),
    }),
    execute: async ({ direction, amount, description }) => {
      return {
        action: 'scroll',
        direction,
        amount,
        description,
        success: true,
        message: `Scrolling ${direction} by ${amount}px: ${description}`,
      }
    },
  }),

  navigate: tool({
    description: 'Navigate to a new URL or follow a link on the page.',
    inputSchema: z.object({
      url: z.string().describe('The URL to navigate to'),
      description: z.string().describe('Why you are navigating to this URL'),
    }),
    execute: async ({ url, description }) => {
      return {
        action: 'navigate',
        url,
        description,
        success: true,
        message: `Navigating to: ${url}`,
      }
    },
  }),

  extract: tool({
    description: 'Extract specific information from the current webpage.',
    inputSchema: z.object({
      selector: z.string().nullable().describe('CSS selector to extract from, or null for entire page'),
      dataType: z.string().describe('What type of data you are extracting (e.g., "product prices", "article titles", "form data")'),
    }),
    execute: async ({ selector, dataType }) => {
      return {
        action: 'extract',
        selector,
        dataType,
        success: true,
        message: `Extracting ${dataType} from ${selector || 'page'}`,
      }
    },
  }),

  waitAndObserve: tool({
    description: 'Wait for a moment and observe the page state. Use this when you need to wait for page changes or animations.',
    inputSchema: z.object({
      reason: z.string().describe('Why you are waiting'),
      duration: z.number().default(1000).describe('How long to wait in milliseconds'),
    }),
    execute: async ({ reason, duration }) => {
      return {
        action: 'wait',
        duration,
        reason,
        success: true,
        message: `Waiting ${duration}ms: ${reason}`,
      }
    },
  }),

  analyzePageStructure: tool({
    description: 'Analyze the structure and interactive elements of the current page to understand what actions are possible.',
    inputSchema: z.object({
      focus: z.string().nullable().describe('Specific area or type of elements to focus on (e.g., "forms", "navigation", "content")'),
    }),
    execute: async ({ focus }) => {
      return {
        action: 'analyze',
        focus,
        success: true,
        message: `Analyzing page structure${focus ? ` with focus on: ${focus}` : ''}`,
      }
    },
  }),

  reportProgress: tool({
    description: 'Report the current progress of the task to the user.',
    inputSchema: z.object({
      status: z.enum(['starting', 'in_progress', 'completed', 'error', 'waiting_for_user']).describe('Current status'),
      message: z.string().describe('Detailed progress message'),
      percentComplete: z.number().min(0).max(100).nullable().describe('Estimated completion percentage'),
    }),
    execute: async ({ status, message, percentComplete }) => {
      return {
        action: 'progress',
        status,
        message,
        percentComplete,
        success: true,
      }
    },
  }),

  taskComplete: tool({
    description: 'Mark the task as complete and provide a summary of what was accomplished.',
    inputSchema: z.object({
      summary: z.string().describe('Summary of what was accomplished'),
      results: z.string().nullable().describe('Any data or results extracted during the task'),
    }),
    execute: async ({ summary, results }) => {
      return {
        action: 'complete',
        summary,
        results,
        success: true,
        message: 'Task completed successfully',
      }
    },
  }),
}

export async function POST(req: Request) {
  try {
    const { messages, pageInfo } = await req.json()

    // Build system prompt with current page context
    const systemPrompt = `You are an intelligent browser automation agent. You can see and interact with web pages to complete user tasks.

CURRENT PAGE STATE:
- URL: ${pageInfo?.url || 'No page loaded'}
- Title: ${pageInfo?.title || 'Unknown'}

AVAILABLE ELEMENTS ON PAGE:
${pageInfo?.buttons?.length > 0 ? `Buttons: ${JSON.stringify(pageInfo.buttons.slice(0, 20))}` : 'No buttons found'}
${pageInfo?.links?.length > 0 ? `Links: ${JSON.stringify(pageInfo.links.slice(0, 20))}` : 'No links found'}
${pageInfo?.inputs?.length > 0 ? `Input fields: ${JSON.stringify(pageInfo.inputs.slice(0, 20))}` : 'No inputs found'}

PAGE CONTENT PREVIEW:
${pageInfo?.text?.substring(0, 2000) || 'No content available'}

INSTRUCTIONS:
1. Analyze the user's request and the current page state
2. Plan your actions step by step
3. Use tools to interact with the page
4. Always use reportProgress to keep the user informed
5. Use taskComplete when the task is finished
6. If you encounter an error, explain what went wrong

IMPORTANT GUIDELINES:
- Be precise with CSS selectors - use IDs when available, then specific classes
- Wait after clicking or submitting forms for the page to update
- If an element is not found, try scrolling or look for alternative elements
- Always explain your reasoning before taking actions
- Keep the user informed of your progress`

    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: browserTools,
      stopWhen: stepCountIs(15),
      maxOutputTokens: 4096,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Browser agent error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
