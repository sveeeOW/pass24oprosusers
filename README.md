# PASS24.online — опрос пользователей, версия с исправленной передачей demo/ответов

В этой версии исправлена ошибка `Required fields are missing`: Vercel теперь дублирует данные и в `payload`, и в прямых form-полях, а Apps Script умеет читать оба формата.

**Важно:** после загрузки файлов в GitHub нужно также заменить код в Google Apps Script на `apps-script/Code.gs` и сделать новый деплой: `Deploy → Manage deployments → Edit → Version → New version → Deploy`. Без нового деплоя Google будет выполнять старый код.

# PASS24.online — опрос пользователей для Vercel + Google Apps Script

Проект сохраняет ответы опроса в Google Sheet через Google Apps Script Web App.

## Что исправлено в этой версии

1. Vercel отправляет данные в Apps Script через `application/x-www-form-urlencoded`, а не через сырой JSON.
2. Редирект Google Apps Script обрабатывается вручную: POST не превращается в GET.
3. Добавлен диагностический endpoint `/api/debug-appscript`.
4. Ошибки отправки теперь показываются подробнее.

## Структура

```txt
public/index.html
api/submit-survey.js
api/get-results.js
api/clear-results.js
api/debug-appscript.js
lib/appsScriptClient.js
apps-script/Code.gs
package.json
vercel.json
```

## Важно

Недостаточно только загрузить новый Vercel-проект. Нужно также заменить код в Google Apps Script на содержимое файла:

```txt
apps-script/Code.gs
```

После замены кода Apps Script обязательно сделай новый деплой:

```txt
Apps Script → Deploy → Manage deployments → Edit → Version → New version → Deploy
```

Если не создать новую версию деплоя, Vercel будет обращаться к старому коду Apps Script.

## Пароль админки

```txt
pass24opros24
```

## Apps Script URL

В код уже вставлен URL:

```txt
https://script.google.com/macros/s/AKfycbzfCubdL0GqzT7Xc93Vb8wkbNZl36PAEQJonE2V_N_5O2Hx-tw9uzVyOiJvX9SLlk0Z/exec
```

Если в Vercel есть переменная `APPS_SCRIPT_URL`, она может переопределить URL из кода. Лучше указать там тот же URL или удалить старую неправильную переменную.

## Проверка после деплоя

1. Открой:

```txt
https://твой-домен.vercel.app/api/debug-appscript
```

Должно вернуться:

```json
{"ok":true,"ping":{"ok":true,"message":"PASS24 users survey Apps Script is working"},"postTest":null}
```

2. Для проверки записи открой:

```txt
https://твой-домен.vercel.app/api/debug-appscript?write=1
```

После этого в Google Sheet должна появиться строка `DEBUG`.

3. Потом проверь обычную форму опроса и кнопку `Добавить демо-данные`.

## Обновление 2026-05-20: исправление ложной ошибки 405 при добавлении демо-данных

Если демо-данные появляются в Google Sheet, но интерфейс показывает ошибку `Apps Script вернул не JSON. HTTP 405`, причина в редиректе Google Apps Script на `googleusercontent`.

В этой версии исправлено:

- Vercel больше не повторяет `POST` на redirect-URL `googleusercontent`.
- Для редиректа 301/302/303 Vercel делает `GET` на Location, как ожидает Apps Script.
- Если Google всё равно отдаёт HTML вместо JSON после успешного POST, Vercel считает запись успешной и админка перечитывает Google Sheet.
- Кнопка «Добавить демо-данные» теперь добавляет все 3 демо-ответа одним запросом `/api/seed-demo`, а не тремя отдельными POST.
- После добавления демо-данных админка автоматически обновляет таблицу и графики.
- `apps-script/Code.gs` обновлён: русские заголовки столбцов, поддержка `seedDemo`, `debugWrite`, `clearResponses`, `getResponses`.

После загрузки файлов в GitHub обязательно обнови Apps Script:

1. Открой Google Sheet → Расширения → Apps Script.
2. Замени код на содержимое `apps-script/Code.gs`.
3. Сделай новый деплой: Deploy → Manage deployments → Edit → Version → New version → Deploy.


## Обновление: стабильные действия админки

Кнопки `Добавить демо-данные`, `Очистить ответы` и диагностическая запись теперь вызывают Apps Script через GET-действия (`seedDemo`, `clearResponses`, `debugWrite`). Это убирает ложные ошибки `HTTP 405 / Page Not Found`, которые появлялись из-за POST-redirect в Google Apps Script.


## Изменение в версии tg-required

Поле «Знаете ли вы о возможности заказать пропуск в Telegram-боте?» сделано обязательным для заполнения на уровне фронтенд-валидации. Логика Apps Script и Google Sheets не менялась.
