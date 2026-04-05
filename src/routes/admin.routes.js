import * as supportTicketsController from "#controllers/support.tickets.controller.js";
import * as settingsController from "#controllers/settings.controller.js";
import * as CountriesController from "#controllers/countries.controller.js";
import * as CurrenciesController from "#controllers/currencies.controller.js";
import pagination from "#middlewares/pagination.middleware.js";
import { Router } from "express";
const router = Router();

//currencies
router.post("/currencies/create", CurrenciesController.createCurrency);
router.get("/currencies", pagination, CurrenciesController.fetchCurrencies);
router.get("/currencies/:currencyId", CurrenciesController.fetchCurrencyById);
router.put("/currencies/update/:currencyId", CurrenciesController.updateCurrency);
router.delete("/currencies/delete/:currencyId", CurrenciesController.deleteCurrency);

//countries
router.post("/countries/create", CountriesController.createCountry);
router.get("/countries", pagination, CountriesController.fetchCountries);
router.get("/countries/:countryId", CountriesController.fetchCountryById);
router.put("/countries/update/:countryId", CountriesController.updateCountry);
router.delete("/countries/delete/:countryId", CountriesController.deleteCountry);

//support tickets
router.post("/support-tickets/create", supportTicketsController.createGeneralSupportTicket);
router.get("/support-tickets", pagination, supportTicketsController.fetchGeneralSupportTickets);
router.get("/support-tickets/:ticketId", supportTicketsController.fetchGeneralSupportTicketById);
router.delete("/support-tickets/:ticketId", supportTicketsController.deleteGeneralSupportTicket);

//settings
router.get("/settings", pagination, settingsController.fetchGeneralSettings);
router.patch("/settings/upsert", settingsController.upsertGeneralSettings);

export default router;