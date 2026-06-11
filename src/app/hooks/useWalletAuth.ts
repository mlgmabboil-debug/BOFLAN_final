'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useUser } from '../context/UserContext'
import { supabase } from '../utils/supabase'

export function useWalletAuth() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { user } = useUser()

  const connectWallet = async () => {
    if (!address || !user) {
      setError('Кошелек или пользователь не найден')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Создаем сообщение для подписи
      const timestamp = Date.now()
      const message = `Connect to Boflan\nProof of Ownership for user ${user.id}\nAddress: ${address}\nTimestamp: ${timestamp}`

      // Подписываем сообщение
      const signature = await signMessageAsync({ account: address as any, message })

      // Обновляем профиль пользователя в Supabase
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          wallet_address: address.toLowerCase(),
          is_verified: true,
          wallet_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Обновляем локальное состояние пользователя
      const updatedUser = {
        ...user,
        wallet_address: address.toLowerCase(),
        wallet_verified: true
      }

      // Сохраняем в localStorage (если используется)
      localStorage.setItem('boflan_user', JSON.stringify(updatedUser))

      return { success: true, address, signature }
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения кошелька')
      return { success: false, error: err.message }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    if (!user) return

    try {
      await supabase
        .from('user_profiles')
        .update({
          wallet_address: null,
          is_verified: false,
          wallet_connected_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      // Обновляем локальное состояние
      const updatedUser = {
        ...user,
        wallet_address: undefined,
        wallet_verified: false
      }

      localStorage.setItem('boflan_user', JSON.stringify(updatedUser))

      return { success: true }
    } catch (err: any) {
      setError(err.message || 'Ошибка отключения кошелька')
      return { success: false, error: err.message }
    }
  }

  return {
    connectWallet,
    disconnectWallet,
    isConnecting,
    error,
    isConnected: !!address
  }
}
