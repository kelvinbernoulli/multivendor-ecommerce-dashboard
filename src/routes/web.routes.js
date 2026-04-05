import * as SupportTicketController from "#controllers/support.tickets.controller.js";
import * as SettingsController from "#controllers/settings.controller.js";
import pagination from "#middlewares/pagination.middleware.js";
import { Router } from "express";
const router = Router();

//support tickets
router.post("/support-tickets/create", SupportTicketController.createGeneralSupportTicket);

//settings
router.get("/settings", pagination, SettingsController.fetchGeneralSettings);

export default router;