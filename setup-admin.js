const mysql = require('mysql2/promise');

async function setupAdmin() {
  let connection;
  try {
    // Use a single connection instead of pool
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'happiness_survey',
      socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock'
    });

    console.log('✅ Connected to database');

    // Check if admins table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'admins'"
    );

    if (tables.length === 0) {
      console.log('❌ Admins table does not exist');
      console.log('Creating admins table...');
      
      await connection.execute(`
        CREATE TABLE admins (
          id VARCHAR(128) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX admin_email_idx (email)
        )
      `);
      
      console.log('✅ Admins table created');
    } else {
      console.log('✅ Admins table exists');
    }

    // Check if admin user exists
    const [rows] = await connection.execute(
      'SELECT id, email, name FROM admins WHERE email = ?',
      ['admin@surveyjs.com']
    );

    if (rows.length === 0) {
      console.log('Creating admin user...');
      
      await connection.execute(
        'INSERT INTO admins (id, email, password, name) VALUES (?, ?, ?, ?)',
        ['admin-001', 'admin@surveyjs.com', 'admin123', 'Admin User']
      );
      
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user already exists:', rows[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupAdmin();
