const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

router.post("/login/api", async (req, res) => {
  const sql = "SELECT * FROM `members` WHERE `email` = ?";
  const output = {
    success: false,
    member_sid: "",
    nickname: "",
    token: "",
  };
  console.log(req.body);

  const { email, password } = req.body;
  console.log(email);
  const [result] = await db.query(sql, email.toLowerCase());
  // console.log(result)

  if (
    result[0] &&
    password &&
    bcrypt.compareSync(password, result[0].password)
  ) {
    const token = jwt.sign({ member_sid: result[0].member_sid }, "hiking1214");

    output.member_sid = result[0].member_sid;
    output.nickname = result[0].nickname;
    output.success = true;
    output.token = token;
  }
  console.log(result);

  res.json(output);
});

router.post("/signUp/api", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    error: "",
    postData: req.body,
    token: "",
    //for debug
  };

  if (!req.body.email || !req.body.password || !req.body.nickname) {
    output.error = ": 必填欄位不得空白";
    return res.json(output);
  }

  const sqlCheckMail = "SELECT * FROM `members` WHERE `email` = ?";

  const [rowsCheckMail] = await db.query(
    sqlCheckMail,
    req.body.email.toLowerCase()
  );

  if (rowsCheckMail.length > 0) {
    output.error = "信箱已註冊";
    return res.json(output);
  }

  const passBcrypt = bcrypt.hashSync(req.body.password, 10);

  const sql =
    "INSERT INTO `members`(`email`, `password`, `nickname`) VALUES (?, ?, ? )";

  const [result] = await db.query(sql, [
    req.body.email.toLowerCase(),
    passBcrypt,
    req.body.nickname,
  ]);

  console.log(result);

  const sqlNew = "SELECT * FROM `members` WHERE `email` = ?";
  const [resultNew] = await db.query(sqlNew, [req.body.email.toLowerCase()]);
  const token = jwt.sign({ member_sid: resultNew[0].member_sid }, "hiking1214");

  if (result.affectedRows) {
    output.success = true;
    output.token = token;
  }

  res.json(output);
});

module.exports = router;
