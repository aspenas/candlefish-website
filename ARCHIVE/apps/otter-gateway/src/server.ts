import 'dotenv/config';
import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { WebClient } from '@slack/web-api';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { OpenAI } from 'openai';

const app = express();
app.use(
  express.json({
    type: ['application/json', 'application/*+json'],
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf.toString();
    },
  })
);

const port = Number(process.env.PORT || 8080);
const logLevel = process.env.LOG_LEVEL || 'info';

const slackBotToken = process.env.SLACK_BOT_TOKEN || '';
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET || '';
let slackAggregatorChannelId = process.env.SLACK_AGGREGATOR_CHANNEL_ID || '';

const slack = new WebClient(slackBotToken);

const s3Bucket = process.env.S3_BUCKET_TRANSCRIPTS || 'candlefish-meetings';
const s3 = new S3Client({});

const secrets = new SecretsManagerClient({});

const openaiApiKey = process.env.OPENAI_API_KEY || '';
const openai = new OpenAI({ apiKey: openaiApiKey });

async function ensureAggregatorChannelId(): Promise<string> {
  if (slackAggregatorChannelId) return slackAggregatorChannelId;
  try {
    const secret = await secrets.send(new GetSecretValueCommand({
      SecretId: 'candlefish/slack/aggregator-channel',
    }));
    if (secret.SecretString) {
      const parsed = JSON.parse(secret.SecretString);
      slackAggregatorChannelId = parsed.channel_id || parsed.channelId || '';
    }
  } catch {
    // ignore
  }
  if (!slackAggregatorChannelId) {
    throw new Error('SLACK_AGGREGATOR_CHANNEL_ID not set');
  }
  return slackAggregatorChannelId;
}

function verifySlackSignature(req: Request): boolean {
  if (!slackSigningSecret) return true; // allow if not configured yet
  const timestamp = req.headers['x-slack-request-timestamp'] as string;
  const sig = req.headers['x-slack-signature'] as string;
  if (!timestamp || !sig) return false;
  const body = (req as any).rawBody || '';
  const basestring = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', slackSigningSecret).update(basestring).digest('hex');
  const computed = `v0=${hmac}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computed));
  } catch {
    return false;
  }
}

app.post('/slack/events', async (req: Request, res: Response) => {
  if (req.body && req.body.type === 'url_verification') {
    return res.status(200).send(req.body.challenge);
  }
  if (!verifySlackSignature(req)) return res.status(401).send('invalid signature');
  return res.status(200).send('ok');
});

app.post('/webhooks/otter', async (req: Request, res: Response) => {
  // Minimal shape: { meetingId, title, finalized: true, participants, transcript, summary }
  const event = req.body;
  try {
    if (!event || !event.finalized) return res.status(200).send('ignored');

    const channelId = await ensureAggregatorChannelId();

    // Upload transcript JSON to S3 (best effort)
    const objectKey = `meetings/${event.meetingId}.json`;
    try {
      await s3.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: objectKey,
        Body: JSON.stringify(event),
        ContentType: 'application/json'
      }));
    } catch (s3err) {
      if (logLevel !== 'silent') console.warn('[otter-gateway] S3 upload failed, continuing:', s3err);
    }

    // Generate Candlefish summary using GPT-5
    const title = event.title || 'Meeting';
    const transcriptText: string = event.transcript || '';
    const participants: string[] = Array.isArray(event.participants) ? event.participants : [];

    let summaryText = '';
    if (openaiApiKey && transcriptText) {
      const prompt = `Summarize the following meeting transcript focusing on: Decisions, Action Items (with owners), Risks, and Key Points. Keep it concise and scannable.\n\nTitle: ${title}\nParticipants: ${participants.join(', ')}\n\nTranscript:\n${transcriptText}`;
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.0-mini',
        messages: [
          { role: 'system', content: 'You are an expert meeting summarizer for Candlefish.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 700
      });
      summaryText = completion.choices[0]?.message?.content?.trim() || '';
    }

    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: title.slice(0, 150) } },
      { type: 'section', text: { type: 'mrkdwn', text: `Participants: ${participants.join(', ') || 'N/A'}` } },
      { type: 'section', text: { type: 'mrkdwn', text: `Candlefish Summary:\n${summaryText || '_(generated summary unavailable)_'} ` } }
    ];

    await slack.chat.postMessage({
      channel: channelId,
      text: `${title} — meeting summary`,
      blocks: blocks as any
    });

    res.status(200).send('ok');
  } catch (err) {
    console.error(err);
    res.status(500).send('error');
  }
});

app.get('/health', (_req: Request, res: Response) => res.status(200).send('ok'));

app.listen(port, () => {
  if (logLevel !== 'silent') console.log(`[otter-gateway] listening on :${port}`);
});
