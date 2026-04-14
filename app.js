const express = require('express');
const expressStatic = require('express-static');
const app = express();

require('dotenv').config();

app.set('view engine', 'pug');

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(process.env.PORT);

