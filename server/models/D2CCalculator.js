import mongoose from "mongoose";


const DynamicFieldSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            trim: true
        },
        amount: {
            type: Number,
            default: 0
        },
        frequency: {
            type: String,
            enum: ['one-time', 'monthly', 'quarterly', 'yearly'],
            default: 'monthly'
        }
    },
    { _id: false }
);

const AmountFrequencySchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            default: 0
        },
        frequency: {
            type: String,
            enum: ['one-time', 'monthly', 'quarterly', 'yearly'],
            default: 'one-time'
        }
    },
    { _id: false }
);



const d2cCalculatorSchema = new mongoose.Schema(
    {
        brandId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Brand',
            required: true,
            index: true,
            unique: true,
        },

        revenue: {

            otherRevenue: {
                type: AmountFrequencySchema,
                default: () => ({ amount: 0, frequency: 'monthly' })
            },

            additionalRevenue: {
                type: [DynamicFieldSchema],
                default: []
            }
        },
        // Cost and Expenses
        costAndExpenses: {

            operatingCost: {
                type: AmountFrequencySchema,
                default: () => ({ amount: 0, frequency: 'monthly' })
            },
            otherMarketingCost: {
                type: AmountFrequencySchema,
                default: () => ({ amount: 0, frequency: 'monthly' })
            },
            additionalExpenses: {
                type: [DynamicFieldSchema],
                default: []
            }
        },
        // COGS
        cogsData: {
            COGSMultiplier: {
                type: Number,
                default: 0
            },
            additionalCOGS: {
                type: [DynamicFieldSchema],
                default: []
            }
        },
    },
    { timestamps: true }
);


const D2CCalculator = mongoose.model("D2CCalculator", d2cCalculatorSchema);

export default D2CCalculator;