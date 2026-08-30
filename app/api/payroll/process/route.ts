// app/api/payroll/process/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { PayrollAttendanceService } from "@/lib/services/payroll-attendance.service";

// ─── POST /api/payroll/process ──────────────────────────────────────────────
// Process payroll for a period
export const POST = withAuthGuard("payroll:create", async (req: NextRequest, { agencyId }) => {
  try {
    const body = await req.json();
    const { month, year } = body;

    if (month === undefined || year === undefined) {
      return NextResponse.json(
        { error: "Month and year are required" },
        { status: 400 }
      );
    }

    const report = await PayrollAttendanceService.processMonthlyPayroll(
      agencyId,
      parseInt(month),
      parseInt(year)
    );

    return NextResponse.json({
      success: true,
      message: "Payroll processed successfully",
      data: report,
    });
  } catch (error: any) {
    console.error("[PROCESS_PAYROLL_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payroll" },
      { status: 500 }
    );
  }
});

// ─── GET /api/payroll/report ─────────────────────────────────────────────────
// Get payroll report for a period
export const GET_REPORT = withAuthGuard("payroll:read", async (req: NextRequest, { agencyId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    const report = await PayrollAttendanceService.generatePayrollReport(agencyId, {
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("[GET_PAYROLL_REPORT_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get payroll report" },
      { status: 500 }
    );
  }
});

// ─── GET /api/payroll/employee/[employeeId] ────────────────────────────────
// Get payroll summary for an employee
export const GET_EMPLOYEE = withAuthGuard("payroll:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const employeeId = params.employeeId;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const summary = await PayrollAttendanceService.getEmployeePayrollSummary(employeeId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error("[GET_EMPLOYEE_PAYROLL_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get employee payroll" },
      { status: 500 }
    );
  }
});