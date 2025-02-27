export interface Subscription {
    name: string
    type: number,
    price: number
    benefite: [string]
    isActive: boolean
    isAutoRenew: boolean
    createdAt: Date
    updatedAt: Date
    duration: number
    isMonthly?: boolean;
    isYearly?: boolean;
    isDaily?: boolean;
    razorpayPlanId: string
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
}