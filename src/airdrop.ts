import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { CONFIG } from './config.js';
import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import { loadKeypair, ensureAtaIx, sendTx } from './utils/solana.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

interface Holder { owner: string; amount?: string; }

export interface AirdropProgress {
  total: number;
  sent: number;
  failed: number;
  dryRun: boolean;
  running: boolean;
  mint: string;
  amount: string;
  errors: { owner: string; error: string }[];
  sourceAta?: string;
  manual: boolean;
}

export class AirdropRunner {
  private connection: Connection;
  private mintAuthority = loadKeypair(CONFIG.MINT_AUTHORITY_KEYPAIR_PATH);
  private mintPk!: PublicKey;
  private amount!: bigint;
  private holders: Holder[] = [];
  private manual = false;

  private progress: AirdropProgress = {
    total: 0, sent: 0, failed: 0, dryRun: CONFIG.DRY_RUN, running: false,
    mint: '', amount: '0', errors: [], manual: false
  };

  constructor() {
    this.connection = new Connection(CONFIG.RPC_URL, 'confirmed');
  }

  configure(params: { mint?: string; amount?: bigint; dryRun?: boolean }) {
    this.mintPk = new PublicKey(params.mint || CONFIG.DEFAULT_OPPO_MINT);
    this.amount = params.amount ?? CONFIG.DEFAULT_AIRDROP_AMOUNT;
    if (typeof params.dryRun === 'boolean') this.progress.dryRun = params.dryRun;
    this.progress.mint = this.mintPk.toBase58();
    this.progress.amount = this.amount.toString();
  }

  loadSnapshot(file = 'snapshot/holders.json') {
    if (!fs.existsSync(file)) throw new Error('Snapshot dosyası yok: ' + file);
    this.holders = JSON.parse(fs.readFileSync(file, 'utf-8'));
    this.progress.total = this.holders.length;
    this.manual = false;
    this.progress.manual = false;
  }

  loadManualAddresses(addresses: string[]) {
    const clean = addresses
      .map(a => a.trim())
      .filter(a => a.length > 0);
    this.holders = Array.from(new Set(clean)).map(a => ({ owner: a }));
    this.progress.total = this.holders.length;
    this.manual = true;
    this.progress.manual = true;
  }

  getProgress() {
    return this.progress;
  }

  getCurrentAddresses() {
    return this.holders.map(h => h.owner);
  }

  async run() {
    if (!this.holders.length) throw new Error('Adres listesi boş.');
    if (!this.mintPk) throw new Error('Mint ayarlanmamış. configure() çağır.');
    this.progress.running = true;

    const logDir = 'logs';
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, `airdrop-${Date.now()}.log`);
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });

    const limit = pLimit(CONFIG.PARALLEL_LIMIT);
    const authorityAta = await getAssociatedTokenAddress(this.mintPk, this.mintAuthority.publicKey);
    this.progress.sourceAta = authorityAta.toBase58();

    let index = 0;
    const tasks = this.holders.map(holder =>
      limit(async () => {
        const ownerPk = new PublicKey(holder.owner);
        const current = ++index;
        try {
            const { ata, ix } = await ensureAtaIx(this.connection, this.mintPk, ownerPk, this.mintAuthority.publicKey);
          const tx = new Transaction();
          if (ix) tx.add(ix);
          tx.add(
            createTransferInstruction(
              authorityAta,
              ata,
              this.mintAuthority.publicKey,
              Number(this.amount)
            )
          );
          if (this.progress.dryRun) {
            logStream.write(`[DRY_RUN] ${holder.owner}\n`);
          } else {
            const sig = await sendTx(this.connection, tx, this.mintAuthority);
            logStream.write(`${holder.owner},${sig}\n`);
          }
          this.progress.sent++;
          if (current % 50 === 0) {
            console.log(`İlerleme: ${current}/${this.holders.length}`);
          }
        } catch (e: any) {
          this.progress.failed++;
          this.progress.errors.push({ owner: holder.owner, error: e.message });
          logStream.write(`ERROR,${holder.owner},${e.message}\n`);
        }
      })
    );

    await Promise.all(tasks);
    logStream.end();
    this.progress.running = false;
    console.log('Airdrop bitti. Başarılı:', this.progress.sent, 'Hatalı:', this.progress.failed);
  }
}
