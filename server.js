const express = require("express");
const cors = require("cors");
const easyvk = require("easyvk");
const app = express();
const axios = require("axios");

app.use(express.json());
app.use(
  cors({
    origin: "https://www.unimessage.ru",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"], // Добавлено
    allowedHeaders: ["Content-Type"], // Добавлено
  }),
);
const VK_CONFIG = {
  clientId: "53263292",
  clientSecret: "xK4loxyZGbRjhC7OjBw2",
  redirectUri: "https://www.unimessage.ru/messages",
};

app.post("/api/exchange-code", async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Authorization code is required and must be a string",
    });
  }

  try {
    const params = new URLSearchParams();
    params.append("client_id", VK_CONFIG.clientId);
    params.append("client_secret", VK_CONFIG.clientSecret);
    params.append("redirect_uri", VK_CONFIG.redirectUri);
    params.append("code", code);

    console.log("Sending request to VK with params:", params.toString());

    const response = await axios.post(
      "https://oauth.vk.com/access_token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    console.log("VK response:", response.data);

    if (response.data.error) {
      return res.status(400).json({
        error: response.data.error,
        error_description: response.data.error_description,
      });
    }

    return res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      user_id: response.data.user_id,
    });
  } catch (error) {
    console.error("Full error:", error);

    const errorData = error.response?.data || {
      error: "server_error",
      error_description: error.message,
    };

    return res.status(500).json(errorData);
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
