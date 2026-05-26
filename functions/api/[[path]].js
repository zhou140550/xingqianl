export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const target = 'https://open.feishu.cn' + path + url.search;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const response = await fetch(target, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': request.headers.get('Authorization') || '',
    },
    body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
  });

  const data = await response.text();
  return new Response(data, {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
