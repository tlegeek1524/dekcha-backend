// utils/empIdGenerator.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ฟังก์ชันสร้าง empid
function generateEmpId() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
  const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${randomLetter}${randomNumber}`;
}

// ฟังก์ชันตรวจสอบไม่ให้ซ้ำ
async function generateUniqueEmpId() {
  let empid;
  let exists = true;

  while (exists) {
    empid = generateEmpId();

    const existing = await prisma.empuser.findUnique({
      where: { empid },
    });

    if (!existing) {
      exists = false;
    }
  }

  return empid;
}

module.exports = { generateUniqueEmpId };
