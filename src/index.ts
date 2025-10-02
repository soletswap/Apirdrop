import { AirdropRunner } from './airdrop.js';

interface CliOptions {
  mint?: string;
  amount?: bigint;
  dryRun?: boolean;
  addresses?: string[];
  holdersFile?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--mint') opts.mint = args[++i];
    else if (a === '--amount') opts.amount = BigInt(args[++i]);
    else if (a === '--dry-run') opts.dryRun = args[++i] === 'true';
    else if (a === '--addresses') {
      const raw = args[++i];
      opts.addresses = raw.split(/[,]/).map(s => s.trim());
    } else if (a === '--holders') {
      opts.holdersFile = args[++i];
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const runner = new AirdropRunner();
  runner.configure({
    mint: opts.mint,
    amount: opts.amount,
    dryRun: opts.dryRun
  });

  if (opts.addresses && opts.addresses.length) {
    runner.loadManualAddresses(opts.addresses);
  } else if (opts.holdersFile) {
    const fs = await import('fs');
    if (!fs.existsSync(opts.holdersFile)) throw new Error('Holders file yok: ' + opts.holdersFile);
    const content = fs.readFileSync(opts.holdersFile, 'utf-8');
    const addresses = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    runner.loadManualAddresses(addresses);
  } else {
    runner.loadSnapshot(); // snapshot/holders.json
  }

  console.log('Airdrop başlıyor. Toplam adres:', runner.getProgress().total);
  console.log('Mint:', runner.getProgress().mint, 'Amount (raw):', runner.getProgress().amount, 'DryRun:', runner.getProgress().dryRun);
  await runner.run();
}

main().catch(e => {
  console.error('Airdrop CLI hata:', e);
  process.exit(1);
});
