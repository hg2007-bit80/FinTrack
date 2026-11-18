const mongoose = require('mongoose')
const dns = require('dns')
const path = require('path')

// Fallback DNS to avoid ISP SRV lookup failures
dns.setServers(['1.1.1.1', '8.8.8.8'])

require('dotenv').config({ path: path.join(__dirname, '.env') })

const testConnection = async () => {
  console.log('\n⏳ Connecting to MongoDB Atlas...')
  console.log(`📡 URI: ${process.env.MONGO_URI.replace(/:[^:]*@/, ':****@')}`)

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log('\n✅ MongoDB Atlas Connected Successfully!')
    console.log(`🌐 Host: ${conn.connection.host}`)
    console.log(`📂 Database: ${conn.connection.name}`)

    // Check collections
    const collections = await conn.connection.db.listCollections().toArray()
    console.log('📁 Collections found:', collections.length > 0 ? collections.map(c => c.name).join(', ') : 'None yet (will be created automatically on first insert)')

    // Ping check
    const pingResult = await conn.connection.db.admin().ping()
    console.log('⚡ Ping Test:', pingResult.ok === 1 ? 'PASSED (OK: 1)' : 'FAILED')
    console.log('\n🎉 Your database is 100% active and ready!\n')

    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ MongoDB Connection Failed!')
    console.error('Error Details:', error.message)
    console.error('\n💡 Tips: Make sure your IP is whitelisted (0.0.0.0/0) in MongoDB Atlas.\n')
    process.exit(1)
  }
}

testConnection()
