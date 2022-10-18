const router = require("express").Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
//REGISTER
router.post("/register", async (req, res) => {
  try {
    if (!req.body.password || !req.body.email || !req.body.username) {
      return res.json("Yêu cầu nhập đầy đủ");
    }
    if (req.body.password !== req.body.re_pass) {
      return res.json("Mật khẩu chưa trùng khớp");
    }
    const user_test = await User.findOne({ email: req.body.email });
    if (user_test != null) {
      return res.json("Đã có Người đăng ký tài khoản này");
    }

    //create new user
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
    });

    //save user and respond
    const user = await newUser.save();
    const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, {
      expiresIn: 60 * 60 * 24,
    });
    res.setHeader("Authorization", token);
    res
      .header("Authorization", token)
      // .send(token);
      .cookie("token_id", `${user._id}`, { maxAge: 900000, httpOnly: true })
      .redirect("/index");
    // res.status(200).json(user);
  } catch (err) {
    res.status(500).json(err);
  }
});

//LOGIN
router.post("/login", async (req, res) => {
  // catch lỗi ở đây là xử lý lỗi khi server trò chuyện với database

  const user = await User.findOne({ email: req.body.email });

  if (user == null) {
    res.json("user not found");
  } else {
    // const validPassword = await bcrypt.compare(req.body.password, user.password)
    if (req.body.password === user.password) {
      const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, {
        expiresIn: 60 * 60 * 24,
      });
      res.setHeader("Authorization", token);
      res
        .header("Authorization", token)
        // .send(token);
        .cookie("token_id", `${user._id}`, { maxAge: 900000, httpOnly: true })
        .redirect("/index");
    } else {
      res.status(404).redirect("/login");
    }
  }
});

// test api
router.get("/takedatauser/:mail", async (req, res) => {
  console.log(req.params.mail);
  const user = await User.findOne({ username: req.params.mail }); // trả về null
  res.json(user);
});
module.exports = router;
