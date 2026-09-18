// lib/services/payroll-attendance.service.ts
import { db } from "@/lib/db";
import { differenceInHours, differenceInMinutes, startOfDay, endOfDay, eachDayOfInterval, isWeekend } from "date-fns";

export interface PayrollPeriod {
  startDate: Date;
  endDate: Date;
}

export interface AttendancePayrollData {
  employeeId: string;
  employeeName: string;
  userType: string;
  baseSalary: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  lateMinutes: number;
  absentDays: number;
  presentDays: number;
  weekendDays: number;
  holidayDays: number;
  totalEarnings: number;
  overtimePay: number;
  deductions: number;
  netPay: number;
  payPeriod: {
    start: string;
    end: string;
  };
  attendanceDetails: {
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    totalHours: number;
    isLate: boolean;
    isEarlyOut: boolean;
    status: string;
  }[];
}

export class PayrollAttendanceService {
  /**
   * Calculate payroll for a single employee for a given period
   */
  static async calculateEmployeePayroll(
    employeeId: string,
    period: PayrollPeriod
  ): Promise<AttendancePayrollData> {
    // Get employee details
    const employee = await db.user.findUnique({
      where: { id: employeeId },
      include: {
        attendanceLogs: {
          where: {
            date: {
              gte: startOfDay(period.startDate),
              lte: endOfDay(period.endDate),
            },
          },
          orderBy: { date: "asc" },
        },
      },
    });

    if (!employee) {
      throw new Error("Employee not found");
    }

    // Get agency working hours
    const agency = await db.agency.findFirst({
      where: { users: { some: { id: employeeId } } },
      include: { workingHours: true },
    });

    // Calculate attendance metrics
    const attendanceDetails = [];
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let lateMinutes = 0;
    let absentDays = 0;
    let presentDays = 0;
    let weekendDays = 0;
    let holidayDays = 0;

    // Get all days in the period
    const daysInPeriod = eachDayOfInterval({
      start: period.startDate,
      end: period.endDate,
    });

    // Get holidays (if any - you can extend this)
    const holidays = await db.holiday.findMany({
      where: {
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
    });

    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

    for (const day of daysInPeriod) {
      const dayStr = day.toISOString().split('T')[0];
      const dayName = day.toLocaleDateString("en-US", { weekday: "long" });
      
      // Check if it's a working day
      const workingDay = agency?.workingHours?.find((wh) => wh.day === dayName);
      const isWorkingDay = workingDay && !workingDay.isClosed;
      const isWeekendDay = isWeekend(day);
      const isHoliday = holidayDates.has(dayStr);

      // Find attendance log for this day
      const log = employee.attendanceLogs.find(
        (l) => l.date.toISOString().split('T')[0] === dayStr
      );

      if (log) {
        presentDays++;
        const checkIn = log.checkInTime;
        const checkOut = log.checkOutTime || new Date();
        const hours = log.totalHours || differenceInHours(checkOut, checkIn);
        
        // Calculate total hours
        totalHours += hours;
        
        // Calculate regular vs overtime hours
        if (isWorkingDay && !isWeekendDay && !isHoliday) {
          const dailyRegularHours = 8; // Standard workday
          if (hours > dailyRegularHours) {
            regularHours += dailyRegularHours;
            overtimeHours += (hours - dailyRegularHours);
          } else {
            regularHours += hours;
          }
        } else {
          // Weekend or holiday work is overtime
          overtimeHours += hours;
        }

        // Calculate late minutes
        if (log.isLate && workingDay && !workingDay.isClosed) {
          const [openHours, openMinutes] = workingDay.openTime.split(":").map(Number);
          const expectedStart = new Date(day);
          expectedStart.setHours(openHours, openMinutes, 0, 0);
          const lateMins = differenceInMinutes(checkIn, expectedStart);
          if (lateMins > 0) {
            lateMinutes += lateMins;
          }
        }

        attendanceDetails.push({
          date: dayStr,
          checkIn: checkIn.toLocaleTimeString(),
          checkOut: log.checkOutTime?.toLocaleTimeString() || null,
          totalHours: hours,
          isLate: log.isLate || false,
          isEarlyOut: log.isEarlyOut || false,
          status: log.status || "PRESENT",
        });
      } else {
        // Check if this day should be counted as absent
        if (isWorkingDay && !isWeekendDay && !isHoliday) {
          absentDays++;
        }
        
        attendanceDetails.push({
          date: dayStr,
          checkIn: null,
          checkOut: null,
          totalHours: 0,
          isLate: false,
          isEarlyOut: false,
          status: "ABSENT",
        });
      }

      // Count weekend days
      if (isWeekendDay) {
        weekendDays++;
      }

      // Count holidays
      if (isHoliday) {
        holidayDays++;
      }
    }

    // Calculate payroll - handle null baseSalary
    const baseSalary = employee.baseSalary || 0;
    const hourlyRate = baseSalary / (20 * 8); // Assume 20 working days, 8 hours/day
    
    // Overtime rate (1.5x)
    const overtimeRate = hourlyRate * 1.5;
    
    // Regular earnings
    const regularEarnings = regularHours * hourlyRate;
    const overtimeEarnings = overtimeHours * overtimeRate;
    const totalEarnings = regularEarnings + overtimeEarnings;

    // Calculate deductions (e.g., for late arrivals)
    const lateDeductionRate = hourlyRate / 60; // Per minute
    const lateDeductions = lateMinutes * lateDeductionRate;
    
    // Net pay
    const netPay = totalEarnings - lateDeductions;

    return {
      employeeId: employee.id,
      employeeName: employee.name || "Unknown",
      userType: employee.userType || "FULL_TIME",
      baseSalary,
      totalHours,
      regularHours,
      overtimeHours,
      lateMinutes,
      absentDays,
      presentDays,
      weekendDays,
      holidayDays,
      totalEarnings,
      overtimePay: overtimeEarnings,
      deductions: lateDeductions,
      netPay,
      payPeriod: {
        start: period.startDate.toISOString().split('T')[0],
        end: period.endDate.toISOString().split('T')[0],
      },
      attendanceDetails,
    };
  }

  /**
   * Calculate payroll for all employees in an agency
   */
  static async calculateAgencyPayroll(
    agencyId: string,
    period: PayrollPeriod
  ): Promise<AttendancePayrollData[]> {
    // Get all employees in the agency
    const employees = await db.user.findMany({
      where: {
        agencyId,
        userType: { in: ["FULL_TIME", "PART_TIME", "FREELANCER"] },
      },
      select: { id: true },
    });

    const payrollData = [];
    for (const employee of employees) {
      try {
        const data = await this.calculateEmployeePayroll(employee.id, period);
        payrollData.push(data);
      } catch (error) {
        console.error(`Failed to calculate payroll for employee ${employee.id}:`, error);
        // Continue with other employees
      }
    }

    return payrollData;
  }

  /**
   * Get payroll summary for an employee
   */
  static async getEmployeePayrollSummary(employeeId: string) {
  const employee = await db.user.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      name: true,
      userType: true,
      baseSalary: true,
      walletBalance: true,
      // ✅ compute totalPayouts from the relation
      payouts: {
        select: { amount: true, status: true },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  // Get all attendance logs for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logs = await db.attendanceLog.findMany({
    where: {
      userId: employeeId,
      date: { gte: thirtyDaysAgo },
    },
  });

  const totalHours = logs.reduce(
    (sum, log) => sum + (log.totalHours || 0),
    0
  );
  const lateDays = logs.filter((log) => log.isLate).length;
  const presentDays = logs.filter((log) => log.status === "PRESENT").length;

  // ✅ Sum PAID payouts only
  const totalPayouts = employee.payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  const baseSalary = employee.baseSalary || 0;

  return {
    id: employee.id,
    name: employee.name,
    userType: employee.userType,
    baseSalary,
    walletBalance: employee.walletBalance,
    totalPayouts,
    totalHoursLast30Days: totalHours,
    lateDaysLast30Days: lateDays,
    presentDaysLast30Days: presentDays,
    averageDailyHours: presentDays > 0 ? totalHours / presentDays : 0,
    efficiencyRate: baseSalary > 0 ? (totalHours / (20 * 8)) * 100 : 0,
  };
}

  /**
   * Generate payroll report for a period
   */
  static async generatePayrollReport(
    agencyId: string,
    period: PayrollPeriod
  ) {
    const payrollData = await this.calculateAgencyPayroll(agencyId, period);

    // Calculate agency totals
    const totals = payrollData.reduce(
      (acc, emp) => ({
        totalEmployees: acc.totalEmployees + 1,
        totalHours: acc.totalHours + emp.totalHours,
        totalOvertimeHours: acc.totalOvertimeHours + emp.overtimeHours,
        totalRegularHours: acc.totalRegularHours + emp.regularHours,
        totalEarnings: acc.totalEarnings + emp.totalEarnings,
        totalNetPay: acc.totalNetPay + emp.netPay,
        totalDeductions: acc.totalDeductions + emp.deductions,
        totalOvertimePay: acc.totalOvertimePay + emp.overtimePay,
        totalAbsentDays: acc.totalAbsentDays + emp.absentDays,
        totalLateMinutes: acc.totalLateMinutes + emp.lateMinutes,
      }),
      {
        totalEmployees: 0,
        totalHours: 0,
        totalOvertimeHours: 0,
        totalRegularHours: 0,
        totalEarnings: 0,
        totalNetPay: 0,
        totalDeductions: 0,
        totalOvertimePay: 0,
        totalAbsentDays: 0,
        totalLateMinutes: 0,
      }
    );

    return {
      period: {
        start: period.startDate.toISOString().split('T')[0],
        end: period.endDate.toISOString().split('T')[0],
      },
      employees: payrollData,
      summary: totals,
    };
  }

  /**
   * Process monthly payroll for all employees
   */
  static async processMonthlyPayroll(agencyId: string, month: number, year: number) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    const period: PayrollPeriod = { startDate, endDate };
    
    // Calculate payroll
    const report = await this.generatePayrollReport(agencyId, period);
    
    // Create payroll records
    for (const employee of report.employees) {
      // Check if payroll already exists for this period
      const existing = await db.payrollRecord.findFirst({
        where: {
          employeeId: employee.employeeId,
          periodStart: startDate,
          periodEnd: endDate,
        },
      });

      if (!existing) {
        await db.payrollRecord.create({
          data: {
            employeeId: employee.employeeId,
            agencyId,
            periodStart: startDate,
            periodEnd: endDate,
            payPeriod: `${new Date(startDate).toLocaleString('default', { month: 'long' })} ${year}`,
            baseSalary: employee.baseSalary,
            regularHours: employee.regularHours,
            overtimeHours: employee.overtimeHours,
            totalHours: employee.totalHours,
            regularPay: employee.totalEarnings - employee.overtimePay,
            overtimePay: employee.overtimePay,
            // Use totalDeductions instead of deductions (which is a relation)
            totalDeductions: employee.deductions,
            lateDeduction: employee.deductions,
            absenceDeduction: 0,
            taxDeduction: 0,
            socialSecurity: 0,
            healthInsurance: 0,
            otherDeductions: 0,
            grossPay: employee.totalEarnings,
            netPay: employee.netPay,
            status: "PENDING",
            // attendanceSummary is a Json field
            attendanceSummary: {
              presentDays: employee.presentDays,
              absentDays: employee.absentDays,
              lateMinutes: employee.lateMinutes,
            },
          },
        });
      }
    }

    return report;
  }

  /**
   * Get attendance-based metrics for HR dashboard
   */
  static async getAttendanceMetrics(agencyId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const employees = await db.user.findMany({
      where: { agencyId },
      include: {
        attendanceLogs: {
          where: {
            date: { gte: startDate },
          },
        },
      },
    });

    const totalEmployees = employees.length;
    let totalHours = 0;
    let totalLateDays = 0;
    let totalPresentDays = 0;
    let totalAbsentDays = 0;
    let totalOvertimeHours = 0;

    // Get working days in the period
    const workingDays = [];
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      const workingDay = await db.workingDay.findFirst({
        where: {
          agencyId,
          day: dayName,
          isClosed: false,
        },
      });
      if (workingDay) {
        workingDays.push(new Date(d));
      }
    }

    const totalWorkingDays = workingDays.length;

    for (const employee of employees) {
      const logs = employee.attendanceLogs;
      const presentDays = logs.filter(log => log.status === "PRESENT").length;
      const lateDays = logs.filter(log => log.isLate).length;
      const hours = logs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
      const overtime = logs.reduce((sum, log) => {
        const h = log.totalHours || 0;
        return sum + (h > 8 ? h - 8 : 0);
      }, 0);

      totalHours += hours;
      totalLateDays += lateDays;
      totalPresentDays += presentDays;
      totalAbsentDays += (totalWorkingDays - presentDays);
      totalOvertimeHours += overtime;
    }

    const avgHoursPerEmployee = totalEmployees > 0 ? totalHours / totalEmployees : 0;
    const attendanceRate = (totalEmployees * totalWorkingDays) > 0 
      ? (totalPresentDays / (totalEmployees * totalWorkingDays)) * 100 
      : 0;

    return {
      totalEmployees,
      totalWorkingDays,
      totalHours,
      avgHoursPerEmployee,
      totalLateDays,
      totalPresentDays,
      totalAbsentDays,
      totalOvertimeHours,
      attendanceRate,
      latePercentage: totalPresentDays > 0 ? (totalLateDays / totalPresentDays) * 100 : 0,
    };
  }
}