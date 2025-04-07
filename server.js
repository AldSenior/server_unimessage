const express = require("express");
const cors = require("cors");
const easyvk = require("easyvk");
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "https://www.unimessage.ru",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"], // Добавлено
    allowedHeaders: ["Content-Type"], // Добавлено
  }),
);

// Эндпоинт для обмена кода на токен
app.post("/api/exchange-code", async (req, res) => {
  const { code } = req.body; // device_id не нужен для VK API

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const response = await axios.get("https://oauth.vk.com/access_token", {
      params: {
        client_id: 53263292,
        client_secret: "xK4loxyZGbRjhC7OjBw2",
        redirect_uri: "https://www.unimessage.ru/messages",
        code: code,
        // device_id не используется в VK OAuth
      },
    });

    return res.json(response.data);
  } catch (error) {
    console.error(
      "Error exchanging code:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      error: "Failed to exchange code",
      details: error.response?.data || error.message,
    });
  }
});

// Эндпоинт для получения сообщений
app.post("/api/messages", async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(401).json({
        success: false,
        error: "Access token is required",
      });
    }

    // Используем easyvk для работы с VK API
    const vk = await easyvk({
      access_token,
      v: "5.131",
    });

    // Получаем сообщения
    const conversations = await vk.call("messages.getConversations", {
      count: 20,
      extended: 1,
    });

    // Получаем информацию о пользователях
    const userIds = conversations.items
      .map((item) => item.conversation.peer.id)
      .filter((id) => id > 0);

    const usersInfo =
      userIds.length > 0
        ? await vk.call("users.get", {
            user_ids: userIds.join(","),
            fields: "photo_100,first_name,last_name",
          })
        : [];

    res.json({
      success: true,
      data: {
        conversations: conversations.items,
        profiles: usersInfo,
        count: conversations.count,
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
