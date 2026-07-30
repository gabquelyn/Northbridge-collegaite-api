import mongoose from "mongoose";

export interface IInvoice extends mongoose.Document{
    application: mongoose.Schema.Types.ObjectId
    url: string,
    reference: string,
    status: string,
    amount: number,
    amount_paid?: number,
    currency: string
    createdAt: string
}