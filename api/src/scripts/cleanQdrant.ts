import { qdrantClient, COLLECTION_NAME } from '../lib/qdrant';

async function cleanQdrant() {
  try {
    await qdrantClient.deleteCollection(COLLECTION_NAME);
    console.log(`Qdrant collection '${COLLECTION_NAME}' deleted successfully`);
  } catch (error: any) {
    if (error.status === 404 || error.message?.includes('doesn\'t exist')) {
      console.log(`Qdrant collection '${COLLECTION_NAME}' does not exist`);
    } else {
      console.error('Error deleting Qdrant collection:', error);
      process.exit(1);
    }
  }
}

cleanQdrant()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

