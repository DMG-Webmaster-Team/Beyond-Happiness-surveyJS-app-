const mysql = require('mysql2/promise');

async function checkAdmin() {
  let connection;
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'happiness_survey',
      socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock'
    });

    console.log('✅ Connected to database');

    // Check if admin exists
    const [rows] = await connection.execute(
      'SELECT id, email, name FROM admins WHERE email = ?',
      ['admin@surveyjs.com']
    );

    if (rows.length > 0) {
      console.log('✅ Admin user found:', rows[0]);
    } else {
      console.log('❌ Admin user not found. Creating admin user...');
      
      // Create admin user
      const { nanoid } = require('nanoid');
      const adminId = nanoid();
      
      await connection.execute(
        'INSERT INTO admins (id, email, password, name) VALUES (?, ?, ?, ?)',
        [adminId, 'admin@surveyjs.com', 'admin123', 'Admin User']
      );
      
      console.log('✅ Admin user created successfully');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAdmin();
