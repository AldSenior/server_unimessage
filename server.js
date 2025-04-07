const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const app = express();
const easyvk = require("easyvk");

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'self'", "https://vk.com", "https://*.vk.com"],
    },
  }),
);

app.use(
  cors({
    origin: "https://www.unimessage.ru",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.post("/api/vk/exchange-code", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: "Authorization code not provided",
    });
  }

  try {
    const tokenResponse = await axios.get("https://oauth.vk.com/access_token", {
      params: {
        client_id: "53263292",
        client_secret: "xK4loxyZGbRjhC7OjBw2",
        redirect_uri: "https://www.unimessage.ru/messages",
        code,
      },
    });

    const data = tokenResponse.data;

    res.cookie("vk_access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: data.expires_in * 1000,
    });

    res.json({
      success: true,
      data: {
        user_id: data.user_id,
        expires_in: data.expires_in,
      },
    });
  } catch (error) {
    console.error("Error while exchanging code:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_description || "Server error",
    });
  }
});

app.get("/api/messages", async (req, res) => {
  try {
    const accessToken = req.cookies.vk_access_token;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const vk = await easyvk({
      access_token: accessToken,
      v: "5.131",
    });

    const conversations = await vk.call("messages.getConversations", {
      count: 20,
      extended: 1,
    });

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
