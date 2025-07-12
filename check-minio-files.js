import { Client } from 'minio';

const minioClient = new Client({
  endPoint: 'localhost',
  port: 8621,
  useSSL: false,
  accessKey: 'minioaccesskey',
  secretKey: 'miniosecretkey',
});

async function listFiles() {
  try {
    console.log('Listing files in studio5-production bucket...');
    const stream = minioClient.listObjects('studio5-production', 'avatars/', true);
    
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