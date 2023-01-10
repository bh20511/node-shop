const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect.js");
const jwt = require("jsonwebtoken")

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
    result[0] && password 
  ) {
    const token = jwt.sign({ member_sid: result[0].member_sid }, "hiking1214")

    output.member_sid = result[0].member_sid
    output.nickname = result[0].nickname
    output.success = true
    output.token =  token
  }
  console.log(result);


  res.json(output);
});

module.exports = router;
