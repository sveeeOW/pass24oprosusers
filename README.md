# PASS24.online — опрос пользователей для Vercel + Google Sheets

Готовый проект для деплоя на Vercel через GitHub/GitLab.  
Форма опроса находится в `public/index.html`. Ответы отправляются в API Vercel, а API сохраняет их в Google Sheet через Google Sheets API.

## Что внутри

```txt
public/index.html          # Опрос + админка
api/submit-survey.js       # Принимает ответ и пишет строку в Google Sheet
api/get-results.js         # Читает ответы из Google Sheet для админки
api/clear-results.js       # Очищает ответы из Google Sheet, оставляя заголовки
lib/googleSheets.js       # Общая логика авторизации, заголовков и преобразования данных
package.json               # Зависимости проекта
.env.example               # Пример переменных окружения
vercel.json                # Пустая конфигурация, чтобы не ломать автоопределение API
```

## Логика работы

```txt
Пользователь заполняет опрос
        ↓
public/index.html вызывает POST /api/submit-survey
        ↓
Vercel Function авторизуется в Google Sheets через service account
        ↓
Ответ добавляется новой строкой в Google Sheet
        ↓
Админка вызывает GET /api/get-results?token=...
        ↓
Таблица, NPS, CSAT, CSI, графики и CSV строятся из Google Sheet
```

## 1. Создать Google Sheet

1. Создай новую таблицу Google Sheets.
2. Скопируй `GOOGLE_SHEET_ID` из URL:

```txt
https://docs.google.com/spreadsheets/d/GOOGLE_SHEET_ID/edit
```

Вкладку можно назвать `Ответы`, но это необязательно: если вкладки с таким названием нет, API создаст её сам.

## 2. Создать service account в Google Cloud

1. Открой Google Cloud Console.
2. Создай проект или выбери существующий.
3. Включи Google Sheets API.
4. Создай Service Account.
5. Создай JSON-ключ для service account.
6. Из JSON нужны два значения:
   - `client_email` → это `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → это `GOOGLE_PRIVATE_KEY`

## 3. Дать доступ service account к Google Sheet

В Google Sheet нажми **Поделиться** и добавь email service account как редактора.

Пример email выглядит примерно так:

```txt
pass24-survey-writer@project-id.iam.gserviceaccount.com
```

Без этого API не сможет писать данные в таблицу.

## 4. Добавить переменные окружения в Vercel

В Vercel открой:

```txt
Project → Settings → Environment Variables
```

Добавь:

```txt
GOOGLE_SHEET_ID=...
GOOGLE_SHEET_TAB=Ответы
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ADMIN_TOKEN=pass24opros24
```

Важно: `ADMIN_TOKEN` — это пароль, который вводится во вкладке «Админка».

Если private key вставляется с реальными переносами строк — нормально. Если вставляется одной строкой с `\n` — тоже нормально, код это поддерживает.

## 5. Загрузить в Git и подключить Vercel

```bash
git init
git add .
git commit -m "Add PASS24 users survey"
git branch -M main
git remote add origin <URL_ТВОЕГО_РЕПОЗИТОРИЯ>
git push -u origin main
```

Далее в Vercel:

```txt
Add New Project → Import Git Repository → Deploy
```

## 6. Проверка после деплоя

1. Открой ссылку Vercel.
2. Заполни тестовый ответ.
3. Проверь, что появилась страница «Спасибо за ответ».
4. Открой Google Sheet — должна появиться новая строка.
5. Открой вкладку «Админка».
6. Введи `ADMIN_TOKEN`.
7. Проверь, что ответы, NPS, CSAT, CSI, графики и экспорт CSV подтянулись из Google Sheet.

## Структура колонок Google Sheet

Таблица создаёт такие заголовки:

```txt
created_at
name
object_name
object_type
role
nps
nps_reason
missing
problems
tg_know
tg_use
improvements_json
csat_json
csi_json
csat_avg
csi_importance_avg
csi_satisfaction_avg
raw_json
```

`csat_json`, `csi_json`, `improvements_json` и `raw_json` нужны, чтобы опрос оставался полностью синхронизированным с фактическими вопросами. Если ты поменяешь вопросы CSAT/CSI в HTML, ответы всё равно сохранятся с текстом вопроса и оценкой.

## Важное замечание

Не публикуй `.env`, JSON-ключ service account и `GOOGLE_PRIVATE_KEY` в репозитории. Они должны храниться только в переменных окружения Vercel.


## Исправление ошибки Vercel `api/*.js`

В этой версии удалён блок `functions` из `vercel.json`. Vercel сам определяет serverless functions из папки `/api`.
Служебный модуль Google Sheets перенесён из `/api/_googleSheets.js` в `/lib/googleSheets.js`, чтобы внутри `/api` остались только реальные endpoints:

```txt
/api/submit-survey.js
/api/get-results.js
/api/clear-results.js
```

Если в старой версии у тебя был `vercel.json` с таким содержимым, его нужно заменить на `{}` или удалить файл полностью:

```json
{
  "functions": {
    "api/*.js": {
      "maxDuration": 10
    }
  }
}
```
