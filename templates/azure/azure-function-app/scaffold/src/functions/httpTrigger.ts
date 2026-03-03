import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function httpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const url = new URL(request.url);

  if (url.pathname.endsWith('/health')) {
    return {
      jsonBody: { service: '{{service_name}}', status: 'ok', timestamp: new Date().toISOString() },
    };
  }

  return {
    jsonBody: { message: 'Welcome to {{service_name}}' },
  };
}

app.http('httpTrigger', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: httpTrigger,
});
