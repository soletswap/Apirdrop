import * as dotenv from 'dotenv';
dotenv.config();

function req(name: string, def?: string) {
  const v = process.env[name] ?? def;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const CONFIG = {
  RPC_URL: req('RPC_URL'),
  DEFAULT_OPPO_MINT: req('OPPO_MINT'),
  TARGET_TOKEN_MINT: req('TARGET_TOKEN_MINT'),
  MINT_AUTHORITY_KEYPAIR_PATH: req('MINT_AUTHORITY_KEYPAIR_PATH'),
  DEFAULT_AIRDROP_AMOUNT: BigInt(req('AIRDROP_AMOUNT')),
  PARALLEL_LIMIT: parseInt(req('PARALLEL_LIMIT', '4'), 10),
  COMMIT_INTERVAL: parseInt(req('COMMIT_INTERVAL', '20'), 10),
  DRY_RUN: req('DRY_RUN', 'true') === 'true'
};

console.log('[CONFIG] RPC bağlantısı hazır.');
