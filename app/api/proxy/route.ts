import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
  }

  try {
    const targetUrl = new URL(url)
    
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    const contentType = response.headers.get('content-type') || ''
    
    // Handle non-HTML content (images, CSS, JS, etc.)
    if (!contentType.includes('text/html')) {
      const buffer = await response.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    let html = await response.text()
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`

    // Inject base tag for relative URLs
    html = html.replace(
      /<head([^>]*)>/i,
      `<head$1><base href="${baseUrl}/">`
    )

    // Inject communication script for agent interaction
    const injectedScript = `
      <script>
        (function() {
          // Store original page state
          window.__browserAgent = {
            url: '${targetUrl.toString()}',
            baseUrl: '${baseUrl}',
          };

          // Send page info to parent
          function sendPageInfo() {
            const info = {
              type: 'PAGE_INFO',
              url: window.location.href,
              title: document.title,
              html: document.documentElement.outerHTML,
              links: Array.from(document.querySelectorAll('a[href]')).slice(0, 50).map(a => ({
                text: a.textContent?.trim()?.substring(0, 100),
                href: a.href
              })),
              buttons: Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]')).slice(0, 50).map(b => ({
                text: b.textContent?.trim() || b.value || b.getAttribute('aria-label') || '',
                id: b.id,
                className: b.className
              })),
              inputs: Array.from(document.querySelectorAll('input, textarea, select')).slice(0, 50).map(i => ({
                type: i.type || i.tagName.toLowerCase(),
                name: i.name,
                id: i.id,
                placeholder: i.placeholder || '',
                value: i.value || ''
              })),
              text: document.body?.innerText?.substring(0, 5000) || ''
            };
            window.parent.postMessage(info, '*');
          }

          // Listen for commands from parent
          window.addEventListener('message', function(event) {
            const { type, payload } = event.data || {};
            
            if (type === 'CLICK') {
              const { selector, x, y } = payload;
              let element = selector ? document.querySelector(selector) : document.elementFromPoint(x, y);
              if (element) {
                element.click();
                setTimeout(sendPageInfo, 500);
              }
            }
            
            if (type === 'TYPE') {
              const { selector, text, clear } = payload;
              const element = document.querySelector(selector);
              if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                if (clear) element.value = '';
                element.value += text;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                setTimeout(sendPageInfo, 300);
              }
            }
            
            if (type === 'SCROLL') {
              const { x, y, direction } = payload;
              if (direction === 'up') window.scrollBy(0, -300);
              else if (direction === 'down') window.scrollBy(0, 300);
              else window.scrollTo(x || 0, y || 0);
              setTimeout(sendPageInfo, 300);
            }
            
            if (type === 'NAVIGATE') {
              window.location.href = payload.url;
            }
            
            if (type === 'GET_PAGE_INFO') {
              sendPageInfo();
            }
            
            if (type === 'EXTRACT') {
              const { selector } = payload;
              const elements = selector ? document.querySelectorAll(selector) : [document.body];
              const extracted = Array.from(elements).map(el => ({
                text: el.textContent?.trim()?.substring(0, 1000),
                html: el.innerHTML?.substring(0, 2000)
              }));
              window.parent.postMessage({ type: 'EXTRACTED', data: extracted }, '*');
            }
          });

          // Send initial page info after load
          if (document.readyState === 'complete') {
            setTimeout(sendPageInfo, 100);
          } else {
            window.addEventListener('load', () => setTimeout(sendPageInfo, 100));
          }
          
          // Also send on DOM changes
          const observer = new MutationObserver(() => {
            clearTimeout(window.__debouncePageInfo);
            window.__debouncePageInfo = setTimeout(sendPageInfo, 1000);
          });
          observer.observe(document.body, { childList: true, subtree: true });
        })();
      </script>
    `

    // Inject before closing body tag
    html = html.replace('</body>', `${injectedScript}</body>`)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
      },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
