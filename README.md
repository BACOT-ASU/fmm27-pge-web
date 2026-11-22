# FMM27 Pre-Game Editor (PWA)

Editor database FMM27 Mobile yang berjalan di browser HP, offline. Rencana lengkap: `PROJECT_CONTEXT.md`. Aturan untuk Claude Code: `CLAUDE.md`.

## Perintah
| Perintah | Fungsi |
|---|---|
| `npm install` | pasang dependensi |
| `npm run dev` | jalankan lokal |
| `npm test` | tes (core dijalankan di Node) |
| `npm run lint` | cek aturan, termasuk `src/core` bebas API browser |
| `npm run build` | build ke `dist/` |

## Struktur
- `src/core/` — logika murni (parser, writer, model). Tanpa API browser.
- `src/platform/` — akses file/penyimpanan per platform (`FileIO`, `Store`).
- `src/ui/` — tampilan React.
- `research/format_specs/` — spesifikasi format (sumber kebenaran).
- `scripts/` — skrip Python (pembanding/golden).
- `legacy/app/` — editor logo lama (acuan, tidak diubah).

Tidak ada file game di repo ini.
