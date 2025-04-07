const express = require("express");
const cors = require("cors");
const easyvk = require("easyvk");
const app = express();

app.use(
  cors({
    origin: "https://www.unimessage.ru",
    credentials: true,
  }),
);
app.post("/api/exchange-code", async (req, res) => {
  const { code, device_id } = req.body;

  // Обмен кода на токен доступа
  try {
    const response = await axios.get("https://oauth.vk.com/access_token", {
      params: {
        client_id: "53263292", // Замените на ваш client_id
        client_secret: "xK4loxyZGbRjhC7OjBw2", // Замените на ваш client_secret
        redirect_uri: "https://www.unimessage.ru/messages", // URL перенаправления
        code: code,
        device_id: device_id,
      },
    });

    return res.json(response.data); // Отправляем данные о токене обратно клиенту
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return res.status(500).json({ error: "Failed to exchange code for token" });
  }
});
app.use(express.json());

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
