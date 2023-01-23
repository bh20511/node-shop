const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect.js");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const { HmacSHA256 } = require("crypto-js");
const Base64 = require("crypto-js/enc-base64");
//取得.env內的設定部分
require("dotenv").config();
const {
  LINEPAY_CHANNEL_ID,
  LINEPAY_CHANNEL_SECRET_KEY,
  LINEPAY_VERSION,
  LINEPAY_SITE,
  LINEPAY_RETURN_HOST,
  LINEPAY_RETURN_CONFIRM_URL,
  LINEPAY_RETURN_CANCEL_URL,
  uri,
} = process.env;


//輸入uuid跟 指定的linebody 他會幫你轉成可以送給line的headers
function createSignature(orders_num, linePayBody) {
  const nonce = orders_num;
  const string = `${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}${uri}${JSON.stringify(
    linePayBody
  )}${nonce}`;
  //製作簽章
  const signature = Base64.stringify(
    HmacSHA256(string, LINEPAY_CHANNEL_SECRET_KEY)
  );
  const headers = {
    "Content-Type": "application/json",
    "X-LINE-ChannelId": LINEPAY_CHANNEL_ID,
    "X-LINE-Authorization-Nonce	": nonce,
    "X-LINE-Authorization	": signature,
  };
  return headers;
}

// 下面是把訂單寫入資料庫
async function createOrders(req, res) {
  const output = {
    success: false,
    error: "",
    postData: req.body, //除錯用
    auth: {},
  };
  //取出買什麼東西  會員編號 還有付款方式
  const { orders, member_sid, payWay } = req.body;
  console.log(orders);
  //製作訂單的uuid編號
  const orders_num = uuidv4();
  //要用for迴圈跑出總價 先製作一個變數
  let totalPrice = 0;
  // console.log(orders);

  //把每一個品項寫入子訂單
  for (let i = 0; i < orders.length; i++) {
    const pSql = `SELECT price,name FROM products WHERE sid = ${orders[i].sid}`;
    // console.log(orders[i.sid]);
    const [result] = await db.query(pSql);
    // console.log(result);
    orders[i].price = +result[0].price;
    orders[i].name = result[0].name;
    //把商品細項的部分透過資料庫查好

    const oSql =
      "INSERT INTO order_details(orders_num,product_sid,amount,subtotal) VALUES (?,?,?,?)";

    const detailsResult = await db.query(oSql, [
      orders_num, //uuid特別編號
      orders[i].sid, //哪個會員買的
      orders[i].amount, //數量
      orders[i].price * orders[i].amount, //品項金額
    ]);
    totalPrice += orders[i].price * orders[i].amount; //計算總金額
  }

  //寫入母訂單,同時付款狀態要記得先寫未付款
  const sql =
    "INSERT INTO orders(orders_num,member_sid,total_price,pay_way,pay_state,ordered_at) VALUEs(?,?,?,?,?,NOW())";
  const [result2] = await db.query(sql, [
    orders_num,
    member_sid,
    totalPrice,
    payWay,
    "未付款",
  ]);

  const newOrder = orders.map((e, i) => {
    return { sid: e.sid, name: e.name, quantity: e.amount, price: e.price };
  });

  console.log(newOrder);

  const linePayBody = {
    1: {
      amount: totalPrice,
      currency: "TWD",
      redirectUrls: {
        confirmUrl: `${LINEPAY_RETURN_HOST}/${LINEPAY_RETURN_CONFIRM_URL}`,
        cancelUrl: `${LINEPAY_RETURN_HOST}/${LINEPAY_RETURN_CANCEL_URL}`,
      },
      packages: [
        {
          id: "1",
          amount: totalPrice,
          products: [...newOrder],
        },
      ],
    },
  };
  // console.log("helloooooo", linePayBody[1].packages[0].products);
  const headers = createSignature(orders_num, linePayBody);

  const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`;
  const linePayRes = await axios.post(url, linePayBody, { headers });
  console.log(linePayRes.data);


  
  if (result2.affectedRows) {
    output.success = true;
  }
  return { output, orders_num };
}

router.post("/createOrders", async (req, res) => {
  res.json(await createOrders(req, res));
});

// router.post("/createOrder", async (req, res) => {
//   orders = req.body.order;
//   newOrder = req.body;
//   try {
//     //要送出去的東西
//     const linePayBody = {
//       ...orders,
//       //成功的頁面跟取消的頁面
//       redirectUrls: {
//         confirmUrl: `${LINEPAY_RETURN_HOST}/${LINEPAY_RETURN_CONFIRM_URL}`,
//         cancelUrl: `${LINEPAY_RETURN_HOST}/${LINEPAY_RETURN_CANCEL_URL}`,
//       },
//     };

//     const uri = "/payments/request";
//     const headers = createSignature(uri, linePayBody);

//     const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`;
//     const linePayRes = await axios.post(url, linePayBody, { headers });
//     // console.log(linePayRes);
//     res.json(linePayRes?.data);
//   } catch (error) {
//     console.log(error);
//     res.json(error);
//   }
// });

module.exports = router;
