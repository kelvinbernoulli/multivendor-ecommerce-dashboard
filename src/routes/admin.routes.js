import * as supportTicketsController from "#controllers/support.tickets.controller.js";
import * as settingsController from "#controllers/settings.controller.js";
import * as CountriesController from "#controllers/countries.controller.js";
import * as CurrenciesController from "#controllers/currencies.controller.js";
import * as AdminTypesController from "#controllers/admin.types.controller.js";
import * as AdminsController from "#controllers/admins.controller.js";
import pagination from "#middlewares/pagination.middleware.js";
import { Router } from "express";
import { authenticated, isAllAdmin } from "#middlewares/auth.middleware.js";
const router = Router();

//currencies
router.post("/currencies/create", CurrenciesController.createCurrency);
router.get("/currencies", pagination, CurrenciesController.fetchCurrencies);
router.get("/currencies/view/:currencyId", CurrenciesController.fetchCurrencyById);
router.put("/currencies/update/:currencyId", CurrenciesController.updateCurrency);
router.delete("/currencies/delete/:currencyId", CurrenciesController.deleteCurrency);

//countries
router.post("/countries/create", CountriesController.createCountry);
router.get("/countries", pagination, CountriesController.fetchCountries);
router.get("/countries/view/:countryId", CountriesController.fetchCountryById);
router.put("/countries/update/:countryId", CountriesController.updateCountry);
router.delete("/countries/delete/:countryId", CountriesController.deleteCountry);

//support tickets
router.post("/support-tickets/create", supportTicketsController.createGeneralSupportTicket);
router.get("/support-tickets", pagination, supportTicketsController.fetchGeneralSupportTickets);
router.get("/support-tickets/view/:ticketId", supportTicketsController.fetchGeneralSupportTicketById);
router.delete("/support-tickets/:ticketId", supportTicketsController.deleteGeneralSupportTicket);

//settings
router.get("/settings", pagination, settingsController.fetchGeneralSettings);
router.patch("/settings/upsert", settingsController.upsertGeneralSettings);

//admin types
router.post("/admin-types/create", isAllAdmin, AdminTypesController.createAdminTypes);
router.get("/admin-types", pagination, isAllAdmin, authenticated, AdminTypesController.fetchAdminTypes);
router.get("/admin-types/view/:id", isAllAdmin, authenticated, AdminTypesController.fetchAdminType);
router.patch("/admin-types/update/:id", isAllAdmin, AdminTypesController.updateAdminTypes);
router.delete("/admin-types/delete/:id", isAllAdmin, AdminTypesController.deleteAdminType);

//admins
router.post("/admins/create", isAllAdmin, AdminsController.createAdmin);
router.get("/admins", pagination, isAllAdmin, authenticated, AdminsController.fetchAdmins);
router.get("/admins/view/:id", isAllAdmin, authenticated, AdminsController.fetchAdminById);
router.patch("/admins/update/:id", isAllAdmin, AdminsController.updateAdmin);
router.delete("/admins/delete/:id", isAllAdmin, AdminsController.deleteAdmin);

export default router;