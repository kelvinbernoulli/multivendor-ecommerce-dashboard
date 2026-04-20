import * as CategoriesController from "#controllers/categories.controller.js";
import * as SubcategoriesController from "#controllers/subcategories.controller.js";
import * as SettingsController from "#controllers/settings.controller.js";
import * as SupportTicketController from "#controllers/support.tickets.controller.js";
import pagination from "#middlewares/pagination.middleware.js";
import { Router } from "express";
import { authenticated } from "#middlewares/authenticate.middleware.js";
const router = Router();

//categories
router.post("/category/create", authenticated, CategoriesController.createCategory);
router.get("/categories", pagination, authenticated, CategoriesController.fetchVendorCategories);
router.get("/category/:id", authenticated, CategoriesController.fetchCategoryById);
router.patch("/category/update/:categoryId", authenticated, CategoriesController.updateCategory);
router.delete("/category/delete/:categoryId", authenticated, CategoriesController.deleteCategory);

//subcategories
router.post("/subcategory/create", authenticated, SubcategoriesController.createSubcategory);
router.get("/subcategories", pagination, authenticated, SubcategoriesController.fetchVendorSubcategories);
router.get("/subcategory/:id", authenticated, SubcategoriesController.fetchSubcategoryById);
router.patch("/subcategory/update/:subcategoryId", authenticated, SubcategoriesController.updateSubcategory);
router.delete("/subcategory/delete/:subcategoryId", authenticated, SubcategoriesController.deleteSubcategory);

//settings
router.get("/settings", pagination, authenticated, SettingsController.fetchVendorSubcategories);
router.patch("/settings/update", authenticated, SettingsController.updateSubcategory);

//support tickets
router.post("/support-tickets/create", authenticated, SupportTicketController.createSupportTicket);
router.get("/support-tickets", pagination, authenticated, SupportTicketController.fetchVendorSupportTickets);
router.get("/support-tickets/:ticketId", authenticated, SupportTicketController.fetchSupportTicketById);
router.delete("/support-tickets/:ticketId", authenticated, SupportTicketController.deleteSupportTicket);

export default router;