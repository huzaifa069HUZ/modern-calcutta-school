
import { put } from '@vercel/blob';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const filename = request.headers['x-vercel-filename'] || 'image.png';
        const blob = await put(filename, request, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        return response.status(200).json(blob);
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: 'Upload failed' });
    }
}
