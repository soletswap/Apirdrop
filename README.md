# Solana SPL Token Airdrop Aracı (Güncel)

Bu sürümde dinamik:
- Gönderilecek token mint'i (varsayılan: `OPPO_MINT`)
- Gönderilecek miktar (`amount`)
- Elle adres listesi yükleme / yapıştırma

## 1. Ortam Değişkenleri (.env)

```
RPC_URL=...
OPPO_MINT=OPPO_TOKEN_MINT_ADRESİNİ_GİR      # Varsayılan mint (override edilebilir)
TARGET_TOKEN_MINT=TARGET_TOKEN_MINT_ADRESİNİ_GİR
MINT_AUTHORITY_KEYPAIR_PATH=./mint-authority.json
AIRDROP_AMOUNT=1000000                      # Varsayılan raw amount (override edilebilir)
PARALLEL_LIMIT=6
COMMIT_INTERVAL=20
DRY_RUN=true
```

Not: Override geldiğinde (`mint`, `amount`) ENV yerine gelen değerler kullanılır.

## 2. Adresleri Elle Kullanma

### a) Text dosyası ile
`manual/addresses.txt` dosyası oluştur:
```
Adres1
Adres2
Adres3
```

CLI:
```
npm run airdrop -- --holders manual/addresses.txt --mint <GONDERILECEK_MINT> --amount 250000
```

### b) Komut satırında virgülle
```
npm run airdrop -- --addresses "Adr1,Adr2,Adr3" --amount 500000
```

### c) Web arayüzünde
1. `npm run server`
2. `cd web && npm run dev`
3. Textarea’ya adresleri yapıştır → Yükle → Durumu gör → DRY RUN veya Gerçek Airdrop.

## 3. Snapshot (Opsiyonel)

Adresleri otomatik toplamak istiyorsan:
```
npm run snapshot
```
Airdrop başlatırken adres göndermezsen `snapshot/holders.json` kullanılır.

## 4. Airdrop Çalıştırma (CLI)

Varsayılan ENV değerleriyle:
```
npm run airdrop
```

Override ile:
```
npm run airdrop -- --mint <YENI_MINT> --amount 123000000 --dry-run false
```

Elle adres + override:
```
npm run airdrop -- --addresses "Adr1,Adr2" --mint <MINT> --amount 1000000 --dry-run true
```

## 5. Web API Endpointleri

| Method | Endpoint | Açıklama | Body Örneği |
|--------|----------|----------|-------------|
| POST | /api/holders/load | Adres listesi yükle (textarea’dan) | `{ "addresses": ["Adr1","Adr2"] }` veya `{ "addressesText": "Adr1\nAdr2" }` |
| GET | /api/holders | Geçerli adres listesi (count + preview) | - |
| POST | /api/airdrop/start | Airdrop başlat | `{ "dryRun": true, "mint":"<mint>", "amount": 1000000 }` |
| GET | /api/airdrop/status | Durum | - |

Not: Eğer `/api/holders/load` çağrılmazsa ve snapshot yoksa airdrop hata verir.

## 6. Parametre Açıklamaları

- `mint`: Gönderilecek token (mint authority sende olmalı).
- `amount`: Her adrese gönderilecek raw miktar (ör: decimals=6 ise 1 token = 1_000_000).
- `dryRun`: Transfer yerine sadece log (true/false).
- `addresses` / `addressesText`: Manuel adres girişi.

## 7. Güvenlik

- Private key dosyasını (`mint-authority.json`) commit etme.
- Büyük listelerde `PARALLEL_LIMIT` düşür.
- Helius / özel RPC kullan.

## 8. Örnek Senaryolar

1) Sadece manuel 5 adrese 2 token (decimals=6 → 2_000_000):
```
npm run airdrop -- --addresses "A1,A2,A3,A4,A5" --amount 2000000
```

2) Web arayüzünden DRY RUN başlatıp sonra gerçek airdrop:
- Adresleri yükle → DRY RUN → sonuçları kontrol et → Gerçek Airdrop.

## 9. Bilinen Geliştirme Fikirleri

- Orantılı dağıtım (holder bakiyesine göre)
- Blacklist / whitelist
- Yeniden deneme kuyruğu
- Önce “zaten gönderilmiş mi?” kontrolü

İstersen bunlardan birini ekleyebilirim.
