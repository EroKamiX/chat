const router = require("express").Router();
const Message = require("../models/Message");
const User = require("../models/User");
//add

router.post("/send", async (req, res) => {
  console.log(req.body);
  const newMessage = new Message(req.body);

  try {
    const savedMessage = await newMessage.save();
    res.status(200).json(savedMessage);
  } catch (err) {
    res.status(500).json(err);
  }
});

//get
// router.get("/:conversationId", async (req, res) => {
//   try {
//     const messages = await Message.find({
//       conversationId: req.params.conversationId,s
//     });
//     res.status(200).json(messages);
//   } catch (err) {
//     res.status(500).json(err);
//   }
// });
router.delete("/:mesId", async (req, res) => {
  try {
    const originmes = await Message.findOne({ _id: req.params.mesId }); // trả về tin nhắn gốc
    const messages = await Message.deleteOne({
      _id: req.params.mesId,
    });
    res.status(200).json(originmes);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/", async function (req, res) {
  try {
    const messages = await Message.find({
      conversationId: req.body.converId,
    })
    .populate("sender","profilePicture username _id")
    .exec();
    return res
      .status(200)
      .send({ messages})
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router;
