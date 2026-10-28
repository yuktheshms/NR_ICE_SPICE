import mongoose from 'mongoose';

let memoryServer;

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (mongoUri) {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGO_URI must be configured in production.');
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri();
  await mongoose.connect(uri, { dbName: 'nr_ice_spice' });
  console.log('Connected to in-memory MongoDB:', uri);
}

export async function stopDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}
