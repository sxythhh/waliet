export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      BuyerAnalytics: {
        Row: {
          buyerId: string
          churnRisk: string | null
          completedSessions: number
          createdAt: string
          firstPurchaseAt: string
          id: string
          lastPurchaseAt: string
          lifetimeValue: number
          sellerId: string
          totalPurchases: number
          totalSessions: number
          totalSpent: number
          updatedAt: string
        }
        Insert: {
          buyerId: string
          churnRisk?: string | null
          completedSessions?: number
          createdAt?: string
          firstPurchaseAt: string
          id: string
          lastPurchaseAt: string
          lifetimeValue?: number
          sellerId: string
          totalPurchases?: number
          totalSessions?: number
          totalSpent?: number
          updatedAt: string
        }
        Update: {
          buyerId?: string
          churnRisk?: string | null
          completedSessions?: number
          createdAt?: string
          firstPurchaseAt?: string
          id?: string
          lastPurchaseAt?: string
          lifetimeValue?: number
          sellerId?: string
          totalPurchases?: number
          totalSessions?: number
          totalSpent?: number
          updatedAt?: string
        }
        Relationships: []
      }
      CommissionChange: {
        Row: {
          changedBy: string
          communityConfigId: string | null
          createdAt: string
          feeType: string
          id: string
          newBps: number | null
          previousBps: number | null
          reason: string | null
          sellerProfileId: string | null
        }
        Insert: {
          changedBy: string
          communityConfigId?: string | null
          createdAt?: string
          feeType: string
          id: string
          newBps?: number | null
          previousBps?: number | null
          reason?: string | null
          sellerProfileId?: string | null
        }
        Update: {
          changedBy?: string
          communityConfigId?: string | null
          createdAt?: string
          feeType?: string
          id?: string
          newBps?: number | null
          previousBps?: number | null
          reason?: string | null
          sellerProfileId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CommissionChange_communityConfigId_fkey"
            columns: ["communityConfigId"]
            isOneToOne: false
            referencedRelation: "CommunityConfig"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CommissionChange_sellerProfileId_fkey"
            columns: ["sellerProfileId"]
            isOneToOne: false
            referencedRelation: "SellerProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      CommunityConfig: {
        Row: {
          communityFeeBps: number
          createdAt: string
          customPlatformFeeBps: number | null
          id: string
          minSellerRating: number | null
          requireApproval: boolean
          totalSessions: number
          totalVolume: number
          updatedAt: string
          whopCompanyId: string
        }
        Insert: {
          communityFeeBps?: number
          createdAt?: string
          customPlatformFeeBps?: number | null
          id: string
          minSellerRating?: number | null
          requireApproval?: boolean
          totalSessions?: number
          totalVolume?: number
          updatedAt: string
          whopCompanyId: string
        }
        Update: {
          communityFeeBps?: number
          createdAt?: string
          customPlatformFeeBps?: number | null
          id?: string
          minSellerRating?: number | null
          requireApproval?: boolean
          totalSessions?: number
          totalVolume?: number
          updatedAt?: string
          whopCompanyId?: string
        }
        Relationships: []
      }
      Payout: {
        Row: {
          amount: number
          createdAt: string
          currency: string
          failedAt: string | null
          failureReason: string | null
          id: string
          processedAt: string | null
          sellerId: string
          status: Database["public"]["Enums"]["PayoutStatus"]
          updatedAt: string
          whopTransferId: string | null
        }
        Insert: {
          amount: number
          createdAt?: string
          currency?: string
          failedAt?: string | null
          failureReason?: string | null
          id: string
          processedAt?: string | null
          sellerId: string
          status?: Database["public"]["Enums"]["PayoutStatus"]
          updatedAt: string
          whopTransferId?: string | null
        }
        Update: {
          amount?: number
          createdAt?: string
          currency?: string
          failedAt?: string | null
          failureReason?: string | null
          id?: string
          processedAt?: string | null
          sellerId?: string
          status?: Database["public"]["Enums"]["PayoutStatus"]
          updatedAt?: string
          whopTransferId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Payout_sellerId_fkey"
            columns: ["sellerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Purchase: {
        Row: {
          buyerId: string
          communityFee: number
          communityId: string | null
          createdAt: string
          experienceId: string | null
          id: string
          platformFee: number
          pricePerUnit: number
          sellerId: string
          sellerReceives: number
          status: Database["public"]["Enums"]["PurchaseStatus"]
          totalAmount: number
          units: number
          updatedAt: string
          whopCheckoutConfigId: string | null
          whopPaymentId: string | null
        }
        Insert: {
          buyerId: string
          communityFee: number
          communityId?: string | null
          createdAt?: string
          experienceId?: string | null
          id: string
          platformFee: number
          pricePerUnit: number
          sellerId: string
          sellerReceives: number
          status?: Database["public"]["Enums"]["PurchaseStatus"]
          totalAmount: number
          units: number
          updatedAt: string
          whopCheckoutConfigId?: string | null
          whopPaymentId?: string | null
        }
        Update: {
          buyerId?: string
          communityFee?: number
          communityId?: string | null
          createdAt?: string
          experienceId?: string | null
          id?: string
          platformFee?: number
          pricePerUnit?: number
          sellerId?: string
          sellerReceives?: number
          status?: Database["public"]["Enums"]["PurchaseStatus"]
          totalAmount?: number
          units?: number
          updatedAt?: string
          whopCheckoutConfigId?: string | null
          whopPaymentId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Purchase_buyerId_fkey"
            columns: ["buyerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      RateChange: {
        Row: {
          changedAt: string
          id: string
          newRate: number
          previousRate: number
          sellerProfileId: string
        }
        Insert: {
          changedAt?: string
          id: string
          newRate: number
          previousRate: number
          sellerProfileId: string
        }
        Update: {
          changedAt?: string
          id?: string
          newRate?: number
          previousRate?: number
          sellerProfileId?: string
        }
        Relationships: [
          {
            foreignKeyName: "RateChange_sellerProfileId_fkey"
            columns: ["sellerProfileId"]
            isOneToOne: false
            referencedRelation: "SellerProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      RefundRequest: {
        Row: {
          amountApproved: number | null
          amountRequested: number
          createdAt: string
          id: string
          purchaseId: string | null
          reason: string
          requesterId: string
          reviewedBy: string | null
          reviewNotes: string | null
          sessionId: string | null
          status: Database["public"]["Enums"]["RefundStatus"]
          updatedAt: string
        }
        Insert: {
          amountApproved?: number | null
          amountRequested: number
          createdAt?: string
          id: string
          purchaseId?: string | null
          reason: string
          requesterId: string
          reviewedBy?: string | null
          reviewNotes?: string | null
          sessionId?: string | null
          status?: Database["public"]["Enums"]["RefundStatus"]
          updatedAt: string
        }
        Update: {
          amountApproved?: number | null
          amountRequested?: number
          createdAt?: string
          id?: string
          purchaseId?: string | null
          reason?: string
          requesterId?: string
          reviewedBy?: string | null
          reviewNotes?: string | null
          sessionId?: string | null
          status?: Database["public"]["Enums"]["RefundStatus"]
          updatedAt?: string
        }
        Relationships: []
      }
      Review: {
        Row: {
          authorId: string
          createdAt: string
          id: string
          isAnonymous: boolean
          rating: number
          reviewType: Database["public"]["Enums"]["ReviewType"]
          sessionId: string
          subjectId: string
          text: string | null
          updatedAt: string
        }
        Insert: {
          authorId: string
          createdAt?: string
          id: string
          isAnonymous?: boolean
          rating: number
          reviewType: Database["public"]["Enums"]["ReviewType"]
          sessionId: string
          subjectId: string
          text?: string | null
          updatedAt: string
        }
        Update: {
          authorId?: string
          createdAt?: string
          id?: string
          isAnonymous?: boolean
          rating?: number
          reviewType?: Database["public"]["Enums"]["ReviewType"]
          sessionId?: string
          subjectId?: string
          text?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Review_authorId_fkey"
            columns: ["authorId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Review_sessionId_fkey"
            columns: ["sessionId"]
            isOneToOne: false
            referencedRelation: "Session"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Review_subjectId_fkey"
            columns: ["subjectId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      SellerDailyStats: {
        Row: {
          completedSessions: number
          createdAt: string
          date: string
          id: string
          newBuyers: number
          purchases: number
          revenue: number
          sellerId: string
          sessions: number
          updatedAt: string
        }
        Insert: {
          completedSessions?: number
          createdAt?: string
          date: string
          id: string
          newBuyers?: number
          purchases?: number
          revenue?: number
          sellerId: string
          sessions?: number
          updatedAt: string
        }
        Update: {
          completedSessions?: number
          createdAt?: string
          date?: string
          id?: string
          newBuyers?: number
          purchases?: number
          revenue?: number
          sellerId?: string
          sessions?: number
          updatedAt?: string
        }
        Relationships: []
      }
      SellerGoal: {
        Row: {
          achieved: boolean
          createdAt: string
          currentValue: number
          endDate: string
          id: string
          period: string
          sellerProfileId: string
          startDate: string
          target: number
          type: string
          updatedAt: string
        }
        Insert: {
          achieved?: boolean
          createdAt?: string
          currentValue?: number
          endDate: string
          id: string
          period: string
          sellerProfileId: string
          startDate: string
          target: number
          type: string
          updatedAt: string
        }
        Update: {
          achieved?: boolean
          createdAt?: string
          currentValue?: number
          endDate?: string
          id?: string
          period?: string
          sellerProfileId?: string
          startDate?: string
          target?: number
          type?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SellerGoal_sellerProfileId_fkey"
            columns: ["sellerProfileId"]
            isOneToOne: false
            referencedRelation: "SellerProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      SellerProfile: {
        Row: {
          availabilityJson: string | null
          averageRating: number | null
          bio: string | null
          commissionNotes: string | null
          commissionUpdatedAt: string | null
          commissionUpdatedBy: string | null
          createdAt: string
          currency: string
          customCommunityFeeBps: number | null
          customPlatformFeeBps: number | null
          hourlyRate: number
          id: string
          isActive: boolean
          isVerified: boolean
          maxOutstandingHours: number | null
          minNoticeHours: number
          tagline: string | null
          timezone: string
          totalHoursDelivered: number
          totalReviews: number
          totalSessionsCompleted: number
          updatedAt: string
          userId: string
        }
        Insert: {
          availabilityJson?: string | null
          averageRating?: number | null
          bio?: string | null
          commissionNotes?: string | null
          commissionUpdatedAt?: string | null
          commissionUpdatedBy?: string | null
          createdAt?: string
          currency?: string
          customCommunityFeeBps?: number | null
          customPlatformFeeBps?: number | null
          hourlyRate: number
          id: string
          isActive?: boolean
          isVerified?: boolean
          maxOutstandingHours?: number | null
          minNoticeHours?: number
          tagline?: string | null
          timezone?: string
          totalHoursDelivered?: number
          totalReviews?: number
          totalSessionsCompleted?: number
          updatedAt: string
          userId: string
        }
        Update: {
          availabilityJson?: string | null
          averageRating?: number | null
          bio?: string | null
          commissionNotes?: string | null
          commissionUpdatedAt?: string | null
          commissionUpdatedBy?: string | null
          createdAt?: string
          currency?: string
          customCommunityFeeBps?: number | null
          customPlatformFeeBps?: number | null
          hourlyRate?: number
          id?: string
          isActive?: boolean
          isVerified?: boolean
          maxOutstandingHours?: number | null
          minNoticeHours?: number
          tagline?: string | null
          timezone?: string
          totalHoursDelivered?: number
          totalReviews?: number
          totalSessionsCompleted?: number
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "SellerProfile_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Session: {
        Row: {
          actualMinutes: number | null
          autoReleaseAt: string | null
          buyerId: string
          cancellationReason: string | null
          cancelledAt: string | null
          cancelledBy: string | null
          completedAt: string | null
          confirmedAt: string | null
          createdAt: string
          endedAt: string | null
          extensionRequested: boolean
          extensionUnits: number | null
          id: string
          meetingProvider: string | null
          meetingUrl: string | null
          payoutId: string | null
          pricePerUnit: number | null
          scheduledAt: string | null
          scheduledEndAt: string | null
          sellerId: string
          startedAt: string | null
          status: Database["public"]["Enums"]["SessionStatus"]
          timezone: string
          topic: string
          units: number
          updatedAt: string
        }
        Insert: {
          actualMinutes?: number | null
          autoReleaseAt?: string | null
          buyerId: string
          cancellationReason?: string | null
          cancelledAt?: string | null
          cancelledBy?: string | null
          completedAt?: string | null
          confirmedAt?: string | null
          createdAt?: string
          endedAt?: string | null
          extensionRequested?: boolean
          extensionUnits?: number | null
          id: string
          meetingProvider?: string | null
          meetingUrl?: string | null
          payoutId?: string | null
          pricePerUnit?: number | null
          scheduledAt?: string | null
          scheduledEndAt?: string | null
          sellerId: string
          startedAt?: string | null
          status?: Database["public"]["Enums"]["SessionStatus"]
          timezone: string
          topic: string
          units: number
          updatedAt: string
        }
        Update: {
          actualMinutes?: number | null
          autoReleaseAt?: string | null
          buyerId?: string
          cancellationReason?: string | null
          cancelledAt?: string | null
          cancelledBy?: string | null
          completedAt?: string | null
          confirmedAt?: string | null
          createdAt?: string
          endedAt?: string | null
          extensionRequested?: boolean
          extensionUnits?: number | null
          id?: string
          meetingProvider?: string | null
          meetingUrl?: string | null
          payoutId?: string | null
          pricePerUnit?: number | null
          scheduledAt?: string | null
          scheduledEndAt?: string | null
          sellerId?: string
          startedAt?: string | null
          status?: Database["public"]["Enums"]["SessionStatus"]
          timezone?: string
          topic?: string
          units?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Session_buyerId_fkey"
            columns: ["buyerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Session_payoutId_fkey"
            columns: ["payoutId"]
            isOneToOne: false
            referencedRelation: "Payout"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Session_sellerId_fkey"
            columns: ["sellerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          avatar: string | null
          bio: string | null
          createdAt: string
          email: string | null
          id: string
          name: string | null
          payoutSetupComplete: boolean
          supabaseUserId: string | null
          updatedAt: string
          whopCompanyId: string | null
          whopUserId: string | null
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          createdAt?: string
          email?: string | null
          id: string
          name?: string | null
          payoutSetupComplete?: boolean
          supabaseUserId?: string | null
          updatedAt: string
          whopCompanyId?: string | null
          whopUserId?: string | null
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          createdAt?: string
          email?: string | null
          id?: string
          name?: string | null
          payoutSetupComplete?: boolean
          supabaseUserId?: string | null
          updatedAt?: string
          whopCompanyId?: string | null
          whopUserId?: string | null
        }
        Relationships: []
      }
      WalletBalance: {
        Row: {
          avgPurchasePricePerUnit: number
          balanceUnits: number
          createdAt: string
          holderId: string
          id: string
          reservedUnits: number
          sellerId: string
          totalPaid: number
          updatedAt: string
        }
        Insert: {
          avgPurchasePricePerUnit: number
          balanceUnits?: number
          createdAt?: string
          holderId: string
          id: string
          reservedUnits?: number
          sellerId: string
          totalPaid?: number
          updatedAt: string
        }
        Update: {
          avgPurchasePricePerUnit?: number
          balanceUnits?: number
          createdAt?: string
          holderId?: string
          id?: string
          reservedUnits?: number
          sellerId?: string
          totalPaid?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "WalletBalance_holderId_fkey"
            columns: ["holderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "WalletBalance_sellerId_fkey"
            columns: ["sellerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      PayoutStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
      PurchaseStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
      RefundStatus: "PENDING" | "APPROVED" | "DENIED" | "PROCESSED"
      ReviewType: "BUYER_TO_SELLER" | "SELLER_TO_BUYER"
      SessionStatus:
        | "REQUESTED"
        | "ACCEPTED"
        | "DECLINED"
        | "CANCELLED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "RATED"
        | "NO_SHOW_BUYER"
        | "NO_SHOW_SELLER"
        | "DISPUTED"
        | "AWAITING_CONFIRMATION"
        | "PAID_OUT"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
