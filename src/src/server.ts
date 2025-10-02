import express from 'express';
import { AirdropRunner } from './airdrop.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

let runner: AirdropRunner | null = null;
let manualAddresses: string[] = []; // Bellekte tutulur

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/holders/load', (req, res) => {
  try {
    let arr: string[] = [];
    if (Array.isArray(req.body.addresses)) {
      arr = req.body.addresses;
    } else if (typeof req.body.addressesText === 'string') {
      arr = req.body.addressesText
        .split(/\r?\n|,/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);
    } else {
      return res.status(400).json({ error: 'addresses veya addressesText gerekiyor' });
    }
    manualAddresses = Array.from(new Set(arr));
    res.json({ loaded: manualAddresses.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/holders', (_req, res) => {
  res.json({
    count: manualAddresses.length,
    preview: manualAddresses.slice(0, 10)
  });
});

app.post('/api/airdrop/start', async (req, res) => {
  if (runner && runner.getProgress().running) {
    return res.status(400).json({ error: 'Zaten çalışıyor' });
  }
  try {
    const { dryRun, mint, amount } = req.body || {};
    runner = new AirdropRunner();
    runner.configure({
      mint,
      amount: amount ? BigInt(amount) : undefined,
      dryRun: typeof dryRun === 'boolean' ? dryRun : undefined
    });

    if (manualAddresses.length) {
      runner.loadManualAddresses(manualAddresses);
    } else {
      // snapshot fallback
      runner.loadSnapshot();
    }

    runner.run().catch(e => console.error('Airdrop async error:', e));
    res.json({
      message: 'Airdrop başlatıldı',
      total: runner.getProgress().total,
      mint: runner.getProgress().mint,
      amount: runner.getProgress().amount,
      dryRun: runner.getProgress().dryRun,
      manual: runner.getProgress().manual
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/airdrop/status', (_req, res) => {
  if (!runner) return res.json({ status: 'idle' });
  res.json(runner.getProgress());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server çalışıyor:', PORT);
});
