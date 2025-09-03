const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Timezone handling
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * ฟังก์ชันคืนค่า Date object ตามเขตเวลา Asia/Bangkok (UTC+7)
 * 
 * วิธีที่ 1: เก็บเป็น UTC แต่ shift เวลาไป 7 ชั่วโมง (ไม่แนะนำ แต่ใช้ได้)
 */
function getCurrentThailandTimeShifted() {
  // สร้างเวลาปัจจุบันใน timezone ไทย
  const thailandTime = dayjs().tz('Asia/Bangkok');
  // แปลงเป็น UTC แต่เก็บค่าเวลาเดิม (shift 7 ชั่วโมง)
  // เช่น ถ้าเวลาไทย 14:00 จะเก็บเป็น UTC 14:00 (จริงๆ คือ 07:00 UTC)
  const shiftedTime = new Date(thailandTime.format('YYYY-MM-DDTHH:mm:ss.SSS'));
  return shiftedTime;
}

/**
 * วิธีที่ 2: เก็บเป็น UTC ปกติ แต่แปลงตอนแสดงผล (แนะนำ)
 */
function getCurrentThailandTime() {
  // เก็บเป็น UTC ปกติ
  return new Date();
}

/**
 * Helper function สำหรับแปลง UTC เป็นเวลาไทยตอนแสดงผล
 */
function formatToThailandTime(date) {
  return dayjs(date).tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');
}

class PointManageController {
  /**
   * บันทึก Point Log สำหรับการติดตาม transaction
   */
  static async savePointLog(empid, name_emp, uid, data_input, addby, point, description) {
    try {
      if (!empid || !uid || !point) {
        console.error('Missing required fields for point log:', { empid, uid, point });
        throw new Error('Missing required fields: empid, uid, or point');
      }

      const pointLog = await prisma.pointLog.create({
        data: {
          empid,
          name_emp: name_emp || 'Unknown',
          uid,
          data_input: data_input || '',
          addby: addby || 'Unknown',
          point,
          description: description || 'เพิ่มแต้มโดยพนักงาน',
          // ใช้วิธีที่ 1: Shift เวลา (ถ้าต้องการให้ DB เก็บเป็นเวลาไทยจริงๆ)
          createdat: getCurrentThailandTimeShifted()
          
          // หรือใช้วิธีที่ 2: เก็บ UTC ปกติ (แนะนำ)
          // createdat: getCurrentThailandTime()
        }
      });

      console.log('Point log saved successfully:', pointLog.id);
      console.log('Saved time (raw):', pointLog.createdat);
      console.log('Saved time (Thailand):', formatToThailandTime(pointLog.createdat));
      
      return pointLog;
    } catch (error) {
      console.error('Error saving point log:', error);
      throw error;
    }
  }

static async addPointsToCustomer(req, res) {
  const { customer_info, userpoint, note } = req.body;

  if (!req.employee && !req.user) {
    return res.status(401).json({
      success: false,
      message: 'ไม่พบข้อมูลพนักงาน กรุณาเข้าสู่ระบบใหม่'
    });
  }

  const employee = req.employee || {
    id: req.user?.empId || req.user?.id,
    empid: req.user?.empCode || req.user?.empid || req.user?.id?.toString(),
    firstname_emp: req.user?.firstname_emp || 'N/A',
    lastname_emp: req.user?.lastname_emp || 'N/A',
    name_emp: req.user?.name || req.user?.name_emp || req.user?.empCode || 'Unknown',
    role: req.user?.role || 'employee'
  };
  console.log('Employee data:', employee);

  if (!userpoint || typeof userpoint !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'จำนวนแต้มต้องเป็นตัวเลข'
    });
  }

  if (userpoint <= 0) {
    return res.status(400).json({
      success: false,
      message: 'จำนวนแต้มต้องมากกว่า 0'
    });
  }

  if (!customer_info) {
    return res.status(400).json({
      success: false,
      message: 'ต้องใส่ข้อมูลลูกค้า (UID, LINE ID, หรือเบอร์โทร)'
    });
  }

  try {
    const customer = await prisma.user.findFirst({
      where: {
        OR: [
          { uid: customer_info },
          { userid: customer_info },
          { phonenumber: customer_info }
        ],
        isactive: true
      },
      select: {
        id: true,
        userid: true,
        name: true,
        pictureurl: true,
        uid: true,
        userpoint: true,
        role: true,
        phonenumber: true
      }
    });

    if (!customer) {
      let messageType = '';
      if (customer_info.startsWith('0') && customer_info.length >= 9) {
        messageType = 'NumberNotFound';
      } else if (customer_info.startsWith('U')) {
        messageType = 'LineIDNotFound';
      } else {
        messageType = 'ไม่พบข้อมูลลูกค้า';
      }

      return res.status(404).json({
        success: false,
        message: messageType,
        searchInfo: {
          input: customer_info,
          detectedType: messageType.replace('NotFound', '')
        }
      });
    }

    let foundBy = '';
    let addByType = '';
    if (customer.uid === customer_info) {
      foundBy = 'รหัสสมาชิก (UID)';
      addByType = 'รหัสลูกค้า';
    } else if (customer.userid === customer_info) {
      foundBy = 'ไลน์ไอดี (LINE ID)';
      addByType = 'ไลน์ไอดี';
    } else if (customer.phonenumber === customer_info) {
      foundBy = 'เบอร์โทร (PHONE NUMBER)';
      addByType = 'เบอร์โทร';
    }

    const empid = employee.empid || employee.id?.toString() || 'UNKNOWN';
    const name_emp = employee.name_emp || employee.firstname_emp || 'Unknown Employee';
    const uid = customer.uid || customer.id?.toString() || 'UNKNOWN_UID';
    const data_input = customer_info || '';
    const addby = addByType || 'Unknown';

    // ✅ หาร 25 แล้วเก็บเป็นทศนิยมได้
    const point = userpoint / 25;
    const description = note || 'เพิ่มแต้มโดยพนักงาน';

    console.log('Preparing transaction with variables:', {
      empid, name_emp, uid, data_input, addby, point, description
    });

    const result = await prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.user.update({
        where: { id: customer.id },
        data: {
          userpoint: {
            increment: point   // ✅ ใช้ point (ทศนิยมได้)
          }
        },
        select: {
          id: true,
          userid: true,
          name: true,
          pictureurl: true,
          uid: true,
          userpoint: true
        }
      });

      // ใช้วิธีที่ 1: Shift เวลา
      const thailandTimeShifted = getCurrentThailandTimeShifted();

      const pointLog = await tx.pointLog.create({
        data: {
          empid,
          name_emp,
          uid,
          data_input,
          addby,
          point,
          description,
          createdat: thailandTimeShifted
        }
      });

      console.log('Transaction completed:', {
        customerId: updatedCustomer.id,
        pointLogId: pointLog.id,
        savedTime: thailandTimeShifted,
        savedTimeFormatted: formatToThailandTime(thailandTimeShifted)
      });

      return {
        updatedCustomer,
        pointLog
      };
    });

    res.status(200).json({
      success: true,
      message: 'เพิ่มแต้มและบันทึก log สำเร็จ',
      data: {
        searchResult: {
          input: customer_info,
          foundBy,
          customerFound: true
        },
        customer: {
          id: result.updatedCustomer.id,
          lineId: result.updatedCustomer.userid,
          name: result.updatedCustomer.name,
          uid: result.updatedCustomer.uid,
          pointsBefore: customer.userpoint,
          pointsAdded: point, // ✅ show ทศนิยม
          pointsNow: result.updatedCustomer.userpoint,
          phone: customer.phonenumber
        },
        employee: {
          id: employee.id,
          empCode: employee.empid,
          firstName: employee.firstname_emp || 'N/A',
          lastName: employee.lastname_emp || 'N/A',
          name: employee.name_emp || employee.empid || 'Unknown',
          role: employee.role
        },
        transaction: {
          pointsAdded: point, // ✅ show ทศนิยม
          foundBy,
          data_input: customer_info,
          name: result.updatedCustomer.name,
          empid,
          empname: name_emp,
          note: description,
          // แสดงเวลาในรูปแบบ Thailand timezone
          datetime: formatToThailandTime(result.pointLog.createdat),
          datetimeRaw: result.pointLog.createdat,
          pointLogId: result.pointLog.id
        }
      }
    });

  } catch (error) {
    console.error('Add points with log error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้าที่ต้องการอัพเดท'
      });
    }

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มแต้ม',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


  static async getPointLogsByUid(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        startDate,
        endDate
      } = req.query;

      const { uid } = req.params;

      if (!uid) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุ UID ในพารามิเตอร์ URL (/get-point-log/:uid)'
        });
      }

      const whereCondition = { uid };

      // ถ้าใช้วิธี shift เวลา ต้องแปลง query date ด้วย
      if (startDate || endDate) {
        whereCondition.createdat = {};
        if (startDate) {
          // Shift startDate ไป 7 ชั่วโมงด้วย
          const shiftedStart = dayjs(startDate).subtract(7, 'hour').toDate();
          whereCondition.createdat.gte = shiftedStart;
        }
        if (endDate) {
          // Shift endDate ไป 7 ชั่วโมงด้วย
          const shiftedEnd = dayjs(endDate).subtract(7, 'hour').toDate();
          whereCondition.createdat.lte = shiftedEnd;
        }
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const [logs, totalCount] = await Promise.all([
        prisma.pointLog.findMany({
          where: whereCondition,
          select: {
            id: true,
            empid: true,
            name_emp: true,
            uid: true,
            data_input: true,
            addby: true,
            point: true,
            point_status: true,
            description: true,
            createdat: true
          },
          orderBy: { createdat: 'desc' },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.pointLog.count({ where: whereCondition })
      ]);

      const formattedLogs = logs.map(log => {
        let statusText = 'ไม่เปลี่ยนแปลง';
        if (log.point_status === true) statusText = 'เพิ่ม';
        else if (log.point_status === false) statusText = 'ลด';

        return {
          id: log.id,
          empId: log.empid,
          employeeName: log.name_emp,
          customerUid: log.uid,
          input: log.data_input,
          addedBy: log.addby,
          point: log.point,
          pointStatus: statusText,
          description: log.description,
          createdAt: log.createdat,
          // ถ้าใช้วิธี shift แล้ว เวลาที่ได้จาก DB จะเป็นเวลาไทยอยู่แล้ว
          formattedDate: dayjs(log.createdat).format('DD/MM/YYYY HH:mm:ss'),
          // หรือถ้าใช้วิธี UTC ปกติ ให้แปลงตอนแสดง
          // formattedDate: formatToThailandTime(log.createdat)
        };
      });

      const totalPoints = logs.reduce((sum, log) => sum + (log.point || 0), 0);

      res.status(200).json({
        success: true,
        message: `พบประวัติการเพิ่มแต้ม ${totalCount} รายการ`,
        filters: {
          uid,
          startDate: startDate || null,
          endDate: endDate || null
        },
        pagination: {
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit),
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          hasNextPage: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1
        },
        summary: {
          totalRecords: totalCount,
          currentPageRecords: logs.length,
          totalPointsAdded: totalPoints
        },
        data: {
          logs: formattedLogs,
          rawLogs: logs
        }
      });

    } catch (error) {
      console.error('Get point logs error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงประวัติแต้ม',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  static async getAllPointLogs(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const whereCondition = {};

      // ถ้าใช้วิธี shift เวลา ต้องแปลง query date ด้วย
      if (startDate || endDate) {
        whereCondition.createdat = {};
        if (startDate) {
          const shiftedStart = dayjs(startDate).subtract(7, 'hour').toDate();
          whereCondition.createdat.gte = shiftedStart;
        }
        if (endDate) {
          const shiftedEnd = dayjs(endDate).subtract(7, 'hour').toDate();
          whereCondition.createdat.lte = shiftedEnd;
        }
      }

      const logs = await prisma.pointLog.findMany({
        where: whereCondition,
        select: {
          point: true,
          createdat: true,
          point_status: true
        },
        orderBy: { createdat: 'desc' }
      });

      const formattedLogs = logs.map(log => ({
        point: log.point,
        createdAt: log.createdat,
        // ถ้าใช้วิธี shift แล้ว เวลาที่ได้จาก DB จะเป็นเวลาไทยอยู่แล้ว
        formattedDate: dayjs(log.createdat).format('DD/MM/YYYY HH:mm:ss'),
        status: log.point_status
      }));

      const totalPoints = logs.reduce((sum, log) => sum + (log.point || 0), 0);

      res.status(200).json({
        success: true,
        message: `พบประวัติการเพิ่มแต้มทั้งหมด ${logs.length} รายการ`,
        filters: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        summary: {
          totalRecords: logs.length,
          totalPointsAdded: totalPoints
        },
        data: {
          logs: formattedLogs,
          rawLogs: logs
        }
      });

    } catch (error) {
      console.error('Get point logs error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงประวัติแต้ม',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = PointManageController;

/**
 * หมายเหตุ: มี 2 วิธีในการจัดการ timezone
 * 
 * วิธีที่ 1: Shift เวลา (ใช้ getCurrentThailandTimeShifted)
 * - ข้อดี: เวลาใน DB เป็นเวลาไทยจริงๆ ดูง่าย
 * - ข้อเสีย: ต้องระวังเวลา query, ต้อง shift query date ด้วย
 * 
 * วิธีที่ 2: เก็บ UTC แต่แปลงตอนแสดง (แนะนำ)
 * - ข้อดี: มาตรฐาน, ไม่ต้องแปลง query
 * - ข้อเสีย: ต้องแปลงเวลาตอนแสดงผลทุกครั้ง
 * 
 * ถ้าใช้ PostgreSQL สามารถตั้ง timezone ที่ database level ได้:
 * ALTER DATABASE your_db_name SET timezone TO 'Asia/Bangkok';
 * 
 * หรือใน Prisma schema:
 * datasource db {
 *   provider = "postgresql"
 *   url      = env("DATABASE_URL")
 * }
 * 
 * และใน connection string:
 * DATABASE_URL="postgresql://...?timezone=Asia/Bangkok"
 */