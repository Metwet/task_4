import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser  from "cookie-parser";
import sessions  from "express-session";
import jwt from "jsonwebtoken"

import dotenv from "dotenv"
dotenv.config();

const app = express();
const port = process.env.PORT;;

app.listen(port, ()=>{
    console.log('Server started');
});


const connection = mysql.createConnection(process.env.DATABASE_URL)

connection.connect(function(err) {
    if (err) throw err;
    console.log("MySQL connected!");
});

app.use(cors({
    origin: [`${process.env.ORIGIN_URL}`],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials:true,
    headers: ["Origin", "X-Requested-With", "Content-Type", "Accept"]
}));

app.use(express.json());

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));

app.use(sessions({
    key: "userId",
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: false,
    cookie: {expires: 60*60*24 },
    resave: false 
}));

app.get('/', (req, res)=>{
    if(req.session.user){
        res.send({loggedIn: true, user: req.session.user})
    } else {
        res.send({loggedIn: false})
    }
});

app.post("/", function (request, response) {
    if(!request.body) return response.sendStatus(400);

    const date = new Date();
    const registrationDate = date.toISOString().slice(0, 18);
    const data = [registrationDate];
    
    const q = `INSERT INTO users(name, email, password, reg_date, login_date) VALUES('${request.body.username}', '${request.body.email}', '${request.body.password}', '${data}', '${data}')`;
 
    connection.query(q, (err, results)=>{
        if(err) return results.json(err);
    });

});

app.get('/login', (req, res)=>{
    if(req.session.user){
        const id = req.session.user.id;
        const token = jwt.sign({id}, "jwtSecret", {
            expiresIn: 300,
        })

        const q = `SELECT * FROM users WHERE id = ?`;
        connection.query(q, [req.session.user[0].id], function(error, results) {
            if (error) throw error;
            if (results.length>0){
                req.session.user = results;
                res.json({loggedIn: true, user: req.session.user, auth: true, token: token});
            } else {
                res.send({loggedIn: false, message: "DELETE"})
            }
        });
    } else {
        res.send({loggedIn: false, message: "no user exists"})
    }
});

app.post("/login", (req, res)=>{
    const email = req.body.email;
    const password = req.body.password;
    const q = "SELECT * FROM users WHERE email = ? AND password = ?";

    connection.query(q, [email, password], (error, result)=>{
        if(error){
            res.send({error: error});
        }
        if(result.length > 0){
            if(result[0].password == password){
                const id = result[0].id;
                const token = jwt.sign({id}, "jwtSecret", {
                    expiresIn: 300,
                })
                req.session.user = result;
                res.json({auth: true, token: token, result: result});

                const date = new Date();
                const registrationDate = date.toISOString().slice(0, 18);

                const sql = `UPDATE users SET login_date = ? WHERE id = ?`;
                const data = [registrationDate, id];
                connection.query(sql, data, function (err, result) {
                    if (err) throw err;
                });
            }     
        }else{
            res.json({auth: false, message: "no user exists"})
        }   
    })
})

app.get("/table", (req, res)=>{
    const q = "SELECT * FROM users"
    connection.query(q, (err,data)=>{
        if(err) return res.json(err)
        return res.json(data)
    })
})

app.delete("/table/:id", (req, res)=>{
    const userId = req.params.id;
    const q = "DELETE FROM users WHERE id = ?";
    connection.query(q, [userId], (err, data) => {
        if(err) return res.json(err);
        return res.json("Row has been deleted successfully!");
    });
})

app.put("/table/:id", (req, res)=>{
    const userId = req.params.id;
    const status = req.body.ban_status;
    const q = "UPDATE users SET ban_status = ? WHERE id = ?";
    connection.query(q, [status, userId], (err, data) => {
        if(err) return res.json(err);
        return res.json("Row has been baned successfully!");
    });
})