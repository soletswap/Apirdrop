import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';

const ENDPOINT = 'https://api.mainnet-beta.solana.com';

const Inner: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [addressesText, setAddressesText] = useState('');
  const [mint, setMint] = useState('');
  const [amount, setAmount] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [holdersInfo, setHoldersInfo] = useState<{count: number; preview: string[]}|null>(null);

  const refreshStatus = useCallback(async () => {
    const r = await fetch('/api/airdrop/status').then(r => r.json());
    setStatus(r);
  }, []);

  const refreshHolders = useCallback(async () => {
    const r = await fetch('/api/holders').then(r => r.json());
    setHoldersInfo(r);
  }, []);

  useEffect(() => {
    refreshStatus();
    refreshHolders();
    const id = setInterval(() => {
      refreshStatus();
    }, 5000);
    return () => clearInterval(id);
  }, [refreshStatus, refreshHolders]);

  const uploadAddresses = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/holders/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressesText })
      }).then(r => r.json());
      if (resp.error) throw new Error(resp.error);
      await refreshHolders();
      alert('Adresler yüklendi: ' + resp.loaded);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const startAirdrop = async () => {
    setLoading(true);
    try {
      const body: any = { dryRun };
      if (mint.trim()) body.mint = mint.trim();
      if (amount.trim()) body.amount = amount.trim();
      const resp = await fetch('/api/airdrop/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.json());
      if (resp.error) throw new Error(resp.error);
      await refreshStatus();
    } catch (e: any) {
      alert('Airdrop başlatılamadı: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8 }}>
      <WalletMultiButton />
      <div style={{ marginTop: 16 }}>
        <h4>Adres Listesi (Yapıştır)</h4>
        <textarea
          style={{ width: '100%', minHeight: 120 }}
          placeholder="Her satıra bir adres veya virgüllü..."
          value={addressesText}
          onChange={e => setAddressesText(e.target.value)}
        />
        <button disabled={loading} onClick={uploadAddresses}>Adresleri Yükle</button>
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          Yüklendikten sonra snapshot yerine bu liste kullanılır.
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Yüklenen Adres Sayısı:</strong> {holdersInfo?.count ?? 0}
          {holdersInfo?.preview?.length ? (
            <div style={{ fontSize: 11, color: '#666' }}>Örnek: {holdersInfo.preview.join(', ')}</div>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h4>Ayarlar</h4>
        <label style={{ display: 'block', marginBottom: 6 }}>
          Mint (opsiyonel override):<br />
          <input
            style={{ width: '100%' }}
            value={mint}
            onChange={e => setMint(e.target.value)}
            placeholder="Boş bırakırsan .env OPPO_MINT"
          />
        </label>
        <label style={{ display: 'block', marginBottom: 6 }}>
          Amount (raw):<br />
          <input
            style={{ width: '100%' }}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Örn decimals=6 ise 1 token = 1000000"
          />
        </label>
        <label style={{ display: 'block', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={e => setDryRun(e.target.checked)}
          /> DRY RUN (gerçek transfer yapmaz)
        </label>
        <button
          disabled={loading || (status?.running && status?.running === true)}
          onClick={() => {
            if (!dryRun) {
              if (!confirm('Gerçek airdrop başlatılsın mı?')) return;
            }
            startAirdrop();
          }}
        >
          {dryRun ? 'DRY RUN Başlat' : 'GERÇEK AIRDROP Başlat'}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h4>Durum</h4>
        <pre style={{ background: '#f5f5f5', padding: 8, maxHeight: 300, overflow: 'auto' }}>
{JSON.stringify(status, null, 2)}
        </pre>
      </div>
    </div>
  );
};

const ConnectAndAirdrop: React.FC = () => {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Inner />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default ConnectAndAirdrop;
