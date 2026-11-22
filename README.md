# Nexus-Юрист

Правовой помощник с локальной базой законов и подключённой моделью ИИ. Часть экосистемы **Nexus × АутSquad**.

Не заменяет адвоката: даёт нормы, структуру требований и шаги, а решение принимает человек.

![Чат, тема Midnight](screenshots/01-chat-midnight.png)
![Законы, тема Ivory](screenshots/02-laws-ivory.png)
![Документы, тема Aurum](screenshots/03-documents-aurum.png)
![Дела, тема Midnight](screenshots/04-cases-midnight.png)
![Версии и обновления, тема Ivory](screenshots/05-versions-ivory.png)

## Что умеет

- **Консультация.** Ответ по делу со ссылками на статьи: модель получает выдержки из локальной базы (RAG) и обязана цитировать нормы. Без модели работает справочный режим — подбор норм по запросу.
- **Законы.** 16 стран, 228 норм: Конституция РФ, ГК, ТК, УК, КоАП, ЖК, СК, ЗоЗПП, НК, УПК, ГПК, АПК, 127-ФЗ, 152-ФЗ, BGB, Code civil, UCC, Limitation Act, Codice civile, Código Civil, KC, TBK, ГК РК/РБ, ЦК Украины, ГК КНР, Minpō, право ОАЭ и Индии. Поиск по всем странам, импорт своих пакетов JSON.
- **Документы.** Шесть шаблонов: претензия, судебный приказ, трудовое заявление, потребительская претензия, договор аренды, доверенность. Поля подставляются в текст, выгрузка в `.doc`, `.md`, `.txt`.
- **Дела.** Карточки с клиентом, статусом, заметками и вложениями. Всё локально в `%APPDATA%\nexus-lawyer`.
- **Три темы.** Midnight (чёрный + фиолетовый), Ivory (белый + синий), Aurum (графит + золото). Glassmorphism, без «нейрослопного» дефолта.
- **Модель на выбор.** Ollama, llama.cpp, Ada 4B (127.0.0.1:8090), Nexus-Harness (:8848) или любой OpenAI-совместимый API, включая облачный.

## Сборки

| Формат | Файл | Папка |
|---|---|---|
| Portable exe | `nexus-lawyer-1.0.0-portable.exe` | `release-portable-exe/` |
| Portable zip | `nexus-lawyer-1.0.0-portable.zip` | `release-portable-zip/` |
| Установщик NSIS | `nexus-lawyer-setup-1.0.0.exe` | `release-installer/` |

Установщик ставит приложение в пользовательский профиль (без прав администратора), создаёт ярлыки, поддерживает автообновление. Портативные версии не пишут в реестр.

## Обновления и репозиторий версий

- `electron-updater` с провайдером GitHub (`roma1231jjj-cpu/Nexus--lawyer`) или своим generic-сервером (поле «Свой сервер обновлений» в настройках).
- Каналы `stable` / `beta` (prerelease-релизы).
- Журнал версий — `resources/versions.json`, отображается во вкладке «Версии».
- Каждая сборка складывается в `versions/v<версия>/` с манифестом и SHA-256.
- Метаданные обновления `latest.yml` формируются автоматически при сборке установщика.

Чтобы выпустить обновление:

```bash
# поднять версию в package.json и добавить запись в resources/versions.json
npm run dist
# затем выложить в GitHub Releases файлы из release-installer/
#   nexus-lawyer-setup-<версия>.exe
#   nexus-lawyer-setup-<версия>.exe.blockmap
#   latest.yml
```

## Разработка

```bash
npm install
npm run dev      # Vite + Electron
npm run build    # main + renderer
npm run shots    # 5 скриншотов в screenshots/ (три темы)
npm run dist     # portable exe + portable zip + установщик
```

Стек: Electron 33, React 18, TypeScript, Vite, electron-builder. Нативных зависимостей нет.

## Структура

```
electron/        main, preload, база законов, ИИ-клиент, шаблоны, апдейтер
src/             renderer: App, views, темы, CSS
resources/laws/  пакеты законов (JSON), читаются в рантайме
resources/       versions.json — журнал версий
build/           иконки, rcedit для ресурсов exe
scripts/         сборка main, артефактов, скриншоты, иконка
versions/        манифесты выпусков и копии артефактов (локально)
```

## Формат пакета законов

```json
{
  "countries": [{ "code": "KZ", "name": "Казахстан", "flag": "🇰🇿", "region": "СНГ", "system": "…", "languages": "…", "note": "…" }],
  "articles": [{ "id": "kz-gk-178", "country": "KZ", "code": "ГК РК", "codeShort": "ГК РК", "number": "ст. 178", "title": "…", "text": "…", "tags": ["давность"] }]
}
```

Импорт: вкладка «Законы» → «Импорт пакета».

## Лицензия

Код — MIT. Тексты норм — справочные выдержки, сверяйте редакцию на официальных порталах.

Nexus × АутSquad, 2026.
