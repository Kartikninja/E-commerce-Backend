import mongoose from "mongoose";
import { IndustryModel } from "../models/industry.model";

import IndustryData from '../storage/indutsrydata.json';
import { connectToDatabase } from "../database/index";

const seedIndustry = async () => {
    try {


        await connectToDatabase();
        for (const industry of IndustryData) {

            const checkIndustryName = await IndustryModel.findOne({ name: industry.name }).exec();

            if (checkIndustryName) {
                console.log(`${industry.name} already exists.`);
            } else {
                const addIndustry = new IndustryModel({
                    name: industry.name,
                    description: industry.description,
                    imageUrl: industry.imageUrl,
                    baseCostRange: industry.baseCostRange,
                    isActive: industry.isActive
                });

                await addIndustry.save();
                console.log(`Industry ${industry.name} added successfully.`);
            }
        }
        console.log('Industry seeding completed.');

    } catch (error) {
        console.log('Industry seeding failed.');
        console.error(error);

    } finally {
        await mongoose.disconnect();
    }
};

seedIndustry().catch(console.error);
