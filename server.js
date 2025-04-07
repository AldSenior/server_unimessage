const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "https://www.unimessage.ru",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

const VK_CONFIG = {
  clientId: "53263292",
  clientSecret: "xK4loxyZGbRjhC7OjBw2",
  redirectUri: "https://www.unimessage.ru/messages",
};

app.post("/api/exchange-code", async (req, res) => {
  const { code, code_verifier, device_id } = req.body;

  if (!code || !code_verifier) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Missing required parameters",
    });
  }

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("client_id", VK_CONFIG.clientId);
    params.append("client_secret", VK_CONFIG.clientSecret);
    params.append("code", code);
    params.append("code_verifier", code_verifier);
    params.append("redirect_uri", VK_CONFIG.redirectUri);
    if (device_id) params.append("device_id", device_id);

    const response = await axios.post("https://id.vk.com/oauth2/auth", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (response.data.error) {
      return res.status(400).json(response.data);
    }

    res.json({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      user_id: response.data.user_id,
    });
  } catch (error) {
    console.error("VK API Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "server_error",
      error_description:
        error.response?.data?.error_description || error.message,
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
