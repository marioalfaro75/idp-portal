import { Handler } from 'aws-lambda';

interface ProcessInput {
  id: string;
  valid: boolean;
  data: Record<string, unknown>;
}

interface ProcessOutput {
  id: string;
  status: string;
  processedAt: string;
}

export const handler: Handler<ProcessInput, ProcessOutput> = async (event) => {
  console.log('Processing:', JSON.stringify(event));

  if (!event.valid) {
    throw new Error(`Validation failed for item ${event.id}`);
  }

  return {
    id: event.id,
    status: 'processed',
    processedAt: new Date().toISOString(),
  };
};
