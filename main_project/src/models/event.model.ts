// models/event.model.ts
import { Schema, model } from 'mongoose';

const eventSchema = new Schema({
    eventId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

export const EventModel = model('Event', eventSchema);