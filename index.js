//環境變數
require("dotenv").config();
//node.js微框架
const express = require("express");
//express的server
const app = express();
//設定資料庫
const db = require(__dirname + "/modules/db_connect.js");
//設定jwt
const jwt = require("jsonwebtoken");
const cors = require("cors");
//跨網域 白名單
const corsOptions = {
  credentials: true,
  origin: function (origin, callback) {
    // console.log({origin});
    callback(null, true);
  },
};

app.use(cors(corsOptions));

//設定靜態資料夾
app.use(express.static("public"));
//設定post部分

const myParser = require("body-parser");

app.use(myParser.json());
app.use(myParser.urlencoded({ extended: false }));

app.use(async (req, res, next) => {
  res.locals.auth = {};
  let auth = req.get("Authorization");

  if (auth && auth.indexOf("Bearer ") === 0) {
    console.log({ auth });
    auth = auth.slice(7);
    try {
      const payload = await jwt.verify(auth, process.env.JWT_SECRET);
      res.locals.auth = payload;
    } catch (err) {
      console.log("token解析有問題:", err);
    }
  }
  next();
});

//路由部分
app.get("/", (req, res) => {
  res.send("歡迎來到express");
});

//會員部分
app.use("/member", require(__dirname + "/routes/member"));

//商品部分
app.use("/product", require(__dirname + "/routes/product"));

//購物車部分
app.use("/cart", require(__dirname + "/routes/cart"));

app.get("/test-token", (req, res) => {
  // return res.json({ a: 1 });
  const output = {
    success: false,
    member_sid: "沒登入不能看唷",
  };
  const { auth } = res.locals;
  if (auth && auth.member_sid) {
    return res.json({ ...output, success: true, member_sid: auth.member_sid });
  }
  res.json(output);
});

//設定找不到頁面時顯示的畫面
app.use((req, res) => {
  res.status(404).send("<h1>404-找不到你要的網頁</h1>");
});

//偵聽port
const port = process.env.SERVER_PORT;
app.listen(port, () => {
  console.log(`server port:${port}已經開始執行`);
});
