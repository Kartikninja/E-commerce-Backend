import axios from "axios";

import { uploadToS3 } from "./utils";
import { nextTick } from "process";

export const uploadImage = async (imgUrl: string, folderName: string, fileName: string): Promise<string> => {

    try {

        const response = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
        });

        const uploadImg = await uploadToS3(response.data, folderName, fileName);
        console.log("S3 Upload Response:", uploadImg);

        if (uploadImg && uploadImg.Location) {
            imgUrl = uploadImg.Location;
            console.log("Image successfully uploaded to S3:", imgUrl);
            return imgUrl
        } else {
            console.log("Image upload failed. No Location in S3 response.");
            throw new Error("Failed to upload image to S3");
        }

    } catch (error) {
        console.log("Error during image upload:", error.message);
        throw new Error("Image upload failed");
    }
}
