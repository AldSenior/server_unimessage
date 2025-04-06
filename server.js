const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const app = express();

// Настройки для VK
const CLIENT_ID = "53263292"; // Ваш Client ID
const CLIENT_SECRET = "xK4loxyZGbRjhC7OjBw2"; // Ваш Client Secret
const REDIRECT_URI = "https://server-unimessage.onrender.com/api/vk/callback"; // Redirect URI

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: [
        "'self'",
        "https://vk.com",
        "https://*.vk.com",
        "https://*.my.games",
      ],
    },
  }),
);

// Настройки CORS
app.use(
  cors({
    origin: "https://www.unimessage.ru", // Разрешите доступ только с вашего клиентского домена
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Шаг 1: Генерация URL для авторизации
app.get("/auth/vk", (req, res) => {
  const authUrl = `https://oauth.vk.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=offline&response_type=code&v=5.131`;
  return res.redirect(authUrl);
});

// Шаг 2: Обработка кода аутентификации
app.post("/api/vk/exchange-code", async (req, res) => {
  const { code, device_id } = req.body;

  if (!code) {
    return res
      .status(400)
      .json({ success: false, error: "Authorization code not provided" });
  }

  try {
    const tokenResponse = await axios.get("https://oauth.vk.com/access_token", {
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

    // Сохраните токен в куки
    res.cookie("access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    // Возврат успешного ответа
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error while exchanging code:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
