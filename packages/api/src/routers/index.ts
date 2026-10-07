import { protectedProcedure, publicProcedure, router } from "../index";
import { tenantRouter } from "./tenant";
import { patientRouter } from "./patient";
import { visitRouter } from "./visit";
import { labRouter } from "./lab";
import { prescriptionRouter } from "./prescription";
import { inventoryRouter } from "./inventory";
import { billingRouter } from "./billing";
import { referralRouter } from "./referral";
import { appointmentRouter } from "./appointment";
import { notificationRouter } from "./notification";
import { wardRouter } from "./ward";
import { auditRouter } from "./misc";
import { tariffRouter } from "./tariff";
import { doctorRouter } from "./doctor";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: `Authenticated user: ${ctx.userId ?? "unknown"}`,
  })),

  tenant: tenantRouter,
  patient: patientRouter,
  visit: visitRouter,
  lab: labRouter,
  prescription: prescriptionRouter,
  inventory: inventoryRouter,
  billing: billingRouter,
  referral: referralRouter,
  appointment: appointmentRouter,
  notification: notificationRouter,
  ward: wardRouter,
  audit: auditRouter,
  tariff: tariffRouter,
  doctor: doctorRouter,
});

export type AppRouter = typeof appRouter;
