#!/usr/bin/env ts-node

import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function testBlockscoutIntegration() {
  console.log('🧪 Testing Blockscout Integration...\n')

  try {
    // Test 1: Check if the new table exists
    console.log('1. Testing database schema...')
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'blockscout_transactions'
      );
    `
    console.log('✅ blockscout_transactions table exists:', tableExists)

    // Test 2: Test inserting a sample transaction
    console.log('\n2. Testing transaction insertion...')
    const sampleTx = await prisma.blockscoutTransaction.create({
      data: {
        tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        network: 'sepolia',
        status: 'pending',
        finality_reached: false,
        check_count: 1
      }
    })
    console.log('✅ Sample transaction created:', sampleTx.id)

    // Test 3: Test updating transaction status
    console.log('\n3. Testing transaction update...')
    const updatedTx = await prisma.blockscoutTransaction.update({
      where: { id: sampleTx.id },
      data: {
        status: 'confirmed',
        block_number: BigInt(12345),
        gas_used: '21000',
        gas_price: '20000000000',
        finality_reached: true,
        finality_confirmed_at: new Date()
      }
    })
    console.log('✅ Transaction updated:', updatedTx.status)

    // Test 4: Test querying transactions
    console.log('\n4. Testing transaction queries...')
    const allTxs = await prisma.blockscoutTransaction.findMany()
    console.log('✅ Total transactions in cache:', allTxs.length)

    const finalTxs = await prisma.blockscoutTransaction.findMany({
      where: { finality_reached: true }
    })
    console.log('✅ Final transactions:', finalTxs.length)

    // Test 5: Clean up test data
    console.log('\n5. Cleaning up test data...')
    await prisma.blockscoutTransaction.delete({
      where: { id: sampleTx.id }
    })
    console.log('✅ Test data cleaned up')

    console.log('\n🎉 All tests passed! Blockscout integration is working correctly.')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    
    if (error.message.includes('blockscoutTransaction')) {
      console.log('\n💡 Solution: Run the database migration first:')
      console.log('   npm run db:migrate')
    }
    
    if (error.message.includes('relation "blockscout_transactions" does not exist')) {
      console.log('\n💡 Solution: The table doesn\'t exist. Run the migration:')
      console.log('   npm run db:migrate')
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Test Blockscout API connectivity
async function testBlockscoutAPI() {
  console.log('\n🌐 Testing Blockscout API connectivity...')
  
  try {
    const response = await fetch('https://eth-sepolia.blockscout.com/api/v2/stats')
    if (response.ok) {
      const stats = await response.json()
      console.log('✅ Blockscout API is accessible')
      console.log('   Total blocks:', stats.total_blocks)
    } else {
      console.log('⚠️  Blockscout API returned status:', response.status)
    }
  } catch (error) {
    console.log('❌ Blockscout API test failed:', error.message)
  }
}

// Run all tests
async function runAllTests() {
  await testBlockscoutIntegration()
  await testBlockscoutAPI()
  
  console.log('\n📋 Next steps:')
  console.log('1. Run database migration: npm run db:migrate')
  console.log('2. Start the server: npm start')
  console.log('3. Test prefetching with a real transaction hash')
  console.log('4. Monitor queue statistics at /api/blockscout/queue-stats')
}

runAllTests().catch(console.error)
