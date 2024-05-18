const cors = require("cors");
const express = require("express");
const http = require("http");
const OpenAI = require("openai");
require('dotenv').config();


const app = express();

PORT = 8080;

app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const server = http.createServer(app);

app.get("/", (req, res) => {
  res.json("API for upstage");
});

app.post("/upload-text", async (req, res) => {
  const { text } = req.body;
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
  });

  const conversation = [
    {
      role: "system",
      content: '안녕하세요.',
    },
    {
      role: "user",
      content: text,
    },
  ];

  const resultText = await openai.chat.completions.create({
    messages: conversation,
    model: "gpt-4",
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  if (resultText && resultText.choices && resultText.choices.length > 0) {
    res.json({ response: resultText.choices[0].message.content });
  } else {
    res.status(500).json({ error: "Invalid response format from OpenAI API" });
  }
});


app.all("*", (req, res) => {
  res.status(httpStatus.NOT_FOUND).json("Not Found");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
