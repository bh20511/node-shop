//環境變數
require("dotenv").config();
//node.js微框架
const express = require("express");
//express的server
const app = express();
//設定資料庫
const db = require(__dirname + "/modules/db_connect.js");

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




//路由部分
app.get("/", (req, res) => {
  res.send("歡迎來到express");
});

app.use("/member", require(__dirname + "/routes/member"));



//設定找不到頁面時顯示的畫面
app.use((req, res) => {
  res.status(404).send("<h1>404-找不到你要的網頁</h1>");
});

//偵聽port
const port = process.env.SERVER_PORT;
app.listen(port, () => {
  console.log(`server port:${port}已經開始執行`);
});
