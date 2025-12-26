export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
        }
      }
      challenges: {
        Row: {
          id: string
          name: string
          account_size: number
          price: number
          profit_target: number
          daily_loss_limit: number
          max_drawdown: number
          profit_split: number
          phase_count: number
          min_trading_days: number
          leverage: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          account_size: number
          price: number
          profit_target: number
          daily_loss_limit: number
          max_drawdown: number
          profit_split: number
          phase_count?: number
          min_trading_days?: number
          leverage?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          account_size?: number
          price?: number
          profit_target?: number
          daily_loss_limit?: number
          max_drawdown?: number
          profit_split?: number
          phase_count?: number
          min_trading_days?: number
          leverage?: string
          is_active?: boolean
          created_at?: string
        }
      }
      user_accounts: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          status: string
          current_phase: number
          balance: number
          initial_balance: number
          profit_loss: number
          daily_profit_loss: number
          total_trades: number
          winning_trades: number
          losing_trades: number
          trading_days: number
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id: string
          status?: string
          current_phase?: number
          balance: number
          initial_balance: number
          profit_loss?: number
          daily_profit_loss?: number
          total_trades?: number
          winning_trades?: number
          losing_trades?: number
          trading_days?: number
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          challenge_id?: string
          status?: string
          current_phase?: number
          balance?: number
          initial_balance?: number
          profit_loss?: number
          daily_profit_loss?: number
          total_trades?: number
          winning_trades?: number
          losing_trades?: number
          trading_days?: number
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          user_account_id: string
          symbol: string
          type: string
          entry_price: number
          exit_price: number | null
          quantity: number
          profit_loss: number
          opened_at: string
          closed_at: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_account_id: string
          symbol: string
          type: string
          entry_price: number
          exit_price?: number | null
          quantity: number
          profit_loss?: number
          opened_at?: string
          closed_at?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_account_id?: string
          symbol?: string
          type?: string
          entry_price?: number
          exit_price?: number | null
          quantity?: number
          profit_loss?: number
          opened_at?: string
          closed_at?: string | null
          status?: string
          created_at?: string
        }
      }
      positions: {
        Row: {
          id: string
          user_id: string
          user_account_id: string
          symbol: string
          side: 'long' | 'short'
          entry_price: number
          current_price?: number // Optional as it might be computed
          quantity: number
          leverage: number
          unrealized_pnl: number
          status: 'open' | 'closed'
          opened_at: string
          closed_at?: string | null
          reason?: string
        }
        Insert: {
          id?: string
          user_id: string
          user_account_id: string
          symbol: string
          side: 'long' | 'short'
          entry_price: number
          current_price?: number
          quantity: number
          leverage: number
          unrealized_pnl?: number
          status?: 'open' | 'closed'
          opened_at?: string
          closed_at?: string | null
          reason?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_account_id?: string
          symbol?: string
          side?: 'long' | 'short'
          entry_price?: number
          current_price?: number
          quantity?: number
          leverage?: number
          unrealized_pnl?: number
          status?: 'open' | 'closed'
          opened_at?: string
          closed_at?: string | null
          reason?: string
        }
      }
    }
  }
}
