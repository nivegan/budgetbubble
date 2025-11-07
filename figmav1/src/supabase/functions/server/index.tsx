import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

/**
 * Error codes for structured error handling
 */
const ERROR_CODES = {
  // Auth Errors (1000-1999)
  E1001: "Authentication failed: Invalid credentials",
  E1002: "Authentication required: Please log in",
  E1003: "User already exists with this email",
  
  // Household Errors (2000-2999)
  E2001: "Household not found",
  E2002: "User is already part of a household",
  E2003: "Cannot remove last member from household",
  E2004: "Member not found in household",
  
  // Transaction Errors (3000-3999)
  E3001: "Transaction not found",
  E3002: "Invalid transaction data",
  E3003: "Duplicate transaction detected",
  
  // Data Ingestion Errors (4000-4999)
  E4001: "File upload failed: Invalid file type",
  E4002: "File upload failed: Required columns missing",
  E4003: "Template not found",
  E4004: "Failed to parse transaction row",
  
  // Goal Errors (5000-5999)
  E5001: "Goal not found",
  E5002: "Invalid goal data",
};

/**
 * Helper function to create Supabase client with service role
 */
function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

/**
 * Helper function to authenticate user from request
 * @returns User ID if authenticated, null otherwise
 */
async function authenticateUser(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  const accessToken = authHeader.split(' ')[1];
  if (!accessToken) return null;
  
  const supabase = createServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    console.log(`Auth error: ${error?.message || 'No user found'}`);
    return null;
  }
  
  return user.id;
}

// Health check endpoint
app.get("/make-server-ecf79a0e/health", (c) => {
  return c.json({ status: "ok" });
});

/**
 * User signup endpoint
 * Creates a new user account with email confirmation auto-enabled
 */
app.post("/make-server-ecf79a0e/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    
    const supabase = createServiceClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured
      email_confirm: true
    });
    
    if (error) {
      console.log(`Signup error: ${error.message}`);
      if (error.message.includes('already registered')) {
        return c.json({ error: ERROR_CODES.E1003, code: 'E1003' }, 400);
      }
      return c.json({ error: `Signup failed: ${error.message}` }, 400);
    }
    
    // Create user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      createdAt: new Date().toISOString(),
    });
    
    return c.json({ 
      success: true, 
      userId: data.user.id,
      message: "Account created successfully" 
    });
  } catch (error) {
    console.log(`Signup exception: ${error}`);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

/**
 * Get user profile
 */
app.get("/make-server-ecf79a0e/user/profile", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: "User profile not found" }, 404);
    }
    
    return c.json({ user });
  } catch (error) {
    console.log(`Get profile error: ${error}`);
    return c.json({ error: "Failed to fetch user profile" }, 500);
  }
});

/**
 * Update user profile
 */
app.put("/make-server-ecf79a0e/user/profile", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const { name } = await c.req.json();
    const user = await kv.get(`user:${userId}`);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const updatedUser = { ...user, name, updatedAt: new Date().toISOString() };
    await kv.set(`user:${userId}`, updatedUser);
    
    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.log(`Update profile error: ${error}`);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

/**
 * Create a new household
 */
app.post("/make-server-ecf79a0e/households", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const { name, currency = 'USD' } = await c.req.json();
    
    if (!name) {
      return c.json({ error: "Household name is required" }, 400);
    }
    
    // Check if user is already in a household
    const userHouseholds = await kv.getByPrefix(`household_member:${userId}:`);
    if (userHouseholds && userHouseholds.length > 0) {
      return c.json({ error: ERROR_CODES.E2002, code: 'E2002' }, 400);
    }
    
    const householdId = crypto.randomUUID();
    const household = {
      id: householdId,
      name,
      currency,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      memberIds: [userId],
    };
    
    await kv.set(`household:${householdId}`, household);
    await kv.set(`household_member:${userId}:${householdId}`, { 
      userId, 
      householdId, 
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });
    
    return c.json({ success: true, household });
  } catch (error) {
    console.log(`Create household error: ${error}`);
    return c.json({ error: "Failed to create household" }, 500);
  }
});

/**
 * Get user's household
 */
app.get("/make-server-ecf79a0e/households/my", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const memberships = await kv.getByPrefix(`household_member:${userId}:`);
    
    if (!memberships || memberships.length === 0) {
      return c.json({ household: null });
    }
    
    const householdId = memberships[0].householdId;
    const household = await kv.get(`household:${householdId}`);
    
    if (!household) {
      return c.json({ error: ERROR_CODES.E2001, code: 'E2001' }, 404);
    }
    
    // Get all member details
    const memberDetails = await Promise.all(
      household.memberIds.map(async (memberId: string) => {
        const member = await kv.get(`user:${memberId}`);
        return member;
      })
    );
    
    return c.json({ household: { ...household, members: memberDetails } });
  } catch (error) {
    console.log(`Get household error: ${error}`);
    return c.json({ error: "Failed to fetch household" }, 500);
  }
});

/**
 * Add member to household (invite)
 */
app.post("/make-server-ecf79a0e/households/:id/members", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const householdId = c.req.param('id');
    const { email } = await c.req.json();
    
    const household = await kv.get(`household:${householdId}`);
    if (!household) {
      return c.json({ error: ERROR_CODES.E2001, code: 'E2001' }, 404);
    }
    
    // Find user by email
    const allUsers = await kv.getByPrefix('user:');
    const invitedUser = allUsers.find((u: any) => u.email === email);
    
    if (!invitedUser) {
      return c.json({ error: "User not found with this email" }, 404);
    }
    
    // Check if user is already in a household
    const userHouseholds = await kv.getByPrefix(`household_member:${invitedUser.id}:`);
    if (userHouseholds && userHouseholds.length > 0) {
      return c.json({ error: ERROR_CODES.E2002, code: 'E2002' }, 400);
    }
    
    // Add member
    household.memberIds.push(invitedUser.id);
    await kv.set(`household:${householdId}`, household);
    await kv.set(`household_member:${invitedUser.id}:${householdId}`, {
      userId: invitedUser.id,
      householdId,
      role: 'member',
      joinedAt: new Date().toISOString(),
    });
    
    return c.json({ success: true, message: "Member added successfully" });
  } catch (error) {
    console.log(`Add member error: ${error}`);
    return c.json({ error: "Failed to add member" }, 500);
  }
});

/**
 * Remove member from household
 */
app.delete("/make-server-ecf79a0e/households/:id/members/:memberId", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const householdId = c.req.param('id');
    const memberId = c.req.param('memberId');
    
    const household = await kv.get(`household:${householdId}`);
    if (!household) {
      return c.json({ error: ERROR_CODES.E2001, code: 'E2001' }, 404);
    }
    
    if (household.memberIds.length === 1) {
      return c.json({ error: ERROR_CODES.E2003, code: 'E2003' }, 400);
    }
    
    household.memberIds = household.memberIds.filter((id: string) => id !== memberId);
    await kv.set(`household:${householdId}`, household);
    await kv.del(`household_member:${memberId}:${householdId}`);
    
    return c.json({ success: true, message: "Member removed successfully" });
  } catch (error) {
    console.log(`Remove member error: ${error}`);
    return c.json({ error: "Failed to remove member" }, 500);
  }
});

/**
 * Get all transactions for a household
 */
app.get("/make-server-ecf79a0e/transactions", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const { householdId, personalView } = c.req.query();
    
    let transactions;
    if (personalView === 'true') {
      transactions = await kv.getByPrefix(`transaction:personal:${userId}:`);
    } else if (householdId) {
      transactions = await kv.getByPrefix(`transaction:household:${householdId}:`);
    } else {
      return c.json({ error: "householdId or personalView required" }, 400);
    }
    
    return c.json({ transactions: transactions || [] });
  } catch (error) {
    console.log(`Get transactions error: ${error}`);
    return c.json({ error: "Failed to fetch transactions" }, 500);
  }
});

/**
 * Create a new transaction manually
 */
app.post("/make-server-ecf79a0e/transactions", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const transactionData = await c.req.json();
    const { householdId, date, description, amount, type, category, personalView } = transactionData;
    
    if (!date || !description || !amount || !type) {
      return c.json({ error: ERROR_CODES.E3002, code: 'E3002' }, 400);
    }
    
    const transactionId = crypto.randomUUID();
    const transaction = {
      id: transactionId,
      date,
      description,
      amount: parseFloat(amount),
      type, // 'income' or 'expense'
      category: category || 'Uncategorized',
      householdId: personalView ? null : householdId,
      userId: personalView ? userId : null,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    
    const key = personalView 
      ? `transaction:personal:${userId}:${transactionId}`
      : `transaction:household:${householdId}:${transactionId}`;
    
    await kv.set(key, transaction);
    
    return c.json({ success: true, transaction });
  } catch (error) {
    console.log(`Create transaction error: ${error}`);
    return c.json({ error: "Failed to create transaction" }, 500);
  }
});

/**
 * Update a transaction
 */
app.put("/make-server-ecf79a0e/transactions/:id", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const transactionId = c.req.param('id');
    const updates = await c.req.json();
    const { householdId, personalView } = updates;
    
    const key = personalView 
      ? `transaction:personal:${userId}:${transactionId}`
      : `transaction:household:${householdId}:${transactionId}`;
    
    const transaction = await kv.get(key);
    if (!transaction) {
      return c.json({ error: ERROR_CODES.E3001, code: 'E3001' }, 404);
    }
    
    const updatedTransaction = {
      ...transaction,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(key, updatedTransaction);
    
    return c.json({ success: true, transaction: updatedTransaction });
  } catch (error) {
    console.log(`Update transaction error: ${error}`);
    return c.json({ error: "Failed to update transaction" }, 500);
  }
});

/**
 * Delete a transaction
 */
app.delete("/make-server-ecf79a0e/transactions/:id", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const transactionId = c.req.param('id');
    const { householdId, personalView } = c.req.query();
    
    const key = personalView === 'true'
      ? `transaction:personal:${userId}:${transactionId}`
      : `transaction:household:${householdId}:${transactionId}`;
    
    await kv.del(key);
    
    return c.json({ success: true, message: "Transaction deleted" });
  } catch (error) {
    console.log(`Delete transaction error: ${error}`);
    return c.json({ error: "Failed to delete transaction" }, 500);
  }
});

/**
 * Save a column mapping template
 */
app.post("/make-server-ecf79a0e/templates", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const { name, mapping, skipRows } = await c.req.json();
    
    if (!name || !mapping) {
      return c.json({ error: "Template name and mapping are required" }, 400);
    }
    
    const templateId = crypto.randomUUID();
    const template = {
      id: templateId,
      name,
      mapping,
      skipRows: skipRows || 0,
      userId,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`template:${userId}:${templateId}`, template);
    
    return c.json({ success: true, template });
  } catch (error) {
    console.log(`Save template error: ${error}`);
    return c.json({ error: "Failed to save template" }, 500);
  }
});

/**
 * Get all templates for a user
 */
app.get("/make-server-ecf79a0e/templates", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const templates = await kv.getByPrefix(`template:${userId}:`);
    return c.json({ templates: templates || [] });
  } catch (error) {
    console.log(`Get templates error: ${error}`);
    return c.json({ error: "Failed to fetch templates" }, 500);
  }
});

/**
 * Process uploaded CSV file with column mapping
 */
app.post("/make-server-ecf79a0e/transactions/upload", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const householdId = formData.get('householdId') as string;
    const personalView = formData.get('personalView') === 'true';
    const mappingStr = formData.get('mapping') as string;
    const skipRows = parseInt(formData.get('skipRows') as string || '0');
    
    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }
    
    if (!mappingStr) {
      return c.json({ error: "Column mapping is required" }, 400);
    }
    
    const mapping = JSON.parse(mappingStr);
    const fileText = await file.text();
    const lines = fileText.split('\n').slice(skipRows); // Skip header rows
    
    // Detect delimiter (CSV uses comma, TSV/Excel uses tab)
    const delimiter = lines[0] && lines[0].includes('\t') ? '\t' : ',';
    
    const successfulTransactions = [];
    const failedRows = [];
    
    // Process each row
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        
        // Extract values based on mapping
        const date = values[mapping.date];
        const description = values[mapping.description];
        const withdrawal = values[mapping.withdrawal] ? parseFloat(values[mapping.withdrawal]) : 0;
        const deposit = values[mapping.deposit] ? parseFloat(values[mapping.deposit]) : 0;
        
        if (!date || isNaN(new Date(date).getTime())) {
          throw new Error("Invalid date format");
        }
        
        if (isNaN(withdrawal) && isNaN(deposit)) {
          throw new Error("Invalid amount");
        }
        
        const amount = withdrawal > 0 ? withdrawal : deposit;
        const type = withdrawal > 0 ? 'expense' : 'income';
        
        // Check for duplicates
        const existingTransactions = personalView
          ? await kv.getByPrefix(`transaction:personal:${userId}:`)
          : await kv.getByPrefix(`transaction:household:${householdId}:`);
        
        const isDuplicate = existingTransactions?.some((t: any) => 
          t.date === date && 
          t.description === description && 
          Math.abs(t.amount - amount) < 0.01
        );
        
        if (isDuplicate) {
          failedRows.push({
            lineNumber: i + skipRows + 1,
            rawLine: line,
            reason: "Duplicate transaction detected"
          });
          continue;
        }
        
        // Create transaction
        const transactionId = crypto.randomUUID();
        const transaction = {
          id: transactionId,
          date,
          description,
          amount,
          type,
          category: 'Uncategorized',
          householdId: personalView ? null : householdId,
          userId: personalView ? userId : null,
          createdBy: userId,
          createdAt: new Date().toISOString(),
        };
        
        const key = personalView 
          ? `transaction:personal:${userId}:${transactionId}`
          : `transaction:household:${householdId}:${transactionId}`;
        
        await kv.set(key, transaction);
        successfulTransactions.push(transaction);
        
      } catch (error) {
        failedRows.push({
          lineNumber: i + skipRows + 1,
          rawLine: line,
          reason: error instanceof Error ? error.message : "Failed to parse row"
        });
      }
    }
    
    return c.json({
      success: true,
      successCount: successfulTransactions.length,
      failureCount: failedRows.length,
      transactions: successfulTransactions,
      failedRows,
    });
  } catch (error) {
    console.log(`Upload error: ${error}`);
    return c.json({ error: `File upload failed: ${error}` }, 500);
  }
});

/**
 * Smart CSV upload with auto-detection for transactions
 */
app.post("/make-server-ecf79a0e/transactions/smart-upload", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const householdId = formData.get('householdId') as string;
    const personalView = formData.get('personalView') === 'true';
    
    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }
    
    const fileText = await file.text();
    const lines = fileText.split('\n');
    
    // Detect delimiter
    const delimiter = lines[0] && lines[0].includes('\t') ? '\t' : ',';
    
    // Parse header row
    const headerRow = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    // Auto-detect column indices using common column names
    const dateIndex = headerRow.findIndex(h => 
      h.includes('date') || h.includes('transaction date') || h.includes('posting date')
    );
    const descIndex = headerRow.findIndex(h => 
      h.includes('description') || h.includes('memo') || h.includes('payee') || h.includes('merchant')
    );
    const amountIndex = headerRow.findIndex(h => 
      h.includes('amount') && !h.includes('withdrawal') && !h.includes('deposit')
    );
    const withdrawalIndex = headerRow.findIndex(h => 
      h.includes('withdrawal') || h.includes('debit') || h.includes('payment')
    );
    const depositIndex = headerRow.findIndex(h => 
      h.includes('deposit') || h.includes('credit')
    );
    
    if (dateIndex === -1 || descIndex === -1) {
      return c.json({ 
        error: "Could not auto-detect required columns (Date and Description). Please ensure your file has these columns." 
      }, 400);
    }
    
    const successfulTransactions = [];
    const failedRows = [];
    
    // Process data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        
        const date = values[dateIndex];
        const description = values[descIndex];
        
        // Determine amount and type
        let amount = 0;
        let type = 'expense';
        
        if (amountIndex !== -1) {
          // Single amount column - negative means expense, positive means income
          const amountVal = parseFloat(values[amountIndex].replace(/[^0-9.-]/g, ''));
          amount = Math.abs(amountVal);
          type = amountVal < 0 ? 'expense' : 'income';
        } else if (withdrawalIndex !== -1 || depositIndex !== -1) {
          // Separate withdrawal/deposit columns
          const withdrawal = withdrawalIndex !== -1 ? parseFloat(values[withdrawalIndex].replace(/[^0-9.-]/g, '') || '0') : 0;
          const deposit = depositIndex !== -1 ? parseFloat(values[depositIndex].replace(/[^0-9.-]/g, '') || '0') : 0;
          
          amount = withdrawal > 0 ? withdrawal : deposit;
          type = withdrawal > 0 ? 'expense' : 'income';
        }
        
        if (!date || isNaN(new Date(date).getTime())) {
          throw new Error("Invalid date format");
        }
        
        if (isNaN(amount) || amount === 0) {
          throw new Error("Invalid or zero amount");
        }
        
        // Check for duplicates
        const existingTransactions = personalView
          ? await kv.getByPrefix(`transaction:personal:${userId}:`)
          : await kv.getByPrefix(`transaction:household:${householdId}:`);
        
        const isDuplicate = existingTransactions?.some((t: any) => 
          t.date === date && 
          t.description === description && 
          Math.abs(t.amount - amount) < 0.01
        );
        
        if (isDuplicate) {
          failedRows.push({
            lineNumber: i + 1,
            rawLine: line,
            reason: "Duplicate transaction detected"
          });
          continue;
        }
        
        // Create transaction
        const transactionId = crypto.randomUUID();
        const transaction = {
          id: transactionId,
          date,
          description,
          amount,
          type,
          category: 'Uncategorized',
          householdId: personalView ? null : householdId,
          userId: personalView ? userId : null,
          createdBy: userId,
          createdAt: new Date().toISOString(),
        };
        
        const key = personalView 
          ? `transaction:personal:${userId}:${transactionId}`
          : `transaction:household:${householdId}:${transactionId}`;
        
        await kv.set(key, transaction);
        successfulTransactions.push(transaction);
        
      } catch (error) {
        failedRows.push({
          lineNumber: i + 1,
          rawLine: line,
          reason: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    
    return c.json({
      success: true,
      successCount: successfulTransactions.length,
      failureCount: failedRows.length,
      failedRows,
      transactions: successfulTransactions,
    });
  } catch (error) {
    console.log(`Smart upload error: ${error}`);
    return c.json({ error: "Failed to process upload" }, 500);
  }
});

/**
 * Smart CSV upload for holdings
 */
app.post("/make-server-ecf79a0e/holdings/upload", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const householdId = formData.get('householdId') as string;
    const personalView = formData.get('personalView') === 'true';
    
    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }
    
    const fileText = await file.text();
    const lines = fileText.split('\n');
    
    // Detect delimiter
    const delimiter = lines[0] && lines[0].includes('\t') ? '\t' : ',';
    
    // Parse header row
    const headerRow = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    // Auto-detect column indices
    const nameIndex = headerRow.findIndex(h => 
      h.includes('name') || h.includes('asset') || h.includes('holding') || h.includes('symbol')
    );
    const typeIndex = headerRow.findIndex(h => 
      h.includes('type') || h.includes('category')
    );
    const valueIndex = headerRow.findIndex(h => 
      h.includes('value') || h.includes('amount') || h.includes('balance')
    );
    
    if (nameIndex === -1 || valueIndex === -1) {
      return c.json({ 
        error: "Could not auto-detect required columns (Name and Value). Please ensure your file has these columns." 
      }, 400);
    }
    
    const successfulHoldings = [];
    const failedRows = [];
    
    // Process data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        
        const name = values[nameIndex];
        const type = typeIndex !== -1 ? values[typeIndex] : 'Other';
        const valueStr = values[valueIndex].replace(/[^0-9.-]/g, '');
        const value = parseFloat(valueStr);
        
        if (!name) {
          throw new Error("Missing asset name");
        }
        
        if (isNaN(value)) {
          throw new Error("Invalid value");
        }
        
        // Create holding
        const holdingId = crypto.randomUUID();
        const holding = {
          id: holdingId,
          name,
          type,
          value,
          householdId: personalView ? null : householdId,
          userId: personalView ? userId : null,
          createdBy: userId,
          createdAt: new Date().toISOString(),
        };
        
        const key = personalView 
          ? `holding:personal:${userId}:${holdingId}`
          : `holding:household:${householdId}:${holdingId}`;
        
        await kv.set(key, holding);
        successfulHoldings.push(holding);
        
      } catch (error) {
        failedRows.push({
          lineNumber: i + 1,
          rawLine: line,
          reason: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    
    return c.json({
      success: true,
      successCount: successfulHoldings.length,
      failureCount: failedRows.length,
      failedRows,
      holdings: successfulHoldings,
    });
  } catch (error) {
    console.log(`Holdings upload error: ${error}`);
    return c.json({ error: "Failed to process upload" }, 500);
  }
});

/**
 * Create a new goal
 */
app.post("/make-server-ecf79a0e/goals", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const { name, targetAmount, targetDate, householdId, type } = await c.req.json();
    
    if (!name || !targetAmount || !targetDate) {
      return c.json({ error: ERROR_CODES.E5002, code: 'E5002' }, 400);
    }
    
    const goalId = crypto.randomUUID();
    const goal = {
      id: goalId,
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      targetDate,
      type: type || 'savings', // 'savings' or 'contribution'
      householdId,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      contributions: [],
    };
    
    await kv.set(`goal:${householdId}:${goalId}`, goal);
    
    return c.json({ success: true, goal });
  } catch (error) {
    console.log(`Create goal error: ${error}`);
    return c.json({ error: "Failed to create goal" }, 500);
  }
});

/**
 * Get all goals for a household
 */
app.get("/make-server-ecf79a0e/goals", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const { householdId } = c.req.query();
    
    if (!householdId) {
      return c.json({ error: "householdId is required" }, 400);
    }
    
    const goals = await kv.getByPrefix(`goal:${householdId}:`);
    return c.json({ goals: goals || [] });
  } catch (error) {
    console.log(`Get goals error: ${error}`);
    return c.json({ error: "Failed to fetch goals" }, 500);
  }
});

/**
 * Add contribution to a goal
 */
app.post("/make-server-ecf79a0e/goals/:id/contribute", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const goalId = c.req.param('id');
    const { amount, householdId } = await c.req.json();
    
    const goal = await kv.get(`goal:${householdId}:${goalId}`);
    if (!goal) {
      return c.json({ error: ERROR_CODES.E5001, code: 'E5001' }, 404);
    }
    
    const contribution = {
      amount: parseFloat(amount),
      userId,
      date: new Date().toISOString(),
    };
    
    goal.contributions.push(contribution);
    goal.currentAmount += contribution.amount;
    
    await kv.set(`goal:${householdId}:${goalId}`, goal);
    
    return c.json({ success: true, goal });
  } catch (error) {
    console.log(`Add contribution error: ${error}`);
    return c.json({ error: "Failed to add contribution" }, 500);
  }
});

/**
 * Create a new holding (asset/investment)
 */
app.post("/make-server-ecf79a0e/holdings", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const { name, type, initialValue, currentValue, householdId } = await c.req.json();
    
    const holdingId = crypto.randomUUID();
    const holding = {
      id: holdingId,
      name,
      type, // 'stock', 'real-estate', 'crypto', etc.
      initialValue: parseFloat(initialValue),
      currentValue: parseFloat(currentValue || initialValue),
      householdId,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      history: [{
        value: parseFloat(currentValue || initialValue),
        date: new Date().toISOString(),
      }],
    };
    
    await kv.set(`holding:${householdId}:${holdingId}`, holding);
    
    return c.json({ success: true, holding });
  } catch (error) {
    console.log(`Create holding error: ${error}`);
    return c.json({ error: "Failed to create holding" }, 500);
  }
});

/**
 * Get all holdings for a household
 */
app.get("/make-server-ecf79a0e/holdings", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const { householdId } = c.req.query();
    
    if (!householdId) {
      return c.json({ error: "householdId is required" }, 400);
    }
    
    const holdings = await kv.getByPrefix(`holding:${householdId}:`);
    return c.json({ holdings: holdings || [] });
  } catch (error) {
    console.log(`Get holdings error: ${error}`);
    return c.json({ error: "Failed to fetch holdings" }, 500);
  }
});

/**
 * Update holding value
 */
app.put("/make-server-ecf79a0e/holdings/:id", async (c) => {
  const userId = await authenticateUser(c.req.raw);
  if (!userId) {
    return c.json({ error: ERROR_CODES.E1002, code: 'E1002' }, 401);
  }
  
  try {
    const holdingId = c.req.param('id');
    const { currentValue, householdId } = await c.req.json();
    
    const holding = await kv.get(`holding:${householdId}:${holdingId}`);
    if (!holding) {
      return c.json({ error: "Holding not found" }, 404);
    }
    
    holding.currentValue = parseFloat(currentValue);
    holding.history.push({
      value: parseFloat(currentValue),
      date: new Date().toISOString(),
    });
    
    await kv.set(`holding:${householdId}:${holdingId}`, holding);
    
    return c.json({ success: true, holding });
  } catch (error) {
    console.log(`Update holding error: ${error}`);
    return c.json({ error: "Failed to update holding" }, 500);
  }
});

Deno.serve(app.fetch);