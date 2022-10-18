const router = require("express").Router();
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");
//new conv

router
  .route("/")
  .post(async (req, res) => {
    try {
      const newConversation = new Conversation({
        converName: req.body.converName,
        members: [req.body.senderId, req.body.receiverId],
      });
      const savedConversation = await newConversation.save(); // lưu lại conv vừa đưa lên
      res.status(200).json(savedConversation);
    } catch (err) {
      res.status(500).json(err);
    }
  })
  .get(async (req, res) => {
    try {
      const userId = req.headers.cookie.replace("token_id=", "");
      const conversation = await Conversation.find({
        members: { $in: [userId] },
      })
        .populate("members", "username")
        .sort({ createdAt: -1 })
        // .learn()
        .exec();

      let data = JSON.parse(JSON.stringify(conversation));
      data.forEach((item) => {
        item.members = item.members.filter((mem) => mem._id !== userId);
      });
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json(err);
    }
  });
// Tạo nhóm
router.post("/multiconv", async (req, res) => {
  console.log(req.body.arraymember);
  const newConversation = new Conversation({
    members: req.body.arraymember,
  });

  try {
    const savedConversation = await newConversation.save(); // lưu lại conv vừa đưa lên
    res.status(200).json(savedConversation);
  } catch (err) {
    res.status(500).json(err);
  }
});

//getConversationName
router.post("/getConversationName", async (req, res) => {
  // 1 id
  // 2 status
  const array = req.body.iduserArray;
  let NameConv = "";
  for (let i = 0; i < array.length; i++) {
    const user = await User.findById(array[i]);
    NameConv = NameConv + " " + user.username;
  }
  res.json(NameConv);
});

// update conv by id
router.post("/update", async (req, res) => {
  // 1 id
  // 2 status
  try {
    const conversation = await Conversation.updateOne(
      { _id: req.body.id },
      { $set: { status: req.body.status } }
    );
    res.json(conversation);
  } catch (err) {
    res.json(err);
  }
});

// get conv includes two userId

router.get("/find/:firstUserId/:secondUserId", async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      members: { $all: [req.params.firstUserId, req.params.secondUserId] },
    });
    res.status(200).json(conversation);
  } catch (err) {
    res.status(500).json(err);
  }
});

// delete cov by convId
// delete mes by convId
router.get("/delete/:idConv", async (req, res) => {
  try {
    //lấy ra conv định xóa
    const Conversationinfo = await Conversation.findOne({
      _id: req.params.idConv,
    });
    const deleteConversation = await Conversation.deleteOne({
      _id: req.params.idConv,
    }); // lưu lại conv vừa đưa lên

    const deleteMesage = await Message.deleteMany({
      conversationId: req.params.idConv,
    });

    res.status(200).json(Conversationinfo);
  } catch (err) {
    res.status(500).json(err);
  }
});

// get conversation by id conv
router.get("/getconv/:idconv", async (req, res) => {
  try {
    const Conversationinfo = await Conversation.findOne({
      _id: req.params.idconv,
    });
    res.status(200).json(Conversationinfo);
  } catch (err) {
    res.status(500).json(err);
  }
});
module.exports = router;
