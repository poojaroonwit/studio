import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '8621', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioaccesskey',
  secretKey: process.env.MINIO_SECRET_KEY || 'miniosecretkey',
});

async function listFiles() {
  try {
    console.log('Listing files in studio-production bucket...');
    const stream = minioClient.listObjects('studio-production', 'avatars/', true);
    
    stream.on('data', (obj) => {
      console.log('File:', obj.name, 'Size:', obj.size, 'Last Modified:', obj.lastModified);
    });
    
    stream.on('error', (err) => {
      console.error('Error listing files:', err);
    });
    
    stream.on('end', () => {
      console.log('Finished listing files');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

listFiles(); 