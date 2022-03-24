const express = require('express');
const res = require('express/lib/response');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
require('dotenv').config()

app.use(
  session({ secret: '비밀코드', resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

var db;
MongoClient.connect(process.env.DB_URL, function(err, client){
  if (err) return console.log(err)
  db = client.db('todoapp');
  app.listen(process.env.PORT, function() {
    console.log('listening on 8080')
  })
}) 

app.get('/', function (req, res) {
  res.render('index.ejs');
});

app.get('/write', function (req, res) {
  res.sendFile(__dirname + '/write.html');
});

app.post('/add', function (req, res) {
  res.send('전송완료');
  db.collection('counter').findOne(
    { name: '게시물갯수' },
    function (error, result) {
      console.log(result.totalPost);
      var totalPostnumber = result.totalPost;
      db.collection('post').insertOne(
        { _id: totalPostnumber + 1, 제목: req.body.title, 날짜: req.body.date },
        function (error, result) {
          console.log('저장완료');
          //counter라는 콜렉션에 있는 totalPost라는 항목도 1 증가시킨다(수정)
          db.collection('counter').updateOne(
            { name: '게시물갯수' },
            { $inc: { totalPost: 1 } },
            function (error, result) {
              if (error) {
                return console.log(error);
              }
            }
          );
        }
      );
    }
  );
});

// list로 get요청으로 접속하면 db에 저장된 데이터들로 꾸며진 html을 보여주기

app.get('/list', function (req, res) {
  db.collection('post')
    .find()
    .toArray(function (error, result) {
      console.log(result);
      res.render('list.ejs', { posts: result });
    });
});

app.get('/search', (req, res)=> {
  var searchRequirement = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: req.query.value,
          path: '제목'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        }
      }
    },
    {$sort:{_id:1}}
  ]

  db.collection('post').aggregate(searchRequirement).toArray((error, result) => {
    console.log(result)
    res.render('resultpage.ejs', { posts: result });
  })
})


app.delete('/delete', function (req, res) {
  console.log(req.body);
  req.body._id = parseInt(req.body._id);
  db.collection('post').deleteOne(req.body, function (error, result) {
    console.log('삭제완료');
    res.status(200).send({ message: '성공했습니다' });
  });
});

app.get('/detail/:id', function (req, res) {
  db.collection('post').findOne(
    { _id: parseInt(req.params.id) },
    function (error, result) {
      console.log(result);
      res.render('detail.ejs', { data: result });
    }
  );
});

app.get('/edit/:id', function (req, res) {
  db.collection('post').findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      res.render('edit.ejs', { post: result });
    }
  );
});

app.put('/edit', function (req, res) {
  db.collection('post').updateOne(
    { _id: parseInt(req.body.id) },
    { $set: { 제목: req.body.title, 날짜: req.body.date } },
    function (err, result) {
      console.log('수정완료');
      res.redirect('/list');
    }
  );
});

app.get('/login', function (req, res) {
  res.render('login.ejs');
});

app.post(
  '/login',
  passport.authenticate('local', {
    failureRedirect: '/fail',
  }),
  function (req, res) {
    res.redirect('/');
  }
);

app.get('/mypage', isLogin, function (req, res) {
  console.log(req.user)
  res.render('mypage.ejs', {user: req.user});
});

function isLogin(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send('로그인 안하셨는데요?');
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: 'id',
      passwordField: 'pw',
      session: true,
      passReqToCallback: false,
    },
    function (id, pw, done) {
      console.log(id, pw);
      db.collection('login').findOne({ id: id }, function (error, result) {
        if (error) return done(error);

        if (!result)
          return done(null, false, { message: '존재하지않는 아이디요' });
        if (pw == result.pw) {
          return done(null, result);
        } else {
          return done(null, false, { message: '비번틀렸어요' });
        }
      });
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  db.collection('login').findOne({id: id}, function (err,result) {
    done(null, result);  
  })
});
