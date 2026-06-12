import { supabase } from './supabase'
import type { Database } from './supabase'

export interface PaymentRequest {
  groupId: string
  amountUsd: number
  userId: string
}

export interface PaymentResponse {
  success: boolean
  paymentId?: string
  paymentUrl?: string
  error?: string
}

// Simplified payment integration - in production use a real payment gateway like:
// - Coinbase Commerce
// - BTCPay Server
// - NOWPayments
// - CoinGate

export class PaymentService {
  private static PLATFORM_FEE_PERCENT = 0.20 // 20%

  static async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Calculate fees
      const platformFee = request.amountUsd * this.PLATFORM_FEE_PERCENT
      const creatorPayout = request.amountUsd - platformFee

      // Create payment record in database
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          group_id: request.groupId,
          user_id: request.userId,
          amount_usd: request.amountUsd,
          status: 'pending',
          platform_fee: platformFee,
          creator_payout: creatorPayout
        })
        .select()
        .single()

      if (error) throw error

      // In production, integrate with real payment gateway here
      // For now, return a mock payment URL
      const paymentUrl = this.generateMockPaymentUrl(payment.id, request.amountUsd)

      return {
        success: true,
        paymentId: payment.id,
        paymentUrl
      }
    } catch (error: any) {
      console.error('Payment creation error:', error)
      return {
        success: false,
        error: error.message || 'Failed to create payment'
      }
    }
  }

  static async confirmPayment(paymentId: string, txHash: string): Promise<PaymentResponse> {
    try {
      // Update payment status
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          tx_hash: txHash
        })
        .eq('id', paymentId)

      if (error) throw error

      // Add user to group members
      const { data: payment } = await supabase
        .from('payments')
        .select('group_id, user_id')
        .eq('id', paymentId)
        .single()

      if (payment) {
        await supabase
          .from('group_members')
          .insert({
            group_id: payment.group_id,
            user_id: payment.user_id
          })
      }

      return {
        success: true
      }
    } catch (error: any) {
      console.error('Payment confirmation error:', error)
      return {
        success: false,
        error: error.message || 'Failed to confirm payment'
      }
    }
  }

  static async getPaymentStatus(paymentId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('status')
        .eq('id', paymentId)
        .single()

      if (error) throw error

      return data?.status || 'unknown'
    } catch (error) {
      console.error('Payment status error:', error)
      return 'error'
    }
  }

  static async getUserPayments(userId: string) {
    try {
      let { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          groups(name, description)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
          console.warn("Foreign relationship select failed in getUserPayments, fetching separately...");
          const { data: paymentsOnly, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (paymentsError) throw paymentsError;

          if (paymentsOnly) {
            const groupIds = Array.from(new Set(paymentsOnly.map((p: any) => p.group_id).filter(Boolean)));
            let groupMap = new Map();
            if (groupIds.length > 0) {
              const { data: groups, error: groupsError } = await supabase
                .from('groups')
                .select('id, name, description')
                .in('id', groupIds);
              if (!groupsError && groups) {
                groupMap = new Map(groups.map((g: any) => [g.id, g]));
              }
            }
            data = paymentsOnly.map((p: any) => ({
              ...p,
              groups: groupMap.get(p.group_id) || null
            })) as any;
          }
        } else {
          throw error;
        }
      }

      return data
    } catch (error) {
      console.error('User payments error:', error)
      return []
    }
  }

  static async getGroupPayments(groupId: string) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data
    } catch (error) {
      console.error('Group payments error:', error)
      return []
    }
  }

  private static generateMockPaymentUrl(paymentId: string, amount: number): string {
    // In production, this would be a real payment gateway URL
    // For demo purposes, return a mock URL
    return `https://payment.example.com/pay/${paymentId}?amount=${amount}`
  }
}

// Example integration with Coinbase Commerce (commented out for production use)
/*
export class CoinbaseCommerceService {
  private static API_KEY = process.env.VITE_COINBASE_COMMERCE_API_KEY
  private static API_URL = 'https://api.commerce.coinbase.com'

  static async createCharge(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.API_URL}/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CC-Api-Key': this.API_KEY
        },
        body: JSON.stringify({
          name: 'Group Membership',
          description: 'Payment for group access',
          pricing_type: 'fixed_price',
          local_price: {
            amount: request.amountUsd.toString(),
            currency: 'USD'
          },
          metadata: {
            groupId: request.groupId,
            userId: request.userId
          }
        })
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      return {
        success: true,
        paymentId: data.data.id,
        paymentUrl: data.data.hosted_url
      }
    } catch (error: any) {
      console.error('Coinbase Commerce error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}
*/
