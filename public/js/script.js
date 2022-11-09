let hostname = window.location.hostname.includes("herokuapp")
  ? window.location.hostname
  : window.location.hostname + ":3000";
const domain = window.location.protocol + "//" + hostname;
const constraints = {
  audio: {
      channelCount: 2,
      echoCancellation: false,
      latency: 0,
      noiseSuppression: false,
      sampleRate: 48000,
      sampleSize: 16,
      volume: 1.0
  },
  video:
  // true
  {
      width: { min: 1024, ideal: 1920, max: 2560 },
      height: { min: 576, ideal: 1080, max: 1440 }
  }

}
const constraintsWithoutCam = {
  audio: {
      channelCount: 2,
      echoCancellation: false,
      latency: 0,
      noiseSuppression: false,
      sampleRate: 48000,
      sampleSize: 16,
      volume: 1.0
  },
  video: false
}
const iceServers = [
  {
      url: 'stun:stun.l.google.com:19302'
  },
  {
      urls: "turn:0.peerjs.com:3478",
      username: "peerjs",
      credential: "peerjsp"
  }]
console.log(domain);
class ChatApp {
  socket = io(domain);
  username;
    messageNotification;
    userReceiver = "";
    userCurrent = "";
    localstream;
    remoteStream;
    peerConnection;
    remoteRTCMessage;
    iceCandidatesFromCaller = [];
    localVideo;
    remoteVideo;
    users = [];
    cam = false;
    mic = false;
    camLocalOnOff = null;
    camRemoteOnOff = null;
    timeoutCall = 0;
    error;
    frontCam = true;
    stopWatch = 0;
    seconds = 0;
    wave = false;
    caller = null;
    callee = null;
    conversation = null;
    type = null;
  constructor() {
    this.ListenSocket();
  }

  ListenSocket() {
    this.socketOnConnecetError();
    this.socketOnNewCall();
    this.socketOnCallAnswered();
    this.socketOnGetMessage();
    this.socketOnEndCalled();
    this.socketOnRejectd();
    this.socketOnICEcandicate();
    this.socketOnGetAllUser();
    this.socketOnStatus();
    this.socketOnMissCall();
    this.socketOnOrtherDeviceAnswered();
    this.socketOnReceive();
    this.socketOnWave();
    this.socketOnShareScreen();
    this.socketMicCam();
    this.socket.on("successful_create_code", (data) => {
      window.open(
        `${domain}${this.userCurrent}timviec365PS/${this.userCurrent}/${this.username}/${data.codeAccess}`
      );
      $("#popup_show_new_call").hide();
    });
    this.socket.on("disconnect", (reason) => {
      if (reason == "transport error") {
        console.log("reconnet socket");
        setTimeout(() => {
          this.socket.auth = { userId: this.userCurrent };
          this.socket.emit("addUser", {
            userId: this.userCurrent,
            name: this.username,
          });
          this.socket.connect();
        }, 3000);
      }
    });
  }

  // listen socket server su kien lỗi kết nối
  socketOnConnecetError() {
    this.socket.on("connect_error", (err) => {
      if (err.message === "invalid username") {
      }
    });
  }

  // listen socket server su kien tin nhắn trả về

  socketOnEndCalled() {
    this.socket.on("endCalled", data => {
        this.messageNotification = {
            senderId: data.caller,
            msg: "Da tat may"
        }
        if (this.remoteStream) {

            console.log('tắt nhé');

            clearInterval(this.stopWatch);
            let timeCall = this.displayTime(this.seconds);
            // console.log(`Thời gian cuộc gọi là: ${timeCall}`)
            $('#count_time_call').attr('data-id', timeCall);
            $('#popup_show_call_mess').hide();
            console.log(this.messageNotification);
            this.iceCandidatesFromCaller = []
            this.remoteRTCMessage = null
        }
        if (this.timeoutCall > 0) {
            clearTimeout(this.timeoutCall);
        }
        this.endMedia();
        // this.camRemoteOnOff.style.display = "none";
        // this.remoteVideo.style.display = "none";
        // this.camLocalOnOff.style.display = "none";
        // this.localVideo.style.display = "none"
    })

}
socketOnRejectd() {
  this.socket.on("rejected", data => {
      this.messageNotification = {
          senderId: data.caller,
          msg: "Khong nghe may"
      }
      $('#popup_show_call_mess').hide();
      clearTimeout(this.timeoutCall);
      console.log(this.messageNotification);
      this.iceCandidatesFromCaller = []
      $('#popup_show_recall_mess .text_nhan_goi').text(data.username + " không nghe máy!");
      $('#popup_show_recall_mess').show();
      this.endMedia();
  });
}
isIceCandidateSend = false;
// listen socket server su kien lay ICEcandidate từ webRTC
socketOnICEcandicate() {

  this.socket.on('ICEcandidate', data => {

      let message = data.rtcMessage

      let candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate
      });

      if (this.peerConnection) {
          console.log("ICE candidate add");
          this.peerConnection.addIceCandidate(candidate)
              .then((done) => {
                  console.log(done);
              })
              .catch((error) => {
                  console.log("Có cuộc gọi đang gọi bạn nghe đi đã", error);
                  this.socket.emit("missCall", {
                      caller: this.userCurrent,
                      callee: this.userReceiver,
                      msg: "Cuộc gọi nhỡ"
                  })
                  if (this.type == 0) {
                      $.ajax({
                          url: '../ajax/send_nocation_phone_call.php',
                          type: 'POST',
                          data: {
                              type: 2,
                              id_caller: this.caller,
                              conversation: this.conversation,
                          }, success: function (data) {
                          }
                      })
                  } else {
                      $.ajax({
                          url: '../ajax/send_nocation_video_call.php',
                          type: 'POST',
                          data: {
                              type: 2,
                              id_caller: this.caller,
                              conversation: this.conversation,
                          }, success: function (data) {
                          }
                      })
                  }
                  this.endMedia();
                  return;
              });

      }
      else {
          console.log("ICE candidate Pushed");
          this.iceCandidatesFromCaller.push(candidate);

      }


  });
}

// listen socket server su kien lay tat ca users luu trên server usersTA []
socketOnGetAllUser() {
  this.socket.on("getAllUser", (users) => {
      this.users = users;
  })
}

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
      let msgDate = new Date();
      $(".chat-messages").append(`<div class="chat-message-${isSelf} pb-4">
            <div>
                <img src="https://bootdey.com/img/Content/avatar/avatar3.png" class="rounded-circle mr-1" alt="Sharon Lessman" width="40" height="40">
                <div class="text-muted small text-nowrap mt-2">${msgDate.getHours()}:${msgDate.getMinutes()}</div>
            </div>
            <div class="flex-shrink-1 bg-light rounded py-2 px-3 ml-3">
                <div class="font-weight-bold mb-1">${senderName}</div>
                ${data.msg}
            </div>
        </div>`);
        $(".chat-messages").scrollTop($(".chat-messages").get(0).scrollHeight);
      console.log(this.messageNotification);
    });
  }
  socketOnWave() {
    this.socket.on("wave-user", (data) => {
      console.log("Wave nè");
      if (data.wave) {
        //Hiển thị ui đang vẫy  tay
        console.log("VẪY TAY NÈ");
        $(".hand_wave").show();
      } else {
        //Tắt Hiển thị ui đang vẫy  tay
        console.log("Thôi không vẫy nữa");
        $(".hand_wave").hide();
      }
    });
  }

  //Thực hiện vẫy tay
  waveClick() {
    console.log("wave", this.wave);
    if (this.remoteStream) {
      this.wave = !this.wave;
      this.socket.emit("wave", {
        callee: this.userReceiver,
        caller: this.userCurrent,
        wave: this.wave,
      });
    }
  }

  //Nhận thông báo cuộc gọi nhóm
  socketOnReceive() {
    this.socket.on("recviceListMemberCallGroupPS", (data) => {
      console.log("đây rồi");
      $("#popup_show_call_mess_gr .text_nhan_goi").text(
        "Bạn đã nhận được cuộc gọi nhóm từ " + data.userCaller
      );
      var a_gr = document.getElementById("answer_call_gr");
      a_gr.href = `${data.linkGroup}/${this.userCurrent}/${this.username}/${data.codeAccess}`;
      $("#reject_gr_call").attr("data-id", data.caller);
      $("#popup_show_call_mess_gr").show();
      // console.log(`${data.linkGroup}/${this.userCurrent}`);
    });
  }

  // Sự kiện nhận cuộc gọi mới
  socketOnNewCall() {
    this.socket.on("newCall", (data) => {
      // Nhận rtcMessage người gọi
      // data.type = 1 : call Video
      // data.type = 0 : phoneCall

      this.messageNotification = {
        senderId: data.caller,
        msg: "Dang goi may ne",
      };
      this.userReceiver = data.caller;
      (this.conversation = data.conversation),
        (this.caller = this.userReceiver);
      this.callee = this.userCurrent;
      $("#popup_show_call_mess").show();
      if (data.type == 1) {
        $("#answer_call").attr("type_call", 1);
      } else {
        $("#answer_call").attr("type_call", 2);
      }
      this.type = data.type;
      $("#answer_call").attr("data-id", data.caller);
      $("#popup_show_call_mess .text_nhan_goi").text(
        "Bạn đã nhận được cuộc gọi từ " + data.username
      );
      console.log(this.messageNotification);
      // Hiện nút trả lời
      this.remoteRTCMessage = data.rtcMessage;

      // document.getElementById("callerName").text() = otherUser;
      // document.getElementById("call").style.display = "none";
      // document.getElementById("answer").style.display = "block";
      // document.getElementById("userName").style.display = "none";
    });
  }

  // Sự kiện nhận tín hiệu cuộc gọi nhỡ
  socketOnMissCall() {
    this.socket.on("callMissing", (data) => {
      this.messageNotification = {
        senderId: data.username,
        msg: data.msg,
      };
      if (!this.remoteStream) {
        $("#popup_show_call_mess_gr").hide();
        $("#popup_show_call_mess").hide();
        this.appendHours.text("00");
        this.appendMinutes.text("00");
        this.appendSeconds.text("00");
        this.countClick = 0;
        this.seconds = 0;
        this.hours = 0;
        this.minutes = 0;
        this.remoteRTCMessage = null;
        this.remoteStream = null;
        this.userReceiver = null;
        this.mic = false;
        this.cam = false;
        this.wave = false;
        this.share = false;
        this.caller = null;
        this.callee = null;
        this.conversation = null;
        this.type = null;
        $(window).off("beforeunload");
        clearTimeout(this.timeoutCall);
        $("#screenShare").show();
        $("#offscreenShare").hide();
        document.getElementById("setCam").src =
          "../images/video_call/camOn.png";
        document.getElementById("setMic").src =
          "../images/video_call/micOn.png";
        $(".hand_wave,.off_mic_call").hide();
      }
      console.log(this.messageNotification);
    });
  }

  // Sự kiện trả lại thông báo lỗi khi gọi
  socketOnStatus() {
    this.socket.on("status", (data) => {
      // data status
      // 0 = this.userReceiver offline
      // 1 = userReceiver đang trong cuộc gọi khác
      // 2 = userReceiver đang rảnh
      // 3 = userCurrrent đang trong cuộc gọi khác
      let msg;
      switch (data.status) {
        case -1:
          msg = "Lỗi bạn đang không có trong cuộc gọi nên không thực hiện được";
          console.log(msg);
          break;
        case 0:
          msg = "Bên nhận đang không có mặt";

          this.endMedia();
          break;
        case 1:
          msg = "Bên nhận đang bận";
          this.endMedia();
          alert(msg);
          break;
        case 2:
          msg = "Bạn đang trong cuộc gọi khác";
          if (this.remoteRTCMessage || this.remoteStream) {
            $(".popup_call_chat365").hide();
          } else {
            this.endMedia();
          }
          alert(msg);
          break;
        default:
          break;
      }
      // Nhận rtcMessage người gọi
      // clearTimeout(this.timeoutCall);
    });
  }

  // Sự kiện nhận tín hiệu trả lời cuộc gọi
  socketOnCallAnswered() {
    this.socket.on("callAnswered", (data) => {
      this.messageNotification = {
        senderId: data.caller,
        msg: "Da nghe may",
      };
      console.log("socket on call Answered", data);
      if (this.peerConnection) {
        this.seconds = 0;
        this.minutes = 0;
        this.hours = 0;
        this.stopWatch = setInterval(() => {
          this.timeStart();
        }, 1000);
        this.remoteRTCMessage = data.rtcMessage;
        // this.peerConnection.setRemoteDescription({type: 'rollback'});
        this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(this.remoteRTCMessage),
          () => console.log("SUCCESS"),
          () => console.log("FAILD")
        );
      } else {
        console.log("else nhung no la lam", this.peerConnection);
      }
      console.log("Call Started. They Answered");
    });
  }

  //Sự kiện nhận tín hiệu khi có taps khác đã thực hiện hành động(nghe, từ chối)
  socketOnOrtherDeviceAnswered() {
    this.socket.on("ortherDeviceAnswered", (data) => {
      this.messageNotification = data;
      console.log(this.messageNotification);
      clearTimeout(this.timeoutCall);
      // $('#popup_show_call_mess').hide();
      // this.userReceiver = null;
      this.endMedia();
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
          isOnline = `<span class="fas fa-circle chat-online"></span> Online`;
        } else {
          isOnline = `Offline`;
        }

        $(`#${user.id} .isOnline`).empty();
        $(`#${user.id} .isOnline`).append(isOnline);
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

  sendMessageClick(userReceiverId, converId, msg) {
    this.socket.emit(
      "sendMessage",
      [this.userCurrent, userReceiverId],
      this.userCurrent,
      msg
    );
    $.ajax({
      url: "/api/messages/send",
      type: "POST",
      data: {
        sender: this.userCurrent,
        conversationId: converId,
        text: msg,
      },
      success: function (data) {},
    });
  }

  //set element ảnh bật tắt cam
  setDisplayOnOffCamera(camLocalOnOff, camRemoteOnOff) {
    this.camLocalOnOff = camLocalOnOff;
    this.camRemoteOnOff = camRemoteOnOff;
  }

  //Đổi cam
  switchCam() {
    if (this.localStream) {
      const supports = navigator.mediaDevices.getSupportedConstraints();
      if (!supports["facingMode"]) {
        console.log("Browser Not supported!");
        return;
      }
      this.frontCam = !this.frontCam;
      const options = {
        audio: true,
        video: {
          facingMode: {
            exact: this.frontCam ? "user" : "environment",
          },
        },
      };
      if (this.localStream.getVideoTracks()) {
        const tracks = this.localStream.getVideoTracks();
        tracks.forEach((track) => {
          this.localStream.removeTrack(track);
          track.stop();
        });
      }
      navigator.mediaDevices
        .getUserMedia(options)
        .then((stream) => {
          stream
            .getVideoTracks()
            .forEach((track) => this.localStream.addTrack(track, stream));
          this.localStream
            .getVideoTracks()
            .forEach((track) =>
              this.peerConnection.addTrack(track, this.localStream)
            );
          console.log(
            `Using video device: ${this.localStream.getVideoTracks()[0].label}`
          );
          // const thisChatApp = this;
          // console.log(this.peerConnection);
          this.peerConnection.getSenders().forEach((rtpSender) => {
            rtpSender
              .replaceTrack(this.localStream.getVideoTracks()[0])
              .then(() => {
                console.log("Replaced video track success");
              })
              .catch((error) => {
                // this.switchCam();
                console.log("Could not replace video track: " + error);
              });
          });
          this.localVideo.srcObject = null;
          this.localVideo.srcObject = this.localStream;
        })
        .catch((e) => {
          console.log("Error swith Camera", e);
          if (e.name.includes("OverconstrainedError")) {
            this.switchCam();
          }
          this.displayErrorMedia(e);
        });
    }
  }
  share = false;

  socketOnShareScreen() {
    this.socket.on("share-user", (data) => {
      if (data.share) {
        console.log("Đang share");
      } else {
        console.log("Tắt share");
      }
    });
  }

  shareSreen() {
    if (this.localStream) {
      if (this.localStream.getVideoTracks().length > 0) {
        const tracks = this.localStream.getVideoTracks();
        tracks.forEach((track) => {
          this.localStream.removeTrack(track);
          track.stop();
        });
      }
      if (
        navigator.mediaDevices &&
        "getDisplayMedia" in navigator.mediaDevices
      ) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true })
          .then((stream) => {
            this.share = !this.share;
            this.socket.emit("share", {
              callee: this.userReceiver,
              caller: this.userCurrent,
              share: this.share,
            });
            let thisChatApp = this;
            stream.getVideoTracks()[0].onended = function () {
              thisChatApp.frontCam = true;
              thisChatApp.switchCam();
              thisChatApp = null;
              $("#screenShare").show();
              $("#offscreenShare").hide();
            };

            this.replaceStream(stream);
            $("#screenShare").hide();
            $("#offscreenShare").show();
          });
      } else {
        console.log("getDisplayMedia is not supported");
      }
    }
  }

  endScreen() {
    this.share = false;
    this.socket.emit("share", {
      callee: this.userReceiver,
      caller: this.userCurrent,
      share: this.share,
    });
    if (this.localStream && this.localStream.getVideoTracks().length > 0) {
      this.frontCam = true;
      this.switchCam();
    }
    $("#screenShare").show();
    $("#offscreenShare").hide();
  }

  replaceStream(stream) {
    stream
      .getVideoTracks()
      .forEach((track) => this.localStream.addTrack(track, stream));
    this.localStream
      .getVideoTracks()
      .forEach((track) =>
        this.peerConnection.addTrack(track, this.localStream)
      );
    console.log(
      `Using video device: ${this.localStream.getVideoTracks()[0].label}`
    );
    // const thisChatApp = this;
    // console.log(this.peerConnection);
    const [videoTrack] = this.localStream.getVideoTracks();
    const sender = this.peerConnection
      .getSenders()
      .find((s) => s.track.kind === videoTrack.kind);
    console.log("Found sender:", sender);
    sender.replaceTrack(videoTrack);
    if (this.cam) {
      // this.camLocalOnOff.style.display = "block";
      // this.localVideo.style.display = "none"
      if (this.localStream && this.localStream.getVideoTracks().length > 0) {
        this.localStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
    } else {
      // this.camLocalOnOff.style.display = "none";
      // this.localVideo.style.display = "block"
      if (this.localStream && this.localStream.getVideoTracks().length > 0) {
        this.localStream.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
      }
    }
    this.localVideo.srcObject = null;
    this.localVideo.srcObject = this.localStream;
  }
  //Bật tắt cam
  setCam() {
    if (this.localStream) {
      this.cam = !this.cam;
      this.socket.emit("cam", {
        caller: this.userCurrent,
        callee: this.userReceiver,
        cam: this.cam,
      });
      if (this.cam) {
        // this.camLocalOnOff.style.display = "block";
        // this.localVideo.style.display = "none"
        if (this.localStream && this.localStream.getVideoTracks().length > 0) {
          this.localStream.getVideoTracks().forEach((track) => {
            track.enabled = false;
            document.getElementById("setCam").src =
              "../images/video_call/camOfff.png";
            // $('#localVideo').show();
            // $('#camLocalOnOff').hide();
          });
        }
      } else {
        // this.camLocalOnOff.style.display = "none";
        // this.localVideo.style.display = "block"
        if (this.localStream && this.localStream.getVideoTracks().length > 0) {
          this.localStream.getVideoTracks().forEach((track) => {
            track.enabled = true;
            document.getElementById("setCam").src =
              "../images/video_call/camOn.png";

            // $('#localVideo').hide();
            // $('#camLocalOnOff').show();
          });
        }
      }
    } else {
      console.log("Bạn Đang Không Trong cuộc gọi nào cả");
    }
  }

  //Bật tắt mic
  setMic() {
    if (this.localStream) {
      console.log("Mic: ", this.mic);
      this.mic = !this.mic;
      this.socket.emit("mic", {
        caller: this.userCurrent,
        callee: this.userReceiver,
        mic: this.mic,
      });
      if (this.mic) {
        if (this.localStream && this.localStream.getAudioTracks().length > 0) {
          this.localStream.getAudioTracks().forEach((track) => {
            track.enabled = false;
            document.getElementById("setMic").src =
              "../images/video_call/micOff.png";
          });
        }
      } else {
        if (this.localStream && this.localStream.getAudioTracks().length > 0) {
          this.localStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
            document.getElementById("setMic").src =
              "../images/video_call/micOn.png";
          });
        }
      }
    } else {
      console.log("Bạn Đang Không Có Trong cuộc gọi nào cả");
    }
  }

  //Xu ly sy kien nhận tin nhan tu socket (nguoi gui, nguôi nhan , ten nguoi gui , tin nhan)

  endCallDisconnect() {
    try {
      if (this.remoteStream) {
        this.socket.emit("endCall", {
          caller: this.userCurrent,
          callee: this.userReceiver,
          rtcMessage: null,
        });
        console.log(this.seconds);
        clearInterval(this.stopWatch);
        var timeCall = this.displayTime();
        console.log(`Thời gian cuộc gọi là: ${timeCall}`);
        $("#count_time_call").attr("data-id", timeCall);
      } else {
        this.socket.emit("missCall", {
          caller: this.userCurrent,
          callee: this.userReceiver,
          msg: "Cuộc gọi nhỡ",
        });
        if (this.type == 0) {
          $.ajax({
            url: "../ajax/send_nocation_phone_call.php",
            type: "POST",
            data: {
              type: 2,
              id_caller: this.caller,
              conversation: this.conversation,
            },
            success: function (data) {},
          });
        } else {
          $.ajax({
            url: "../ajax/send_nocation_video_call.php",
            type: "POST",
            data: {
              type: 2,
              id_caller: this.caller,
              conversation: this.conversation,
            },
            success: function (data) {},
          });
        }
      }
      clearTimeout(this.timeoutCall);
    } catch (error) {
      console.log(error);
    }
  }

  //Xu ly su kien ket thuc cuôc goi ((nguoi gui, người nhan , rtcMessage ))
  endCallClick(rtcMessage = null) {
    if (this.userCurrent && this.userReceiver) {
      if (this.remoteStream) {
        this.socket.emit("endCall", {
          caller: this.userCurrent,
          callee: this.userReceiver,
          rtcMessage: rtcMessage,
        });
        console.log("endcallne");
        console.log(this.seconds);
        clearInterval(this.stopWatch);
        var timeCall = this.displayTime();
        console.log(`Thời gian cuộc gọi là: ${timeCall}`);
        $("#count_time_call").attr("data-id", timeCall);
        if (this.type == 0) {
          $.ajax({
            url: "../ajax/send_nocation_phone_call.php",
            type: "POST",
            data: {
              type: 1,
              id_caller: this.caller,
              time_call: timeCall,
              conversation: this.conversation,
            },
            success: function (data) {},
          });
        } else {
          $.ajax({
            url: "../ajax/send_nocation_video_call.php",
            type: "POST",
            data: {
              type: 1,
              id_caller: this.caller,
              time_call: timeCall,
              conversation: this.conversation,
            },
            success: function (data) {},
          });
        }
      } else {
        this.socket.emit("missCall", {
          caller: this.userCurrent,
          callee: this.userReceiver,
          msg: "Cuộc gọi nhỡ",
        });
        if (this.type == 0) {
          $.ajax({
            url: "../ajax/send_nocation_phone_call.php",
            type: "POST",
            data: {
              type: 2,
              id_caller: this.caller,
              conversation: this.conversation,
            },
            success: function (data) {},
          });
        } else {
          $.ajax({
            url: "../ajax/send_nocation_video_call.php",
            type: "POST",
            data: {
              type: 2,
              id_caller: this.caller,
              conversation: this.conversation,
            },
            success: function (data) {},
          });
        }
      }
      clearTimeout(this.timeoutCall);
      this.endMedia();
    } else {
      console.log("Chưa có id của người gọi hoặc người nghe");
    }
  }

  //Xu ly su kien goi di ((nguoi gui, người nhan  ))
  countClick = 0;
  async callClick(userReceiverId, conversationId) {
    $("#popup_show_recall_mess").hide();
    this.countClick++;
    if (this.countClick > 1) {
      console.log("Ấn từ từ thôi");
      return;
    }
    if (this.userReceiver) return;
    let isReady = await this.beReady(1);
    if (isReady == 1) {
      this.userReceiver = userReceiverId;
      this.conversation = conversationId;
      this.caller = this.userCurrent;
      this.callee = userReceiverId;
      $(window).on("beforeunload", () => {
        if (this.userReceiver && this.caller && this.callee) {
          this.endCallDisconnect();
        }
      });
      this.timeoutCall = setTimeout(() => {
        if (this.remoteStream) {
          clearTimeout(this.timeoutCall);
          return;
        }
        this.socket.emit("missCall", {
          caller: this.userCurrent,
          callee: this.userReceiver,
          msg: "Cuộc gọi nhõ",
        });

        this.endMedia();
        // this.rejectCallClick(this.userCurrent, data.caller, null);
      }, 15000);
      // this.localVideo.style.display = "block"
      this.processCall(this.userCurrent, userReceiverId, 1, conversationId);
      $(".popup_call_chat365").show();
    } else {
      alert(this.error);
      this.userReceiver = null;
      this.countClick = 0;
    }
  }

  appendSeconds = $(".time_g");
  appendMinutes = $(".time_p");
  appendHours = $(".time_h");
  //Xu ly su kien goi di ((nguoi gui, người nhan ))
  async answereClick() {
    this.countClick++;
    if (this.countClick > 1) {
      console.log("Ấn từ từ thôi");
      return;
    }
    let isReady = await this.beReady(1);
    if (isReady == 1) {
      this.seconds = 0;
      this.minutes = 0;
      this.hours = 0;

      $(window).on("beforeunload", () => {
        if (this.userReceiver && this.caller && this.callee) {
          this.endCallDisconnect();
        }
      });
      this.processAccept(this.userCurrent, this.userReceiver);
    } else {
      this.countClick = 0;
      alert(this.error);
    }
    // this.localVideo.style.display = "block"
    // this.remoteVideo.style.display = "block"
  }

  minutes = 0;
  hours = 0;
  timeStart() {
    this.seconds++;
    if (this.seconds <= 9) {
      this.appendSeconds.text("0" + this.seconds);
    }
    if (this.seconds > 9) {
      this.appendSeconds.text(this.seconds);
    }
    if (this.seconds > 59) {
      this.minutes++;
      this.appendMinutes.text("0" + this.minutes);
      this.seconds = 0;
      this.appendSeconds.text("0" + 0);
    }
    if (this.minutes <= 9) {
      this.appendMinutes.text("0" + this.minutes);
    }
    if (this.minutes > 9) {
      this.appendMinutes.text(this.minutes);
    }
    if (this.minutes > 59) {
      this.hours++;
      this.appendHours.text("0" + this.hours);
      this.minutes = 0;
      this.appendMinutes.text("0" + 0);
    }
    if (this.hours <= 9) {
      this.appendHours.text("0" + this.hours);
    }
    if (this.hours > 9) {
      this.appendHours.text(this.hours);
    }
  }

  async phoneCallClick(userReceiverId, conversationId) {
    this.countClick++;
    if (this.countClick > 1) {
      console.log("Ấn từ từ thôi");
      return;
    }
    if (this.userReceiver) return;
    let isReady = await this.beReady(0);
    if (isReady == 1) {
      this.userReceiver = userReceiverId;
      this.conversation = conversationId;
      this.caller = this.userCurrent;
      this.callee = userReceiverId;
      $(window).on("beforeunload", () => {
        if (this.userReceiver && this.caller && this.callee) {
          this.endCallDisconnect();
        }
      });
      this.timeoutCall = setTimeout(() => {
        if (this.remoteStream) {
          clearTimeout(this.timeoutCall);
          return;
        }
        this.socket.emit("missCall", {
          caller: this.userCurrent,
          callee: this.userReceiver,
          msg: "Cuộc gọi nhõ",
        });
        $.ajax({
          url: "../ajax/send_nocation_phone_call.php",
          type: "POST",
          data: {
            type: 4,
            id_caller: this.caller,
            conversation: this.conversation,
          },
          success: function (data) {},
        });
        this.endMedia();
        // this.rejectCallClick(this.userCurrent, data.caller, null);
      }, 15000);
      // this.localVideo.style.display = "block"
      this.processCall(this.userCurrent, userReceiverId, 0, conversationId);
      // console.log("remoteStream before call", this.remoteStream);

      $(".popup_call_chat365").show();
    } else {
      alert(this.error);
      this.countClick = 0;
    }
  }

  //Xu ly su kien goi di ((nguoi gui, người nhan ))
  async phoneAnswereClick(userCurrentId, userReceiverId) {
    this.countClick++;
    if (this.countClick > 1) {
      console.log("Ấn từ từ thôi");
      return;
    }
    let isReady = await this.beReady(0);
    if (isReady == 1) {
      // this.userReceiver = userReceiverId;
      this.seconds = 0;
      this.minutes = 0;
      this.hours = 0;
      $(window).on("beforeunload", () => {
        if (this.userReceiver && this.caller && this.callee) {
          this.endCallDisconnect();
        }
      });
      let checkCall = this.processAccept(this.userCurrent, this.userReceiver);
      if (checkCall) {
        $(".popup_call_chat365").show();
        $("#popup_show_call_mess").hide();
      } else {
        this.countClick = 0;
        console.log("Cuộc gọi đã kết thúc");
      }
    } else {
      this.countClick = 0;
      alert(this.error);
    }
    // this.localVideo.style.display = "block"
    // this.remoteVideo.style.display = "block"
  }

  //Xu ly su kien goi di  ((nguoi gui, người nhan ,rtcMessage = null )
  reject_gr_call(callee) {
    this.socket.emit("decline_currnent_meeting_invite", {
      userId: this.userCurrent,
      callee: callee,
    });
    this.endMedia();
  }
  //Xu ly su kien goi di  ((nguoi gui, người nhan ,rtcMessage = null )
  rejectCallClick(rtcMessage = null) {
    this.socket.emit("reject", {
      caller: this.userCurrent,
      callee: this.userReceiver,
      rtcMessage: rtcMessage,
    });
    if (this.type == 0) {
      $.ajax({
        url: "../ajax/send_nocation_phone_call.php",
        type: "POST",
        data: {
          type: 3,
          id_caller: this.caller,
          conversation: this.conversation,
        },
        success: function (data) {},
      });
    } else {
      $.ajax({
        url: "../ajax/send_nocation_video_call.php",
        type: "POST",
        data: {
          type: 3,
          id_caller: this.caller,
          conversation: this.conversation,
        },
        success: function (data) {},
      });
    }
    this.iceCandidatesFromCaller = [];
    clearTimeout(this.timeoutCall);
    this.endMedia();
  }

  // Xư lý gọi đi
  processCall(userCurrentId, userReceiverId, type, conversationId) {
    this.peerConnection
      .createOffer()
      .then((sessionDescription) => {
        this.peerConnection.setLocalDescription(sessionDescription);
        this.socket.emit("call", {
          caller: userCurrentId,
          callee: userReceiverId,
          type: type,
          rtcMessage: sessionDescription,
          conversation: conversationId,
        });
        this.type = type;
        this.socket.on("cam-user", (data) => {
          if (data.cam) {
            // console.log("This remote stream", this.remoteStream);
            // this.camRemoteOnOff.style.display = "block";
            // this.remoteVideo.style.display = "none";
            if (
              this.remoteStream &&
              this.remoteStream.getVideoTracks().length > 0
            ) {
              this.remoteStream.getVideoTracks().forEach((track) => {
                track.enabled = false;
              });
            }
          } else {
            // this.camRemoteOnOff.style.display = "none";
            // this.remoteVideo.style.display = "block";
            if (
              this.remoteStream &&
              this.remoteStream.getVideoTracks().length > 0
            ) {
              this.remoteStream.getVideoTracks().forEach((track) => {
                track.enabled = true;
              });
            }
          }
        });
      })
      .catch((e) => {
        console.log(e);
        this.endMedia();
      });
  }

  processAccept(userCurrentId, userReceiverId) {
    // Thiết lập mô tả từ đối tác
    // console.log("processAccept peerConnection", this.peerConnection);
    if (this.userReceiver) {
      this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(this.remoteRTCMessage),
        () => console.log("SUCCESS"),
        () => console.log("FAILD")
      );
      this.peerConnection
        .createAnswer()
        .then((sessionDescription) => {
          this.peerConnection.setLocalDescription(sessionDescription);
          if (this.iceCandidatesFromCaller.length > 0) {
            for (let i = 0; i < this.iceCandidatesFromCaller.length; i++) {
              let candidate = this.iceCandidatesFromCaller[i];
              // console.log("ICE candidate Added From queue");
              try {
                this.peerConnection
                  .addIceCandidate(candidate)
                  .then((done) => {
                    console.log(done);
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              } catch (error) {
                console.log(error);
              }
            }
            this.iceCandidatesFromCaller = [];
            // console.log("ICE candidate queue cleared");
          } else {
            // console.log("No Ice candidate in queue");
          }

          this.answerCall({
            caller: userCurrentId,
            callee: userReceiverId,
            rtcMessage: sessionDescription,
          });
          $(".popup_call_chat365").show();
          $("#popup_show_call_mess").hide();
          this.stopWatch = setInterval(() => {
            this.timeStart();
          }, 1000);
          clearTimeout(this.timeoutCall);
        })
        .catch((e) => {
          console.log(e);
          this.endMedia();
        });
    } else {
      this.endMedia();
      alert("CuộC gọi đã kết thúc");
    }
  }

  // gửi tín hiệu trả lời lên socket server
  socketMicCam() {
    this.socket.on("cam-user", (data) => {
      if (data.cam) {
        // console.log("This remote stream", this.remoteStream);
        // this.camRemoteOnOff.style.display = "block";
        // this.remoteVideo.style.display = "none";
        if (
          this.remoteStream &&
          this.remoteStream.getVideoTracks().length > 0
        ) {
          this.remoteStream.getVideoTracks().forEach((track) => {
            track.enabled = false;
          });
        }
      } else {
        // this.camRemoteOnOff.style.display = "none";
        // this.remoteVideo.style.display = "block";
        if (
          this.remoteStream &&
          this.remoteStream.getVideoTracks().length > 0
        ) {
          this.remoteStream.getVideoTracks().forEach((track) => {
            track.enabled = true;
          });
        }
      }
    });
    this.socket.on("mic-user", (data) => {
      if (data.mic) {
        if (
          this.remoteStream &&
          this.remoteStream.getAudioTracks().length > 0
        ) {
          this.remoteStream.getAudioTracks().forEach((track) => {
            track.enabled = false;
            $(".off_mic_call").show();
          });
        }
      } else {
        if (
          this.remoteStream &&
          this.remoteStream.getAudioTracks().length > 0
        ) {
          this.remoteStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
            $(".off_mic_call").hide();
          });
        }
      }
    });
  }

  answerCall(data) {
    this.socket.emit("answerCall", data);
    // console.log("remote stream", this.remoteStream);
  }

  sendICEcandidate(data) {
    console.log("Send ICE candidate");
    this.isIceCandidateSend = true;
    // console.log(data);
    this.socket.emit("ICEcandidate", data);
  }

  displayErrorMedia(error) {
    error = "" + error;
    if (error.includes("Permission denied")) {
      this.error =
        "Bạn chưa cấp quyền truy cập thiết bị\r\nVui lòng kiểm tra lại thiết bị của bạn và thử lại";
    } else if (error.includes("Could not start video source")) {
      this.error = "Bạn đang sử thiết bị camera trên ứng dụng khác";
    } else if (error.includes("Requested device not found")) {
      this.error =
        "Thiết bị của bạn chưa có camera.\r\nVui lòng kiểm tra lại thiết bị của bạn";
    } else {
      this.error = "Vui lòng kiểm tra lại thiết bị camera và mic của bạn";
    }
    this.countClick = 0;
  }
  async beReady(typee) {
    let type = typee;
    try {
      if (!this.localStream) {
        let stream;
        if (type == 1) {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } else {
          this.cam = true;
          stream = await navigator.mediaDevices.getUserMedia(
            constraintsWithoutCam
          );
        }
        // console.log(stream);
        this.localStream = stream;
        if (this.localStream.status == false) {
          return (this.error = "Kiểm tra lại thiết bị cam hoặc mic");
        }
        this.handleSuccess(this.localStream);
        this.createConnectionAndAddStream(this.localStream);
        return 1;
      }
      this.error = "Bạn Đang trong cuộc gọi hoặc không có gọi nào";
    } catch (error) {
      // alert(JSON.stringify(error))
      this.displayErrorMedia(error);
      return -1;
    }
  }

  applyCamDevice(idVideo) {
    console.log(idVideo);
    this.localStream.getVideoTracks().forEach((track) => {
      this.localStream.removeTrack(track);
      track.stop();
    });
    navigator.mediaDevices
      .getUserMedia({
        video: {
          deviceId: idVideo,
        },
      })
      .then((stream) => {
        stream
          .getVideoTracks()
          .forEach((track) => this.localStream.addTrack(track, stream));
        this.localStream
          .getVideoTracks()
          .forEach((track) =>
            this.peerConnection.addTrack(track, this.localStream)
          );
        console.log(
          `Using video device: ${this.localStream.getVideoTracks()[0].label}`
        );
        // const thisChatApp = this;
        // console.log(this.peerConnection);
        this.peerConnection.getSenders().forEach((rtpSender) => {
          rtpSender
            .replaceTrack(this.localStream.getVideoTracks()[0])
            .then(function () {
              console.log("Replaced video track success");
            })
            .catch(function (error) {
              // thisChatApp.switchCam();
              console.log("Could not replace video track: " + error);
            });
        });
        this.localVideo.srcObject = null;
        this.localVideo.srcObject = this.localStream;
        if (this.cam) {
          this.setCam();
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  applyMicDevice(idAudio) {
    console.log("tạ đây rồi");
    this.localStream.getAudioTracks().forEach((track) => {
      track.stop();
      this.localStream.removeTrack(track);
    });
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          deviceId: idAudio,
        },
      })
      .then((stream) => {
        stream
          .getAudioTracks()
          .forEach((track) => this.localStream.addTrack(track, stream));
        // const thisChatApp = this;
        // console.log(this.peerConnection);
        console.log(
          `Using video device: ${this.localStream.getAudioTracks()[0].label}`
        );
        this.peerConnection.getSenders().forEach((rtpSender) => {
          rtpSender
            .replaceTrack(this.localStream.getAudioTracks()[0])
            .then(function () {
              console.log("Replaced video track from camera front to behine");
            })
            .catch(function (error) {
              // thisChatApp.switchCam();
              console.log("Could not replace video track: " + error);
            });
        });
        this.localVideo.srcObject = null;
        this.localVideo.srcObject = this.localStream;
        if (this.mic) {
          this.setMic();
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  applyPreview(idAudio, idVideo) {
    if (idVideo == -1) {
      if (!this.cam) {
        this.setCam();
      }
    } else {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            deviceId: idVideo,
          },
        })
        .then((stream) => {
          this.localStream.getVideoTracks().forEach((track) => {
            track.stop();
            this.localStream.removeTrack(track);
          });
          stream
            .getVideoTracks()
            .forEach((track) => this.localStream.addTrack(track, stream));
          this.localStream
            .getVideoTracks()
            .forEach((track) =>
              this.peerConnection.addTrack(track, this.localStream)
            );
          console.log(
            `Using video device: ${this.localStream.getVideoTracks()[0].label}`
          );
          // const thisChatApp = this;
          // console.log(this.peerConnection);
          this.peerConnection.getSenders().forEach((rtpSender) => {
            rtpSender
              .replaceTrack(this.localStream.getVideoTracks()[0])
              .then(function () {
                console.log("Replaced video track success");
              })
              .catch(function (error) {
                // thisChatApp.switchCam();
                console.log("Could not replace video track: " + error);
              });
          });
          this.localVideo.srcObject = null;
          this.localVideo.srcObject = this.localStream;
          if (this.cam) {
            this.setCam();
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
    if (idAudio == -1) {
      if (!this.mic) {
        this.setMic();
      }
    } else {
      navigator.mediaDevices
        .getUserMedia({
          audio: {
            deviceId: idAudio,
          },
        })
        .then((stream) => {
          this.localStream.getAudioTracks().forEach((track) => {
            track.stop();
            this.localStream.removeTrack(track);
          });
          stream
            .getAudioTracks()
            .forEach((track) => this.localStream.addTrack(track, stream));
          this.localStream
            .getAudioTracks()
            .forEach((track) =>
              this.peerConnection.addTrack(track, this.localStream)
            );
          // const thisChatApp = this;
          // console.log(this.peerConnection);
          console.log(
            `Using video device: ${this.localStream.getAudioTracks()[0].label}`
          );
          this.peerConnection.getSenders().forEach((rtpSender) => {
            rtpSender
              .replaceTrack(this.localStream.getAudioTracks()[0])
              .then(function () {
                console.log("Replaced video track from camera front to behine");
              })
              .catch(function (error) {
                // thisChatApp.switchCam();
                console.log("Could not replace video track: " + error);
              });
          });
          this.localVideo.srcObject = null;
          this.localVideo.srcObject = this.localStream;
          if (this.mic) {
            this.setMic();
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }

  attachSinkId(element, sinkId) {
    if (typeof element.sinkId !== "undefined") {
      element
        .setSinkId(sinkId)
        .then(() => {
          console.log(`Success, audio output device attached: ${sinkId}`);
        })
        .catch((error) => {
          let errorMessage = error;
          if (error.name === "SecurityError") {
            errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
          }
          console.error(errorMessage);
          // Jump back to first output device in the list as it's the default.
          audioOutputSelect.selectedIndex = 0;
        });
    } else {
      console.warn("Browser does not support output device selection.");
    }
  }

  changeAudioDestination() {
    const audioDestination = audioOutputSelect.value;
    attachSinkId(videoElement, audioDestination);
  }

  endMedia() {
    $("#popup_show_call_mess_gr").hide();
    $(".popup_call_chat365").hide();
    $("#popup_show_call_mess").hide();
    $(".call_back_video_call").removeClass("called");
    $(".call_back_audio_call").removeClass("called");
    // this.socket.emit("endMedia", { caller: this.userCurrent });
    this.appendHours.text("00");
    this.appendMinutes.text("00");
    this.appendSeconds.text("00");
    this.countClick = 0;
    this.seconds = 0;
    this.hours = 0;
    this.minutes = 0;
    this.remoteRTCMessage = null;
    this.remoteStream = null;
    this.userReceiver = null;
    this.mic = false;
    this.cam = false;
    this.wave = false;
    this.share = false;
    this.caller = null;
    this.callee = null;
    this.conversation = null;
    this.type = null;
    this.isIceCandidateSend = false;
    $(window).off("beforeunload");
    clearTimeout(this.timeoutCall);
    clearInterval(this.stopWatch);
    if (this.localStream) {
      console.log(this.localStream.getTracks());
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localVideo = null;
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    $("#screenShare").show();
    $("#offscreenShare").hide();
    document.getElementById("setCam").src = "../images/video_call/camOn.png";
    document.getElementById("setMic").src = "../images/video_call/micOn.png";
    $(".hand_wave,.off_mic_call").hide();
    // this.camRemoteOnOff.style.display = "none";
    // this.remoteVideo.style.display = "none";
    // this.camLocalOnOff.style.display = "none";
    // this.localVideo.style.display = "none"
  }

  //Xư lý set cam, mic và bật cam người dùng
  handleSuccess(stream) {
    this.localVideo = document.getElementById("localVideo");
    this.localVideo.muted = true;
    this.localVideo.volume = 0;
    this.remoteVideo = document.getElementById("remoteVideo");
    this.camLocalOnOff = document.getElementById("camLocalOnOff");
    this.camRemoteOnOff = document.getElementById("camRemoteOnOff");

    let videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      console.log(`Using video device: ${videoTracks[0].label}`);
      window.stream = stream; // make variable available to browser console
      this.localVideo.srcObject = stream;
    }
  }

  // Tạo kết nối RTCPeerConnection khi gọi và khi nhấn trả lời
  // Tạo kết nối RTCPeerConnection và thêm luồng
  createConnectionAndAddStream(localStream) {
    this.createPeerConnection();
    localStream
      .getTracks()
      .forEach((track) => this.peerConnection.addTrack(track, localStream));
    // this.peerConnection.addStream(localStream);
    return true;
  }
  createPeerConnection() {
    try {
      // peerConnection = new RTCPeerConnection();
      this.peerConnection = new RTCPeerConnection({ iceServers });
      this.peerConnection.thisChatApp = this;
      this.peerConnection.onicecandidate = this.handleIceCandidate;
      this.peerConnection.onaddstream = this.handleRemoteStreamAdded;
      this.peerConnection.onremovestream = this.handleRemoteStreamRemoved;
      //check remote stream close tap or close browser
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log(this.peerConnection.iceConnectionState);
        let disconnectTimeout;
        if (["connected"].includes(this.peerConnection.iceConnectionState)) {
          clearTimeout(disconnectTimeout);
        }
        if (
          ["failed", "closed"].includes(this.peerConnection.iceConnectionState)
        ) {
          console.log(
            "this peerConnection is ",
            this.peerConnection.iceConnectionState
          );
          this.endCallDisconnect();
          this.endMedia();
        }
        if (["disconnected"].includes(this.peerConnection.iceConnectionState)) {
          console.log(
            "this peerConnection is ",
            this.peerConnection.iceConnectionState
          );
          this.peerConnection.restartIce();
          disconnectTimeout = setTimeout(() => {
            if (
              ["disconnected"].includes(this.peerConnection.iceConnectionState)
            ) {
              console.log("endConnect");
              this.endCallDisconnect();
              this.endMedia();
            } else {
              console.log("reconneted");
              this.peerConnection.restartIce();
              clearTimeout(disconnectTimeout);
            }
          }, 10000);
        }
      };
      // console.log('Created RTCPeerConnnection');
      return;
    } catch (e) {
      console.log("Failed to create PeerConnsection, exception: " + e.message);
      console.log("Cannot create RTCPeerConnection object.");
      return;
    }
  }

  // Tạo đối tượng kết nối
  handleIceCandidate(event) {
    // console.log('icecandidate event: ', event);
    if (event.candidate) {
      // console.log("Local ICE candidate");
      // console.log(event.candidate.candidate);
      this.thisChatApp.sendICEcandidate({
        caller: this.thisChatApp.userCurrent,
        callee: this.thisChatApp.userReceiver,
        rtcMessage: {
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
        },
      });
    } else {
      // console.log('End of candidates.');
    }
  }

  // Thêm luồng từ xa
  handleRemoteStreamAdded(event) {
    // console.log('Remote stream added.');
    this.thisChatApp.remoteStream = event.stream;
    this.thisChatApp.remoteVideo.srcObject = event.stream;
  }

  // Loại bỏ luồng từ xa
  handleRemoteStreamRemoved(event) {
    // console.log('Remote stream removed. Event: ', event);
    this.thisChatApp.remoteVideo.srcObject = null;
    this.thisChatApp.localVideo.srcObject = null;
  }
}
