import { Client, GatewayIntentBits, Events, Message, Partials } from 'discord.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SUPABASE_FUNCTIONS_URL = process.env.SUPABASE_FUNCTIONS_URL;
const BOT_SECRET = process.env.DISCORD_BOT_SECRET;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Validate required environment variables
if (!BOT_TOKEN) {
  console.error('DISCORD_BOT_TOKEN is required');
  process.exit(1);
}

if (!SUPABASE_FUNCTIONS_URL) {
  console.error('SUPABASE_FUNCTIONS_URL is required');
  process.exit(1);
}

if (!BOT_SECRET) {
  console.error('DISCORD_BOT_SECRET is required');
  process.exit(1);
}

// Simple logger
const log = {
  debug: (...args: any[]) => LOG_LEVEL === 'debug' && console.log('[DEBUG]', ...args),
  info: (...args: any[]) => ['debug', 'info'].includes(LOG_LEVEL) && console.log('[INFO]', ...args),
  warn: (...args: any[]) => ['debug', 'info', 'warn'].includes(LOG_LEVEL) && console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

// Create Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Track processed messages to avoid duplicates
const processedMessages = new Set<string>();
const MAX_PROCESSED_CACHE = 1000;

// Cleanup old processed messages periodically
setInterval(() => {
  if (processedMessages.size > MAX_PROCESSED_CACHE) {
    const toDelete = processedMessages.size - MAX_PROCESSED_CACHE / 2;
    const iterator = processedMessages.values();
    for (let i = 0; i < toDelete; i++) {
      processedMessages.delete(iterator.next().value);
    }
    log.debug(`Cleaned up ${toDelete} old processed messages`);
  }
}, 60000); // Every minute

// Sync message to Supabase
async function syncMessage(message: Message) {
  // Skip if already processed
  if (processedMessages.has(message.id)) {
    return;
  }
  processedMessages.add(message.id);

  // Skip bot messages
  if (message.author.bot) {
    log.debug(`Skipping bot message: ${message.id}`);
    return;
  }

  // Only sync messages from ticket channels
  const channelName = 'name' in message.channel ? message.channel.name : null;
  if (!channelName || !channelName.startsWith('ticket-')) {
    log.debug(`Skipping non-ticket channel: ${channelName}`);
    return;
  }

  log.info(`Syncing message ${message.id} from channel ${channelName}`);

  try {
    // Prepare attachments
    const attachments = message.attachments.map(att => ({
      url: att.url,
      filename: att.name || 'attachment',
    }));

    // Send to sync edge function
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/sync-discord-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOT_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel_id: message.channel.id,
        message_id: message.id,
        content: message.content,
        author_id: message.author.id,
        author_username: message.author.username,
        author_discriminator: message.author.discriminator,
        attachments: attachments.length > 0 ? attachments : undefined,
        timestamp: message.createdAt.toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      log.error(`Failed to sync message ${message.id}: ${response.status} - ${error}`);
      return;
    }

    const result = await response.json();
    log.info(`Successfully synced message ${message.id}: ticket_message_id=${result.ticket_message_id}`);

  } catch (error) {
    log.error(`Error syncing message ${message.id}:`, error);
  }
}

// Event handlers
client.once(Events.ClientReady, (readyClient) => {
  log.info(`Bot is ready! Logged in as ${readyClient.user.tag}`);
  log.info(`Watching ${readyClient.guilds.cache.size} guild(s) for ticket messages`);
});

client.on(Events.MessageCreate, async (message) => {
  await syncMessage(message);
});

// Handle message updates (edits)
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (!newMessage.partial) {
    // For now, we don't sync edits - just log them
    const channelName = 'name' in newMessage.channel ? newMessage.channel.name : null;
    if (channelName?.startsWith('ticket-')) {
      log.debug(`Message edit in ticket channel: ${newMessage.id}`);
    }
  }
});

// Error handling
client.on(Events.Error, (error) => {
  log.error('Discord client error:', error);
});

client.on(Events.Warn, (warning) => {
  log.warn('Discord client warning:', warning);
});

// Graceful shutdown
process.on('SIGINT', () => {
  log.info('Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.info('Shutting down...');
  client.destroy();
  process.exit(0);
});

// Start the bot
log.info('Starting Discord ticket sync bot...');
client.login(BOT_TOKEN);
