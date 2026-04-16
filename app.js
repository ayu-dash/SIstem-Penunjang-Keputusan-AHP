require('dotenv').config();

const express = require('express');
const path = require('path');
const routes = require('./routes');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`✦ SPK Properti running → http://localhost:${PORT}`);
});
