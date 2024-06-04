require("dotenv").config();
const token = process.env.TOKEN || "";
const Discord = require("discord.js");
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const cors = require("cors");
const { GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const util = require("util");
const readFile = util.promisify(fs.read);
const request = require("request");
const path = require("path");

const client = new Discord.Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const TextChannelId = process.env.TEXT_CHANNEL_ID || "";
const FileChannelId = process.env.FILE_CHANNEL_ID || "";

async function sendText(text) {
  const channelId = TextChannelId;
  if (!channelId || !text) {
    throw new Error("Invalid request body");
  }

  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  await channel.send(text);

  return "Texts sent successfully";
}

async function sendFileChunksToChannel(fileChunks, file) {
  console.log(file);
  const channelId = FileChannelId;

  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }
  var str = "file_name:" + file.originalname + "\n" + file.mimetype + "\n";
  sendText(str);
  await Promise.all(
    fileChunks.map(async (chunk, index) => {
      const filedata = await channel.send({
        files: [{ attachment: chunk, name: `part_${index}.bin` }],
      });
      console.log(filedata);
      sendText(filedata.attachments.first().url);
      console.log(filedata.attachments.first().url);
      console.log(`Sent chunk ${index}/${fileChunks.length}`);
    })
  );

  console.log("All chunks sent successfully");
}

async function sendFileAsSingleChunk(file) {
  const channelId = FileChannelId;
  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  // Send the file as a single chunk
  const filedata = await channel.send({
    files: [file.path],
  });
  await sendText(`file_name:${file.originalname}\n${file.mimetype}`);
  await sendText(filedata.attachments.first().url);

  // Delete the file from the uploads folder
  fs.unlinkSync(file.path);

  return filedata;
}

function combineFilesAndRename(folderPath, ext) {
  // Read files in the folder
  const files = fs
    .readdirSync(folderPath)
    .filter((file) => fs.statSync(path.join(folderPath, file)).isFile())
    .sort((a, b) => {
      const numA = parseInt(a.split("part_")[1]);
      const numB = parseInt(b.split("part_")[1]);
      return numA - numB;
    });
  console.log(files);

  // Combine files into one final file
  const finalFilePath = path.join(folderPath, "finalfile" + "." + ext);
  const outputStream = fs.createWriteStream(finalFilePath);

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
    const fileContent = fs.readFileSync(filePath);
    outputStream.write(fileContent);
  });

  outputStream.end();

  console.log("Final file created:", finalFilePath);

  // Delete all files except the final file
  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
    if (filePath !== finalFilePath) {
      fs.unlinkSync(filePath);
      console.log("Deleted:", filePath);
    }
  });

  console.log("All files except final file deleted.");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
const upload = multer({ dest: "uploads/" });

const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());
client.login(token).then(() => {
  console.log("Bot logged in");
});

// Function to fetch messages from a channel
async function fetchMessages() {
  const channelId = TextChannelId;
  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  let messages = [];
  let lastMessageId = null;

  while (true) {
    const fetchedMessages = await channel.messages.fetch({
      limit: 100,
      before: lastMessageId,
    });

    if (fetchedMessages.size === 0) {
      // No more messages to fetch
      break;
    }

    fetchedMessages.forEach((msg) => {
      messages.push(msg.content);
    });

    // Update the last message id
    lastMessageId = fetchedMessages.last().id;
  }

  return messages.reverse();
}

app.post("/sendfile", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).send("Invalid request body");
    }
    console.log(file);

    const fileStats = fs.statSync(file.path);
    const fileSize = fileStats.size;
    const maxChunkSize = 8 * 1024 * 1024; // 8 MB

    if (fileSize <= maxChunkSize) {
      await sendFileAsSingleChunk(file);
      return res.send({ res: "File sent successfully" });
    }

    // File size exceeds 8 MB, slice it into chunks
    const totalChunks = Math.ceil(fileSize / maxChunkSize);
    const fileChunks = [];

    // Open the file for reading
    const fd = fs.openSync(file.path, "r");

    // Read and save file chunks
    for (let i = 0; i < totalChunks; i++) {
      const buffer = Buffer.alloc(maxChunkSize);
      const { bytesRead } = fs.readSync(
        fd,
        buffer,
        0,
        maxChunkSize,
        i * maxChunkSize
      );
      const chunkPath = `uploads/${file.filename}_part_${i}`;
      fs.writeFileSync(chunkPath, buffer.slice(0, bytesRead));
      fileChunks.push(chunkPath);
    }

    // Close the file descriptor
    fs.closeSync(fd);

    // Send file chunks to Discord channel concurrently
    await sendFileChunksToChannel(fileChunks, file);

    // Delete file chunks
    fileChunks.forEach((chunkPath) => fs.unlinkSync(chunkPath));

    // Delete the original file from the uploads folder
    fs.unlinkSync(file.path);

    return res.send({ res: "File sent successfully" });
  } catch (error) {
    console.error("Error sending file:", error.message);
    res.status(500).send({ res: "File sent error" });
  }
});

// Endpoint for getting texts
app.get("/gettexts", async (req, res) => {
  try {
    const messages = await fetchMessages();
    res.send(messages.reverse());
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).send("Error fetching messages");
  }
});

app.post("/downloadfile", async (req, res) => {
  const words = req.body.words;
  const directoryPath = path.join(
    __dirname,
    words[0].split(":")[1].split(".")[0]
  );

  try {
    // Create the directory if it doesn't exist
    fs.mkdirSync(directoryPath, { recursive: true });
  } catch (err) {
    console.error("Error creating directory:", err);
    res.status(500).send("Error creating directory");
    return;
  }

  const downloadPromises = words.slice(2).map((url, index) => {
    return new Promise((resolve, reject) => {
      request
        .get(url)
        .on("error", (err) => {
          console.error("Error downloading file:", err);
          reject(err);
        })
        .pipe(fs.createWriteStream(path.join(directoryPath, `part_${index}`)))
        .on("finish", resolve)
        .on("error", reject);
    });
  });
  try {
    // Wait for all downloads to complete
    await Promise.all(downloadPromises);
    const splitarr = words[0].split(":")[1].split(".");
    combineFilesAndRename(directoryPath, splitarr[splitarr.length - 1]);

    res.send("File downloaded and combined successfully");
  } catch (err) {
    console.error("Error during file download or combination:", err);
    res.status(500).send("Error during file download or combination");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
