import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
const { spawn } = require('child_process');

const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  projectId: 'bigdataanalysis-442614',
  keyFilename: './bigdataanalysis-442614-9fdaf719ff96.json'
});

const localFilePath = '/home/klebba_rafal/app/';

enum DifficultyLevel {
  EASY = 0,
  MEDIUM = 1,
  HARD = 2,
  SUPER_HARD = 3
}

interface GameSate {
  turn: string;
  players: Record<string, PlayerInfo>;
  currentWord: string;
  difficultyLevel: DifficultyLevel | null;
  generatorMode: number;
}

interface PlayerInfo {
  username: string;
  score: number;
}

const rooms: Record<string, GameSate> = {};
const words: string[] = ['chair', 'campfire', 'bucket', 'apple', 'shorts', 'square', 'circle', 'sun', 'snail', 'carrot', 'spider', 'cat', 'crown', 'triangle', 'car', 'bicycle'];

io.on('connection', (socket) => {
  socket.on('joinRoom', (roomId: string, username: string) => {
    try {
      socket.join(roomId);

      if (!rooms[roomId]) {
        // Initialize a new game state for the room
        rooms[roomId] = {
          turn: socket.id,
          players: { 
            [socket.id]: { username: username, score: 0 },
            ['ai']: { username: 'ai', score: 0 }
          },
          currentWord: '',
          difficultyLevel: null,
          generatorMode: 0,
        };
      } else {
        if (!rooms[roomId].players[socket.id]) {
          rooms[roomId].players[socket.id] = { username: username, score: 0 };
        }
      }

      // Notify the client of successful room join and game state
      socket.emit('roomJoined', rooms[roomId].turn);
      io.to(roomId).emit('playerJoined', username);
    } catch (error) {
      console.error('joinRoom error: ', error);
    }
  });

  socket.on('startGame', (roomId: string, difficultyLevel: number, generatorMode: number) => {
    try {
      if (rooms[roomId].turn === socket.id) {
        const word: string = generateWord();
        rooms[roomId].currentWord = word;
        rooms[roomId].difficultyLevel = difficultyLevel as DifficultyLevel;
        rooms[roomId].generatorMode = generatorMode;
        io.to(roomId).emit('gameStarted', word);
      }
    } catch (error) {
      console.error('startGame error: ', error);
    }
  });

  socket.on('drawing', (roomId: string, data) => {
    try {
      socket.to(roomId).emit('drawing', data);
    } catch (error) {
      console.error('drawing error: ', error);
    }
  });

  socket.on('guess', (roomId: string, guess: string, username: string) => {
    try {
      if (rooms[roomId].currentWord.toLowerCase() === guess.toLowerCase()) {
        rooms[roomId].turn = socket.id;
        let newWord: string;
        do {
          newWord = generateWord();
        } while (newWord === rooms[roomId].currentWord);
        io.to(roomId).emit('correctGuess', username, rooms[roomId].players, rooms[roomId].currentWord);
        rooms[roomId].currentWord = newWord;
        if (username == "ai") {
          rooms[roomId].turn = "ai";
          createImage(newWord, roomId);
          rooms[roomId].players['ai'].score += 1;
        } else {
          rooms[roomId].players[socket.id].score += 1;
        }
        io.to(roomId).emit('changeTurn', newWord, username);
      } else {
        io.to(roomId).emit('newGuess', username, guess);
      }
    } catch (error) {
      console.error('guess error: ', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      for (const roomId in rooms) {
        if (rooms[roomId].players[socket.id]) {
          delete rooms[roomId].players[socket.id];
          io.to(roomId).emit('playerLeft', socket.id);

          if (rooms[roomId].turn === socket.id) {
            const remainingPlayers = Object.keys(rooms[roomId].players).filter((id) => id !== 'ai');
            if (remainingPlayers.length > 0) {
              rooms[roomId].turn = remainingPlayers[0];
              const newWord = generateWord();
              rooms[roomId].currentWord = newWord;
              io.to(rooms[roomId].turn).emit('yourTurn', newWord);
            }
          }

          // If the room is empty, delete it
          if (Object.keys(rooms[roomId].players).length === 1) {
            delete rooms[roomId];
            const dir = localFilePath + 'drawings/' + roomId;
            if (fs.existsSync(dir)) {
              fs.rmdirSync(dir, { recursive: true });
            }
          }
        }
      }
    } catch (error) {
      console.error('disconnect error: ', error);
    }
  });
});

function generateWord(): string {
  return words[Math.floor(Math.random() * words.length)];
}

function createImage(generatedWord: string, roomId: string) {
  const dir = localFilePath + 'drawings/' + roomId;
  if (fs.existsSync(dir)) {
    fs.rmdirSync(dir, { recursive: true });
  }
  try {
    const class_number = Math.floor(Math.random() * 9);
    const labels = ['bucket', 'apple', 'shorts', 'square', 'circle', 'sun', 'carrot', 'crown', 'triangle', 'car'];
    rooms[roomId].currentWord = labels[class_number];
    if (rooms[roomId].generatorMode === 0) {
      const process = spawn('python3', ['generator/diffusion_generator.py', labels[class_number], roomId]);
      process.on('close', function (code: number) {});
    } else {
      const process = spawn('python3', ['generator/gan_generator.py', '-c', class_number, '-o', localFilePath + 'drawings/' + roomId]);
      process.on('close', function (code: number) {});
    }
  } catch (error) {
    console.error('createImage error: ', error);
  }
}

function getLabelForClass(classNum: number): string {
  let map: { [key: number]: string } = {0: 'chair', 1: 'campfire', 2: 'bucket', 3: 'apple', 4: 'shorts', 5: 'square', 6: 'circle', 7: 'sun', 8: 'snail', 9: 'carrot', 10: 'spider', 11: 'cat', 12: 'crown', 13: 'triangle', 14: 'car', 15: 'bicycle'};
  return map[classNum];
}

app.get('/generate-room-id', (req, res) => {
  const roomId: string = Math.random().toString(36).substring(2, 26);
  res.send({ response: roomId }).status(200);
});

app.post('/guess', (req, res) => {
  let response: string = '';
  let script: string = '';
  switch (rooms[req.body.roomId].difficultyLevel) {
    case DifficultyLevel.EASY:
      script = 'klasyfikator/DecisionTree/eval.py';
      break;
    case DifficultyLevel.MEDIUM:
      script = 'klasyfikator/KNN/eval.py';
      break;
    case DifficultyLevel.HARD:
      script = 'klasyfikator/RandomForest/eval.py';
      break;
    case DifficultyLevel.SUPER_HARD:
      script = 'klasyfikator/CNN/guess.py';
      break;
    default:
      script = 'klasyfikator/CNN/guess.py';
      break;
  }
  if (script === '') {
    res.send({ response: response }).status(200);
    return;
  }
  try {
    const process = spawn('python3', [script, '-j', JSON.stringify(req.body.data)]);
    process.stdout.on('data', function (data: string) {
      let result: string = data.toString().split('\n')[0];
      response = getLabelForClass(parseInt(result));
    });

    process.on('close', function (code: number) {
      res.send({ response: response }).status(200);
    });
  } catch (error) {
    console.error('test error: ', error);
  }
});

app.get('/download-image/:id', (req, res) => {
  const id = req.params.id;
  const imagePath = path.join(localFilePath + 'drawings/' + id + '/', 'image.png');
  fs.access(imagePath, fs.constants.F_OK, (err: any) => {
    if (err) {
      return res.status(200).send(null);
    }
    res.sendFile(imagePath);
  });
});

app.get('/get-scores/:id', (req, res) => {
  const roomId = req.params.id;
  let result: {username: string, score: number}[] = [];
  Object.keys(rooms[roomId].players).forEach((key) => {
    result.push({ username: rooms[roomId].players[key].username, score: rooms[roomId].players[key].score });
  });
  res.send({ response: result }).status(200);
});

app.post('/set-word/:id', (req, res) => {
  const roomId = req.params.id;
  if (!words.includes(req.body.word)) {
    res.send({ response: 'failure' }).status(400);
    return;
  }
  rooms[roomId].currentWord = req.body.word;
  res.send({ response: 'success' }).status(200);
});

app.post('/room-exists/:id', (req, res) => {
  const roomId = req.params.id;
  const username = req.body.username;
  if (rooms[roomId]) {
    if (rooms[roomId].players[username]) {
      res.send({ response: false }).status(200);
    } else {
      res.send({ response: true }).status(200);
    }
  } else {
    res.send({ response: false }).status(200);
  }
});

app.post('/save-drawing/', (req, res) => {
  const data: any = req.body.data;
  const word: string = req.body.word;
  if (words.includes(word)) {
    const bucketName: string = 'charades-game-engineering-project';
    const filePath: string = '/user-drawings/' + word + '/' + Math.random().toString(36).substring(2, 26) + '.json';
    uploadFile(bucketName, filePath, data);
    res.send().status(200);
  }
  res.send().status(400);
});

async function uploadFile(bucketName: string, filePath: string, data: any) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);

  try {
    await file.save(JSON.stringify(data), {
      resumable: false,
      metadata: {
        contentType: 'application/json',
      }
    });
  } catch (error) {
    console.error('Error uploading buffer:', error);
  }
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
