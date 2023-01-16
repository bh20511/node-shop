const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect.js");

async function getPageData(req) {
    // const perPage = 20;
    // let page = +req.query.page || 1;
    const sql = 'SELECT * FROM `PRODUCTS`'
    const [result]= await db.query(sql)
    return result
  }

router.get("/pageApi", async (req, res) => {
    res.json(await getPageData(req));
  });


  async function getDetailPageData(req) {
   
    const sql = 'SELECT * FROM `PRODUCTS`'
    const [result]= await db.query(sql)
    return result
  }

router.get("/pageDetailApi/:sid", async (req, res) => {
    const {sid} = req.params
    const sql = `SELECT * FROM PRODUCTS WHERE sid =${sid}`
    const [result]= await db.query(sql)
    res.json(result);
  });




module.exports = router;