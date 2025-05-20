var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');

var hbs = require('express-handlebars');
var app = express();
const fileUpload = require('express-fileupload');
var db = require('./config/connection');
var session = require('express-session');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ✅ Register Handlebars with "eq" helper
app.engine(
  'hbs',
  hbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: __dirname + '/views/layout',
    partialsDir: __dirname + '/views/partials/',
    helpers: {
      range: function (start, end, options) {
        let result = '';
        for (let i = start; i <= end; i++) {
          result += options.fn(i);
        }
        return result;
      },
      lte: function (a, b) {
        return a <= b;
      },
      times: function(n) {
          return '⭐'.repeat(n); // Repeat star emoji for rating display
      },
      eq: function(a, b) {
          return a == b ? 'selected' : '';
      }
  }
})
)

app.use(session({
  secret: 'your_secret_key',  // Change this to a strong secret
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }  // Set true if using HTTPS
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(express.static('public'));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(session({ secret: "Key", cookie: { maxAge: 600000 } }));

db.connect((err) => {
  if (err) console.log("Connection error: " + err);
  else console.log("Database connected.");
});

app.use('/', userRouter);
app.use('/admin', adminRouter);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
