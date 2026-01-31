import path from 'path';

/**
 * Sandbox Security Module (Task 4.3)
 * 
 * Enforces execution boundaries and sanitizes repository inputs
 * to prevent code execution outside the sandbox.
 */

// Dangerous patterns in file paths
const DANGEROUS_PATTERNS = [
  /\.\./,                    // Path traversal
  /[~%$#@!&*()]/,           // Special characters
  /\0/,                     // Null bytes
  /^\//,                    // Absolute paths
  /^(con|prn|aux|nul|com\d|lpt\d)$/i, // Windows reserved names
];

// Allowed file extensions for smart contracts
const ALLOWED_EXTENSIONS = ['.sol', '.vy', '.yul', '.json', '.md', '.txt'];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Maximum path depth
const MAX_PATH_DEPTH = 10;

export interface SanitizationResult {
  isValid: boolean;
  sanitizedPath: string;
  errors: string[];
}

/**
 * Sanitize repository URL
 */
export function sanitizeRepoUrl(url: string): SanitizationResult {
  const errors: string[] = [];
  
  // Check for valid GitHub URL format
  const githubUrlRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  if (!githubUrlRegex.test(url)) {
    errors.push('Invalid GitHub URL format');
  }
  
  // Check for dangerous characters
  if (url.includes('\0') || url.includes('%00')) {
    errors.push('URL contains null bytes');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedPath: url,
    errors,
  };
}

/**
 * Sanitize file path
 */
export function sanitizeFilePath(filePath: string): SanitizationResult {
  const errors: string[] = [];
  
  // Normalize path
  const normalized = path.normalize(filePath);
  
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(normalized)) {
      errors.push(`Path contains dangerous pattern: ${pattern}`);
    }
  }
  
  // Check path depth
  const depth = normalized.split(path.sep).length;
  if (depth > MAX_PATH_DEPTH) {
    errors.push(`Path exceeds maximum depth of ${MAX_PATH_DEPTH}`);
  }
  
  // Check file extension
  const ext = path.extname(normalized).toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    errors.push(`File extension ${ext} is not allowed`);
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedPath: normalized,
    errors,
  };
}

/**
 * Validate contract path
 */
export function validateContractPath(
  basePath: string,
  contractPath: string
): SanitizationResult {
  const errors: string[] = [];
  
  // Sanitize the contract path
  const sanitized = sanitizeFilePath(contractPath);
  if (!sanitized.isValid) {
    errors.push(...sanitized.errors);
  }
  
  // Ensure the resolved path is within basePath
  const fullPath = path.resolve(basePath, sanitized.sanitizedPath);
  const resolvedBase = path.resolve(basePath);
  
  if (!fullPath.startsWith(resolvedBase)) {
    errors.push('Contract path escapes the repository directory');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedPath: sanitized.sanitizedPath,
    errors,
  };
}

/**
 * Check if code contains dangerous patterns
 */
export function validateContractCode(code: string): SanitizationResult {
  const errors: string[] = [];
  
  // Check for inline assembly that might be dangerous
  const dangerousPatterns = [
    /assembly\s*\{[^}]*call\(/i,           // Assembly with call
    /assembly\s*\{[^}]*delegatecall\(/i,   // Assembly with delegatecall
    /selfdestruct\s*\(/i,                  // Selfdestruct
    /suicide\s*\(/i,                       // Suicide (old selfdestruct)
    /block\.timestamp.*=.*now/i,          // Timestamp manipulation attempt
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(`Code contains potentially dangerous pattern: ${pattern}`);
    }
  }
  
  // Check file size
  if (code.length > MAX_FILE_SIZE) {
    errors.push(`File exceeds maximum size of ${MAX_FILE_SIZE} bytes`);
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedPath: '',
    errors,
  };
}

/**
 * Create sandbox configuration
 */
export interface SandboxConfig {
  basePath: string;
  maxMemoryMB: number;
  maxExecutionTimeMs: number;
  allowedNetworkHosts: string[];
  readOnlyPaths: string[];
  writePaths: string[];
}

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  basePath: '/tmp/sandbox',
  maxMemoryMB: 512,
  maxExecutionTimeMs: 5 * 60 * 1000, // 5 minutes
  allowedNetworkHosts: [], // No network access by default
  readOnlyPaths: [],
  writePaths: ['/tmp'],
};

/**
 * Validate sandbox configuration
 */
export function validateSandboxConfig(config: Partial<SandboxConfig>): SandboxConfig {
  return {
    ...DEFAULT_SANDBOX_CONFIG,
    ...config,
  };
}
