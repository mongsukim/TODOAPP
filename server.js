const express = require("express");
const app = express();
require("dotenv").config();

const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

app.use(express.urlencoded({ extended: true }));
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

let multer = require("multer");
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/image");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
var upload = multer({ storage: storage });

app.use(
  session({ secret: "비밀코드", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

let db;

MongoClient.connect(process.env.DB_URL)
  .then((client) => {
    console.log("db연결성공");
    db = client.db("forum");
    app.listen(8080, () => {
      console.log("http://localhost:8080에서 서버실행중");
    });
  })
  .catch((err) => {
    console.log("err", err);
  });

app.get("/", function (req, res) {
  res.render("반갑다 index.ejs");
});

app.get("/write", function (req, res) {
  res.render("write.ejs");
});

app.post("/add", function (req, res) {
  console.log(req.body);
  // res.render("write.ejs");
});

// db에 있는 데이터 꺼내오기
app.get("/list", async (req, res) => {
  let result = await db.collection("post").find().toArray();
  res.render("list.ejs", { posts: result });
});

app.get("/search", (req, res) => {
  var searchRequirement = [
    {
      $search: {
        index: "titleSearch",
        text: {
          query: req.query.value,
          path: "제목", // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        },
      },
    },
    { $sort: { _id: 1 } },
  ];

  db.collection("post")
    .aggregate(searchRequirement)
    .toArray((error, result) => {
      console.log(result);
      res.render("resultpage.ejs", { posts: result });
    });
});

app.get("/detail/:id", function (req, res) {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (error, result) {
      console.log(result);
      res.render("detail.ejs", { data: result });
    }
  );
});

app.get("/edit/:id", function (req, res) {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      res.render("edit.ejs", { post: result });
    }
  );
});

app.put("/edit", function (req, res) {
  db.collection("post").updateOne(
    { _id: parseInt(req.body.id) },
    { $set: { 제목: req.body.title, 날짜: req.body.date } },
    function (err, result) {
      console.log("수정완료");
      res.redirect("/list");
    }
  );
});

app.get("/login", function (req, res) {
  res.render("login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  function (req, res) {
    res.redirect("/");
  }
);

app.get("/mypage", isLogin, function (req, res) {
  console.log(req.user);
  res.render("mypage.ejs", { user: req.user });
});

function isLogin(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send("로그인 안하셨는데요?");
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    function (id, pw, done) {
      console.log(id, pw);
      db.collection("login").findOne({ id: id }, function (error, result) {
        if (error) return done(error);

        if (!result)
          return done(null, false, { message: "존재하지않는 아이디요" });
        if (pw == result.pw) {
          return done(null, result);
        } else {
          return done(null, false, { message: "비번틀렸어요" });
        }
      });
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  db.collection("login").findOne({ id: id }, function (err, result) {
    done(null, result);
  });
});

app.post("/register", function (req, res) {
  db.collection("login").insertOne(
    { id: req.body.id, pw: req.body.pw },
    function (error, result) {
      res.redirect("/");
    }
  );
});

app.post("/add", function (req, res) {
  res.send("전송완료");
  db.collection("counter").findOne(
    { name: "게시물갯수" },
    function (error, result) {
      console.log(result.totalPost);
      var totalPostnumber = result.totalPost;
      var toSave = {
        _id: totalPostnumber + 1,
        제목: req.body.title,
        날짜: req.body.date,
        작성자: req.user._id,
      };

      db.collection("post").insertOne(toSave, function (error, result) {
        console.log("저장완료");
        db.collection("counter").updateOne(
          { name: "게시물갯수" },
          { $inc: { totalPost: 1 } },
          function (error, result) {
            if (error) {
              return console.log(error);
            }
          }
        );
      });
    }
  );
});

app.delete("/delete", function (req, res) {
  console.log(req.body);
  req.body._id = parseInt(req.body._id);

  var toDeleteData = { _id: req.body._id, 작성자: req.user._id };

  db.collection("post").deleteOne(toDeleteData, function (error, result) {
    console.log("삭제완료");
    if (result) {
      console.log(result);
    }
    res.status(200).send({ message: "성공했습니다" });
  });
});

app.use("/shop", require("./routes/shop.js"));
app.use("/board", require("./routes/board.js"));

app.get("/upload", function (req, res) {
  res.render("upload.ejs");
});

app.post("/upload", upload.single("uploadfile"), function (req, res) {
  res.send("업로드완료");
});

app.get("/image/:imageName", function (req, res) {
  res.sendFile(__dirname + "/public/image/" + req.params.imageName);
});
