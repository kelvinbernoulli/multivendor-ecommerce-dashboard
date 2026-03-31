import * as CategoriesController from "#controllers/categories.controller.js";
import * as SubcategoriesController from "#controllers/subcategories.controller.js";
import pagination from "#middlewares/pagination.middleware.js";
import { Router } from "express";
const router = Router();

//categories
router.post("/category/create", CategoriesController.createCategory);
router.get("/categories", pagination, CategoriesController.fetchVendorCategories);
router.get("/category/:id", CategoriesController.fetchCategoryById);
router.patch("/category/update/:categoryId", CategoriesController.updateCategory);
router.delete("/category/delete/:categoryId", CategoriesController.deleteCategory);

//subcategories
router.post("/subcategory/create", SubcategoriesController.createSubcategory);
router.get("/subcategories", pagination, SubcategoriesController.fetchVendorSubcategories);
router.get("/subcategory/:id", SubcategoriesController.fetchSubcategoryById);
router.patch("/subcategory/update/:subcategoryId", SubcategoriesController.updateSubcategory);
router.delete("/subcategory/delete/:subcategoryId", SubcategoriesController.deleteSubcategory);

//settings
router.get("/settings", pagination, SubcategoriesController.fetchVendorSubcategories);
router.patch("/settings/update", SubcategoriesController.updateSubcategory);

export default router;