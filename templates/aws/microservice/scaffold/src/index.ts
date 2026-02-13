import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (_req, res) => {
  res.json({ service: '{{service_name}}', status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ message: 'Welcome to {{service_name}}' });
});

app.listen(PORT, () => {
  console.log(`{{service_name}} running on port ${PORT}`);
});
