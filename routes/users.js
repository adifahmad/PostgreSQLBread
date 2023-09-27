var express = require('express');
var router = express.Router();
var today = new Date()
const moment = require('moment')
const path = require('path')
const { isLoggedin } = require('../helpers/util.js');



module.exports = function (db) {

    router.get('/', isLoggedin, (req, res) => {
        const { page = 1, tittle, startdate, enddate, deadline, complete, radioOperator, sortby = "id", sort = "DESC" } = req.query
        const { usersid } = req.session.user
        const limit = 5
        const offset = (page - 1) * 5
        db.query(`SELECT * FROM users WHERE id = ${usersid}`, (err, {rows})=>{
        if (err) return res.send(err)
        const queries = []
        const params = []
        const avatar = rows[0].avatar


        if (tittle) {
            params.push(tittle)
            queries.push(`tittle ilike '%' || $${params.length} || '%'`)
        }

        if (startdate && enddate) {
            params.push(startdate, enddate)
            queries.push(`deadline BETWEEN $${params.length - 1} and $${params.length}`)
        } else if (startdate) {
            params.push(startdate)
            queries.push(`deadline >= $${params.length}`)
        } else if (enddate) {
            params.push(enddate)
            queries.push(`deadline <= $${params.length}`)
        }

        if (complete) {
            params.push(complete)
            queries.push(`complete = $${params.length}`)
        }

        let sql = `SELECT COUNT(*) AS total FROM todos WHERE userid = ${usersid}`

        if (queries.length > 0) {
            sql += ` and ${queries.join(` ${radioOperator} `)}`
        }

        console.log(sql)
        console.log(params)
        db.query(sql, params, (err, { rows: data }) => {
            const url = req.url
            const total = data[0].total
            const pages = Math.ceil(total / limit)

            sql = `SELECT * FROM todos WHERE userid = ${usersid}`


            if (queries.length > 0) {
                sql += ` and (${queries.join(` ${radioOperator} `)})`
            }
            
            sql += ` ORDER BY ${sortby} ${sort}`
      

            params.push(limit, offset)
            sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`

            console.log(sql)

            db.query(sql, params, (err, { rows }) => {
                if (err) return res.send(err)
                res.render('users/list', { data: rows, query: req.query, pages, offset, page, url, moment, usersid, user: req.session.user, failedInfo : req.flash('failedInfo'), successInfo : req.flash('successInfo'), sortby, sort, avatar})
                
            })
        })
    })
        })


    router.get('/upload/:id', function (req, res) {
        res.render('users/upload')
    })

    router.post('/upload/:id', function (req, res) {

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
        const avatar = req.files.avatar;

        let avatarName = Date.now() + '-' + avatar.name;

        let avatarPath = path.join(__dirname, '..', 'public', 'images', avatarName);

        // Use the mv() method to place the file somewhere on your server
        avatar.mv(avatarPath, async function (err) {
            if (err)
                return res.status(500).send(err);
            try {
                const { rows } = await db.query('UPDATE public.users SET avatar = $1 WHERE id = $2', [avatarName, req.params.id])
                res.redirect('/users');
            } catch (err) {
                console.log(err);
            }

        });
    });

    router.get('/add/:userid', (req, res) => {
        res.render('users/add', { user: req.session.user })
    })

    router.post('/add/:userid', (req, res) => {
        db.query('INSERT INTO todos (tittle, userid) VALUES ($1,$2)', [req.body.tittle, req.params.userid], (err) => {
            if (err) return console.log(err)
            res.redirect('/users')
        })
    })


    router.get('/delete/:id', (req, res) => {
        db.query('DELETE FROM todos WHERE id = $1', [req.params.id], (err) => {
            if (err) return res.send(err)
            res.redirect('/users')
        })

    })

    router.get('/update/:id', isLoggedin, async (req, res) => {
        const id = req.params.id
        const { rows } = await db.query('SELECT * FROM todos WHERE id = $1', [id])
        res.render('users/update', { item: rows[0], user: req.session.user, moment })
        
    })

    router.post('/update/:id', (req, res) => {

        db.query('UPDATE todos SET tittle = $1,deadline = $2,complete = $3 WHERE id = $4', [req.body.tittle, req.body.deadline, req.body.complete, req.params.id], (err) => {
            if (err) return res.send(err)
            res.redirect('/users')
        })
    })

    return router;
}