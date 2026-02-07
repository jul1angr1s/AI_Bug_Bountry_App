import { Router, Request, Response, NextFunction } from 'express';
import { verifyMessage } from 'ethers';
import { supabaseAdmin } from '../lib/supabase.js';
import { z } from 'zod';

const router = Router();

// Zod validation schema for SIWE request
const siweSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  signature: z.string().regex(/^0x[a-fA-F0-9]*$/i, 'Invalid signature format'),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i, 'Invalid wallet address format'),
});

type SiweRequest = z.infer<typeof siweSchema>;

/**
 * POST /siwe - Verify SIWE signature and create/update user session
 *
 * Verifies that the signature was signed by the wallet address specified,
 * creates or updates a Supabase user with the wallet address,
 * and returns a session token.
 */
router.post('/siwe', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const { message, signature, walletAddress }: SiweRequest = siweSchema.parse(req.body);

    // Verify SIWE signature using ethers.js
    let recoveredAddress: string;
    try {
      recoveredAddress = verifyMessage(message, signature);
    } catch (error) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Check that recovered address matches the wallet address in the request
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Normalize wallet address to lowercase for consistent storage
    const normalizedAddress = walletAddress.toLowerCase();
    const userEmail = `${normalizedAddress}@wallet.local`;

    console.log('[Auth] SIWE signature verified for wallet:', normalizedAddress);

    // Find or create user in Supabase
    let userId: string;

    try {
      // List all users to find by wallet address
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();

      // Check if user with this wallet already exists
      const existingUser = listData.users.find(
        (u) =>
          u.email === userEmail ||
          u.user_metadata?.wallet_address?.toLowerCase() === normalizedAddress
      );

      if (existingUser) {
        // Update existing user with latest verification timestamp
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
              ...existingUser.user_metadata,
              wallet_address: walletAddress,
              siwe_verified: true,
              verified_at: new Date().toISOString(),
            },
          }
        );

        if (updateError) throw updateError;
        userId = existingUser.id;
        console.log('[Auth] Updated existing user:', userId);
      } else {
        // Create new user with wallet metadata
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          user_metadata: {
            wallet_address: walletAddress,
            siwe_verified: true,
            verified_at: new Date().toISOString(),
          },
        });

        if (createError) throw createError;
        userId = createData.user.id;
        console.log('[Auth] Created new user:', userId);
      }
    } catch (error) {
      console.error('[Auth] Supabase user operation failed:', error);
      throw error;
    }

    // Generate magic link token for this user
    let accessToken: string;
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
      });

      if (linkError) throw linkError;

      // Extract token from magic link URL
      // Format: https://<project>.supabase.co/auth/v1/verify?token=<token>&type=magiclink
      const linkUrl = new URL(linkData.properties.action_link);
      const token = linkUrl.searchParams.get('token');

      if (!token) {
        throw new Error('Failed to extract token from magic link');
      }

      accessToken = token;
      console.log('[Auth] Generated session token for user:', userId);
    } catch (error) {
      console.error('[Auth] Token generation failed:', error);
      throw error;
    }

    // Return success response
    res.json({
      access_token: accessToken,
      user: {
        id: userId,
        wallet_address: walletAddress,
      },
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid request body',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    // Handle other errors
    console.error('[Auth] SIWE verification failed:', error);
    next(error);
  }
});

export default router;
