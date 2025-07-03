import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function generateUid() {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  const number = Math.floor(100 + Math.random() * 900); // 100-999
  return `${letter}${number}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, displayName, pictureUrl } = req.body;

  if (!userId || !displayName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let user = await prisma.user.findUnique({ where: { userId } });

    if (!user) {
      let uid;
      let isUnique = false;

      while (!isUnique) {
        uid = generateUid();
        const exists = await prisma.user.findUnique({ where: { uid } });
        if (!exists) isUnique = true;
      }

      user = await prisma.user.create({
        data: {
          userId,
          name: displayName,
          pictureUrl,
          uid,
        },
      });
    }

    return res.status(200).json({ uid: user.uid, name: user.name });
  } catch (error) {
    console.error('Error in getuser:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
