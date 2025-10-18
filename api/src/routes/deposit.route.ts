import { Router } from 'express';
import { DepositController } from '../controller/deposit.controller';

const router = Router();

// Get user's gas deposit balance
router.get('/balance/:userAddress', DepositController.checkBalance);

// Get contract address for deposits
router.get('/address', DepositController.getDepositAddress);

// Get gas cost estimate
router.get('/estimate', DepositController.getGasEstimate);

// Get comprehensive deposit info (balance + address + estimate)
router.get('/info/:userAddress', DepositController.getDepositInfo);

export default router;
