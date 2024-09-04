const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer')
const app = express();
const fs = require('fs');
const nodemailer = require('nodemailer');
// Specify the absolute path to the public directory
const publicPath = path.join(__dirname, '../public');
const uploadsPath = path.join(publicPath, 'resume');

// Ensure the 'uploads' directory exists
fs.mkdirSync(uploadsPath, { recursive: true });
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null,uploadsPath); // Specify the directory where you want to save the files
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname); // Use a unique filename
    },
  });
const upload = multer({ storage: storage });
app.use(cors());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
const db = mysql.createConnection({
    host:"localhost",
    user:'root',
    password:'',
    database:'jobportal'
})

db.connect((err) => {
    if(err){console.log(err)}
})
app.post('/sendInterestEmail', async (req, res) => {
    const { freelancerName,freelancerEmail, companyName } = req.body;
  
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'srinithi.123.srinithi@gmail.com', 
          pass: 'lcid envc tjnc kqsp', 
        },
      });
  
      const mailOptions = {
        from: 'srinithi.123.srinithi@gmail.com',
        to: freelancerEmail,
        subject: 'Company shown interest in your profile - Job portal',
        text: `Hello ${freelancerName},\n\n${companyName} - company is shown interest in your profile!\nThey will contact further if anything.\nAll the Best For your future.\n\nRegards \nJob Portal`,
      };
  
      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Reply saved and email sent successfully.' });

    res.json({ success: true, message: 'Email sent successfully' });
  });
app.post('/getCompanyDetails', (req, res) => {
    const companyId = req.body.company_id;
  
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required.' });
    }
  
    const sql = 'SELECT * FROM company WHERE company_id = ?';
  
    db.query(sql, [companyId], (err, result) => {
      if (err) {
        console.error('Error executing SQL query:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      if (result.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
  
      const companyDetails = result[0];
      res.json({ success: true, companyDetails });
    });
  });
app.post('/getFreelancersforCompany',(re,ress)=>{
    const companyId = re.body.company_id;
    db.query("SELECT skill FROM company WHERE company_id = ?", [companyId], (err, skillData) => {
        if (err) {
            return ress.send(err);
        } else {
            if (skillData.length > 0) {
                const primarySkill = skillData[0].skill;

                // Now, use the primary skill to find users
                db.query("SELECT * FROM user WHERE p_skill = ?", [primarySkill], (err, userData) => {
                    if (err) {
                        return ress.send(err);
                    } else {
                        if (userData.length > 0) {
                            
                            return ress.send({ success: true, users: userData });
                        } else {
                            return ress.send({ success: false, message: 'No users found with the matching primary skill' });
                        }
                    }
                });
            } else {
                return ress.send({ success: false, message: 'Company not found with the provided ID' });
            }
        }
    });
});
 
app.post('/saveScore', (res,ress)=>{
    const { user_id, score} = res.body;
    
    db.query("UPDATE user set score=? where user_id=?",[score,user_id], (err,data)=>{
        if(err) return ress.send(err);
        return ress.send(data); 
    })  
})
app.post('/validateclogin', (res,ress)=>{
    const { username, password } = res.body;

    db.query("SELECT * FROM company WHERE c_name = ? AND c_email = ?", [username, password], (err, data) => {
        if (err) {
            return ress.send(err);
        } else {
            if(data.length > 0)
            {
                const id = data[0].company_id
                return ress.send({ success:true,company_id:id});
            }else {
                return ress.send({ success: false, message: 'Invalid credentials' });
            }
        }
    }); 
})

app.get('/getCompanies', (res,ress)=>{
    
    db.query("SELECT * FROM company", (err,data)=>{
        if(err) return ress.send(err);
        return ress.send(data); 
    })  
})
app.get('/getFreelancers', (res,ress)=>{
    
    db.query("SELECT * FROM user", (err,data)=>{
        if(err) return ress.send(err);
        return ress.send(data); 
    })  
})

app.post('/addCompany', (res,ress)=>{
    const { c_name, c_des,industry,vacancies,skill,c_location,c_email} = res.body;
    db.query("INSERT INTO company (company_id,c_name,c_des,industry,vacancies,skill,c_location,c_email) values (?,?,?,?,?,?,?,?)",['',c_name,c_des,industry,vacancies,skill,c_location,c_email], (err,data)=>{
        if (err) {
            return ress.send(err);
        } else {
            if (data.insertId) {
                const id = data.insertId;
                return ress.send({ success: true, company_id: id });
            } else {
                return ress.send({ success: false, message: 'Failed to add company' });
            }
        }
    })  
})

app.listen(8081, ()=>{
    console.log('listening');
})
app.post('/addUser', upload.single('file'), (req, res) => {
    const { name, email, mobile, experience, p_skill, other_skill } = req.body;
    const file = req.file; // Multer adds the 'file' object to the request
    
    // Ensure that file exists
    if (!file) {
        return res.status(400).json({ error: 'Please upload a resume file.' });
    }

    // Get the path to the uploaded file
    const resumePath = file.path;

    // Set initial score as zero
    const initialScore = 0;

    db.query("INSERT INTO user (name, email, mobile, experience, p_skill, other_skill, score, resume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, email, mobile, experience, p_skill, other_skill, initialScore, resumePath], (err, data) => {
            if (err) {
                console.error('Error adding user:', err);
                return res.status(500).json({ error: 'Failed to add user' });
            } else {
                if (data.insertId) {
                    const id = data.insertId;
                    return res.json({ success: true, user_id: id });
                } else {
                    return res.json({ success: false, message: 'Failed to add user' });
                }
            }
        });
});
