# NOVA AI LAB

Интерактивный курс по искусственному интеллекту для шестого класса. Включает 12 миссий, игры и практический финал «Спаси перемену».

[Открыть курс в браузере](https://ai-school-grade6-beta.neatboot130.chatgpt.site/)

## Локальный запуск

Требуются Node.js и Python 3.

```sh
npm test
npm run build:grade6
python3 -m http.server 8000 --directory dist
```

Затем откройте http://localhost:8000. Прогресс хранится в браузере. На карте есть кнопка «Начать заново».
