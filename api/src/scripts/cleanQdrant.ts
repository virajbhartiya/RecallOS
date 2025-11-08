import { qdrantClient, COLLECTION_NAME } from '../lib/qdrant'
import { logger } from '../utils/logger'

async function cleanQdrant() {
  try {
    await qdrantClient.deleteCollection(COLLECTION_NAME)
    logger.log(`Qdrant collection '${COLLECTION_NAME}' deleted successfully`)
  } catch (error: any) {
    if (error.status === 404 || error.message?.includes("doesn't exist")) {
      logger.log(`Qdrant collection '${COLLECTION_NAME}' does not exist`)
    } else {
      logger.error('Error deleting Qdrant collection:', error)
      process.exit(1)
    }
  }
}

cleanQdrant()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('Unexpected error:', error)
    process.exit(1)
  })
