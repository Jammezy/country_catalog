// ============================================================
// The code below belongs to server setup.
// ============================================================

// Load Neon's local environment file; hosting environment variables take priority.
require("dotenv").config({ path: [".env.local", ".env"], quiet: true });

let express = require("express");
let app = express();
let path = require("path");
let session = require("express-session");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const port = process.env.PORT || 3000;

app.use(session({
    secret: process.env.SESSION_SECRET || "country_catalog_secret",
    resave: false,
    saveUninitialized: false
}));


// ============================================================
// The code below belongs to the database connection and queries.
// ============================================================

const knex = require("knex")({
    client: "pg",
    connection: process.env.DATABASE_URL
        ? {
            // Verify the hosted database's TLS certificate.
            connectionString: process.env.DATABASE_URL.replace("sslmode=require", "sslmode=verify-full")
        }
        : {
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "postgres",
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || "country_catalog",
            port: process.env.DB_PORT || 5432,
            ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
        }
});

// Database queries stay here; routes call these functions.
function findUser(username, password) {
    return knex.select().from("users")
        .where("user_email", username)
        .andWhere("user_password", password);
}

function getCountries() {
    return knex.select("country_id", "country_name", "popular_site", "capital", "population", "visited")
        .from("country")
        .orderBy("country_name", "asc");
}

function getCountry(id) {
    return knex.select("country_id", "country_name", "popular_site", "capital", "population", "visited")
        .from("country")
        .where("country_id", id)
        .first();
}

function addCountry(country) {
    // PostgreSQL generates country_id automatically.
    return knex.insert(country).into("country");
}

function updateCountry(id, country) {
    return knex.update(country).from("country").where("country_id", id);
}

function deleteCountry(id) {
    return knex.delete().from("country").where("country_id", id);
}


// ============================================================
// The code below belongs to login protection and request validation.
// ============================================================

// Send anyone who hasn't logged in back to the home page
function requireLogin(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect("/");
    }
}

// Helper to validate Country fields on the server
function validateCountryInput(body) {
    const country_name = (typeof body.country_name === "string" ? body.country_name : "").trim();
    const popular_site = (typeof body.popular_site === "string" ? body.popular_site : "").trim();
    const capital = (typeof body.capital === "string" ? body.capital : "").trim();
    const populationText = typeof body.population === "string" ? body.population.trim() : "";
    const population = Number(populationText);
    const visitedRaw = (typeof body.visited === "string" ? body.visited : "").trim().toUpperCase();
    const visited = visitedRaw === "" ? null : visitedRaw;

    if (!country_name || country_name.length > 30) {
        return { error: "country_name is required and must be at most 30 characters." };
    }
    if (!popular_site || popular_site.length > 50) {
        return { error: "popular_site is required and must be at most 50 characters." };
    }
    if (!capital || capital.length > 30) {
        return { error: "capital is required and must be at most 30 characters." };
    }
    if (populationText === "" || !Number.isInteger(population) || population < 0 || population > 2147483647) {
        return { error: "population must be a whole number from 0 to 2147483647." };
    }
    if (visited !== null && visited !== "Y" && visited !== "N") {
        return { error: "visited must be Y, N, or left blank." };
    }

    return {
        data: { country_name, popular_site, capital, population, visited }
    };
}

// Reject invalid record IDs before sending a query to PostgreSQL.
function validateCountryId(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).send("Invalid country ID.");
    }
    next();
}


// ============================================================
// The code below belongs to server routes.
// ============================================================

// 1. Landing page
app.get("/", (req, res) => {
    res.render("index", { loggedIn: req.session.loggedIn });
});

// 2. Login submission
app.post("/login", (req, res) => {
    if (typeof req.body.username !== "string" || !req.body.username.trim() ||
        typeof req.body.password !== "string" || !req.body.password) {
        return res.status(400).send("Username and password are required.");
    }
    findUser(req.body.username, req.body.password)
        .then(users => {
            if (users.length === 0) {
                req.session.loggedIn = false;
                res.send("<script>alert('Invalid username or password'); window.location.href = '/';</script>");
            } else {
                req.session.loggedIn = true;
                res.redirect("/");
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).send("Database error: " + err.message);
        });
});

// 3. Protected Country Management Page (READ all countries)
app.get("/countries", requireLogin, (req, res) => {
    getCountries()
        .then(countries => {
            res.render("countries", { countries: countries });
        })
        .catch(err => {
            console.log(err);
            res.status(500).send("Database error: " + err.message);
        });
});

// 4. Add Country Form Page (GET)
app.get("/addCountry", requireLogin, (req, res) => {
    res.render("add", { loggedIn: req.session.loggedIn });
});

// 5. Add Country Submission (CREATE)
app.post("/addCountry", requireLogin, (req, res) => {
    const result = validateCountryInput(req.body);
    if (result.error) {
        return res.status(400).send("<script>alert('" + result.error + "'); window.history.back();</script>");
    }

    // Do NOT pass country_id; PostgreSQL generates it automatically
    addCountry(result.data)
        .then(() => {
            res.redirect("/countries");
        })
        .catch(err => {
            console.log(err);
            res.status(500).send("Database error: " + err.message);
        });
});

// 6. Edit Country Form Page (GET)
app.get("/editCountry/:id", requireLogin, validateCountryId, (req, res) => {
    getCountry(req.params.id)
        .then(country => {
            if (!country) {
                return res.status(404).send("Country not found");
            }
            res.render("edit", { country: country });
        })
        .catch(err => {
            console.log(err);
            res.status(500).send("Database error: " + err.message);
        });
});

// 7. Edit Country Submission (UPDATE)
app.post("/editCountry/:id", requireLogin, validateCountryId, (req, res) => {
    const result = validateCountryInput(req.body);
    if (result.error) {
        return res.status(400).send("<script>alert('" + result.error + "'); window.history.back();</script>");
    }

    updateCountry(req.params.id, result.data)
        .then(count => {
            if (count === 0) {
                return res.status(404).send("Country not found");
            }
            res.redirect("/countries");
        })
        .catch(err => {
            console.log(err);
            res.status(500).send("Database error: " + err.message);
        });
});

// 8. Delete Country (DELETE)
app.post("/deleteCountry/:id", requireLogin, validateCountryId, (req, res) => {
    deleteCountry(req.params.id)
        .then(count => {
            if (count === 0) {
                return res.status(404).send("Country not found");
            }
            res.redirect("/countries");
        })
        .catch(err => {
            console.log(err);
            res.status(500).send("Database error: " + err.message);
        });
});

// 9. Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});


// ============================================================
// The code below belongs to browser JavaScript for the country map.
// ============================================================

// Send this code to the browser, where document.getElementById can run.
// Backticks allow the JavaScript response to span multiple lines.
app.get("/js/countries.js", (req, res) => {
    res.type("application/javascript").send(`
function showMap(countryName, capital, site) {
    const query = encodeURIComponent(countryName + " " + capital);
    document.getElementById("mapTitle").textContent = "Map: " + countryName + " (Capital: " + capital + " | Popular Site: " + site + ")";
    document.getElementById("mapFrame").src = "https://www.google.com/maps?q=" + query + "&output=embed";
    const section = document.getElementById("mapSection");
    section.classList.remove("d-none");
    section.scrollIntoView({ behavior: "smooth" });
}
function closeMap() {
    document.getElementById("mapSection").classList.add("d-none");
    document.getElementById("mapFrame").src = "";
}
    `);
});


// ============================================================
// The code below starts the server.
// ============================================================

app.listen(port, () => console.log("The server is listening for a client on port " + port));
