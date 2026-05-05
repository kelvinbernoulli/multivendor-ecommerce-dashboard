import * as SupportTicketController from "#controllers/support.ticket.controller.js";
import * as SettingsController from "#controllers/settings.controller.js";
import * as ProductController from "#controllers/product.controller.js";
import * as CartController from "#controllers/cart.controller.js";
import * as OrderController from "#controllers/order.controller.js";
import * as WishlistController from "#controllers/wishlist.controller.js";
import * as UsersController from "#controllers/users.controller.js";
import * as CountriesController from "#controllers/countries.controller.js";
import pagination from "#middlewares/pagination.middleware.js";
import { Router } from "express";
import { authenticated, isCustomer } from "#middlewares/auth.middleware.js";
const router = Router();

//support tickets
router.post("/support-tickets/create", SupportTicketController.createGeneralSupportTicket);

//settings
router.get("/settings", pagination, SettingsController.fetchGeneralSettings);

//countries
router.get("/countries", CountriesController.fetchCountries);

//products
router.get("/products", authenticated, pagination, ProductController.fetchProducts);
router.get("/product/:productId", authenticated, ProductController.fetchProductById);
router.get("/products/search", authenticated, pagination, ProductController.searchProducts);
router.get("/products/filters", authenticated, ProductController.getFilters);
router.get("/products/related/:productId", authenticated, pagination, ProductController.getRelatedProducts);
router.get("/products/featured", authenticated, pagination, ProductController.getFeaturedProducts);


//cart
router.post("/cart/items/add", isCustomer, CartController.addToCart);
router.get("/cart/items", pagination, isCustomer, CartController.cartItems);
router.patch("/cart/items/update", isCustomer, CartController.upsertCart);
router.post("/cart/items/remove", isCustomer, CartController.removeFromCart);

//checkout
router.get("/cart/preview-checkout", isCustomer, CartController.previewCheckout);
router.post("/cart/validate-coupon", isCustomer, CartController.validateCoupon);
router.post("/cart/checkout", isCustomer, CartController.processCheckout);

//wishlist
router.post("/wishlist/items/add/:product_id", isCustomer, WishlistController.addToWishList);
router.get("/wishlist/items", pagination, isCustomer, WishlistController.wishListItems);
router.delete("/wishlist/item/remove/:item_id", isCustomer, WishlistController.removeFromWishList);
router.post("/wishlist/items/move-to-cart/:item_id", isCustomer, WishlistController.moveToCart);

//orders
router.post("/orders/place", isCustomer, OrderController.placeOrder);
router.get("/orders", pagination, isCustomer, OrderController.getCustomerOrders);
router.get("/orders/history", isCustomer, OrderController.getOrderHistory);
router.patch("/orders/cancel/:orderId", isCustomer, OrderController.cancelOrder);

//profile
router.get("/profile", authenticated, isCustomer, UsersController.getProfile);
router.patch("/profile/update", authenticated, isCustomer, UsersController.updateProfile);
router.post("/address/add", authenticated, isCustomer, UsersController.addAddress);
router.patch("/address/update/:addressId", authenticated, isCustomer, UsersController.updateAddress);
router.delete("/address/delete/:addressId", authenticated, isCustomer, UsersController.deleteAddress);

export default router;