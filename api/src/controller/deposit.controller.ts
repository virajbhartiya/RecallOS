import { Request, Response } from 'express';
import { 
  getUserGasBalance, 
  getEstimatedGasCost, 
  getContractAddress 
} from '../services/blockchain';

export class DepositController {
  static async checkBalance(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'User address is required',
        });
      }

      const balance = await getUserGasBalance(userAddress);

      res.status(200).json({
        success: true,
        data: {
          userAddress,
          balance: balance.balance,
          balanceWei: balance.balanceWei,
        },
      });
    } catch (error) {
      console.error('Error checking gas balance:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check gas balance',
      });
    }
  }

  static async getDepositAddress(req: Request, res: Response) {
    try {
      const contractAddress = await getContractAddress();

      res.status(200).json({
        success: true,
        data: {
          contractAddress,
        },
      });
    } catch (error) {
      console.error('Error getting deposit address:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get deposit address',
      });
    }
  }

  static async getGasEstimate(req: Request, res: Response) {
    try {
      const { memoryCount = 1 } = req.query;
      const count = parseInt(memoryCount as string) || 1;

      const estimate = await getEstimatedGasCost(count);

      res.status(200).json({
        success: true,
        data: {
          memoryCount: count,
          gasPrice: estimate.gasPrice,
          estimatedGas: estimate.estimatedGas,
          estimatedCost: estimate.estimatedCost,
          estimatedCostWei: estimate.estimatedCostWei,
        },
      });
    } catch (error) {
      console.error('Error getting gas estimate:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get gas estimate',
      });
    }
  }

  static async getDepositInfo(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'User address is required',
        });
      }

      const [balance, contractAddress, estimate] = await Promise.all([
        getUserGasBalance(userAddress),
        getContractAddress(),
        getEstimatedGasCost(1),
      ]);

      res.status(200).json({
        success: true,
        data: {
          userAddress,
          balance: balance.balance,
          balanceWei: balance.balanceWei,
          contractAddress,
          gasEstimate: {
            gasPrice: estimate.gasPrice,
            estimatedGas: estimate.estimatedGas,
            estimatedCost: estimate.estimatedCost,
          },
          recommendations: {
            minDeposit: '0.01', // 0.01 ETH minimum recommended
            lowBalanceThreshold: '0.005', // 0.005 ETH low balance warning
          },
        },
      });
    } catch (error) {
      console.error('Error getting deposit info:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get deposit info',
      });
    }
  }
}
