import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
  }

  try {
    const targetUrl = new URL(url)
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
    
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    
    clearTimeout(timeoutId)

    const contentType = response.headers.get('content-type') || ''
    
    // Handle non-HTML content (images, CSS, JS, etc.) - stream directly
    if (!contentType.includes('text/html')) {
      const buffer = await response.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    let html = await response.text()

    // Simple and fast: inject base tag and communication script
    const headInsert = `<base href="${baseUrl}/"><meta name="referrer" content="no-referrer">`
    
    // Inject into head
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${headInsert}`)
    } else if (html.includes('<head ')) {
      html = html.replace(/<head([^>]*)>/, `<head$1>${headInsert}`)
    } else {
      html = `<head>${headInsert}</head>${html}`
    }

    // Minimal communication script - fast execution
    const injectedScript = `<script>
(function(){
  var ba=window.__browserAgent={url:'${targetUrl.toString()}',base:'${baseUrl}'};
  function send(){
    var d=document,b=d.body;
    if(!b)return;
    var info={
      type:'PAGE_INFO',
      url:location.href,
      title:d.title,
      links:[].slice.call(d.querySelectorAll('a[href]'),0,30).map(function(a){return{text:(a.textContent||'').trim().slice(0,80),href:a.href}}),
      buttons:[].slice.call(d.querySelectorAll('button,[type=submit],[type=button],[role=button]'),0,30).map(function(e){return{text:(e.textContent||e.value||e.getAttribute('aria-label')||'').trim(),id:e.id,cls:e.className}}),
      inputs:[].slice.call(d.querySelectorAll('input,textarea,select'),0,30).map(function(i){return{type:i.type||i.tagName.toLowerCase(),name:i.name,id:i.id,ph:i.placeholder||''}}),
      text:(b.innerText||'').slice(0,3000)
    };
    parent.postMessage(info,'*');
  }
  function ready(fn){if(document.readyState!='loading')fn();else document.addEventListener('DOMContentLoaded',fn)}
  ready(function(){setTimeout(send,50)});
  window.addEventListener('message',function(e){
    var d=e.data||{},t=d.type,p=d.payload||{};
    if(t==='CLICK'){var el=p.selector?document.querySelector(p.selector):document.elementFromPoint(p.x,p.y);if(el)el.click();setTimeout(send,300)}
    if(t==='TYPE'){var el=document.querySelector(p.selector);if(el){if(p.clear)el.value='';el.value+=p.text;el.dispatchEvent(new Event('input',{bubbles:1}));setTimeout(send,200)}}
    if(t==='SCROLL'){if(p.direction==='up')scrollBy(0,-300);else if(p.direction==='down')scrollBy(0,300);else scrollTo(p.x||0,p.y||0);setTimeout(send,200)}
    if(t==='NAVIGATE')location.href=p.url;
    if(t==='GET_PAGE_INFO')send();
  });
})();
</script>`

    // Inject before </body> or at end
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${injectedScript}</body>`)
    } else {
      html += injectedScript
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[v0] Proxy error:', message)
    return NextResponse.json(
      { error: 'Failed to fetch URL', details: message },
      { status: 500 }
    )
  }
}
