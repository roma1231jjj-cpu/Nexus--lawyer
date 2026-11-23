# Nexus-Lawyer

**English** · [Русская версия →](README.md)

A legal assistant with a local law database and a connected AI model. Part of the **Nexus × АутSquad** ecosystem.

We do not replace a lawyer: the app gives you the norms, the structure of a claim and the next steps, and a human makes the decision.

The interface is bilingual — Russian and English, switching is instant and needs no restart.

| English interface | Русский интерфейс |
|---|---|
| ![Consultation, Midnight theme](docs/screenshots/en-chat.png) | ![Консультация, тема Midnight](docs/screenshots/ru-chat.png) |
| ![Documents, Aurum theme](docs/screenshots/en-docs.png) | ![Документы, тема Aurum](docs/screenshots/ru-docs.png) |
| ![Settings, Ivory theme](docs/screenshots/en-settings.png) | ![Настройки, тема Ivory](docs/screenshots/ru-settings.png) |

## Interface language

- The **RU / EN** switch lives in Settings, in the Interface block. It applies instantly: menus, headings, buttons, hints, errors and placeholders all change.
- The choice is stored in `localStorage` (`nl-lang`) and in the settings file, so the next launch opens in the selected language. Russian is the default.
- Switching the interface language also sets the answer language of the model; the separate Answer language option lets us keep an English interface with Russian, English or German answers.
- Russian-law forms (`electron/docs.ts`) and the wording of norms (`electron/laws.ts`, `resources/laws/*.json`) stay in Russian in any interface language — that is the content of Russian law, not UI labels. The English Documents screen says so explicitly.
- The demo conversation on the Consultation screen is served in the selected language as well.

## What it does

- **Consultation.** An answer with references to articles: the model receives excerpts from the local database (RAG) and must cite the norms. Without a model the reference mode still finds the relevant norms for a query.
- **Laws.** 16 countries, 228 norms: the Russian Constitution, civil, labour, criminal, administrative, housing, family, tax and procedural codes, consumer protection, BGB, Code civil, UCC, Limitation Act, Codice civile, Código Civil, KC, TBK, the civil codes of Kazakhstan, Belarus, Ukraine and China, Minpō, UAE and Indian law. Search across all countries, import your own JSON packs.
- **Documents.** Six templates: pre-trial claim, court order application, labour application, consumer claim, lease agreement, power of attorney. Fields are substituted into the text, export to `.doc`, `.md`, `.txt`.
- **Cases.** Cards with client, status, notes and attachments. Everything stays local in `%APPDATA%\nexus-lawyer`.
- **Three themes.** Midnight (black + violet), Ivory (white + blue), Aurum (graphite + gold). Glassmorphism, no generic AI-looking default.
- **Model of your choice.** Ollama, llama.cpp, Ada 4B (127.0.0.1:8090), Nexus-Harness (:8848) or any OpenAI-compatible API, cloud included.

## Install

| Format | File | Folder |
|---|---|---|
| Portable exe | `nexus-lawyer-1.0.0-portable.exe` | `release-portable-exe/` |
| Portable zip | `nexus-lawyer-1.0.0-portable.zip` | `release-portable-zip/` |
| NSIS installer | `nexus-lawyer-setup-1.0.0.exe` | `release-installer/` |

The portable builds only need to be unpacked and run — they do not touch the registry. The installer puts the app into the user profile (no administrator rights), creates shortcuts and supports auto-updates.

From source:

```bash
npm install
npm run dev      # Vite + Electron
npm run build    # main + renderer
```

## Updates and release repository

- `electron-updater` with the GitHub provider (`roma1231jjj-cpu/Nexus--lawyer`) or a custom generic server (the Custom update server field in Settings).
- `stable` / `beta` (prerelease) channels.
- The version log lives in `resources/versions.json` and is shown in the Versions tab.
- Every build is copied to `versions/v<version>/` together with a manifest and SHA-256.
- The `latest.yml` update metadata is generated when the installer is built.
- Auto-update works in the installed build (in-app download, install, restart). Portable builds are updated by replacing the exe — use the “releases on GitHub” button in the Versions tab.

To ship an update:

```bash
# bump the version in package.json and add an entry to resources/versions.json
npm run dist
# then upload the files from release-installer/ to GitHub Releases
#   nexus-lawyer-setup-<version>.exe
#   nexus-lawyer-setup-<version>.exe.blockmap
#   latest.yml
```

## Development

```bash
npm install
npm run dev      # Vite + Electron
npm run build    # main + renderer
npm run shots    # 5 screenshots into screenshots/ (three themes)
npm run dist     # portable exe + portable zip + installer
```

Stack: Electron 33, React 18, TypeScript, Vite, electron-builder. No native dependencies.

Localization layer: `src/i18n/ru.ts` and `src/i18n/en.ts` (the key type is derived from the Russian dictionary), `src/i18n/index.ts` — `t()`, `useT()`, `useLang()`, locale-aware date formatting. The main process uses `electron/i18n/` (model prompt, reference answer, dialogs, updater messages).

Open the interface in a plain browser (no Electron): `npx vite --port 5182`. When `window.nexus` is missing, the renderer starts the demo bridge `src/mock.ts` and reads the law database straight from `resources/laws/*.json` — handy for layout work and screenshots.

## Layout

```
electron/        main, preload, law database, AI client, templates, updater, i18n
src/             renderer: App, views, i18n, themes, CSS
resources/laws/  law packs (JSON), read at runtime
resources/       versions.json — version log
build/           icons, rcedit resources for the exe
scripts/         main build, artifacts, screenshots, icon
docs/screenshots RU/EN screenshots for the READMEs
versions/        release manifests and artifact copies (local)
```

## Law pack format

```json
{
  "countries": [{ "code": "KZ", "name": "Kazakhstan", "flag": "🇰🇿", "region": "CIS", "system": "…", "languages": "…", "note": "…" }],
  "articles": [{ "id": "kz-gk-178", "country": "KZ", "code": "Civil Code of Kazakhstan", "codeShort": "CC KZ", "number": "art. 178", "title": "…", "text": "…", "tags": ["limitation"] }]
}
```

Import: Laws tab → “Import a pack”.

## License

Code is MIT. The wording of norms is a reference excerpt — always check the current edition on the official portals.

Nexus × АутSquad, 2026.
