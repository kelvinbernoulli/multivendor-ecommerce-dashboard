import * as CategoriesController from "#controllers/categories.controller.js";
import * as SubcategoriesController from "#controllers/subcategories.controller.js";
import * as SettingsController from "#controllers/settings.controller.js";
import * as SupportTicketController from "#controllers/support.ticket.controller.js";
import * as ProductController from "#controllers/product.controller.js";
import * as VendorController from "#controllers/vendor.controller.js";
import * as PermissionsController from "#controllers/permission.controller.js";
import pagination from "#middlewares/pagination.middleware.js";
import { Router } from "express";
import { authenticated, isVendor, isVendorAdmin, isVendorAndVendorAdmin } from "#middlewares/auth.middleware.js";
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
router.get("/settings", pagination, authenticated, SettingsController.fetchSettings);
router.patch("/settings/update", authenticated, SettingsController.upsertSettings);

//support tickets
router.post("/support-tickets/create", authenticated, SupportTicketController.createSupportTicket);
router.get("/support-tickets", pagination, authenticated, SupportTicketController.fetchVendorSupportTickets);
router.get("/support-tickets/:ticketId", authenticated, SupportTicketController.fetchSupportTicketById);
router.delete("/support-tickets/:ticketId", authenticated, SupportTicketController.deleteSupportTicket);

//products
router.post("/product/create", isVendorAndVendorAdmin, ProductController.createProduct);
router.get("/products", authenticated, isVendorAndVendorAdmin, pagination, ProductController.fetchProducts);
router.get("/product/:id", authenticated, isVendorAndVendorAdmin, ProductController.fetchProductById);
router.patch("/product/update/:id", authenticated, isVendorAndVendorAdmin, ProductController.updateProduct);

//orders
router.get("/orders", authenticated, pagination, VendorController.getVendorOrders);
router.get("/customer-orders", authenticated, pagination, VendorController.getCustomerOrders);
router.patch("/order/update-status/:orderId", authenticated, VendorController.updateOrderStatus);
router.patch("/order/cancel/:orderId", authenticated, VendorController.cancelOrder);
router.get("/order/history/:customerId", authenticated, pagination, VendorController.getOrderHistory);

//dashboard
router.get("/dashboard/overview", authenticated, VendorController.getDashboard);
router.get("/dashboard/revenue-chart", authenticated, VendorController.getRevenueChart);
router.get("/dashboard/low-stock", authenticated, VendorController.getLowStockProducts);

//vendor admin permissions
router.post("/admins/permissions/assign", isVendor, PermissionsController.assignAdminPermissions);
router.get("/admins/permissions/:adminId", isVendor, PermissionsController.fetchAdminPermissions);

export default router;