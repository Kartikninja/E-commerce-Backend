import { Schema } from "mongoose";

export interface Payoutinterface {
    storeId: Schema.Types.ObjectId,
    amout: number,
    status: "requested" | "approved" | "paid"
    requestedAt: Date;
    paidAt: Date
}