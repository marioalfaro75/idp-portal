import { SQSHandler, SQSEvent } from 'aws-lambda';

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    console.log('Processing message:', record.messageId);

    try {
      const body = JSON.parse(record.body);
      console.log('Message body:', JSON.stringify(body));

      // Process the message
      await processMessage(body);

      console.log('Successfully processed:', record.messageId);
    } catch (error) {
      console.error('Failed to process message:', record.messageId, error);
      throw error;
    }
  }
};

async function processMessage(body: Record<string, unknown>): Promise<void> {
  // TODO: Implement message processing logic
  console.log('Processing:', JSON.stringify(body));
}
