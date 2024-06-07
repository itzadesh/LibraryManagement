const { Router } = require("express");
const router = Router();
const promisePool = require("../config/database");

router.get("/viewBooks", async (req, res) => {
  try {
    const query = "SELECT * FROM `books`";
    const [books] = await promisePool.query(query);
    const username = req.user.username;
    const msg = req.session.msg;
    const type = req.session.type;
    req.session.msg = null;
    req.session.type = null;
    res.render("viewBooks", { books, msg, type, username });
  } catch (error) {
    req.session.msg = "Internal Server Error";
    req.session.type = "error";
    return res.redirect("/");
  }
});

//This route is also done now
router.post("/checkout/:id", async (req, res) => {
  const bookid = req.params.id;
  const userid = req.user.id;
  const currentDatetime = new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  try {
    const query =
      "INSERT INTO `transactions`(`user_id`, `book_id`, `status`,`checkout_time`) VALUES (?,?,?,?)";
    const [rows, fields] = await promisePool.query(query, [
      userid,
      bookid,
      "checkout_requested",
      currentDatetime,
    ]);
    req.session.msg = "Checkout requested successfully for book";
    req.session.type = "success";
    return res.redirect("/viewBooks");
  } catch (error) {
    req.session.msg = "Internal Server Error";
    req.session.type = "error";
    return res.redirect("/viewBooks");
  }
});

router.get("/history", async (req, res) => {
  try {
    const id = req.user.id;
    const username = req.user.username;
    const query = `
    SELECT t.transaction_id, b.title AS title, t.status AS status, t.checkout_time, t.checkin_time
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    WHERE t.user_id = ?;`;
    const [transactions] = await promisePool.query(query, [id]);
    const msg = req.session.msg;
    const type = req.session.type;
    req.session.msg = null;
    req.session.type = null; 
    return res.render("viewhistory", { username, transactions, msg, type });
  } catch (error) {
    req.session.msg = "Internal Server Error";
    req.session.type = "error";
    return res.redirect("/");
  }
});

router.get("/viewholdings", async (req, res) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;
    const query = `SELECT t.transaction_id, b.title, b.author, t.checkout_time
    FROM books b
    JOIN transactions t ON b.id = t.book_id
    WHERE t.status IN ('checkout_accepted', 'checkin_requested') AND t.user_id = ?;`
    const [transactions] = await promisePool.query(query, [userId]);
    const msg = req.session.msg;
    const type = req.session.type;
    req.session.msg = null;
    req.session.type = null;
    return res.render("viewholdings", { transactions, msg, type, username });
  } catch (error) {
    req.session.msg = "Internal Server Error";
    req.session.type = "error";
    return res.redirect("/");
  }
});

router.post("/checkin/:transactionId", async (req, res) => {
  try {
    const transactionId = req.params.transactionId;
    const query1 = "SELECT * FROM `transactions` WHERE `transaction_id`=?";
    const [transactions] = await promisePool.query(query1, [transactionId]);
    if (transactions.length === 0) {
      req.session.msg = "Transaction not found";
      req.session.type = "error";
      return res.redirect("/");
    } else if (transactions[0].status == "checkin_requested") {
      req.session.msg = "Checkin is already requested for this transaction";
      req.session.type = "error";
      return res.redirect("/");
    } else if (transactions[0].status == "checkin_accepted") {
      req.session.msg = "Checkin is already accepted for this transaction";
      req.session.type = "error";
      return res.redirect("/");
    } else if (transactions[0].status != "checkout_accepted") {
      req.session.msg = "Transaction must be checked out first";
      req.session.type = "error";
      return res.redirect("/");
    } 
    const userId = req.user.id;
    const currentDatetime = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    const query = "UPDATE `transactions` SET `status` = ?, `checkin_time` = ? WHERE `transaction_id` = ?";
    const [rows,fields] = await promisePool.query(query, ['checkin_requested', currentDatetime, transactionId]);
    req.session.msg = "Checkin request sent successfully";
    req.session.type = "success";
    return res.redirect("/");
  } catch (error) {
    console.log(error);
    req.session.msg = "Internal Server Error";
    req.session.type = "error";
    return res.redirect("/");
  }
});

router.post("/reqadmin", async (req,res) =>{
  try {
    const user_id = req.user.id;
    const query1 = "SELECT * FROM `admin_requests` WHERE `user_id`=?";
    const [requests] = await promisePool.query(query1,[user_id]);
    if (requests.length != 0){
      req.session.msg = "Request already exists"
      req.session.type = "error"
      return res.redirect("/");
    }
    const query2 = "INSERT INTO `admin_requests` (`user_id`) VALUES (?);"
    const [rows,fields] = await promisePool.query(query2,[user_id]);
    req.session.msg = "Request sent successfully"
    req.session.type = "success"
    return res.redirect("/");
  } catch (error) {
    req.session.msg = "Internal Server Error";
    req.session.type = "error";
    return res.redirect("/reqadmin");
  }
})

router.get("/reqadmin", async (req,res) => {
  try {
    const user_id = req.user.id;
    const username = req.user.username;
    const query1 = "SELECT * FROM `admin_requests` WHERE `user_id`=?";
    const [requests] = await promisePool.query(query1,[user_id]);
    var request_flag = true;
    if (requests.length ==0){
      request_flag = false;
    }
    const msg = req.session.msg;
    const type = req.session.type;
    req.session.msg = null;
    req.session.type = null;
    return res.render("reqadmin", {username,msg, type, request_flag})
  } catch (error) {
    req.session.msg = "Internal Server Error";
    req.session.type = "error";
    return res.redirect("/");
  }
})

module.exports = router;
