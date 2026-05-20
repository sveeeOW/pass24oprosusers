# PASS24 — Опрос пользователей через Apps Script

Готовая версия с уже вставленным Web App URL:

```txt
https://script.google.com/macros/s/AKfycbzfCubdL0GqzT7Xc93Vb8wkbNZl36PAEQJonE2V_N_5O2Hx-tw9uzVyOiJvX9SLlk0Z/exec
```

Пароль админки: `pass24opros24`.

Если в Vercel ранее была задана неправильная переменная `APPS_SCRIPT_URL` вида `script.googleusercontent.com/macros/echo?...`, эта версия её игнорирует и использует URL выше.

# PASS24.online — Опрос пользователей через Vercel + Google Apps Script

Проект публикуется на Vercel и сохраняет ответы в Google Sheets через Google Apps Script Web App.

## Что исправлено в этой версии

- Вход в админку больше не показывает «неверный пароль», если проблема на стороне Google Sheet / Apps Script.
- Кнопка «Добавить демо-данные» теперь показывает понятную ошибку, если Apps Script URL указан неправильно.
- Кнопка «⬇ Экспорт CSV» теперь всегда срабатывает: если данные не загрузились, выгружается CSV-шаблон с заголовками.
- Убрана попытка использовать временный `script.googleusercontent.com/macros/echo?...` как рабочий API URL.

## Структура

```txt
public/index.html          # Опрос + админка
api/submit-survey.js       # Прокси Vercel для записи ответа в Apps Script
api/get-results.js         # Прокси Vercel для чтения ответов из Apps Script
api/clear-results.js       # Прокси Vercel для очистки ответов
apps-script/Code.gs        # Код Google Apps Script для вставки в Google Sheet
package.json
.env.example
vercel.json
```

## Главный важный момент

Для `APPS_SCRIPT_URL` нужен именно стабильный Web App URL из Apps Script:

```txt
https://script.google.com/macros/s/AKfycbzfCubdL0GqzT7Xc93Vb8wkbNZl36PAEQJonE2V_N_5O2Hx-tw9uzVyOiJvX9SLlk0Z/exec
```

Нельзя использовать URL такого вида:

```txt
https://script.googleusercontent.com/macros/echo?user_content_key=...
```

`script.googleusercontent.com/macros/echo?...` — это временный redirect/echo-адрес ответа, а не стабильный endpoint для записи и чтения данных.

## Переменные Vercel

В Vercel → Project → Settings → Environment Variables добавь:

```txt
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbzfCubdL0GqzT7Xc93Vb8wkbNZl36PAEQJonE2V_N_5O2Hx-tw9uzVyOiJvX9SLlk0Z/exec
ADMIN_TOKEN=pass24opros24
```

Пароль админки в коде уже зафиксирован как:

```txt
pass24opros24
```

## Как получить правильный Apps Script URL

1. Открой Google Sheet.
2. Перейди в `Extensions → Apps Script` / `Расширения → Apps Script`.
3. Вставь код из `apps-script/Code.gs`.
4. Нажми `Deploy → New deployment`.
5. Тип деплоя: `Web app`.
6. `Execute as`: `Me`.
7. `Who has access`: `Anyone` или `Anyone with the link`.
8. Нажми `Deploy`.
9. Скопируй именно `Web app URL`.
10. Он должен заканчиваться на `/exec`.

Если деплой уже создан:

```txt
Deploy → Manage deployments → Web app URL
```

## Проверка Apps Script

Открой Web App URL в браузере. Должен вернуться JSON:

```json
{"ok":true,"message":"PASS24 users survey Apps Script is working"}
```

Если видишь HTML, ошибку доступа или пустую страницу — деплой Apps Script настроен неправильно.

## Проверка записи

1. В Apps Script запусти функцию `testAppendResponse` вручную.
2. В Google Sheet должна появиться тестовая строка.
3. После этого открой сайт на Vercel и отправь тестовый ответ.
4. Новая строка должна появиться в Google Sheet.

## Колонки Google Sheet

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
