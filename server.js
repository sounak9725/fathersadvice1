const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require("./models/userMODEL.js");
const config = require('./config.json');
const MentorRequest = require('./models/mentorRequest.js');

const app = express();

// Connect to MongoDB
mongoose.connect(config.mongoURI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });

//Define User schema and model
// const UserSchema = new mongoose.Schema({
//     name: { type: String, required: true },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     role: { type: String, required: true } // Mentee or Mentor
// });
// const User = mongoose.model('User', UserSchema); // it will go to the model

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Specify the views folder for EJS templates
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/html', express.static(path.join(__dirname, 'public', 'html')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Serve the main index.html file
app.get('/', (req, res) => {
    if (!req.session.userId) {
        // Allow public access to home page
        res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
    } else {
        // If logged in, redirect to the profile page
        res.redirect('/profile');
    }
});

// Signup route


app.post('/signup', async (req, res) => {
    console.log(req.body); // Ensure all data is logged correctly

    const { name, email, password, role, phone, address, language, qualification } = req.body;
    
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword, 
            role, 
            phone, 
            address, 
            language, 
            qualification 
        });

        // Save user to the database
        await newUser.save()
            .then(() => {
                console.log('New user saved:', newUser); // Log successful save
            })
            .catch(err => {
                console.error('Error saving user:', err); // Log any errors during save
            });

        res.redirect('/html/login.html');
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('Internal server error');
    }
});



// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('User not found');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Invalid password');
        }

        req.session.userId = user._id;
        req.session.role = user.role; // Store the role in the session
        res.redirect('/profile'); // Redirect to profile after successful login
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal server error');
    }
});

// Protect the profile page (only accessible if logged in)
app.get('/profile', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('You need to log in first');
    }
    
    // Fetch user data and render the profile.ejs template
    User.findById(req.session.userId)
        .then(user => {
            res.render('profile', { user }); // Render profile page with user data
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            res.status(500).send('Internal server error');
        });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Failed to log out');
        }
        res.redirect('/');
    });
});


// Add this to your server.js
app.post('/find-mentor', async (req, res) => {
    const { education, field, location, details } = req.body;

    // Check if all required fields are filled
    if (!education || !field || !location) {
        return res.status(400).send('Please fill in all the fields');
    }

    try {
        // Create a new document or process the data here
        const newRequest = new MentorRequest({
            education,
            field,
            location,
            details
        });

        // Save the data into a new collection (e.g., MentorRequests)
        await newRequest.save();

        // Redirect the user to a random mentor profile page (or show matching mentors)
        res.redirect(`/mentor-profile/${newRequest._id}`);
    } catch (error) {
        console.error('Error saving mentor request:', error);
        res.status(500).send('Internal Server Error');
    }
});









// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
