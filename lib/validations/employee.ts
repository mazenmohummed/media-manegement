import * as z from "zod";

export const employeeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.string().min(2, "Role is required"),
  userType: z.enum(["FULL_TIME", "FREELANCER"]),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;