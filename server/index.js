import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Client, GatewayIntentBits } from 'discord.js';
import { parseEmbed } from './parser.js';

const { DISCORD_TOKEN, CHANNEL_ID, PORT = 3000 } = process.env;

const history = [];          // последние 50 бросков
const streams = new Set();   // подключённые расширения (SSE)

function publish(roll) {
  history.push(roll);
  if (history.length > 50) history.shift();
  const data = `data: ${JSON.stringify(roll)}\n\n`;
  for (const res of streams) res.write(data);
}

// --- Discord ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Важно: сообщения GMENTOR приходят от вебхука, поэтому НЕ отфильтровываем ботов/вебхуки.
client.on('messageCreate', (msg) => {
  if (msg.channelId !== CHANNEL_ID) return;
  msg.embeds.forEach((embed, i) => {
    const roll = parseEmbed(embed);
    if (!roll) {
      console.log('Не разобрано:', JSON.stringify(embed.toJSON()));
      return;
    }
    publish({
      id: `${msg.id}:${i}`,
      ts: msg.createdTimestamp,
      character: msg.author.username,      // имя персонажа = имя вебхука
      avatar: msg.author.displayAvatarURL({ size: 64 }),
      ...roll,
    });
  });
});

if (DISCORD_TOKEN) {
  await client.login(DISCORD_TOKEN);
  console.log('Бот подключён к Discord');
} else {
  console.log('DISCORD_TOKEN не задан — работает только /test');
}

// --- HTTP ---
const app = express();
app.use(cors());

app.get('/', (_req, res) => res.send('GMENTOR → Owlbear bridge: ok'));
app.get('/history', (_req, res) => res.json(history));

app.get('/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  streams.add(res);
  req.on('close', () => streams.delete(res));
});

// Проверка без Discord: открыть в браузере https://ВАШ-СЕРВЕР/test
app.get('/test', (_req, res) => {
  const total = 3 + Math.floor(Math.random() * 16);
  const target = 10;
  publish({
    id: `test:${Date.now()}`, ts: Date.now(), character: 'Тестовый персонаж', avatar: '',
    skill: 'Stealth (Скрытность)', target, total, dice: [], modifier: null,
    outcome: total <= target ? 'success' : 'failure',
    label: total <= target ? 'Успех' : 'Провал', margin: Math.abs(total - target),
  });
  res.send('Тестовый бросок отправлен');
});

setInterval(() => { for (const res of streams) res.write(': ping\n\n'); }, 25000); // чтобы хостинг не рвал соединение

app.listen(PORT, () => console.log(`HTTP на порту ${PORT}`));
