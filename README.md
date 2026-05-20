# PASS24.online — Опрос пользователей через Vercel + Google Apps Script

Этот проект публикуется на Vercel и сохраняет ответы в Google Sheets через Google Apps Script Web App.

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

## Переменные Vercel

```txt
APPS_SCRIPT_URL=https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnQyLLfbuF_FETAgqCjZCekC1Sg0GO9og_v32is70bj61TJlZDjHRaHENnPW-VoyrJe8RKI3gN1MYoNAej58RDH_QywIcGuHqrzqmSiYUToNyhymKMjQNgdV3Gv2FoBdF0KFVGJ3VO8HD-Jc3NbdpkIAlTN4bLUwyMIDPvOwhS4FFj5gqH5PO_-_AU4TusoHu4DEAo2D2xz7Ll5Hsol9IvkeRi5kTOTsOChJH5ppe3xuKw3Ye8sjhFRWStcSDeL-wAagO9tkNnZcd4VHtB-5ZhcYyfaWuQ&lib=MoK-R-c2tF-A5VYYTn99JYUpRjWXLvCQ_
ADMIN_TOKEN=pass24opros24
```

## Уже вставленный Apps Script URL

В API-файлах уже прописан резервный URL Apps Script, который ты прислал:

```txt
https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnQyLLfbuF_FETAgqCjZCekC1Sg0GO9og_v32is70bj61TJlZDjHRaHENnPW-VoyrJe8RKI3gN1MYoNAej58RDH_QywIcGuHqrzqmSiYUToNyhymKMjQNgdV3Gv2FoBdF0KFVGJ3VO8HD-Jc3NbdpkIAlTN4bLUwyMIDPvOwhS4FFj5gqH5PO_-_AU4TusoHu4DEAo2D2xz7Ll5Hsol9IvkeRi5kTOTsOChJH5ppe3xuKw3Ye8sjhFRWStcSDeL-wAagO9tkNnZcd4VHtB-5ZhcYyfaWuQ&lib=MoK-R-c2tF-A5VYYTn99JYUpRjWXLvCQ_
```

Идентификатор скрипта:

```txt
1M9_d6LGViAgBquXEwNhWkpo1jqiDhWAdJ1dIodIQHNhscoxU0wS7SSA4
```

Vercel сначала будет брать `APPS_SCRIPT_URL` из Environment Variables. Если переменная не задана, будет использоваться URL, вставленный прямо в код. Рекомендуемый вариант — всё равно добавить этот же URL в Vercel как `APPS_SCRIPT_URL`, чтобы потом менять его без правки кода.

## Подключение Google Sheet

1. Создай Google Sheet.
2. Назови вкладку `Ответы` или оставь любую — скрипт сам создаст вкладку `Ответы`.
3. Открой `Extensions → Apps Script`.
4. Вставь код из `apps-script/Code.gs`.
5. Сохрани проект.
6. Нажми `Deploy → New deployment`.
7. Тип деплоя: `Web app`.
8. `Execute as`: `Me`.
9. `Who has access`: `Anyone` или `Anyone with the link`.
10. Скопируй Web App URL, который заканчивается на `/exec`.
11. Добавь этот URL в Vercel как `APPS_SCRIPT_URL`.
12. Добавь `ADMIN_TOKEN=pass24opros24`.
13. Сделай redeploy проекта на Vercel.

## Проверка

1. Открой Web App URL Apps Script в браузере. Должен вернуться JSON:

```json
{"ok":true,"message":"PASS24 users survey Apps Script is working"}
```

2. В Apps Script запусти функцию `testAppendResponse` вручную. В таблице должна появиться тестовая строка.
3. Открой сайт на Vercel и отправь тестовый ответ.
4. Открой админку, введи пароль `pass24opros24` и проверь, что данные подтянулись из таблицы.

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

JSON-поля сохраняют полную структуру ответов. Поэтому если вопросы CSAT/CSI изменятся, старые ответы всё равно сохранят текст вопроса и оценку.


## Исправление входа в админку

Пароль админки зафиксирован в проекте как `pass24opros24`. Проверка пароля теперь выполняется локально в `public/index.html`, а серверные API-файлы также используют этот же пароль напрямую. Это сделано специально, чтобы старая или ошибочная переменная `ADMIN_TOKEN` в Vercel не блокировала вход и не показывала ложное сообщение «неверный пароль».

Если после входа появляется сообщение, что пароль принят, но данные не загрузились, проблема уже не в пароле, а в `APPS_SCRIPT_URL` или в деплое Apps Script. В этом случае нужно взять стабильный Web App URL из Apps Script: `Deploy → Manage deployments → Web app URL`. Обычно он выглядит как `https://script.google.com/macros/s/.../exec`.
