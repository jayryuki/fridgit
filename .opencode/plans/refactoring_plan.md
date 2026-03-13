# Fridgit Codebase Refactoring Plan

## Overview
This plan outlines recommended refactoring efforts for the Fridgit codebase based on analysis of server-side and client-side code. The focus areas include bug fixes, security improvements, redundancy removal, and performance/style optimizations.

## Priority Issues Found

### 1. Duplicate Code (Medium Priority)
- **round2 function**: Defined in multiple locations:
  - `server/routes/items.js` (line 9)
  - `server/services/openfoodfacts.js` (line 27)
  - Client-side equivalent: `client/src/utils/helpers.js` (`r2` and `r2Empty` functions)

### 2. Security Vulnerabilities (High Priority)
- **SQL Injection Risk**: In `server/routes/items.js` line 120, the query uses string concatenation for the interval:
  ```javascript
  expiry_date <= CURRENT_DATE + $2 * INTERVAL '1 day'
  ```
  While parameterized, the multiplication operation could be risky if not properly validated.

### 3. Performance & Style Improvements (Medium Priority)
- **Redundant Imports**: Helper functions imported individually in multiple files
- **Console Logging**: Excessive console.log/error statements throughout server code
- **Nested Try/Catch**: Some routes have deeply nested error handling

## Detailed Recommendations

### 1. Consolidate Utility Functions
**Action**: Create a shared utility module for common functions like rounding and nutrition checks.

**Files to Modify**:
- Create `server/utils/helpers.js` mirroring client helpers
- Update `server/routes/items.js` to use shared round2 function
- Update `server/services/openfoodfacts.js` to use shared round2 function
- Remove duplicate round2 implementations

### 2. Fix Potential SQL Injection Risk
**Action**: Validate numeric input before using in SQL interval calculation.

**Files to Modify**:
- `server/routes/items.js` line 115-127: Add validation for `days` parameter
- Ensure `days` is a positive integer before using in query

### 3. Standardize Error Handling
**Action**: Create consistent error handling patterns across routes.

**Files to Modify**:
- Replace repetitive try/catch blocks with centralized error handling middleware
- Standardize error responses (status codes, message formats)
- Reduce console.log spam in production

### 4. Optimize Shopping List Auto-generation
**Action**: Improve performance of the auto-generate endpoint.

**Files to Modify**:
- `server/routes/shopping-list.js` lines 63-93: 
  - Replace individual queries with batch operations
  - Use JOINs or WHERE NOT EXISTS clauses instead of looping
  - Consider adding database indexes for frequently queried columns

### 5. Standardize API Response Formats
**Action**: Ensure consistent response structures across all endpoints.

**Files to Modify**:
- All server route files: Standardize success/error response formats
- Consider creating response helper functions

### 6. Improve Input Validation
**Action**: Add comprehensive input validation for all API endpoints.

**Files to Modify**:
- All POST/PUT route handlers: Add validation middleware or inline validation
- Focus on required fields, data types, and range validation

### 7. Remove Unused Code & Dependencies
**Action**: Audit and remove unused imports, variables, and code blocks.

**Files to Modify**:
- Review all files for commented-out code, unused imports, dead code
- Check package.json for unused dependencies

### 8. Enhance Security Headers
**Action**: Add security-related HTTP headers.

**Files to Modify**:
- `server/index.js`: Add helmet.js or equivalent security middleware
- Implement CORS restrictions if needed
- Add rate limiting for authentication endpoints

## Implementation Order

1. **High Priority** (Security & Critical Bugs)
   - Fix SQL injection risk in items route
   - Standardize error handling
   - Enhance security headers

2. **Medium Priority** (Performance & Maintainability)
   - Consolidate utility functions
   - Optimize shopping list auto-generation
   - Standardize API responses
   - Improve input validation

3. **Low Priority** (Code Cleanup)
   - Remove unused code and dependencies
   - Reduce console logging
   - Minor style improvements

## Estimated Effort
- High Priority: 2-3 days
- Medium Priority: 3-4 days  
- Low Priority: 1-2 days
- Total: 6-9 days

## Testing Considerations
- All changes should maintain backward compatibility
- Existing tests should continue to pass
- Add unit tests for new utility functions
- Test edge cases for input validation