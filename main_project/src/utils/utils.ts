import moment, { Moment } from 'moment';
import AWS from 'aws-sdk';
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { createClient } from "@deepgram/sdk";
import multer from 'multer';
import { OAuth2Client } from 'google-auth-library';
import { HttpException } from '@/exceptions/httpException';

export const QUERY_PARAMS = (params: object) => {
  const LIMIT = params['limit'] || 20;
  const SORT = params['sort'] || '-createdAt';
  const paramkeys = Object.keys(params);
  const filter = {};
  for (let i = 0; i < paramkeys.length; i++) {
    if (paramkeys[i] != 'page') {
      filter[paramkeys[i]] = params[paramkeys[i]];
    }
  }
  filter['limit'] = LIMIT;
  filter['skip'] = (params['page'] - 1) * LIMIT;
  filter['sort'] = SORT;
  return filter;
};

export const generatePassword = () => {
  var length = 8,
    charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    retVal = '';
  for (var i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
};

export const getCurrentDateTime = () => {
  return moment().toISOString();
};

export const isDatePast = (date: moment.MomentInput, dateToCompare: moment.MomentInput) => {
  return moment(date).isBefore(dateToCompare);
};

export const getAvailableDays = (startDate: Moment, endDate: Moment) => {
  const result = [];

  while (startDate.isSameOrBefore(endDate)) {
    result.push(startDate.format('DD'));
    startDate.add(1, 'day');
  }
  return result;
};

export const getAvailableMonths = (startDate: Moment, endDate: Moment) => {
  const result = [];

  if (endDate.isBefore(startDate)) {
    throw 'End date must be greated than start date.';
  }

  while (startDate.isSameOrBefore(endDate)) {
    result.push(startDate.format('MM'));
    startDate.add(1, 'month');
  }
  return result;
};

export const generatePresigned = async (file: { originalname: any }) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGIONS,
  });
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: file.originalname,
    Expires: 60 * 10,
  };
  const url = await s3.getSignedUrl('putObject', params);
  return url;
};

export const pick = (obj: { [x: string]: any }) => {
  for (const key in obj) {
    if (obj[key] === null || obj[key] === '') delete obj[key];
    else if (typeof obj[key] === 'object') {
      pick(obj[key]);
      if (Object.keys(obj[key]).length === 0) delete obj[key];
    }
  }
  return obj;
};


const client = new OAuth2Client("280000882284-fmkmhiiqvj6po5i7h5caokiu7d1it54u.apps.googleusercontent.com");

export const verifyGoogleToken = async (token: string) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "280000882284-fmkmhiiqvj6po5i7h5caokiu7d1it54u.apps.googleusercontent.com",
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (err) {
    console.error("Google token verification failed:", err);
    throw new HttpException(401, "Invalid Google token");
  }
};

export const uploadToS3 = async (file, folderName = 'user-profile', fileName) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `swipeLounge/${folderName}/${fileName}`,
    Body: file,
  };
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGIONS,
  });
  const data = await s3.upload(params).promise();
  console.log("DATA", data)
  return data;
  // return data.Location

};

export const downloadMediaAndUploadToS3 = async (mediaUrl: string, video: boolean) => {
  const name = video ? `${Math.ceil(Date.now() * Math.random())}.mp4` : `${Math.ceil(Date.now() * Math.random())}.jpg`;
  const filePath = path.join(__dirname, name);
  const file = fs.createWriteStream(filePath);

  try {
    const response: unknown | any = await new Promise((resolve, reject) => {
      https.get(mediaUrl, res => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download file. Status code: ${res.statusCode}`));
          return;
        }
        resolve(res);
      });
    });

    response.pipe(file);
    return new Promise((resolve, reject) => {
      file.on('finish', async () => {
        try {
          const uploadedFile = await uploadToS3(fs.createReadStream(filePath), 'media', name);
          fs.unlink(filePath, err => { if (err) console.error(err) });
          return resolve(uploadedFile.Location);
        } catch (err) {
          fs.unlink(filePath, err => { if (err) console.error(err) });
          return reject();
        }
      });
      file.on('error', reject);
    });
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    return null;
  }
};

export const getFileExtension = (url: string): string => {
  return url.split('.').pop() || '';
};


export const transcribeVideo = async (url: string) => {
  const deepgram = createClient(process.env.DEEPGRAM_SECRET_KEY);
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    {
      url: url,
    },
    {
      model: "nova-2",
      smart_format: true,
      utterances: true
    }
  );

  if (error) throw error;
  if (!error) console.log("Video transcribed..!!");
  return result;
}

export const getCurrentDate = () => {
  return moment().format('DD-MM-YYYY');
};


const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  }

}
)
export default upload;