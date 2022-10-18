const domain = "http://" + window.location.hostname + ":3000";
console.log(domain);
class ChatApp {
  socket = io(domain);
  username;
  messageNotification;
  userReceiver = "";
  userCurrent = "";
  localVideo;
  remoteVideo;
  users = [];
  conversation = null;
  type = null;
  constructor() {
    this.ListenSocket();
  }

  ListenSocket() {
    this.socketOnConnecetError();
    this.socketOnGetMessage();
    this.socketOnGetAllUser();
  }


  
  // listen socket server su kien lỗi kết nối
  socketOnConnecetError() {
    this.socket.on("connect_error", (err) => {
      if (err.message === "invalid username") {
      }
    });
  }


  // listen socket server su kien tin nhắn trả về
  socketOnGetMessage() {
    this.socket.on("getMessage", (data) => {
      this.messageNotification = data;
      let isSelf;
      let senderName;
      if (data.senderId == this.userCurrent) {
        isSelf = "right";
        senderName = "Bạn";
      } else {
        senderName = data.username;
        isSelf = "left";
      }

      $(".chat-messages").append(`<div class="chat-message-${isSelf} pb-4">
            <div>
                <img src="https://bootdey.com/img/Content/avatar/avatar3.png" class="rounded-circle mr-1" alt="Sharon Lessman" width="40" height="40">
                <div class="text-muted small text-nowrap mt-2">2:34 am</div>
            </div>
            <div class="flex-shrink-1 bg-light rounded py-2 px-3 ml-3">
                <div class="font-weight-bold mb-1">${senderName}</div>
                ${data.msg}
            </div>
        </div>`);
      console.log(this.messageNotification);
    });
  }

  displayTime() {
    // var sec_num = sec; // don't forget the second param
    // var hours = Math.floor(sec_num / 3600);
    // var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    // var seconds = sec_num - (hours * 3600) - (minutes * 60);

    // if (hours < 10) { hours = "0" + hours; }
    // if (minutes < 10) { minutes = "0" + minutes; }
    // if (seconds < 10) { seconds = "0" + seconds; }
    // return this.hours + " giờ :" + minutes + " phút : " + seconds + " giây";
    return (
      this.hours + " giờ :" + this.minutes + " phút : " + this.seconds + " giây"
    );
  }

  // listen socket server su kien lay tat ca users luu trên server users []
  socketOnGetAllUser() {
    this.socket.on("getAllUser", (users) => {
      // $("#users").empty();
      users.sort((a, b) => {
        const nameA = a.username; // ignore upper and lowercase
        const nameB = b.username; // ignore upper and lowercase
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      });
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (user.id == this.userCurrent) {
          continue;
        }
        let isOnline;
        if (user.socketDevice.length > 0) {
          isOnline = `<div class="small"><span class="fas fa-circle chat-online"></span> Online</div>`;
        } else {
          isOnline = `<div class="small">Offline</div>`;
        }
        // $("#users").append(
        //   $(`<a href="#" class="list-group-item list-group-item-action border-0" onClick="clickLi('${user.id}')">
        //                     <div class="badge bg-success float-right"></div>
        //                     <div class="d-flex align-items-start" id="'${user.id}'">
        //                         <img src="https://bootdey.com/img/Content/avatar/avatar5.png" class="rounded-circle mr-1" alt="${user.username}" width="40" height="40">
        //                         <div class="flex-grow-1 ml-3">
        //                             ${user.username}
        //                             ${isOnline}
                    
        //                         </div>
        //                     </div>
        //                 </a>`)
        // );
      }
    });
  }

  //End Socket Listen

  getMessage() {
    return this.messageNotification;
  }
  setMessage(msg) {
    this.messageNotification = msg;
  }
  getAllUser() {
    return this.users;
  }
  getUserReceiver() {
    return this.userReceiver;
  }

  getUserCurent() {
    // console.log("object", this.userCurrent);
    return this.userCurrent;
  }
  setVidStream(localVid, remoteVid) {
    this.localVideo = localVid;
    this.remoteVideo = remoteVid;
  }

  addUser(userId, name) {
    this.userCurrent = userId;
    this.username = name;
    this.socket.auth = { userId };
    this.socket.emit("addUser", { userId, name });
    this.socket.connect();
  }

  SetUserCurrent(userCurrent) {
    this.userCurrent = userCurrent;
  }

  SetUserReceiver(userReceiver) {
    this.userReceiver.id = userReceiver;
  }
  // End Event Click

  sendMessageClick(userCurrentId, userReceiverId, msg) {
    this.socket.emit(
      "sendMessage",
      [userCurrentId, userReceiverId],
      userCurrentId,
      msg
    );
  }
}
