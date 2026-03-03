import { Handler } from 'aws-lambda';

interface ValidateInput {
  id: string;
  data: Record<string, unknown>;
}

interface ValidateOutput {
  id: string;
  valid: boolean;
  data: Record<string, unknown>;
}

export const handler: Handler<ValidateInput, ValidateOutput> = async (event) => {
  console.log('Validating:', JSON.stringify(event));

  const valid = Boolean(event.id && event.data);

  return {
    id: event.id,
    valid,
    data: event.data,
  };
};
