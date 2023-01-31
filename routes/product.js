const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect.js");

async function getList(req) {
  const perPage = 20;
  let page = +req.query.page || 1;
  let where = `WHERE 1`

  //判斷有沒有種類條件
  let category = +req.query.category ? req.query.category.trim() : "";
  if (category) {
    where += ` AND c.parent_sid = '${category}'`
  }
  //再來處理有幾筆 要弄幾個分頁的問題
  const sql1 = `SELECT COUNT(1) count FROM products p JOIN product_categories c ON c.sid= p.category ${where}`
  const [[{ count }]] = await db.query(sql1)
  let totalPages = 0;
  if(count > 0) {
    totalPages = Math.ceil(count / perPage);
  }
  
  //開始處理每頁問題
  const sql = `SELECT p.* FROM products p JOIN product_categories c ON c.sid = p.category ${where} LIMIT ${(page - 1) * perPage},${perPage}`
const [result] = await db.query(sql)
  return { result , count , totalPages }
}


router.get("/getlist", async (req, res) => {
  res.json(await getList(req));
});












async function getDetailPageData(req) {

  const sql = 'SELECT * FROM `PRODUCTS`'
  const [result] = await db.query(sql)
  return result
}
//這是商品細節頁
router.get("/pageDetailApi/:sid", async (req, res) => {
  const { sid } = req.params
  const sql = `SELECT * FROM PRODUCTS WHERE sid =${sid}`
  const [result] = await db.query(sql)
  res.json(result);
});



module.exports = router;