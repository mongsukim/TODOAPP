const express = require('express');
const res = require('express/lib/response');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));
const MongoClient = require('mongodb').MongoClient;
app.set('view engine','ejs')

var db;

MongoClient.connect('mongodb+srv:// : @cluster0.3rmzg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', 
function(error, client){
    if (error) return console.log(error);

    db = client.db('todoapp')


    app.listen('8080', function(){
      console.log('listening on 8080')
    });
  })






app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html')
})

app.get('/write', function(req, res){
    res.sendFile(__dirname + '/write.html')
})

app.post('/add', function(req,res){
    res.send('전송완료');
    db.collection('counter').findOne({name : '게시물갯수'}, function(error, result){
        console.log(result.totalPost)
        var totalPostnumber = result.totalPost;
        db.collection('post').insertOne({ _id: totalPostnumber+1, 제목:req.body.title, 날짜:req.body.date }, function(error,result){
            console.log('저장완료');
            //counter라는 콜렉션에 있는 totalPost라는 항목도 1 증가시킨다(수정)
            db.collection('counter').updateOne({name:'게시물갯수'},{$inc : {totalPost:1}},function(error, result){
                if(error){return console.log(error)}
            })
        });
    });
});

    // list로 get요청으로 접속하면 db에 저장된 데이터들로 꾸며진 html을 보여주기


app.get('/list', function(req, res){
    db.collection('post').find().toArray(function(error, result){
        console.log(result);
        res.render('list.ejs', { posts : result });
    });
});

app.delete('/delete', function(req,res){
    console.log(req.body);
    req.body._id = parseInt(req.body._id);
    db.collection('post').deleteOne(req.body,function(error,result){
        console.log('삭제완료');
        res.status(200).send({message:'성공했습니다'});
    })
})