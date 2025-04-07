// db.js
const mysql = require('mysql2');

// Create a connection pool (recommended for web applications)
const pool = mysql.createPool({
  host: 'localhost',           // Your MySQL host (usually localhost)
  user: 'root',                // Your MySQL username
  password: 'cadlee',          // --- CHANGE THIS TO YOUR MYSQL PASSWORD ---
  database: 'lost_and_found_db',// The database name you created
  waitForConnections: true,
  connectionLimit: 10,         // Adjust as needed
  queueLimit: 0
});

// Optional: Test the pool connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error connecting to MySQL database pool:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('-> Check MySQL username and password in db.js');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
        console.error(`-> Database '${pool.config.database}' not found. Did you create it?`);
    }
    // Consider exiting if the DB connection is critical for startup
    // process.exit(1);
    return;
  }
  if (connection) {
    console.log('✅ Successfully connected to the database pool.');
    connection.release(); // Release the connection back to the pool
  }
});

// Export the pool's promise-based interface for async/await usage
module.exports = pool.promise();