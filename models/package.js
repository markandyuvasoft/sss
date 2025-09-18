const mongoose = require('mongoose')

const packageSchema = new mongoose.Schema({
    title: {
        type: String,
        required:true,
    },
    eventType: { 
        type: String, 
        required: true, 
        enum: [ 'Corporate',
                'Wedding',
                'Birthday',
                'Conference',
                'seminar',
                'Other'
                ] },
    description: {
        type: String,
        required: true,

    },
    budget: {
        type:Number,
        required:true,
    },
    servicesIncluded:[{
        type: String,
        required:true,
    }],
    location: {
        city: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
        country: {
            type: String,
            default: 'India', // You can set a default country
        },
    },
    availableCities: { type: [String], required: true }, // Add this field
    managerId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true,
    },
    status:{
        type:String,
        enum:['active', 'inactive'],
        default:'active',
    },
    createdAt:{
        type: Date,
        default:Date.now,
    },
})

// Added indexes to improve search performance 
packageSchema.index({ eventType: 1, budget: 1, location: 1,})

const Package = mongoose.model('Package', packageSchema)

module.exports = Package