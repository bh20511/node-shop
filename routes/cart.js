const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect.js");
const { v4: uuidv4 } = require("uuid");

async function createOrders(req, res) {
  const output = {
    success: false,
    error: "",
    postData: req.body, //除錯用
    auth: {},
  };
  const { orders, member_sid, payWay } = req.body;
  const orders_num = uuidv4();
  let totalPrice = 0;
  console.log(orders);

  for (let i = 0; i < orders.length; i++) {
    const pSql = `SELECT price FROM products WHERE sid = ${orders[i].sid}`;
    console.log(orders[i.sid]);
    const [result] = await db.query(pSql);
    console.log(result);

    const oSql =
      "INSERT INTO order_details(orders_num,product_sid,amount,subtotal) VALUES (?,?,?,?)";

    const detailsResult = await db.query(oSql, [
      orders_num,
      orders[i].sid,
      orders[i].amount,
      +result[0].price * orders[i].amount,
    ]);
    totalPrice += +result[0].price * orders[i].amount;
  }

  const sql =
    "INSERT INTO orders(orders_num,member_sid,total_price,pay_way,ordered_at) VALUEs(?,?,?,?,NOW())";
  const [result2] = await db.query(sql, [
    orders_num,
    member_sid,
    totalPrice,
    payWay,
  ]);

  if (result2.affectedRows) {
    output.success = true;
  }
  return { output, orders_num };
}

router.post("/createOrders", async (req, res) => {
  res.json(await createOrders(req, res));
});

module.exports = router;
