'use strict';
require('dotenv').config();
const express=require('express');
const superagent=require('superagent');
const cors= require('cors');
const pg= require('pg');


const PORT=process.env.PORT || 3000;
const server=express();
server.use(cors());
server.set('view engine','ejs');
server.use(express.static('./public'));
server.use(express.urlencoded({extended:true}));
let client = new pg.Client((process.env.DATABASE_URL));


function booksSearchHand (req,res){
  let bookSearchInput=req.body.search_query;
  let search=req.body.search_fields;
  let bookUrl=`https://www.googleapis.com/books/v1/volumes?q=+in${bookSearchInput}:${search}`;
  superagent.get(bookUrl)
    .then(booksData=>{
      let volumeInfoArr=booksData.body;
      let newBookInstance= volumeInfoArr.items.map(element=>{
        return new BOOKS(element);
      });
      res.render('searches/show',{bookinstance:newBookInstance});
    })
    .catch(()=>{
      res.render('error');
    });
}


function homePageHandeler (req,res){
  let sql=`select * from books;`;
  client.query(sql)
    .then (result=>{
      res.render('pages/index',{books:result.rows});
    });
}


function selectedBookHand (req,res){
  let {title,author,description,isbn,image_url,bookshelf}=req.body;
  let sql= `insert into books (title,author,description,isbn,image_url,bookshelf) values ($1,$2,$3,$4,$5,$6) Returning *;`;
  let safeValues=[title,author,description,isbn,image_url,bookshelf];
  client.query(sql,safeValues)
    .then(result=>{
      res.redirect(`/book/${result.rows[0].id}`);
    });
}

function idbookhandeler(req,res){
  let sql=`select * from books where id=$1;`;
  let safeValues=[req.params.id];
  client.query(sql,safeValues)
    .then(result=>{
      res.render('pages/books/book',{bookid:result.rows[0]});
    });
}


server.get('/',homePageHandeler);
server.get('/new',(req,res)=>{
  res.render('searches/new');
});
server.post('/searches',booksSearchHand);
server.post('/book',selectedBookHand);
server.get('/book/:id',idbookhandeler);
server.get('*', (req,res)=>{
  res.render('pages/error');
});


function BOOKS(value) {
  this.image_url=value.volumeInfo.imageLinks.thumbnail || `https://i.imgur.com/J5LVHEL.jpg`;
  this.title=value.volumeInfo.title || 'Not Found';
  this.author=value.volumeInfo.authors || 'Not Found';
  this.description=value.volumeInfo.description || 'Not Found';
  this.isbn=value.volumeInfo.industryIdentifiers[0].identifier || 'Not Found';
  this.bookshelf=value.volumeInfo.categories|| 'Not Found';
}


client.connect()
  .then(() => {
    server.listen(PORT, ()=>{
      console.log(`listen to port ${PORT}`);
    });
  });
