/**
 * Extract a meaningful error message from an unknown caught value.
 *
 * Usage:
 *   catch (error) {
 *     const msg = toErrorMessage(error);
 *     logger.error(msg);
 *   }
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Safely extract error data for contract revert scenarios (ethers.js).
 *
 * Usage:
 *   catch (error) {
 *     const { message, data } = toContractError(error);
 *   }
 */
export function toContractError(error: unknown): { message: string; data?: string } {
  if (error instanceof Error) {
    const errObj = error as { data?: string };
    return { message: error.message, data: errObj.data };
  }
  return { message: String(error) };
}
