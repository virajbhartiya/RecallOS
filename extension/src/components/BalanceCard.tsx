import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface BalanceCardProps {
  ethBalance: string | null
  gasBalance: string | null
  isLoading: boolean
  onRefresh: () => void
  onDeposit: () => void
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  ethBalance,
  gasBalance,
  isLoading,
  onRefresh,
  onDeposit,
}) => {
  const formatBalance = (balance: string | null) => {
    if (!balance) return '0'
    return parseFloat(balance).toString()
  }

  const formatGasBalance = (balance: string | null) => {
    if (!balance) return '0'
    // Balance is already in ETH from the API, not wei
    return parseFloat(balance).toString()
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">ETH Balance</span>
          <span className="font-mono text-sm">{formatBalance(ethBalance)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Gas Deposit</span>
          <span className="font-mono text-sm">{formatGasBalance(gasBalance)}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex-1"
          >
            Refresh
          </Button>
          <Button onClick={onDeposit} disabled={isLoading} size="sm" className="flex-1">
            Deposit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
