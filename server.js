
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});
const cors = require('cors');

const path = 'COM9'
const baudRate = 115200
const { SerialPort, ReadlineParser } = require('serialport')
const port = new SerialPort({ path, baudRate })
const parser = port.pipe(new ReadlineParser({ delimiter: '\r' }))


app.use(cors({
  origin: '*'
}));

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const DATA = {
  rpm: 600,
  kmh: 25,
  kmhF: 0,
  clt: 0,
  lvlFuel: 0,
  lvlFuelF: 0,
  turnLeft: 1,
  turnRight: 1,
  parkLights: 1,
  fogLights: 1,
  auxLights: 1,
  highBeam: 1,
  eBrake: 1,
  battAlt: 1,
  ECUErr: 1,
  oilSwitch: 1,
  rearDefrost: 1,
  fan: 1,
  openDoor: 1,
  airbag: 1,
  odoNow: 0,
}

app.get('/', async (req, res) => {
  const list = await SerialPort.list()
  res.json(list)
});

io.on('connection', (socket) => {
  parser.on('data', (raw) => {
    const dataRaw = raw.toString()
    const data = dataRaw.indexOf('CAN Read') !== -1 ? {} : JSON.parse(dataRaw)
    const payload = {
      kmh: data.SPEED,
      rpm: data.SPEED,
      clt: 40,
      turnLeft: data.setaEsquerda,
      turnRight: data.setaDireita,
      lvlFuel: data.fuel,
      lvlFuelF: data.fuel,
      parkLights: data.freioDeMao,
      fogLights: data.lanterna,
      auxLights: data.farolBaixo,
      highBeam: data.farolAlto,
      eBrake: data.freio,
      battAlt: 0,
      ECUErr: 0,
      oilSwitch: 0,
      rearDefrost: 0,
      fan: 0,
      openDoor: 0,
      airbag: 0
    }
    socket.broadcast.emit('data-update', payload)
  })

  // setInterval(() => {
  //   DATA.kmh = DATA.kmh + 1;
  //   DATA.clt = randomIntFromInterval(0, 100);
  //   DATA.turnLeft = randomIntFromInterval(0, 1);
  //   DATA.turnRight = randomIntFromInterval(0, 1);
  //   DATA.lvlFuel = randomIntFromInterval(0, 100);
  //   DATA.lvlFuelF = randomIntFromInterval(0, 100);
  //   DATA.turnLeft = randomIntFromInterval(0, 1);
  //   DATA.turnRight = randomIntFromInterval(0, 1);
  //   DATA.parkLights = randomIntFromInterval(0, 1);
  //   DATA.fogLights = randomIntFromInterval(0, 1);
  //   DATA.auxLights = randomIntFromInterval(0, 1);
  //   DATA.highBeam = randomIntFromInterval(0, 1);
  //   DATA.eBrake = randomIntFromInterval(0, 1);
  //   DATA.battAlt = randomIntFromInterval(0, 1);
  //   DATA.ECUErr = randomIntFromInterval(0, 1);
  //   DATA.oilSwitch = randomIntFromInterval(0, 1);
  //   DATA.rearDefrost = randomIntFromInterval(0, 1);
  //   DATA.fan = randomIntFromInterval(0, 1);
  //   DATA.openDoor = randomIntFromInterval(0, 1);
  //   DATA.airbag = randomIntFromInterval(0, 1);
  //   socket.broadcast.emit('data-update', DATA)
  // }, 500)
  console.log('a user connected');
});

server.listen(4000, () => {
  console.log('listening on *:4000');
});