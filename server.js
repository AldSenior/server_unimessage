const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cookieParser = require("cookie-parser");

const app = express();

const CLIENT_ID = "53263292"; // Замените на ваш Client ID
const CLIENT_SECRET = "xK4loxyZGbRjhC7OjBw2"; // Замените на ваш Client Secret
const REDIRECT_URI = "http://localhost:3000/api/vk/callback"; // Redirect URI для приложения на сервере

app.use(
  cors({
    origin: "https://www.unimessage.ru", // Разрешите доступ только с вашего клиентского домена
    credentials: true, // Разрешите отправку куков и заголовков авторизации
  }),
);
app.use(express.json());
app.use(cookieParser());

// Шаг 1: Генерируем URL для авторизации
app.get("/auth/vk", (req, res) => {
  const authUrl = `https://oauth.vk.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=offline&response_type=code&v=5.131`;
  return res.redirect(authUrl);
});

// Шаг 2: Обработка редиректа после авторизации
app.get("/api/vk/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res
      .status(400)
      .json({ success: false, error: "Authorization code not provided" });
  }

  try {
    const tokenResponse = await axios.get(`https://oauth.vk.com/access_token`, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code,
      },
    });

    const data = tokenResponse.data;

    if (data.error) {
      return res.status(400).json({ success: false, error: data.error });
    }

    // Сохраните токен в куках или сессии
    res.cookie("access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Использовать secure куки только в продакшене
      sameSite: "Strict",
    });

    res.redirect("https://www.unimessage.ru/profile"); // Перенаправление на страницу профиля
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// Запустите сервер
const PORT = process.env.PORT || 3000; // Используйте PORT из окружения
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
