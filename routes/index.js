const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', {
        title: 'SPK Properti | Metode SAW'
    });
});

module.exports = router;
