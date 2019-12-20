module.exports = {

    development: {
      client: 'postgresql',
      connection: {
        database: 'knex',
        user:     'knex',
        password: 'knex'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        tableName: 'knex_migrations'
      }
    },
  
    production: {
      client: 'postgresql',
      connection: {
        host : process.env.DB_HOST,
        user : process.env.DB_USER,
        password: process.env.DB_PASS,
        database : process.env.DB_NAME
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        tableName: 'knex_migrations'
      }
    }
  
  };
  