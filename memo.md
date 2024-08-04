### 시작

폴더 생성 후 에디터 열기.

server.js 생성.

```npm init```
```npm install```

#### express 라이브러리 설치

```npm install express```

#### 여러 페이지 만들기

app.get('/news, (req,res)=>{
res.sendFile(__dirname + '/index.html')
})

#### nodemon 설치

```npm install -g nodemon```

명령어 : nodemon server.js

#### css 파일 등록하기

우선 css파일 있는 폴더를 server.js에 등록부터 해야한다.
public 폴더 생성 후 main.css을 생성

server.js 에다가
```app.use('/public', express.static('public'));```

index.html파일에 <link href="css파일경로">

#### MongoDB

사용하는방법 1. 컴퓨터에 직접설치 2.클라우드 호스팅 받기

####         

데이터 저장,출력시 검사 하는 역할을 서버가 해주게 하자

```npm install mongodb@5```

#### 예시  : 누군가 /news페이지에 접속하면 db에 무언가를 저장해보자.

```
app.get('/news' (req,res) => {
 db.collection('post').insertOne({title:'내용'})
 })
```