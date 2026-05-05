import { getBase64Extension, S3upload } from "#services/s3upload.js";

export class Product {
    static async create(req, vendorId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const {
                name, description, short_description, brand, tags,
                category_id, subcategory_id, price, compare_at_price, cost_price, discount,
                stock, low_stock_threshold, track_inventory,
                thumbnail, images,
                weight, length, width, height, free_shipping,
                attributes, options, variants,
                status, is_featured, is_digital,
                meta_title, meta_description, slug
            } = data;

            // Generate slug if not provided
            const productSlug = slug
                ? slug.toLowerCase().replace(/\s+/g, '-')
                : name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

            // Upload thumbnail            
            const filename = `images/product-images/${name}.${getBase64Extension(thumbnail)}`;

            const thumbnailUrl = await S3upload(req, res, filename, thumbnail);

            const hasVariants = variants && variants.length > 0;

            // 1. Insert product
            const { rows: productRows } = await client.query(
                `INSERT INTO products (
                vendor_id, category_id, subcategory_id, name, slug, description,
                short_description, brand, tags, price, compare_at_price,
                cost_price, discount, stock, low_stock_threshold,
                track_inventory, has_variants, weight,
                length, width, height, free_shipping, status,
                is_featured, is_digital, meta_title, meta_description
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
            ) RETURNING *`,
                [
                    vendorId, category_id, subcategory_id ?? null, name, productSlug,
                    description ?? null, short_description ?? null,
                    brand ?? null, tags ?? [],
                    price, compare_at_price ?? null,
                    cost_price ?? null, discount ?? 0,
                    stock, low_stock_threshold ?? 5,
                    track_inventory ?? true, hasVariants,
                    thumbnailUrl, weight ?? null,
                    length ?? null, width ?? null,
                    height ?? null, free_shipping ?? false,
                    status ?? 'draft', is_featured ?? false,
                    is_digital ?? false, meta_title ?? null,
                    meta_description ?? null
                ]
            );

            const product = productRows[0];

            // 2. Upload and insert images
            if (images && images.length > 0) {
                const filename = `images/product-images//${images}.${getBase64Extension(images)}`;
                const imageUrls = await S3upload(req, res, filename, images);
                for (let i = 0; i < imageUrls.length; i++) {
                    await client.query(
                        `INSERT INTO product_images (product_id, url, position, is_primary)
                    VALUES ($1, $2, $3, $4)`,
                        [product.id, imageUrls[i], i, i === 0]
                    );
                }
            }

            // 3. Insert attributes
            if (attributes && attributes.length > 0) {
                for (let i = 0; i < attributes.length; i++) {
                    await client.query(
                        `INSERT INTO product_attributes (product_id, name, value, position)
                    VALUES ($1, $2, $3, $4)`,
                        [product.id, attributes[i].name, attributes[i].value, i]
                    );
                }
            }

            // 4. Insert options and option values
            const optionValueMap = {};
            if (options && options.length > 0) {
                for (let i = 0; i < options.length; i++) {
                    const option = options[i];

                    const { rows: optionRows } = await client.query(
                        `INSERT INTO product_options (product_id, name, position)
                    VALUES ($1, $2, $3) RETURNING id`,
                        [product.id, option.name, i]
                    );

                    const optionId = optionRows[0].id;

                    for (let j = 0; j < option.values.length; j++) {
                        const { rows: valueRows } = await client.query(
                            `INSERT INTO product_option_values (option_id, value, position)
                        VALUES ($1, $2, $3) RETURNING id`,
                            [optionId, option.values[j], j]
                        );
                        optionValueMap[`${option.name}:${option.values[j]}`] = valueRows[0].id;
                    }
                }
            }

            // 5. Insert variants
            if (hasVariants) {
                for (const variant of variants) {
                    const variantImageUrl = variant.image
                        ? await uploadBase64ToS3(variant.image, 'products/variants')
                        : null;

                    const { rows: variantRows } = await client.query(
                        `INSERT INTO product_variants (
                            product_id, sku, barcode, price, compare_at_price,
                            cost_price, stock, low_stock_threshold, weight, image
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        RETURNING id`,
                        [
                            product.id, variant.sku ?? null,
                            variant.barcode ?? null, variant.price,
                            variant.compare_at_price ?? null,
                            variant.cost_price ?? null, variant.stock,
                            variant.low_stock_threshold ?? 5,
                            variant.weight ?? null, variantImageUrl
                        ]
                    );

                    const variantId = variantRows[0].id;

                    // Link variant to option values
                    for (const optionValueId of variant.option_values) {
                        await client.query(
                            `INSERT INTO variant_option_values (variant_id, option_value_id)
                        VALUES ($1, $2)`,
                            [variantId, optionValueId]
                        );
                    }
                }
            }

            await client.query('COMMIT');

            return await Product.findByKey(product.id, client);

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Error creating product:", error);
            throw error;
        } finally {
            client.release();
        }
    }

    static async findByKey(conditions, vendorId) {
        try {
            if (!vendorId) {
                throw new Error('Vendor ID is required');
            }

            if (!Array.isArray(conditions) || conditions.length === 0) {
                throw new Error('conditions must be a non-empty array');
            }

            let paramIndex = 1;
            const whereClauses = [];
            const values = [];

            // Build dynamic conditions
            for (const condition of conditions) {
                if (condition.value === null || condition.value === undefined) {
                    whereClauses.push(`p.${condition.key} IS NULL`);
                } else {
                    whereClauses.push(`p.${condition.key} = $${paramIndex++}`);
                    values.push(condition.value);
                }
            }

            // Always scope to vendor
            whereClauses.push(`p.vendor_id = $${paramIndex++}`);
            values.push(vendorId);
            whereClauses.push(`p.deleted_at IS NULL`);

            const query = `
            SELECT
                p.*,
                json_agg(DISTINCT jsonb_build_object(
                    'id', pi.id,
                    'url', pi.url,
                    'alt_text', pi.alt_text,
                    'position', pi.position,
                    'is_primary', pi.is_primary
                )) FILTER (WHERE pi.id IS NOT NULL) AS images,
                json_agg(DISTINCT jsonb_build_object(
                    'id', pa.id,
                    'name', pa.name,
                    'value', pa.value
                )) FILTER (WHERE pa.id IS NOT NULL) AS attributes,
                json_agg(DISTINCT jsonb_build_object(
                    'id', po.id,
                    'name', po.name,
                    'position', po.position,
                    'values', (
                        SELECT json_agg(jsonb_build_object(
                            'id', pov.id,
                            'value', pov.value
                        ) ORDER BY pov.position)
                        FROM product_option_values pov
                        WHERE pov.option_id = po.id
                    )
                )) FILTER (WHERE po.id IS NOT NULL) AS options,
                json_agg(DISTINCT jsonb_build_object(
                    'id', pv.id,
                    'sku', pv.sku,
                    'price', pv.price,
                    'stock', pv.stock,
                    'image', pv.image,
                    'status', pv.status
                )) FILTER (WHERE pv.id IS NOT NULL) AS variants
            FROM products p
            LEFT JOIN product_images pi ON pi.product_id = p.id
            LEFT JOIN product_attributes pa ON pa.product_id = p.id
            LEFT JOIN product_options po ON po.product_id = p.id
            LEFT JOIN product_variants pv ON pv.product_id = p.id
            WHERE ${whereClauses.join(' AND ')}
            GROUP BY p.id
            LIMIT 1
        `;

            const { rows } = await pool.query(query, values);
            return rows[0] ?? null;
        } catch (error) {
            console.error("Error finding product by key:", error);
            throw error;
        }
    }

    static async update(productId, vendorId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const {
                name, description, short_description, brand, tags,
                category_id, subcategory_id, price, compare_at_price, cost_price, discount,
                stock, low_stock_threshold, track_inventory,
                thumbnail, images,
                weight, length, width, height, free_shipping,
                attributes, options, variants,
                status, is_featured, is_digital,
                meta_title, meta_description, slug
            } = data;

            // Verify product belongs to vendor
            const { rows: existing } = await client.query(
                `SELECT * FROM products 
            WHERE id = $1 AND vendor_id = $2 AND deleted_at IS NULL`,
                [productId, vendorId]
            );

            if (existing.length === 0) {
                return null;
            }

            const product = existing[0];

            // Generate slug if name changed
            const productSlug = slug
                ? slug.toLowerCase().replace(/\s+/g, '-')
                : name
                    ? name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
                    : product.slug;

            // Upload new thumbnail if provided
            const thumbnailUrl = thumbnail
                ? await uploadBase64ToS3(thumbnail, 'products/thumbnails')
                : product.thumbnail;

            const hasVariants = variants && variants.length > 0;

            // 1. Update product core fields
            const { rows: updatedRows } = await client.query(
                `UPDATE products SET
                category_id         = COALESCE($1, category_id),
                subcategory_id      = COALESCE($2, subcategory_id),
                name                = COALESCE($3, name),
                slug                = COALESCE($4, slug),
                description         = COALESCE($5, description),
                short_description   = COALESCE($6, short_description),
                brand               = COALESCE($7, brand),
                tags                = COALESCE($8, tags),
                price               = COALESCE($9, price),
                compare_at_price    = COALESCE($10, compare_at_price),
                cost_price          = COALESCE($11, cost_price),
                discount            = COALESCE($12, discount),
                stock               = COALESCE($13, stock),
                low_stock_threshold = COALESCE($14, low_stock_threshold),
                track_inventory     = COALESCE($15, track_inventory),
                has_variants        = COALESCE($16, has_variants),
                thumbnail           = COALESCE($17, thumbnail),
                weight              = COALESCE($18, weight),
                length              = COALESCE($19, length),
                width               = COALESCE($20, width),
                height              = COALESCE($21, height),
                free_shipping       = COALESCE($22, free_shipping),
                status              = COALESCE($23, status),
                is_featured         = COALESCE($24, is_featured),
                is_digital          = COALESCE($25, is_digital),
                meta_title          = COALESCE($26, meta_title),
                meta_description    = COALESCE($27, meta_description),
                updated_at          = NOW()
            WHERE id = $28 AND vendor_id = $29 AND deleted_at IS NULL
            RETURNING *`,
                [
                    category_id ?? null, subcategory_id ?? null, name ?? null, productSlug ?? null,
                    description ?? null, short_description ?? null,
                    brand ?? null, tags ?? null,
                    price ?? null, compare_at_price ?? null,
                    cost_price ?? null, discount ?? null,
                    stock ?? null, low_stock_threshold ?? null,
                    track_inventory ?? null, hasVariants,
                    thumbnailUrl ?? null, weight ?? null,
                    length ?? null, width ?? null,
                    height ?? null, free_shipping ?? null,
                    status ?? null, is_featured ?? null,
                    is_digital ?? null, meta_title ?? null,
                    meta_description ?? null,
                    productId, vendorId
                ]
            );

            const updatedProduct = updatedRows[0];

            // 2. Update images — delete old and insert new
            if (images && images.length > 0) {
                await client.query(
                    `DELETE FROM product_images WHERE product_id = $1`,
                    [productId]
                );
                const imageUrls = await uploadImagesToS3(images, 'products');
                for (let i = 0; i < imageUrls.length; i++) {
                    await client.query(
                        `INSERT INTO product_images (product_id, url, position, is_primary)
                    VALUES ($1, $2, $3, $4)`,
                        [productId, imageUrls[i], i, i === 0]
                    );
                }
            }

            // 3. Update attributes — delete old and insert new
            if (attributes && attributes.length > 0) {
                await client.query(
                    `DELETE FROM product_attributes WHERE product_id = $1`,
                    [productId]
                );
                for (let i = 0; i < attributes.length; i++) {
                    await client.query(
                        `INSERT INTO product_attributes (product_id, name, value, position)
                    VALUES ($1, $2, $3, $4)`,
                        [productId, attributes[i].name, attributes[i].value, i]
                    );
                }
            }

            // 4. Update options and option values — delete old and insert new
            if (options && options.length > 0) {
                await client.query(
                    `DELETE FROM product_options WHERE product_id = $1`,
                    [productId]
                );
                for (let i = 0; i < options.length; i++) {
                    const option = options[i];
                    const { rows: optionRows } = await client.query(
                        `INSERT INTO product_options (product_id, name, position)
                    VALUES ($1, $2, $3) RETURNING id`,
                        [productId, option.name, i]
                    );
                    const optionId = optionRows[0].id;
                    for (let j = 0; j < option.values.length; j++) {
                        await client.query(
                            `INSERT INTO product_option_values (option_id, value, position)
                        VALUES ($1, $2, $3)`,
                            [optionId, option.values[j], j]
                        );
                    }
                }
            }

            // 5. Update variants — delete old and insert new
            if (hasVariants) {
                await client.query(
                    `DELETE FROM product_variants WHERE product_id = $1`,
                    [productId]
                );
                for (const variant of variants) {
                    const variantImageUrl = variant.image
                        ? await uploadBase64ToS3(variant.image, 'products/variants')
                        : null;

                    const { rows: variantRows } = await client.query(
                        `INSERT INTO product_variants (
                        product_id, sku, barcode, price, compare_at_price,
                        cost_price, stock, low_stock_threshold, weight, image
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id`,
                        [
                            productId, variant.sku ?? null,
                            variant.barcode ?? null, variant.price,
                            variant.compare_at_price ?? null,
                            variant.cost_price ?? null, variant.stock,
                            variant.low_stock_threshold ?? 5,
                            variant.weight ?? null, variantImageUrl
                        ]
                    );

                    const variantId = variantRows[0].id;

                    for (const optionValueId of variant.option_values) {
                        await client.query(
                            `INSERT INTO variant_option_values (variant_id, option_value_id)
                        VALUES ($1, $2)`,
                            [variantId, optionValueId]
                        );
                    }
                }
            }

            await client.query('COMMIT');

            return await ProductModel.getProductById(updatedProduct.id);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Error updating product:", error);
            throw error;
        } finally {
            client.release();
        }
    }

    static async search(vendorId, filters = {}) {
        try {
            const {
                q, category_id, brand,
                min_price, max_price,
                in_stock, is_featured, is_digital,
                tags, status,
                sort_by = 'newest',
                offset = 0, limit = 40
            } = filters;

            let paramIndex = 1;
            const whereClauses = [`p.vendor_id = $${paramIndex++}`, `p.deleted_at IS NULL`];
            const values = [vendorId];

            // Full text search
            if (q) {
                whereClauses.push(
                    `(p.name ILIKE $${paramIndex} 
                    OR p.description ILIKE $${paramIndex} 
                    OR p.brand ILIKE $${paramIndex}
                    OR p.short_description ILIKE $${paramIndex})`
                );
                values.push(`%${q}%`);
                paramIndex++;
            }

            // Category filter
            if (category_id) {
                whereClauses.push(`p.category_id = $${paramIndex++}`);
                values.push(category_id);
            }

            // Brand filter
            if (brand) {
                whereClauses.push(`p.brand ILIKE $${paramIndex++}`);
                values.push(`%${brand}%`);
            }

            // Price range
            if (min_price) {
                whereClauses.push(`p.price >= $${paramIndex++}`);
                values.push(min_price);
            }

            if (max_price) {
                whereClauses.push(`p.price <= $${paramIndex++}`);
                values.push(max_price);
            }

            // Stock filter
            if (in_stock === true) {
                whereClauses.push(`p.stock > 0`);
            } else if (in_stock === false) {
                whereClauses.push(`p.stock = 0`);
            }

            // Featured filter
            if (is_featured !== undefined) {
                whereClauses.push(`p.is_featured = $${paramIndex++}`);
                values.push(is_featured);
            }

            // Digital filter
            if (is_digital !== undefined) {
                whereClauses.push(`p.is_digital = $${paramIndex++}`);
                values.push(is_digital);
            }

            // Tags filter
            if (tags && tags.length > 0) {
                whereClauses.push(`p.tags && $${paramIndex++}::text[]`);
                values.push(tags);
            }

            // Status filter
            if (status) {
                whereClauses.push(`p.status = $${paramIndex++}`);
                values.push(status);
            } else {
                // Default to active for customers
                whereClauses.push(`p.status = 'active'`);
            }

            // Sort
            const sortOptions = {
                price_asc: 'p.price ASC',
                price_desc: 'p.price DESC',
                newest: 'p.created_at DESC',
                oldest: 'p.created_at ASC',
                popular: 'total_sold DESC NULLS LAST',
                rating: 'avg_rating DESC NULLS LAST'
            };

            const orderBy = sortOptions[sort_by] ?? sortOptions.newest;

            const query = `
                SELECT
                    p.id, p.name, p.slug, p.thumbnail,
                    p.price, p.compare_at_price, p.discount,
                    p.stock, p.brand, p.tags,
                    p.is_featured, p.is_digital,
                    p.status, p.created_at,
                    c.name AS category,

                    -- Ratings
                    ROUND(AVG(pr.rating), 1)    AS avg_rating,
                    COUNT(DISTINCT pr.id)        AS review_count,

                    -- Sales
                    COALESCE(SUM(oi.quantity), 0) AS total_sold,

                    -- Images
                    json_agg(DISTINCT jsonb_build_object(
                        'id', pi.id,
                        'url', pi.url,
                        'is_primary', pi.is_primary
                    )) FILTER (WHERE pi.id IS NOT NULL) AS images
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN product_images pi ON pi.product_id = p.id
                LEFT JOIN product_reviews pr ON pr.product_id = p.id AND pr.status = 'approved'
                LEFT JOIN order_items oi ON oi.product_id = p.id
                WHERE ${whereClauses.join(' AND ')}
                GROUP BY p.id, c.id
                ORDER BY ${orderBy}
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;

            values.push(limit, offset);

            const { rows } = await pool.query(query, values);

            // Get total count for pagination
            const countQuery = `
                SELECT COUNT(DISTINCT p.id) AS total
                FROM products p
                WHERE ${whereClauses.join(' AND ')}
            `;

            const { rows: countRows } = await pool.query(countQuery, values.slice(0, -2));

            return {
                products: rows,
                pagination: {
                    total: parseInt(countRows[0].total),
                    offset,
                    limit,
                    has_more: offset + limit < parseInt(countRows[0].total)
                }
            };
        } catch (error) {
            console.error("Error searching products:", error);
            throw error;
        }
    }

    // ─── GET FILTERS (for frontend filter UI) ─────────
    static async getFilters(vendorId) {
        try {
            const { rows } = await pool.query(
                `SELECT
                    -- Price range
                    MIN(p.price)                                    AS min_price,
                    MAX(p.price)                                    AS max_price,

                    -- Brands
                    array_agg(DISTINCT p.brand) 
                        FILTER (WHERE p.brand IS NOT NULL)          AS brands,

                    -- Tags
                    array_agg(DISTINCT tag)
                        FILTER (WHERE tag IS NOT NULL)              AS tags,

                    -- Categories
                    json_agg(DISTINCT jsonb_build_object(
                        'id', c.id,
                        'name', c.name
                    )) FILTER (WHERE c.id IS NOT NULL)              AS categories
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN LATERAL unnest(p.tags) AS tag ON true
                WHERE p.vendor_id = $1
                AND p.status = 'active'
                AND p.deleted_at IS NULL`,
                [vendorId]
            );

            return rows[0];
        } catch (error) {
            console.error("Error fetching filters:", error);
            throw error;
        }
    }

    // ─── GET RELATED PRODUCTS ──────────────────────────
    static async getRelatedProducts(productId, vendorId, limit = 8) {
        try {
            // Get current product's category and tags
            const { rows: productRows } = await pool.query(
                `SELECT category_id, tags FROM products WHERE id = $1`,
                [productId]
            );

            if (productRows.length === 0) return [];

            const { category_id, tags } = productRows[0];

            const { rows } = await pool.query(
                `SELECT
                    p.id, p.name, p.slug, p.thumbnail,
                    p.price, p.compare_at_price, p.discount,
                    p.stock, p.is_featured,
                    ROUND(AVG(pr.rating), 1) AS avg_rating,
                    COUNT(DISTINCT pr.id) AS review_count
                FROM products p
                LEFT JOIN product_reviews pr ON pr.product_id = p.id AND pr.status = 'approved'
                WHERE p.vendor_id = $1
                AND p.id != $2
                AND p.status = 'active'
                AND p.deleted_at IS NULL
                AND (
                    p.category_id = $3
                    OR p.tags && $4::text[]
                )
                GROUP BY p.id
                ORDER BY
                    CASE WHEN p.category_id = $3 THEN 0 ELSE 1 END,
                    p.created_at DESC
                LIMIT $5`,
                [vendorId, productId, category_id, tags ?? [], limit]
            );

            return rows;
        } catch (error) {
            console.error("Error fetching related products:", error);
            throw error;
        }
    }

    // ─── GET FEATURED PRODUCTS ─────────────────────────
    static async getFeaturedProducts(vendorId, limit = 10) {
        try {
            const { rows } = await pool.query(
                `SELECT
                    p.id, p.name, p.slug, p.thumbnail,
                    p.price, p.compare_at_price, p.discount,
                    p.stock, p.is_featured,
                    ROUND(AVG(pr.rating), 1) AS avg_rating,
                    COUNT(DISTINCT pr.id) AS review_count,
                    json_agg(DISTINCT jsonb_build_object(
                        'url', pi.url,
                        'is_primary', pi.is_primary
                    )) FILTER (WHERE pi.id IS NOT NULL) AS images
                FROM products p
                LEFT JOIN product_reviews pr ON pr.product_id = p.id AND pr.status = 'approved'
                LEFT JOIN product_images pi ON pi.product_id = p.id
                WHERE p.vendor_id = $1
                AND p.is_featured = true
                AND p.status = 'active'
                AND p.deleted_at IS NULL
                GROUP BY p.id
                ORDER BY p.created_at DESC
                LIMIT $2`,
                [vendorId, limit]
            );

            return rows;
        } catch (error) {
            console.error("Error fetching featured products:", error);
            throw error;
        }
    }
}

export default Product;