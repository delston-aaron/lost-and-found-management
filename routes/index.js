// routes/index.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Import the database connection pool promise

console.log("[ROUTES] index.js loaded.");

// --- GET Home Page ---
router.get('/', (req, res) => {
    console.log("[ROUTES] Request received for GET /");

    // --- CHANGE IS HERE ---
    // Instead of sending text, render the 'home.ejs' view.
    // Pass an object with data for the template (here, the 'title').
    res.render('home', { title: 'Welcome - Lost & Found' });
    // --- END OF CHANGE ---

    // Original line (now removed or commented out):
    // res.send("Welcome message from routes/index.js!");
});

// --- Add more routes here later (e.g., /report-lost, /found-items) ---

// Example: Test route for DB query (Keep this for now)
router.get('/testdb', async (req, res, next) => {
    console.log("[ROUTES] Request received for GET /testdb");
    try {
        // Simple query to test connection
        const [results, fields] = await db.query('SELECT 1 + 1 AS solution');
        console.log("[ROUTES] DB Query Result:", results);
        res.json({ message: 'DB connection test successful!', result: results[0].solution });
    } catch (err) {
        console.error("[ROUTES] Error querying database:", err);
        // Pass the error to the general error handler in server.js
        next(err);
    }
});

// routes/index.js

// ... (keep existing require statements, router setup, / and /testdb routes) ...


// --- Route to SHOW the report lost item form ---
router.get('/report-lost', (req, res) => {
    console.log("[ROUTES] Request received for GET /report-lost");
    // Render the report_lost.ejs view
    res.render('report_lost', { title: 'Report a Lost Item' });
});

// --- Route to HANDLE the lost item form submission ---
router.post('/report-lost', async (req, res, next) => {
    console.log("[ROUTES] Request received for POST /report-lost");
    // Extract data from the submitted form (req.body)
    const { item_name, category, description, lost_date, lost_location } = req.body;

    // *** Basic Input Validation (Add more robust validation later) ***
    if (!item_name || !category || !lost_date || !lost_location) {
        // If required fields are missing, re-render the form with an error message
        console.error("[ROUTES] Missing required fields for lost item.");
        return res.status(400).render('report_lost', {
            title: 'Report a Lost Item',
            error: 'Please fill out all required fields.',
            // Optionally pass back entered values to repopulate form:
            // formData: req.body
        });
    }

    // TODO: Get actual user ID from authentication later. For now, use a placeholder.
    const userId = 1; // Hardcoded user ID 1 (assuming user ID 1 exists in your 'users' table)

    const status = 'Reported'; // Default status for new lost items

    try {
        console.log("[ROUTES] Attempting to insert lost item into database...");
        const sql = `INSERT INTO lost_items
                     (user_id, item_name, category, description, lost_date, lost_location, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [
            userId,
            item_name,
            category,
            description,
            lost_date,
            lost_location,
            status
        ]);

        console.log(`[ROUTES] Lost item inserted successfully. Insert ID: ${result.insertId}`);

        // Redirect to a confirmation page or the list of lost items
        // For now, redirect back to the home page with a success indicator (optional)
        res.redirect('/?reported=lost_success'); // Redirect to home page

        // Later, you might redirect to a specific "view lost items" page:
        // res.redirect('/lost-items');

    } catch (err) {
        console.error("[ROUTES] Error inserting lost item into database:", err);
        // Pass error to the general error handler
        next(err);
        // OR render the form again with a database error message:
        // return res.status(500).render('report_lost', {
        //     title: 'Report a Lost Item',
        //     error: 'Database error. Could not save report. Please try again.',
        //     formData: req.body
        // });
    }
});

// routes/index.js

// ... (keep existing require statements, router setup, /, /testdb, GET/POST /report-lost routes) ...


// --- Route to SHOW the report found item form ---
router.get('/report-found', (req, res) => {
    console.log("[ROUTES] Request received for GET /report-found");
    // Render the report_found.ejs view
    res.render('report_found', { title: 'Report a Found Item' });
});

// --- Route to HANDLE the found item form submission ---
router.post('/report-found', async (req, res, next) => {
    console.log("[ROUTES] Request received for POST /report-found");
    // Extract data from the submitted form (req.body)
    const { item_name, category, description, found_date, found_location } = req.body;

    // *** Basic Input Validation (Add more robust validation later) ***
    if (!item_name || !category || !found_date || !found_location) {
        console.error("[ROUTES] Missing required fields for found item.");
        return res.status(400).render('report_found', {
            title: 'Report a Found Item',
            error: 'Please fill out all required fields.',
            // formData: req.body // Optional: repopulate form
        });
    }

    // TODO: Get actual user ID from authentication later. For now, use a placeholder.
    const userId = 2; // Hardcoded user ID 2 (assuming user ID 2 exists, or use 1)

    // Default status for new found items (based on your schema definition)
    const status = 'Available';

    try {
        console.log("[ROUTES] Attempting to insert found item into database...");
        const sql = `INSERT INTO found_item
                     (user_id, item_name, category, description, found_date, found_location, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [
            userId,
            item_name,
            category,
            description,
            found_date,
            found_location,
            status
        ]);

        console.log(`[ROUTES] Found item inserted successfully. Insert ID: ${result.insertId}`);

        // Redirect to a confirmation page or the list of found items
        res.redirect('/?reported=found_success'); // Redirect back to home page for now

        // Later, redirect to view found items:
        // res.redirect('/found-items');

    } catch (err) {
        console.error("[ROUTES] Error inserting found item into database:", err);
        next(err); // Pass to general error handler
    }
});

// routes/index.js

// ... (keep existing requires, router setup, /, /testdb, GET/POST report routes) ...

// --- Route to display FOUND items ---
router.get('/found-items', async (req, res, next) => {
    console.log("[ROUTES] Request received for GET /found-items");
    try {
        // Query to select found items that are currently available
        // Modify the WHERE clause based on the statuses you consider 'claimable'
        const sql = `SELECT
                        found_id, item_name, category, description,
                        found_date, found_location, status, reported_at
                     FROM found_item
                     WHERE status = 'Available' OR status = 'Claim Pending'
                     ORDER BY reported_at DESC`; // Show newest first

        const [foundItems] = await db.query(sql);
        console.log(`[ROUTES] Found ${foundItems.length} available found items.`);

        // Render the list_items view, passing the data and type
        res.render('list_items', {
            title: 'Available Found Items', // Title for the page
            items: foundItems,            // The array of items from the DB
            type: 'found'                 // Identifier for the template logic
        });

    } catch (err) {
        console.error("[ROUTES] Error fetching found items:", err);
        next(err); // Pass error to handler
    }
});

// routes/index.js

// ... (keep existing requires, router setup, other routes) ...

// --- Route to handle a claim submission for a found item ---
router.post('/claim/:found_id', async (req, res, next) => {
    // Extract found_id from the URL parameter
    const { found_id } = req.params;
    // Convert found_id to integer, just in case
    const foundIdInt = parseInt(found_id, 10);

    console.log(`[ROUTES] Request received for POST /claim/${foundIdInt}`);

    // Input validation for found_id
    if (isNaN(foundIdInt) || foundIdInt <= 0) {
        console.error("[ROUTES] Invalid found_id received for claim.");
        // Send a user-friendly error - maybe redirect back with an error message
        return res.status(400).send("Invalid item ID provided.");
    }

    // TODO: Get actual user ID from authentication later.
    // Assuming the user making the claim is user ID 1 for now.
    // Make sure user ID 1 exists in your 'users' table.
    const claimingUserId = 1;

    try {
        console.log(`[ROUTES] Checking status of found_item with ID: ${foundIdInt}`);
        // --- Check 1: Ensure the item exists and is actually available ---
        const [itemCheck] = await db.query(
            "SELECT status FROM found_item WHERE found_id = ?",
            [foundIdInt]
        );

        if (itemCheck.length === 0) {
            console.warn(`[ROUTES] Claim attempt failed: Item ${foundIdInt} not found.`);
            return res.status(404).send("Item not found.");
        }
        if (itemCheck[0].status !== 'Available') {
            console.warn(`[ROUTES] Claim attempt failed: Item ${foundIdInt} is not Available (Status: ${itemCheck[0].status}).`);
            // Maybe redirect back with a message?
            return res.status(400).send(`This item is no longer available for claiming (Status: ${itemCheck[0].status}).`);
        }

        // --- Check 2 (Optional but Recommended): Prevent duplicate claims by same user ---
        // This assumes you added a UNIQUE constraint on (user_id, found_id) in claim_requests table
        // If you didn't add the constraint, this check is still good practice.
        const [existingClaim] = await db.query(
            "SELECT claim_id FROM claim_requests WHERE user_id = ? AND found_id = ?",
            [claimingUserId, foundIdInt]
        );

        if (existingClaim.length > 0) {
            console.warn(`[ROUTES] Duplicate claim attempt by user ${claimingUserId} for item ${foundIdInt}.`);
            // Redirect back with a message telling the user they already claimed it
            return res.redirect('/found-items?claim_status=already_claimed'); // Redirect back to list
        }


        // --- Insert the claim request ---
        // Status defaults to 'pending' based on table definition
        console.log(`[ROUTES] Inserting claim request for item ${foundIdInt} by user ${claimingUserId}.`);
        const insertSql = `INSERT INTO claim_requests (user_id, found_id) VALUES (?, ?)`;
        const [result] = await db.query(insertSql, [claimingUserId, foundIdInt]);

        console.log(`[ROUTES] Claim request inserted successfully. Claim ID: ${result.insertId}`);

        // --- Optional: Update found_item status to 'Claim Pending' ---
        // This prevents others from claiming while this one is reviewed.
        // You could also handle this with a trigger if preferred.
        console.log(`[ROUTES] Updating status of found_item ${foundIdInt} to 'Claim Pending'.`);
        await db.query(
            "UPDATE found_item SET status = 'Claim Pending' WHERE found_id = ?",
            [foundIdInt]
        );
        console.log(`[ROUTES] Status updated for item ${foundIdInt}.`);
        // --- End Optional Status Update ---


        // Redirect back to the found items list with a success message
        res.redirect('/found-items?claim_status=success');


    } catch (err) {
        console.error("[ROUTES] Error processing claim request:", err);
        // Handle specific errors if needed (e.g., ER_DUP_ENTRY if unique constraint exists and the check above failed)
        if (err.code === 'ER_DUP_ENTRY') {
             console.warn(`[ROUTES] Database prevented duplicate claim for user ${claimingUserId} / item ${foundIdInt}.`);
             return res.redirect('/found-items?claim_status=already_claimed');
        }
        next(err); // Pass other errors to the general handler
    }
});

// routes/index.js

// ... (keep existing requires, router setup, other routes) ...

// --- Route to display LOST items ---
router.get('/lost-items', async (req, res, next) => {
    console.log("[ROUTES] Request received for GET /lost-items");
    try {
        // Query to select lost items that haven't been resolved yet
        // Adjust the WHERE clause based on your final status workflow
        const sql = `SELECT
                        item_id, item_name, category, description,
                        lost_date, lost_location, status, reported_at
                     FROM lost_items
                     WHERE status IS NULL OR status NOT IN ('Matched', 'Returned', 'Found', 'Closed') -- Example filter
                     ORDER BY reported_at DESC`; // Show newest first

        const [lostItems] = await db.query(sql);
        console.log(`[ROUTES] Found ${lostItems.length} active lost items.`);

        // Render the SAME list_items view, but pass 'lost' as the type
        res.render('list_items', {
            title: 'Reported Lost Items', // Title for the page
            items: lostItems,           // The array of items from the DB
            type: 'lost'                // Identifier for the template logic
        });

    } catch (err) {
        console.error("[ROUTES] Error fetching lost items:", err);
        next(err); // Pass error to handler
    }
});
// routes/index.js

// ... (keep existing requires, router setup, other routes) ...

// --- Route to display LOST items ---
router.get('/lost-items', async (req, res, next) => {
    console.log("[ROUTES] Request received for GET /lost-items");
    try {
        // Query to select lost items that haven't been resolved yet
        // Adjust the WHERE clause based on your final status workflow
        const sql = `SELECT
                        item_id, item_name, category, description,
                        lost_date, lost_location, status, reported_at
                     FROM lost_items
                     WHERE status IS NULL OR status NOT IN ('Matched', 'Returned', 'Found', 'Closed') -- Example filter
                     ORDER BY reported_at DESC`; // Show newest first

        const [lostItems] = await db.query(sql);
        console.log(`[ROUTES] Found ${lostItems.length} active lost items.`);

        // Render the SAME list_items view, but pass 'lost' as the type
        res.render('list_items', {
            title: 'Reported Lost Items', // Title for the page
            items: lostItems,           // The array of items from the DB
            type: 'lost'                // Identifier for the template logic
        });

    } catch (err) {
        console.error("[ROUTES] Error fetching lost items:", err);
        next(err); // Pass error to handler
    }
});

// routes/index.js

// ... (keep existing requires, router setup, other routes) ...


// --- ADMIN SECTION ---

// Route to display pending claims for admin review
router.get('/admin/claims', async (req, res, next) => {
    console.log("[ROUTES] Request received for GET /admin/claims");
    try {
        // Query to get pending claims JOINED with user and item info
        const sql = `
            SELECT
                cr.claim_id, cr.requested_at, cr.status AS claim_status,
                u.user_id, u.name AS claimant_name, u.email AS claimant_email,
                fi.found_id, fi.item_name, fi.status AS item_status
            FROM claim_requests cr
            LEFT JOIN users u ON cr.user_id = u.user_id         -- LEFT JOIN in case user was deleted but claim remains
            LEFT JOIN found_item fi ON cr.found_id = fi.found_id -- LEFT JOIN in case item was deleted
            WHERE cr.status = 'pending' -- Only show pending claims
            ORDER BY cr.requested_at ASC -- Show oldest first
        `;
        // If you want to show ALL claims (pending, approved, rejected), remove the WHERE clause

        const [claims] = await db.query(sql);
        console.log(`[ROUTES] Found ${claims.length} pending claims.`);

        // Render the admin claims view
        res.render('admin_claims', {
            title: 'Admin - Manage Claims',
            claims: claims // Pass the array of claim objects
        });

    } catch (err) {
        console.error("[ROUTES][Admin] Error fetching claims:", err);
        next(err); // Pass error to handler
    }
});

// --- Add this entire block ---

// Route to handle approving or rejecting a claim
router.post('/admin/claims/update/:claim_id', async (req, res, next) => {
    const { claim_id } = req.params;
    const { action } = req.body; // Expect 'approve' or 'reject' from hidden input

    const claimIdInt = parseInt(claim_id, 10);

    console.log(`[ROUTES][Admin] Request received to ${action} claim ID: ${claimIdInt}`);

    // Basic validation
    if (isNaN(claimIdInt) || claimIdInt <= 0) {
        return res.status(400).send("Invalid claim ID.");
    }
    if (action !== 'approve' && action !== 'reject') {
         return res.status(400).send("Invalid action.");
    }

    let newStatus;
    if (action === 'approve') {
        newStatus = 'Approved';
    } else { // action === 'reject'
        newStatus = 'Rejected';
    }

    try {
        // --- Update the claim_requests table ---
        // This UPDATE will trigger 'trg_after_claim_update' in the database
        const updateSql = "UPDATE claim_requests SET status = ? WHERE claim_id = ? AND status = 'pending'"; // Only update if still pending
        const [result] = await db.query(updateSql, [newStatus, claimIdInt]);

        if (result.affectedRows > 0) {
            console.log(`[ROUTES][Admin] Claim ${claimIdInt} status updated to ${newStatus}. Trigger should handle item status.`);

            // Rely on the trigger to update found_item status
            // If trigger fails, you might need manual updates here later

        } else {
            // Claim might have already been processed, or didn't exist
            console.warn(`[ROUTES][Admin] Claim ${claimIdInt} not updated. It might not exist or was not in 'pending' status.`);
        }

        // Redirect back to the admin claims list
        res.redirect('/admin/claims');

    } catch (err) {
        console.error(`[ROUTES][Admin] Error updating claim ${claimIdInt}:`, err);
        next(err);
    }
});

// --- End of block to add ---

// routes/index.js

// ... (other requires, routes, GET/POST admin/claims routes) ...

// Route to display items currently in escrow
router.get('/admin/escrow', async (req, res, next) => {
    console.log("[ROUTES][Admin] Request received for GET /admin/escrow");
    try {
        // Query to get escrow items JOINED with details
        // We need claimant info, which might require joining through claim_requests
        const sql = `
            SELECT
                e.escrow_id, e.status AS escrow_status, e.claimed_at AS entered_escrow_at, e.released_at,
                fi.found_id, fi.item_name,
                u.name AS claimant_name -- Get claimant name via approved claim
            FROM escrow e
            JOIN found_item fi ON e.found_id = fi.found_id
            -- Find the approved claim for this found_id to get the user
            LEFT JOIN claim_requests cr ON fi.found_id = cr.found_id AND cr.status = 'Approved'
            LEFT JOIN users u ON cr.user_id = u.user_id
            WHERE e.status = 'Holding' -- Or maybe show all statuses? ('Holding', 'Released')
            ORDER BY e.claimed_at DESC
        `;
         // Adjust WHERE clause if you want to see released items too

        const [escrowItems] = await db.query(sql);
        console.log(`[ROUTES][Admin] Found ${escrowItems.length} items in escrow.`);

        // Render the admin escrow view
        res.render('admin_escrow', {
            title: 'Admin - Escrow Management',
            escrowItems: escrowItems
        });

    } catch (err) {
        console.error("[ROUTES][Admin] Error fetching escrow items:", err);
        next(err);
    }
});

// routes/index.js

// ... (other requires, routes, GET /admin/escrow route) ...

// Route to handle releasing an item from escrow
router.post('/admin/escrow/release/:escrow_id', async (req, res, next) => {
    const { escrow_id } = req.params;
    const escrowIdInt = parseInt(escrow_id, 10);

    console.log(`[ROUTES][Admin] Request received to release escrow ID: ${escrowIdInt}`);

    if (isNaN(escrowIdInt) || escrowIdInt <= 0) {
        return res.status(400).send("Invalid escrow ID.");
    }

    try {
        // Update escrow status to 'Released' and set release timestamp
        const updateSql = `UPDATE escrow
                           SET status = 'Released', released_at = NOW()
                           WHERE escrow_id = ? AND status = 'Holding'`; // Only update if currently Holding
        const [result] = await db.query(updateSql, [escrowIdInt]);

        if (result.affectedRows > 0) {
            console.log(`[ROUTES][Admin] Escrow item ${escrowIdInt} marked as Released.`);
            // Optional: Update the corresponding found_item status as well? e.g., to 'Returned'
            // const [escrowData] = await db.query("SELECT found_id FROM escrow WHERE escrow_id = ?", [escrowIdInt]);
            // if (escrowData.length > 0) {
            //     await db.query("UPDATE found_item SET status = 'Returned' WHERE found_id = ?", [escrowData[0].found_id]);
            // }
        } else {
            console.warn(`[ROUTES][Admin] Escrow item ${escrowIdInt} not updated. May not exist or was not 'Holding'.`);
        }

        // Redirect back to the escrow list
        res.redirect('/admin/escrow');

    } catch (err) {
        console.error(`[ROUTES][Admin] Error releasing escrow item ${escrowIdInt}:`, err);
        next(err);
    }
});


module.exports = router; // Export the router object