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



// 下面是把訂單寫入資料庫
async function createOrders(req, res) {
  const output = {
    success: false,
    error: "",
    postData: req.body, //除錯用
  };
  //取出買什麼東西  會員編號 還有付款方式
  const { orders, member_sid, payWay } = req.body;
  //製作訂單的uuid編號
  const orders_num = uuidv4();
  //要用for迴圈跑出總價 先製作一個變數
  let totalPrice = 0;

  //把每一個品項先查好金額並寫好物件
  for (let i = 0; i < orders.length; i++) {
    const pSql = `SELECT price,name FROM products WHERE sid = ${orders[i].sid}`;
    const [result] = await db.query(pSql);
    orders[i].price = +result[0].price;
    orders[i].name = result[0].name;
    //把商品細項的部分透過資料庫查好
    //經過上面之後 購物車orders陣列中的每個物件 都會有 {sid,amount,price,name} 這些屬性 

    //接下來要寫入子訂單的有  訂單編號,商品編號,商品數量,品項購買金額
    const oSql =
      "INSERT INTO order_details(orders_num,product_sid,amount,subtotal) VALUES (?,?,?,?)";

    const detailsResult = await db.query(oSql, [
      orders_num,                                             //uuid訂單編號
      orders[i].sid,                                          //商品編號
      orders[i].amount,                                       //數量
      orders[i].price * orders[i].amount,                     //品項金額
    ]);
    totalPrice += orders[i].price * orders[i].amount;         //計算總金額  !!這邊是要給母訂單寫入的  子訂單沒用到!!
  }

  //寫入母訂單,同時付款狀態要記得先寫未付款
  //要寫的資料分別有  訂單編號(uuid),會員編號,總金額,付款方式,付款狀態(未付款),訂單成立時間(NOW)
  const sql =
    "INSERT INTO orders(orders_num,member_sid,total_price,pay_way,pay_state,ordered_at) VALUEs(?,?,?,?,?,NOW())";
  const [result2] = await db.query(sql, [
    orders_num,
    member_sid,
    totalPrice,
    payWay,
    "未付款",
  ]);




  //輸入uuid跟 指定的linebody 他會幫你轉成可以送給line的headers
  // function createSignature(orders_num, linePayBody) {
  //   const nonce = orders_num;
  //   const string = `${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}${uri}${JSON.stringify(
  //     linePayBody
  //   )}${nonce}`;
  //   //製作簽章
  //   const signature = Base64.stringify(
  //     HmacSHA256(string, LINEPAY_CHANNEL_SECRET_KEY)
  //   );
  //   const headers = {
  //     "Content-Type": "application/json",
  //     "X-LINE-ChannelId": LINEPAY_CHANNEL_ID,
  //     "X-LINE-Authorization-Nonce	": nonce,
  //     "X-LINE-Authorization	": signature,
  //   };
  //   return headers;
  // }

  function createSignature(linePayBody) {
    const nonce = orders_num

    const encrypt = HmacSHA256(`${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}${uri}${JSON.stringify(linePayBody)}${nonce}`, LINEPAY_CHANNEL_SECRET_KEY)

    const signature = Base64.stringify(encrypt);
    // console.log('test:', signature);

    const headers = {
      'Content-Type': 'application/json',
      'X-LINE-ChannelId': LINEPAY_CHANNEL_ID,
      'X-LINE-Authorization-Nonce': nonce,
      'X-LINE-Authorization': signature,
    };
    return headers;
  }



  //為什麼我這邊要寫新陣列? 看起來我是想要紀錄商品編號,商品名稱,商品數量,商品價格
  const newOrder = orders.map((e, i) => {
    return { name: e.name, quantity: e.amount, price: e.price };
  });

  // console.log(newOrder);



  //   function createLinePayBody(order) {
  //     return {
  //         ...order,
  //         currency: 'TWD',
  //         redirectUrls: {
  //             confirmUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CONFIRM_URL}`,
  //             cancelUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CANCEL_URL}`,
  //           },
  //     }
  // }


  const linePayBody = {
    amount: totalPrice,
    currency: "TWD",
    orderId: orders_num,
    redirectUrls: {
      confirmUrl: `${LINEPAY_RETURN_HOST}/${LINEPAY_RETURN_CONFIRM_URL}`,
      cancelUrl: `${LINEPAY_RETURN_HOST}/${LINEPAY_RETURN_CANCEL_URL}`,
    },
    packages: [
      {
        id: "1",
        amount: totalPrice,
        products: newOrder,
      },
    ],
  };

  const headers = createSignature(linePayBody);
  const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`;
  const {data} = await axios.post(url, linePayBody, { headers });
  console.log(data);
  if(data.returnCode==='0000'){
    output.success = true;
    output.url = data.info.paymentUrl.web
    output.orders_num = orders_num
  }else{
    output.error = '訂單失敗'
  }
  // if (result2.affectedRows) {
  //   output.success = true;
  // }
  return { output };
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
