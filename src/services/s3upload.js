import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import mime from 'mime-types';
import dotenv from 'dotenv';
dotenv.config();
// Set up AWS credentials
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const getBase64Extension = (base64Data) => {
    const matches = base64Data.match(/^data:(.+);base64,/);
    if (matches && matches[1]) {
        const contentType = matches[1];
        const extension = contentType.split("/")[1];
        return extension;
    }
};

const S3upload = async (req, res, filename, base64Data = null) => {
    let fileBuffer;
    let contentType = mime.lookup(filename) || 'application/octet-stream';

    try {
        // Check if base64 data is provided
        if (base64Data) {
            // Decode base64 data
            const base64Parts = base64Data.split(',');
            if (base64Parts.length !== 2) {
                throw new Error('Invalid base64 data format');
            }

            const base64String = base64Parts[1];
            fileBuffer = Buffer.from(base64String, 'base64');

            // Extract content type from base64 string if available
            const matches = base64Data.match(/^data:(.+);base64,/);
            if (matches && matches[1]) {
                contentType = matches[1];
            }
        } else {
            if (!req.file || !req.file.buffer) {
                throw new Error('No file buffer available in the request');
            }
            fileBuffer = req.file.buffer;
        }

        const uploadParams = {
            Bucket: process.env.S3_BUCKET,
            Key: filename,
            Body: fileBuffer,
            ContentType: contentType,
        };

        const upload = new Upload({
            client: s3Client,
            params: uploadParams,
        });

        await upload.done();
        return { error: false };
    } catch (err) {
        console.error('Error uploading file:', err);
        return { error: true, message: err.message || err };
    }
}

const S3delete = async (key) => {
    const deleteParams = {
        Bucket: process.env.S3_BUCKET,
        Key: key
    };

    try {
        const deleteResponse = await s3Client.send(new DeleteObjectCommand(deleteParams));
        console.log('File deleted successfully');
        return { error: false };
    } catch (err) {
        console.error('Error deleting file:', err);
        return { error: true, message: err.message };
    }
}

export default { 
    S3upload, 
    S3delete,
    getBase64Extension
};
