import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onDeposit: (amount: string) => Promise<void>
  isLoading: boolean
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onDeposit,
  isLoading,
}) => {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (parseFloat(amount) < 0.001) {
      setError('Minimum deposit is 0.001 ETH')
      return
    }

    setError('')
    try {
      await onDeposit(amount)
      setAmount('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="text-lg">Deposit Gas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="depositAmount">Amount (ETH)</Label>
            <Input
              id="depositAmount"
              type="number"
              step="0.001"
              min="0.001"
              placeholder="0.001"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Minimum deposit: 0.001 ETH</p>
          </div>

          {error && (
            <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleDeposit} disabled={isLoading} className="flex-1">
              {isLoading ? 'Depositing...' : 'Deposit'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
